/**
 * Rate limiter utility for TMDB API calls
 * Implements token bucket algorithm with batched execution
 * TMDB allows ~40-50 requests per 10 seconds, so we use conservative limits
 */

const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_DELAY_MS = 200; // 200ms between batches = ~25 req/sec max

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process items with rate limiting using batched execution
 * This replaces unbounded Promise.all() calls to prevent 429 errors
 * 
 * @template T, R
 * @param {T[]} items - Array of items to process
 * @param {(item: T, index: number) => Promise<R>} fn - Async function to apply to each item
 * @param {Object} options - Rate limiting options
 * @param {number} [options.batchSize=5] - Number of concurrent requests per batch
 * @param {number} [options.delayMs=200] - Delay between batches in milliseconds
 * @returns {Promise<R[]>} - Array of results in same order as input
 * 
 * @example
 * const results = await rateLimitedMap(movieIds, async (id) => {
 *   return await getMeta('movie', 'en-US', id, config);
 * }, { batchSize: 5, delayMs: 200 });
 */
async function rateLimitedMap(items, fn, options = {}) {
    const { batchSize = DEFAULT_BATCH_SIZE, delayMs = DEFAULT_DELAY_MS } = options;
    
    if (!items || items.length === 0) {
        return [];
    }

    const results = new Array(items.length);
    
    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchStartIndex = i;
        
        // Execute batch concurrently
        const batchPromises = batch.map((item, batchIndex) => {
            const globalIndex = batchStartIndex + batchIndex;
            return fn(item, globalIndex)
                .then(result => {
                    results[globalIndex] = result;
                    return result;
                })
                .catch(error => {
                    // Log error but don't fail the entire batch
                    console.error(`Rate limited operation failed for item at index ${globalIndex}:`, error.message);
                    results[globalIndex] = null;
                    return null;
                });
        });
        
        await Promise.all(batchPromises);
        
        // Delay before next batch (skip delay after last batch)
        if (i + batchSize < items.length) {
            await sleep(delayMs);
        }
    }
    
    return results;
}

/**
 * Process items with rate limiting and filter out null/undefined results
 * Convenience wrapper around rateLimitedMap
 * 
 * @template T, R
 * @param {T[]} items - Array of items to process
 * @param {(item: T, index: number) => Promise<R>} fn - Async function to apply to each item
 * @param {Object} options - Rate limiting options
 * @returns {Promise<R[]>} - Array of non-null results
 */
async function rateLimitedMapFiltered(items, fn, options = {}) {
    const results = await rateLimitedMap(items, fn, options);
    return results.filter(Boolean);
}

/**
 * Execute a single async operation with retry on 429 errors
 * Uses exponential backoff
 * 
 * @template R
 * @param {() => Promise<R>} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.baseDelayMs=1000] - Base delay for exponential backoff
 * @returns {Promise<R>} - Result of the function
 */
async function withRetry(fn, options = {}) {
    const { maxRetries = 3, baseDelayMs = 1000 } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Check if this is a rate limit error (429)
            const is429 = error.response?.status === 429 || 
                          error.status === 429 || 
                          error.message?.includes('429');
            
            if (is429 && attempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s...
                const delayMs = baseDelayMs * Math.pow(2, attempt);
                console.log(`Rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
                await sleep(delayMs);
            } else if (!is429) {
                // Non-rate-limit error, don't retry
                throw error;
            }
        }
    }
    
    throw lastError;
}

module.exports = {
    rateLimitedMap,
    rateLimitedMapFiltered,
    withRetry,
    sleep,
    DEFAULT_BATCH_SIZE,
    DEFAULT_DELAY_MS
};
