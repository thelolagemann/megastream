module.exports = function (err, req, res, next) {
    res.status(err.statusCode || 500);
    res.send(JSON.stringify({
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err : {}
    }));
}