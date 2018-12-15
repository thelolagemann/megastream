const createError = (statusCode, message) => {
  let err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const log = (message) => {
  process.env.NODE_ENV == 'development' ? console.log(message) : null;
};

module.exports = { createError, log };