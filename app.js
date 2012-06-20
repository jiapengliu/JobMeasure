
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');

var app = module.exports = express.createServer();
var fs = require('fs'),
	path = require('path'),
	jq = require('jquery');

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

app.get('/history', function(req, res) {
	res.redirect('/history/css');
});

app.get('/history/*', function(req, res) {
	sshis(req.params, function(code, result) {
/*		if (code == 0) {
			res.render('list', {
				title: 'list', 
				columns: ["isfolder", "name"],
				data: splitResult('/list/' + req.params, result)
			});
		} else {
			res.end(code + '\r\n' + result);
		}
		*/
		parseHistory(result, function(data) {
			res.end(data);
		});
	});
});

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

// lib

function parseHistory(content, callback) {
	var lines = content.split('\r\n'),
		items = [],
		item,
		isfile = false,
		isver = false,
		row;

	for(var i in lines) {
		var line = lines[i];

		var version = getBetween(line, '*****************', '*****************');
		if (version) {
			item = createHistoryItem();
			item.version = parseVersion(version);
			items.push(item);
			isfile = false;
			isver = true;
			row = 0;
			continue;
		}

		var filename = getBetween(line, '*****', '*****');
		if (filename) {
			item = createHistoryItem();
			item.filename = filename;
			items.push(item);
			isfile = true;
			isver = false;
			row = 0;
			continue;
		}

		if (isfile) 
			switch(++row) {
				case 1:
					item.version = 	parseVersion(line);
					break;
				case 2:
					parseUserAndDate(item, line);
					break;
			}

		if (isver)
			switch(++row) {
				case 1:
					parseUserAndDate(item, line);
					break;
				case 2:
					item.filename = parseVersionFilename(line);
					break;
			}
	}

	console.log(items);
	callback(content);
}

function createHistoryItem() {
	return { filename: null, version: 0, user: null, date: null };
}

function parseVersionFilename(line) {
	var end = line.lastIndexOf(' ');
	if (end != -1)
		return line.substring(0, end);

	return null;
}

function parseUserAndDate(item, line) {
	var values = getPartValues(line);
	if (values && values.length == 3) {
		item.user = values[0];
		item.date = toDate(values[1], values[2]);
	}
}

function getPartValues(line) {
	var values = [],
		parts = line.split(' ');
	for(var i in parts) {
		var part = parts[i];
		if (part)
			if (part.indexOf(':') != (part.length - 1))
				values.push(part);
	}
	return values;
}

function toDate(date, time) {
	var d = '20' + date,
		t = time + ':00 GMT+0900',
		str = d + ' ' + t;

	return new Date(str);	
}

function parseVersion(version) {
	var parts = version.split(' ');
	if (parts && parts.length == 2) {
		var ver = parseInt(parts[1]);
		if (!isNaN(ver))
			return ver;
	}
	return 0;
}

function getBetween(str, start, end) {
	var b = str.indexOf(start);
	if (b == -1) return null;

	b += start.length;
	if (b >= str.length) return null;

	var e = str.indexOf(end, b);
	if (e == -1) return null;

	return jq.trim(str.substring(b, e));
}

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


function exe2(exefullpath, args, callback) {
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

function exe(exefullpath, args, callback) {
	var cmd = '"' + binp('utf8wrapper.exe') + '"';
	cmd += ' "' + exefullpath + '"';
	for(i = 0; i < args.length; i++) {
		cmd += ' ' + args[i];
	}
	console.log('exe>' + cmd);

	var forker = require('child_process');
	forker.exec(cmd, { cwd: csp() }, function(err, outstr) {
		callback(0, outstr);
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



