/**
  * A module for handling the hash creation, finding and purging.
  * @todo Decide on if hash length should periodically be decided upon or whenever a new hash is to be created.
  * @module hash
  * @author Victor Davidsson
  * @version 0.5.0
  */

let secret = require("./secret.json");

let hashes = new Map();
let hashLength = 3; /* This would also be set by decideHashLength soon, but at start-up I don't want to run into any problems */
let defaultTtl = 1000 * 60 * 60; /* Default 60 minutes time-to-live */

let category = global.logging.register("hash");

/**
  * Upon generating a hash that isn't taken, inserts an object with link keyed with the hash into the map of hashes
  * @function
  * @access public
  * @param {String} link - The link to be saved.
  * @param {Int} [ttl=3600000] - The time-to-live of the hash in milliseconds.
  * @returns {Object} The success/error code object and the hash object saved combined.
  */
function createHash(link, ttl) {
  let start = new Date();
  if(!ttl) ttl = defaultTtl;

  let success = false, tries = 0, hash = "", codeObj = {}, linkObj = {};
  while(!success) { /* Keep trying until a hash that's not in use is generated */
    tries++;

    hash = Math.random().toString(36).substr(2, hashLength); /* Generate a random number between 0 and 1, convert it to Base 36 and then select the sub-string from index 2 to whatever the hashlength needs to be. Index 2 because it starts with 0. */
    if(!hashInUse(hash)) {
      codeObj = {
        code: "1",
        codetext: "success",
        short: secret.webpage + "/api/find/?hash=" + hash
      }
      linkObj = {
        hash: hash,
        link: link,
        created: new Date(),
        ttl: ttl
      }
      hashes.set(hash, linkObj);
      success = true;
    }
  }

  console.log(category, "time: " + (new Date() - start) + " ms", "tries: " + tries);
  return Object.assign(codeObj, linkObj); /* Object.assign to merge the two objects. I want to return success or error codes, but I don't want to save that in the map */
}

/**
  * Simple get function for checking if the has is in use.
  * @function
  * @access private
  * @param {String} hash - The hash to look for.
  * @returns {Boolean} True if the hash already exists or false if it's available.
  */
function hashInUse(hash) {
  return hashes.has(hash);
}

/**
  * Function for getting the object connected to a hash
  * @todo If the map gets really large I might need to optimize this.
  * @function
  * @access public
  * @param {String} hash - The hash to look for.
  * @returns {Object} The success/error code object and the hash object saved combined.
  */
function findUsingHash(hash) {
  let codeObj = {}, linkObj = hashes.get(hash)
  if(linkObj) {
    codeObj = {
      code: "1",
      codetext: "success"
    }
  }
  else {
    codeObj = {
      code: "0",
      codetext: "error",
      reason: "Nothing associated with that hash."
    }
  }
  return Object.assign(codeObj, linkObj); /* Object.assign should not raise exception if linkObj is undefined */
}

/**
  * Removes all the hashes that have passed their time-to-live, by looping through the entire map.
  * @todo If the map is really large this wont be effective and I would need to optimize this
  * @function
  * @access public
  */
function removeOldHashes() {
  let start = new Date(), deleted = 0, loops = 0;

  for (var [key, value] of hashes) {
    loops++;
    if(value.created + value.ttl < new Date()) {
      hashes.delete(key);
      deleted++;
    }
  }

  console.log(category, "time: " + (new Date() - start) + " ms", "loops: " + loops, "deleted: " + deleted);
}

/**
  * Uses the length of the hashes map to decide on a suitable hash length and sets the private variable hashLength accordingly.
  * @todo Optimize the math calculation? Or check how long it takes to calculcate it. The calculation takes on average 2 ns and out of Date's scope on production NODE_ENV. 
  * @function
  * @access public
  */
function decideHashLength() {
  var defaultHashLength = 2; /* Minimum hash length returned will never be smaller than 3, as hashLimits adds atleast 1 to it. */
  var hashLimits = (hashes.size>=Math.pow(36, defaultHashLength))?Math.log(hashes.size)/Math.log(36):1; // Equation stuff from how 36^hashLimits = hashes.size, should make it so that the length is good enough. /Math.log(36) to convert from base 10 to base 36

  hashLength = defaultHashLength + hashLimits;
}

module.exports = {
  create: createHash,
  find: findUsingHash,
  purge: removeOldHashes,
  calculateHashLength: decideHashLength
}
