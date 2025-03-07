const analytics = require('../utils/analytics');

const analyticsMiddleware = () => {
    return async (req, res, next) => {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        analytics.trackUsers(ip);

        next();
    };
};

module.exports = analyticsMiddleware;