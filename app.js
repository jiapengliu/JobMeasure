
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');

var app = module.exports = express.createServer();

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

/*
require.paths.unshift(__dirname + '/public/scripts');

app.get('/', function(res,res){
	var shSyntaxHighlighter = require('shCore').SyntaxHighlighter;
	var shJScript = require('shBrushJScript').Brush;
	var code = '\n\
		function helloWorld()\n\
		{\n\
			// this is great!\n\
			for(var i = 0; i <= 1; i++)\n\
				alert("yay");\n\
		}\n\
		';
	var brush = new shJScript();
	res.render('index',{content:brush.getHtml(code)});
})
*/

var code = '\
function helloWorld()\n\
{\n\
	// this is great!\n\
	for(var i = 0; i <= 1; i++)\n\
		alert("yay");\n\
}\n\
	';

app.get('/', function(req,res){
	res.render('index.jade', {title: 'My Site', src: code});
});

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});


