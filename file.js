/**
  * A module for handling the multipart form-data, saving files to a folder, and finding files
  * @todo Fix purge functions, make functions more reliable and add comments to all functions. Remove fs.accessSync from findFile function and make it non-blocking
  * @module file
  * @author Victor Davidsson
  * @version 0.5.0
  */

/* File management stuff, fs for filesystem and multer for handling multipart in form-data */
let fs = require('fs');
let multer = require('multer'), upload = multer({dest: 'uploads/'});

let secret = require("./secret.json");

let files = new Map();
let defaultTtl = 1000 * 60 * 60; /* Default 60 minutes time-to-live */

let category = global.logging.register("file");

/**
  * As Multer handles the actual saving the file to the folder, this function just adds the file details to a map to keep track of it.
  * @function
  * @access public
  * @param {Object} file - The file that is going to be saved.
  * @param {Int} [ttl=3600000] - The time-to-live of the file in milliseconds.
  * @returns {Object} The success/error code object and the file object saved combined.
  */
function addFile(file, ttl) {
  if(!ttl) ttl = defaultTtl;

  let fileObj = {
    created: new Date(),
    ttl: ttl,
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype
  }
  files.set(fileObj.filename, fileObj);
  let codeObj = {
    code: "1",
    codetext: "success",
    short: secret.webpage + "/api/file/" + file.filename + "?dl=0"
  }

  return Object.assign(codeObj, fileObj);
}

/**
  * Tries to find the file in the map, and if found checks if it exists in the folder.
  * @function
  * @access public
  * @param {String} filename- The filename of the file to search for.
  * @returns {Object} The success/error code object and the file object saved combined
  */
function findFile(filename) {
  let fileObj = {}, codeObj = {};

  if(files.has(filename)) {
    try {
      fs.accessSync(__dirname + '/uploads/' + filename, fs.constants.R_OK | fs.constants.W_OK);
      codeObj = {
        code: "1",
        codetext: "success"
      }
      fileObj = files.get(filename);
    }
    catch (err) {
      codeObj = {
        code: "0",
        codetext: "error",
        reason: "The file could not be found on the disk storage, but there is a reference to it."
      }
    }
  }
  else {
    codeObj = {
      code: "0",
      codetext: "error",
      reason: "There is no reference to the file at all."
    }
  }
  return Object.assign(codeObj, fileObj); /* Here fileObj might be undefined, but that's not a problem for Object.assign */
}

/**
  * Removes the files from the map and folder if their time-to-live has passed.
  * @function
  * @access public
  */
function purgeFiles() {
  let start = new Date(), deleted = 0, loops = 0;

  for (var [key, value] of files) {
    loops++;
    if(value.created + value.ttl < new Date()) {
      files.delete(key);
      fs.unlink(__dirname + "/uploads/" + value.filename, (err) => {
        if (err) {
          console.error(category, err);
          throw err;
        }
      });
      deleted++;
    }
  }
  console.log(category, "time: " + (new Date() - start) + " ms", "loops: " + loops, "deleted: " + deleted);
}

module.exports = {
  add: addFile,
  find: findFile,
  purge: purgeFiles,
  upload: upload
}
