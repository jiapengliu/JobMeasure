
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

app.get('/', function(req, res) {
	res.redirect('/list/css');
});

app.get('/cs/*', function(req, res) {
	var file = req.params[0];
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

app.get('/diff/*', function(req, res) {
	var files = parseFiles(req.params[0]);
	diffFile(files, 0, [], function(diffs) {
		res.render('showdiff', {title: 'diff', diffs: diffs});
	});
});

app.get('/diffcs/*', function(req, res) {
	var file = req.params[0];
	readFile(file, function(p, cs) {
		if (cs != null) {
			res.render('showcs', {title: file, cs: cs});
		} else {
			console.log("Cannot find " + p);
			res.end("Cannot find " + file);
		}
	});
});	

app.get('/list', function(req, res) {
	res.redirect('/list/css');
});

app.get('/list/*', function(req, res) {
	ssdir(req.params, function(result) {
		res.render('list', {
			title: 'list',	
			columns: ["isfolder", "name"],
			data: splitResult('/list/' + req.params, result),
			his: '/history/' + req.params
		});
	});
});

app.get('/history', function(req, res) {
	res.redirect('/history/css');
});

app.get('/history/*', function(req, res) {
	sshis(req.params, function(result) {
		parseHistory(result, function(items) {
			var his = combineHistory('/diff/' + req.params, items);

			res.render('history', {
				title: '履歴', 
				histories: his
			});
		});
	});
});

app.listen(3000, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

// lib

function diffFile(files, id, diffs, callback) {
	var file = files[id];
	diff(file.filename, file.version, function(result) {
		diffs.push(createDiff(file, result));
		if (id == files.length - 1)
			callback(diffs);
		else 
			diffFile(files, ++id, diffs, callback);
	});
}

function createDiff(file, result) {
	var filename = path.basename(file.filename) + '(' + file.version + ' vs. ' + (file.version - 1) + ')';
	var url = file.filename + '.' + file.version;
	return { filename: filename, url: '/diffcs/' + url, diff: result };
}

function parseFiles(fileurl) {
console.log(fileurl);
	var files = [],
		file,
		folder = path.dirname(fileurl),
		filenames = path.basename(fileurl)
		parts = filenames.split(':');

	for(var i in parts) {
		var part = parts[i];
		if (i % 2 == 0)
			file = { filename: path.join(folder, part), version: 0 };
		else {
			var num = parseInt(part);
			if (!isNaN(num))
				file.version = num;

			files.push(file);
		}
	}

	return files;
}

function combineHistory(base, items) {
	var dicDate = {},
		dicTimeComment;

	items.forEach(function(item) {
		var date = item.date;
		var dtkey = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
		if (dtkey in dicDate)
			dicTimeComment = dicDate[dtkey];
		else {
			dicTimeComment = {};
			dicDate[dtkey] = dicTimeComment;
		}

		var tuckey = date.getTime() + '|' + item.user + '|' +  item.comment;
		if (tuckey in dicTimeComment)
			dicTimeComment[tuckey].push(item);
		else
			dicTimeComment[tuckey] = [item];
	});

	var histories = [];
	for(var date in dicDate) {
		histories.push({ date: date, cms: getComments(base, dicDate[date]) });
	}
	return histories;
}

function getComments(base, dictuc) {
	var cms = [];
	for(var tuc in dictuc) {
		var items = dictuc[tuc],
			item = items[0];
		cms.push({ comment: item.comment || 'なし', user: item.user, date: item.date, 
			fileurl: getFileUrl(base, items) });
	}
	return cms;
}

function getFileUrl(base, items) {
	var url = base + '/';
	for(var i in items) {
		var it = items[i];
		if (i > 0)
			url += ':';
		url += it.filename + ':' + it.version;
	}
	return url;
}


function parseHistory(content, callback) {
	var lines = content.split('\r\n'),
		items = [],
		item,
		isfile = false,
		isver = false;

	for(var i in lines) {
		var line = lines[i];

		var version = getBetween(line, '*****************', '*****************');
		if (version) {
/*
			item = createHistoryItem();
			item.version = parseVersion(version);
			items.push(item);
*/
			isfile = false;
			isver = true;
			continue;
		}

		var filename = getBetween(line, '*****', '*****');
		if (filename) {
			item = createHistoryItem();
			item.filename = filename;
			items.push(item);
			isfile = true;
			isver = false;
			continue;
		}

		if (isfile) 
			parseFileBlock(item, line);
/*
		if (isver)
			parseVersionBlock(item, line);
*/
	}
	callback(items);
}

function parseFileBlock(item, line) {
	if (parseFileBlock.iscmt && line)
		item.comment += line;

	if (startWith(line, 'ユーザー:'))
		parseUserAndDate(item, line);

	if (startWith(line, 'コメント:')) {
		item.comment = getAfterAndTrim(line, 'コメント:');
		parseFileBlock.iscmt = true;
	}

	if (startWith(line, 'バージョン')) {
		var numstr = getAfterAndTrim(line, 'バージョン');
		var num = parseInt(numstr);
		if (!isNaN(num))
			item.version = num;	
	}
}
/*
function parseVersionBlock(item, line) {
	var row = 0;
	switch(++row) {
		case 1:
			parseUserAndDate(item, line);
			break;
		case 2:
			item.filename = parseVersionFilename(line);
			break;
	}
}
*/
function getAfterAndTrim(str, keyword) {
	var valstr = str.substring(keyword.length);
	return jq.trim(valstr);
}

function startWith(str, keyword) {
	var pos = str.indexOf(keyword); 
	return pos == 0;
}	

function createHistoryItem() {
	return { filename: null, version: 0, user: null, date: null, comment: null };
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
	ssget(file, function(result) {
		var filename = path.basename(file);
		var p = csp(filename);
		fs.readFile(p, function(err, data) {
			if (err) throw err;
			callback(p, data);
		});
	});
}

function readFile(file, callback) {
	var filename = path.basename(file);
	var p = csp(filename);
	fs.readFile(p, function(err, data) {
		if (err) throw err;
		callback(p, data);
	});
}

function diff(file, version, callback) {
	ssgetv(file, version, function(result) {
		var filename = path.basename(file);
		var p = csp(filename);
		var pnew = p + '.' + version;
		fs.rename(p, pnew, function() {
			var oldver = version - 1;
			var pold = p + '.' + oldver;
			ssgetv(file, oldver, function(result) {
				fs.rename(p, pold, function() {
					diffCs(pold, pnew, callback);
				});
			});
		});
	});
}

function diffCs(file1, file2, callback) {
	exe(binp('localdiff.exe'), ['-u', file1, file2], callback);
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

function ssgetv(sub, version, callback) {
	process.env.ssdir = '\\\\src\\VSS\\CSS';
	process.env.ssuser = 'ryu';
	process.env.sspwd = 'ryu';
	exe(ssp('ss.exe'), ['Get', '-V' + version, '$/' + sub], callback);
}

function ss(cmd, sub, callback) {
	process.env.ssdir = '\\\\src\\VSS\\CSS';
	process.env.ssuser = 'ryu';
	process.env.sspwd = 'ryu';
	exe(ssp('ss.exe'), [cmd, '$/' + sub], callback);
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
		callback(outstr);
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



