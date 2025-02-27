const analytics = require('../utils/analytics');

const analyticsMiddleware = () => {
    return async (req, res, next) => {
        const startTime = Date.now();

        // Capture original end function
        const originalEnd = res.end;
        
        // Override end function
        res.end = function(chunk, encoding, callback) {
            const responseTime = Date.now() - startTime;
            const endpoint = req.path;

            // Track API performance
            analytics.trackAPIPerformance({
                endpoint,
                responseTime,
                status: res.statusCode,
                cacheHit: res.getHeader('X-Cache') === 'HIT'
            });

            // Track specific endpoints
            if (endpoint.includes('/catalog/')) {
                analytics.trackCatalogAccess({
                    type: req.params.type,
                    id: req.params.id,
                    language: req.query.language,
                    responseTime,
                    success: res.statusCode === 200
                });
            }

            if (endpoint.includes('/meta/')) {
                analytics.trackMetadataRequest({
                    type: req.params.type,
                    id: req.params.id,
                    language: req.query.language,
                    responseTime,
                    success: res.statusCode === 200
                });
            }

            // Track errors
            if (res.statusCode >= 400) {
                analytics.trackError({
                    errorType: 'API Error',
                    errorMessage: res.statusMessage,
                    endpoint,
                    stackTrace: res.locals.errorStack
                });
            }

            // Call original end
            originalEnd.apply(res, arguments);
        };

        next();
    };
};

module.exports = analyticsMiddleware; 