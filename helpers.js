const pad = d => (d < 10) ? '0' + d.toString() : d.toString()
const log = (message) => {
  let now = new Date(Date.now());
  process.env.NODE_ENV == 'development' ? console.log(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${message}`) : null;
};
module.exports = { log };