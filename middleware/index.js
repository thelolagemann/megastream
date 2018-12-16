/**
 * This file allows app.js to load all
 * middlewares in a one-shot manner
 */

const path = require('path');
const fs = require('fs');

const middlewares = {};

for (let child of fs.readdirSync(__dirname)) {
  if (fs.statSync(path.join(__dirname, child)).isFile() && child !== 'index.js') {
    middlewares[child] = require(`./${child}`);
  }
}

module.exports = middlewares
