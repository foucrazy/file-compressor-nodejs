var http = require('http');
var util = require('util');
var querystring = require('querystring');
var urlUtil = require('url');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var requirejs = require('./libs/r.js');
var formidable = require('./libs/formidable')

var port=9090;
var nodes=1;
var BASE_DIR="./statics/";
var CACHE_DIR="cache/";
var TEMP_DIR="temp/";
var UPLOAD_DIR="uploaded/";
var USE_GZIP=true;
var USE_OPTIMIZER=false;

	function start(req,res){
		var urlRequest = urlUtil.parse(req.url);
		
		switch(urlRequest.pathname) {	  
			case '/':
				display_form(req, res);
				break;
				
			case '/upload':
				upload(req, res);
				break;				
				
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
	
	function upload(req,res){
		 console.log("Request handler upload was called.");		 
		 var form = new formidable.IncomingForm();
		 form.uploadDir = BASE_DIR+UPLOAD_DIR;
		 form.keepExtensions=true;
		 
		 var contentStr="";
		 
		 //console.dir(req.headers);
		 form.parse(req, function(err, fields, files){			 		 
			//console.log(files);
			contentStr=proccessFile(files.file1)+proccessFile(files.file2)+proccessFile(files.file3)+proccessFile(files.file4)+proccessFile(files.file5);
			respond(res,contentStr);
		 });
	}	
	
	function proccessFile(file){
		if(file.size>0){
			var fileName=normalizeName(file.name);
			fs.rename(file.path,BASE_DIR+UPLOAD_DIR+fileName);
			
			var filePath=BASE_DIR+UPLOAD_DIR+fileName;
			console.log('Reading file '+filePath);				
			
			var partialContent=fs.readFileSync(filePath,'utf-8');	
				
			console.log(partialContent);
				
			if (USE_OPTIMIZER){	
				var config = {
					baseUrl: BASE_DIR,
					cssIn: filePath,
					out: BASE_DIR+TEMP_DIR+fileName+'-optimized.css',
					optimizeCss: "standard",																					
				};

				requirejs.optimize(config, function (buildResponse) {
					partialContent=fs.readFileSync(config.out, 'utf8');
				});
			}		
			
			//fs.unlinkSync(filePath); //Eliminamos el fichero origen
			return '\n//'+filePath+"\n"+partialContent;	
		}else{
			return '';
		}
	}
	
	function combineCss(req,res,query){
		try{
			console.log("[200] " + req.method + " to " + req.url);
			var fileNamesCss=query.split(";");
			var fileCacheName=normalizeName(query);
			
			if (req.method == 'GET') {//Peticiones de ficheros internos almacenados				
				//Lectura de cache
				if (path.existsSync(BASE_DIR+CACHE_DIR+fileCacheName)){ 
					console.log("Leyendo de cache");
					var cache = fs.readFileSync(BASE_DIR+CACHE_DIR+fileCacheName).toString('utf8');										
					respond(res,cache);
				}else{ //Generacion de contenidos					
					var contentStr="";
				
					for (var i=0;i<fileNamesCss.length;i++){
						var filePath=BASE_DIR+fileNamesCss[i]+".css";
						console.log('Reading file '+filePath);				
						partialContent=fs.readFileSync(filePath,'utf-8');	
						
						if (USE_OPTIMIZER){						
							var config = {
								baseUrl: BASE_DIR,
								cssIn: filePath,
								out: BASE_DIR+TEMP_DIR+fileNamesCss[i]+'-optimized.css',
								optimizeCss: "standard",																					
							};

							requirejs.optimize(config, function (buildResponse) {
								partialContent=fs.readFileSync(config.out, 'utf8');
							});
						}
						contentStr=contentStr+'\n//'+filePath+"\n"+partialContent;					
					}																		
					
					console.log("Creando cache para:"+query);														
					fs.writeFileSync(BASE_DIR+CACHE_DIR+fileCacheName,contentStr);					
					respond(res,contentStr);
				}
			}
		}catch(err){
			res.writeHead(500, "Error", {'Content-Type': 'text/html'});
			res.end('<html><head><title>500 - Error</title></head><body><h1>ERROR.</h1></body></html>');				
			console.log(err);
		}
	}
	
	function purgeCache(res){
		try{
			var dirPath=BASE_DIR+CACHE_DIR;
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

	function respond(res,content){
		if(USE_GZIP){
			console.log("Using gzip for response.");
			res.writeHead(200, { 'Content-Encoding': 'gzip', 'Content-Type': 'text/css; charset=UTF-8' });										
			zlib.gzip(content, function(err, result){
			   if(!err){
					res.end(result,'utf-8');
			   }
			});			
		}else{
			res.writeHead(200, { 'Content-Type': 'text/css; charset=UTF-8' });
			res.end(content,'utf-8');		
		}
	}
	
	function normalizeName(query){
		query=replaceAll(query,"/","");
		query=replaceAll(query,"\\","");
		query=replaceAll(query,";","");
		query=replaceAll(query," ","");
		
		return query;		
	}
	
	function replaceAll( text, busca, reemplaza ){
	  while (text.toString().indexOf(busca) != -1)
		  text = text.toString().replace(busca,reemplaza);
	  return text;
	}
	
	/*
	 * Display upload form
	 */
	function display_form(req, res) {
		res.writeHead(200, {"Content-Type": "text/html"});
		res.end(
			'<form action="/upload" method="post" enctype="multipart/form-data">'+
				'<input type="file" name="file1"><br>'+
				'<input type="file" name="file2"><br>'+
				'<input type="file" name="file3"><br>'+
				'<input type="file" name="file4"><br>'+
				'<input type="file" name="file5"><br>'+
				'<input type="submit" value="Upload">'+
			'</form>'
		);		
	}		
	
	for(var i=0;i<nodes;i++){
		var node=http.createServer(function (req, res) { start(req,res); });
		node.listen((port+i), '127.0.0.1');
		console.log("STATICS SERVER");
		console.log('Nodo'+(i+1)+' running at http://127.0.0.1:'+(port+i));
	}	