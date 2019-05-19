/**
  * A module for attaching my own logging functions to the console functions. It acts as a intermediary to add some useful information like date, time and some other useful stuff.
  * @todo Fix so that arguments are printed prettier and try to find a way for the functions to find caller. Move from using console logging to just regular file output, buffer logging output? Console logging blocks a tiny bit.
  * @module log
  * @author Victor Davidsson
  * @version 0.0.5
  */

let fs = require("fs");

let categories = [];

["log", "warn", "error"].forEach(function(type) {
    var oldMethod = console[type].bind(console);
    console[type] = function() {
        let cat;
        if(categories.indexOf(arguments[0])) {
          cat = arguments[0];
          delete arguments[0];
        }
        let logArray = [].concat(getLogString(type, cat), arguments);
        oldMethod.apply(
            console,
            logArray
        );
        writeLogFile(logArray);
    };
});

/**
  * Adds some useful info to be used while logging.
  * @function
  * @access private
  * @param {String} type - The type of the logging, currently this is based on what console functions is called (log, warn and error)
  * @param {String=} cat - The category of the logging. Doesn't have to be defined, still prints pretty if so.
  * @returns {String} The entire string with date and time, type and maybe category. Each is denoted by a |
  */
function getLogString(type, cat) {
  return (new Date().toLocaleString("sv-SE") + " | " + type.toUpperCase() + "\t|") + ((cat)? " " + cat + "\t|":"");
}

/**
  * A function for registering a category so that the logging function know to omit it as an argument and just have it in the category spot.
  * @function
  * @access public
  * @param {String} cat - The category to be registered
  * @returns {String} The category that was registered or already was registered.
  */
function registerCategory(cat) {
  if(!categories.indexOf(cat)) {
    categories.push(cat);
  }
  return cat;
}

/**
  * A function for writing the same console output to a logfile.
  * @function
  * @access private
  * @param {Array} logArray - The array containing everything to be logged.
  */
function writeLogFile(logArray) {
  let stringArray = logArray[0];
  let argsArray = [...logArray[1]];
  fs.appendFile('log.txt', stringArray + " " + argsArray + "\r\n", (err) => {
    if (err) throw err;
  });
}

module.exports = {
  register: registerCategory
}
