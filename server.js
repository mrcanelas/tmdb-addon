// require serverless version
const addon = require('./index.js')

// create local server
addon.listen(7505, function () {
    console.log('Addon active on port 7505.');
    console.log('http://127.0.0.1:7505/[language]/manifest.json');
});