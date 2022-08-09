// require serverless version
const addon = require('./index.js')
var os = require("os");
var hostname = os.hostname();

// create local server
addon.listen(process.env.PORT || 7000, function () {
    console.log('Addon active on port 7000.');
    console.log('http://127.0.0.1:7000/[language]/manifest.json');
    console.log(hostname)
});