var http = require('http');
var utils = require('util');
var querystring = require('querystring');
var urlUtil = require('url');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var port=9090;
var nodes=1;
var CACHE_DIR="cache/";

function start(req,res){

	var urlRequest = urlUtil.parse(req.url);
	//console.log(urlRequest);
	
	switch(urlRequest.pathname) {
		/*case '/calcular':
		 if (req.method == 'POST') {
			console.log("[200] " + req.method + " to " + req.url);
			
			//Recoleccion de informacion recibida
			var fullBody = '';		
			req.on('data', function(chunk) {		  
			  console.log("Peticion:"+chunk.toString());
			  fullBody += chunk.toString();
			});
			
			req.on('end', function() {
			  res.writeHead(200, "OK", {'Content-Type': 'text/html'});		  
			  var decodedBody = querystring.parse(fullBody);	
			  res.write('<html><head><title>Post data</title></head><body><pre>');
			  res.write(utils.inspect(decodedBody));
			  res.write('</pre></body></html>');		  
			  res.end();
			});
			
		  } else {
			console.log("[405] " + req.method + " to " + req.url);
			res.writeHead(405, "Method not supported", {'Content-Type': 'text/html'});
			res.end('<html><head><title>405 - Method not supported</title></head><body><h1>Method not supported.</h1></body></html>');
		  }	  
		  break;*/
		  
		case '/css':
			combineCss(req,res,urlRequest.query);
			break;
			
		case '/purgeCache':
			purgeCache(res);
			break;			
		  
		default:
		  res.writeHead(404, "Not found", {'Content-Type': 'text/html'});
		  res.end('<html><head><title>404 - Not found</title></head><body><h1>Not found.</h1></body></html>');
		  //console.log("[404] " + req.method + " to " + req.url);
	  };
}

	function purgeCache(res){
		try{
			var dirPath="cache/";
			var files = fs.readdirSync(dirPath);
			console.log("Purge cache of "+files.length+" files.");
			
			if (files.length > 0){
				for (var i = 0; i < files.length; i++) {
				  var filePath = dirPath + '/' + files[i];
				  if (fs.statSync(filePath).isFile())
					fs.unlinkSync(filePath);					 
				}
			}			
			
			res.writeHead(200, "OK", {'Content-Type': 'text/css'});			
			res.end("OK", 'utf-8');			
		}catch(err){
			res.writeHead(500, "Error", {'Content-Type': 'text/html'});
			res.end('<html><head><title>500 - Error</title></head><body><h1>ERROR</h1></body></html>');				
			console.log(err);
		}	
	}

	function combineCss(req,res,query){
		try{
			if (req.method == 'GET') {							
				console.log("[200] " + req.method + " to " + req.url);				
				//Recoleccion de informacion recibida
				var fileNamesCss=query.split(";");
				var fileCacheName=query.replace("/","").replace("\\","");
				var content;
												
				if (path.existsSync(CACHE_DIR+fileCacheName)){ //Lectura de cache
					console.log("Leyendo de cache");
					content = fs.readFileSync(CACHE_DIR+fileCacheName);					
					//response.writeHead(200, { 'content-encoding': 'gzip' });
				}else{
					for (var i=0;i<fileNamesCss.length;i++){
						var fileName='./'+fileNamesCss[i]+'.css';
						console.log('Reading file '+fileName);				
						partialContent=fs.readFileSync(fileName,'utf-8');					
						content=content+'\n //-------------------------- File '+fileName+" -------------------------- \n"+partialContent;					
					}			
					console.log("Creando cache para:"+query);
					//var input = new Buffer(content, 'utf8')
					//fs.writeFileSync(CACHE_DIR+fileCacheName,zlib.deflate(input));
					fs.writeFileSync(CACHE_DIR+fileCacheName,content);
				}	
				
				res.writeHead(200, "OK", {'Content-Type': 'text/css'});						
				res.end(content, 'utf-8');							
			} 
		}catch(err){
			res.writeHead(500, "Error", {'Content-Type': 'text/html'});
			res.end('<html><head><title>500 - Error</title></head><body><h1>ERROR.</h1></body></html>');				
			console.log(err);
		}
	}

for(var i=0;i<nodes;i++){
	var node=http.createServer(function (req, res) { start(req,res); });
	node.listen((port+i), '127.0.0.1');
	console.log('Nodo'+(i+1)+' running at http://127.0.0.1:'+(port+i));
}