const addon = require('./index.js')
const PORT = process.env.PORT
const analyticsMiddleware = require('./middleware/analytics.middleware');
const analytics = require('./utils/analytics');

addon.listen(PORT, function () {
  console.log(`Addon active on port ${PORT}.`);
  console.log(`http://127.0.0.1:${PORT}/`);
});

addon.use(analyticsMiddleware());

addon.get('/configure', (req, res, next) => {
    analytics.trackInstall({
        language: req.query.language || 'en',
        catalogs: req.query.catalogs ? req.query.catalogs.split(',') : [],
        integrations: req.query.integrations ? req.query.integrations.split(',') : []
    });
    next();
});