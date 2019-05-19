/**
  * The master script. Handles everything and imports the modules needed. The ordering here is not correct, check the linenumbers for the ordering. Express goes from handler to handler that matches top to bottom.
  * @todo Add pug to render pages for error and success, make sure everything works in AWS, create a production variant
  * @module master
  * @author Victor Davidsson
  * @version 0.0.3
  */

/* Secret, as I don't want some stuff here or in my repo. Please don't go looking for this file. */
let secret = require('./secret.json');

/**
  * My own simple logging function, it binds to the console error, log and warn and adds timestamp and some other useful stuff. See {@link module:log}
  * @global
  */
global.logging = require('./log.js');

/* Web server stuff */
let express = require('express'), app = express();

/* Schedule for periodically calling purge functions and similar */
let schedule = require('node-schedule');

let hash = require('./hash.js');
let file = require('./file.js');

/**
  * Schedule for periodically purging what's needed. Called every 5 minutes by schedule module and it itselfs calls the different purge functions and the function to decide the hash length. See {@link module:hash} and {@link module:file}
  * @module schedule
  * @function scheduleEvery5mins
  */
schedule.scheduleJob("*/5 * * * *", function (){
  hash.purge();
  hash.calculateHashLength();
  file.purge();
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/assets/index.html");
});

/**
  * Creates a hash for the link entered using ?link= and sends out a JSON-object as response. See {@link module:hash}
  * @module express
  * @function GET api/hash/create
  */
app.get('/api/hash/create', function (req, res) {
    let result = {};

    res.setHeader('Content-Type', 'application/json');
    if(req.query.link) {
      let createdObject = hash.create(req.query.link, req.query.ttl);
      result = createdObject;
      res.send(result);
    }
    else {
      result = {
        code: "0",
        codetext: "error",
        reason: "No link present in query. Usage is " + secret.webpage + "/hash/create?link="
      }
      res.status(400).send(result);
    }
});

/**
  * Tries to find the link with the hash entered after /api/hash/find/ and sends out a JSON-object as response. See {@link module:hash}
  * @module express
  * @function GET api/hash/find/*
  */
app.get('/api/hash/find/*', function (req, res) {
    let result = {};
    res.setHeader('Content-Type', 'application/json');

    let foundObject = hash.find(req.params[0]);
    result = foundObject;
    if(result.code == 1) {
      res.send(result);
    }
    else {
      res.status(404).send(result);
    }
});

/**
  * Accepts the file posted and handles it using other modules. See {@link module:file}
  * @module express
  * @function POST api/hash/file/upload
  */
app.post('/api/hash/file/upload', file.upload.single('file'), function (req, res) {
    let createdObject = file.add(req.file);

    res.setHeader('Content-Type', 'application/json');
    res.send(createdObject);
});

/**
  * Tries to find the file with the filename entered after /api/hash/file/ and sends out a JSON-object as response. See {@link module:file}
  * @module express
  * @function GET api/hash/file/*
  */
app.get('/api/hash/file/*', function (req, res) {
    let foundObject = file.find(req.params[0]);

    if(foundObject.code == "1") {
      res.setHeader("Content-Type", foundObject.mimetype);
      res.setHeader("Content-Disposition", (req.query.dl==1?'attachment':'inline') + '; filename="' + foundObject.originalname + '"');
      res.sendFile(__dirname+'/uploads/' + foundObject.filename);
    }
    else {
      res.setHeader('Content-Type', 'application/json');
      res.status(404).send(foundObject);
    }
});

/**
  * Sends the asset files needed for the webpages, all residing in assets folder.
  * @todo This does not send a 404 if the file is not found, instead it sends an error showing the absolute path for this. Kinda bad, I don't want that. Fix it so only approved files can be sent.
  * @module express
  * @function GET assets/*
  */
app.get('/assets/*', function(req, res) {
  res.sendFile(__dirname + req.url);
});

/**
  * Tries to find out what the user was looking for, a link or a file. First looks for a hash and then a file. They shouldn't collide ever.
  * @module express
  * @function GET /*
  */
app.get('/*', function (req, res) {
    let text = req.params[0];

    let hashObject = hash.find(text), fileObject = file.find(text);
    if(hashObject.code == "1") {
      /* Hash hash found a match using the text supplied */
      res.redirect(hashObject.link);
    }
    else if(fileObject.code == "1") {
      /* File hash found a match instead */
      res.setHeader("Content-Type", fileObject.mimetype);
      res.setHeader("Content-Disposition", (req.query.dl==1?'attachment':'inline') + '; filename="' + fileObject.originalname + '"');
      res.sendFile(__dirname+'/uploads/' + fileObject.filename);
    }
    else {
      /* Nothing was found */
      res.status(404).sendFile(__dirname + "/assets/error.html");
    }
});

app.listen(3000, function () {});
