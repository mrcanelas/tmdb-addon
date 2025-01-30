// require serverless version
const addon = require('./index.js')
const PORT = process.env.PORT || 7000

// create local server
addon.listen(PORT, function () {
  console.log(`Addon active on port ${PORT}.`);
  console.log(`http://127.0.0.1:${PORT}/`);
});