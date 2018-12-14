const log = (message) => {
  process.env.NODE_ENV == 'development' ? console.log(message) : null;
};

module.exports = { log };