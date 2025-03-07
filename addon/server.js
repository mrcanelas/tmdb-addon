const addon = require('./index.js')
const PORT = process.env.PORT || 1337;

addon.listen(PORT, function () {
  console.log(`Addon active on port ${PORT}.`);
  console.log(`http://127.0.0.1:${PORT}/`);
});