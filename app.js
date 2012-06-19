
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');

var app = module.exports = express.createServer();
var fs = require('fs');
var path = require('path');

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/cs/*', function(req, res) {
	var file = req.params;
	readCs(file, function(p, cs) {
		if (cs != null) {
			res.render('showcs', {title: file, cs: cs});
		} else {
			console.log("Cannot find " + p);
			res.end("Cannot find " + file);
		}
	});
});	

app.get('/comp/:file1/:file2', function(req, res) {
	var files = [req.params.file1, req.params.file2];
	readCs(files[0], function(p1, cs1) {
		readCs(files[1], function(p2, cs2) {
			if (cs1 != null && cs2 != null)
				res.render('index', {title: files.join(' vs. '), left: cs1, right: cs2});
			else {
				var paths = [p1, p2];
				console.log("Cannot find " + paths.join(', '));
				res.end("Cannot find " + files.join(', '));
			}
		});
	});
});

app.get('/diff/:file1/:file2', function(req, res) {
	var files = [req.params.file1, req.params.file2];
	diffCs(files[0], files[1], function(code, result) {
		if (code == 1) {
			res.render('showdiff', {title: files.join(' vs. '), fullurl: '/cs/' + files[1], fulldisp: files[1], diff: result});
		} else {
			res.end("diff returns " + code + "\n" + result);
		}
	});
});

app.get('/list', function(req, res) {
	res.redirect('/list/css');
});

app.get('/list/*', function(req, res) {
	ssdir(req.params, function(code, result) {
		if (code == 0) {
			res.render('list', {
				title: 'list', 
				columns: ["isfolder", "name"],
				data: splitResult('/list/' + req.params, result)
			});
		} else {
			res.end(code + '\r\n' + result);
		}
	});
});

function splitResult(base, result) {
	var items = [];
	var isfirst = true;
	var parts = result.split('\r\n');
	for (i = 1; i < parts.length; i++) {
		var part = parts[i];
		if (!part) break;
		
		var isfolder = false;
		var name = part;
		if (part.substring(0,1) == '$') {
			isfolder = true;
			name = part.substring(1);
		}

		if (!isfolder)
			base = base.replace('/list', '/cs');

		var item = {
			isfolder: isfolder,
			name: '<a href="' + base + '/' + name + '">' + name + '</a>'
		};
		items.push(item);
	}

	return items;
}

function readCs(file, callback) {
	ssget(file, function(code, result) {
		if (code == 0) {
			var filename = path.basename(file);
			var p = csp(filename);
			fs.readFile(p, function(err, data) {
				if (err) throw err;
				callback(p, data);
			});
		}
		else {
			callback(null, null);
		}
	});
}

function diffCs(file1, file2, callback) {
	exe(binp('localdiff.exe'), ['-u', csp(file1), csp(file2)], callback);
}

function ssdir(sub, callback) {
	ss('Dir', sub, callback);
}


function ssget(sub, callback) {
	ss('Get', sub, callback);
}

function ssstat(sub, callback) {
	ss('Status', sub, callback);
}

function sshis(sub, callback) {
	ss('History', sub, callback);
}

function ss(cmd, sub, callback) {
	process.env.ssdir = '\\\\src\\VSS\\CSS';
	process.env.ssuser = 'ryu';
	process.env.sspwd = 'ryu';
	exe(ssp('ss.exe'), [cmd, '$/' + sub], callback);
}


function exe(exefullpath, args, callback) {
	console.log(csp());
	var util = require('util'),
		spawn = require('child_process').spawn,
		exe = spawn(exefullpath, args, {cwd: csp(), env: process.env}),
		result = '';

	exe.stdout.on('data', function(data) {
		result += data.toString();
	});
	exe.stderr.on('data', function(data) {
		result += data.toString();
	});
	exe.on('exit', function(code) {
		callback(code, result);
	});
}

function csp(filename) {
	return path.join(__dirname, 'cs', filename);
}
function binp(filename) {
	return path.join(__dirname, 'bin', filename);
}
function ssp(filename) {
	return path.join('c:\\Program Files\\Microsoft Visual SourceSafe', filename);
}

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});


