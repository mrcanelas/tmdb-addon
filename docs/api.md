# API Documentation

This document describes the API endpoints available in the TMDB Addon.

## Base URL

All URLs referenced in the documentation have the following base:
```
http://your_domain:1337
```

## Authentication

Most endpoints don't require authentication. However, some features might require API keys to be set in the environment variables.

## Endpoints

### Manifest
```http
GET /manifest.json
GET /:catalogChoices/manifest.json
```

Returns the Stremio addon manifest with addon details and available resources.

**Query Parameters (optional):**
- `catalogChoices`: Encoded string with user configurations (language, catalogs, etc.)

#### Response
```json
{
  "id": "tmdb-addon",
  "version": "3.1.7",
  "name": "The Movie Database Addon",
  "description": "Stremio addon that provides rich metadata for movies and TV shows from TMDB...",
  "resources": ["catalog", "meta"],
  "types": ["movie", "series"],
  "idPrefixes": ["tmdb:", "tt"],
  "catalogs": [
    {
      "id": "tmdb.popular",
      "type": "movie",
      "name": "TMDB - Popular",
      "pageSize": 20,
      "extra": [...]
    }
  ],
  "behaviorHints": {
    "configurable": true,
    "configurationRequired": false
  }
}
```

### Catalog
```http
GET /catalog/:type/:id/:extra?.json
GET /:catalogChoices/catalog/:type/:id/:extra?.json
```

Returns a catalog of items based on type and ID.

#### Parameters
- `catalogChoices`: Encoded string with configurations (optional)
- `type`: Content type (`movie` or `series`)
- `id`: Catalog ID (e.g., `tmdb.popular`, `tmdb.trending`, `tmdb.favorites`, `tmdb.watchlist`, `trakt.watchlist`, `trakt.recommendations`, `tmdb.search`, `tmdb.aisearch`)
- `extra`: Additional parameters (optional)
  - `genre`: Genre filter
  - `search`: Search term
  - `skip`: Number of items to skip (pagination)

#### Catalog ID Examples
- `tmdb.popular` - Popular movies/TV shows
- `tmdb.trending` - Trending movies/TV shows
- `tmdb.favorites` - TMDB favorites (requires authentication)
- `tmdb.watchlist` - TMDB watchlist (requires authentication)
- `trakt.watchlist` - Trakt watchlist (requires authentication)
- `trakt.recommendations` - Trakt recommendations (requires authentication)
- `tmdb.search` - Standard search
- `tmdb.aisearch` - AI search (requires Gemini or Groq API key)
- `mdblist.{listId}` - Custom MDBList list

#### Response
```json
{
  "metas": [
    {
      "id": "tmdb:106646",
      "type": "movie",
      "name": "Movie Title",
      "poster": "https://image.tmdb.org/t/p/w500/poster.jpg",
      "background": "https://image.tmdb.org/t/p/w1280/background.jpg",
      "description": "Movie description...",
      "releaseInfo": "2023",
      "director": ["Director Name"],
      "cast": ["Actor 1", "Actor 2"],
      "imdbRating": "8.5",
      "runtime": "120 min"
    }
  ]
}
```

### Meta
```http
GET /meta/:type/:id.json
GET /:catalogChoices/meta/:type/:id.json
```

Returns metadata for a specific item.

#### Parameters
- `catalogChoices`: Encoded string with configurations (optional)
- `type`: Content type (`movie` or `series`)
- `id`: TMDB ID (format: `tmdb:123456`) or IMDb ID (format: `tt1234567`)

#### Response
```json
{
  "meta": {
    "id": "tmdb:106646",
    "type": "movie",
    "name": "Movie Title",
    "poster": "https://image.tmdb.org/t/p/w500/poster.jpg",
    "background": "https://image.tmdb.org/t/p/w1280/background.jpg",
    "logo": "https://image.tmdb.org/t/p/w500/logo.png",
    "description": "Movie description...",
    "releaseInfo": "2023-01-01",
    "runtime": "120 min",
    "year": 2023,
    "director": ["Director Name"],
    "cast": ["Actor 1", "Actor 2"],
    "imdbRating": "8.5",
    "genres": ["Action", "Drama"],
    "videos": [
      {
        "type": "Trailer",
        "name": "Official Trailer",
        "youtube_id": "abc123"
      }
    ],
    "website": "https://example.com"
  }
}
```

**For TV series**, the response also includes:
```json
{
  "meta": {
    ...
    "seasons": [
      {
        "id": "tmdb:106646:1",
        "season": 1,
        "name": "Season 1",
        "poster": "https://image.tmdb.org/t/p/w500/season1.jpg",
        "description": "Season description..."
      }
    ]
  }
}
```

### Configuration
```http
GET /configure
GET /configure/*
```

Returns the addon configuration page (React interface).

### TMDB Authentication
```http
GET /request_token
```

Generates a request token for TMDB OAuth authentication.

#### Response
```json
"request_token_string"
```

```http
GET /session_id?request_token={token}
```

Creates a TMDB session using the request token.

#### Parameters
- `request_token`: Request token obtained previously

#### Response
```json
"session_id_string"
```

### Trakt Authentication
```http
GET /trakt_auth_url
```

Generates Trakt OAuth authentication URL.

#### Response
```json
{
  "authUrl": "https://trakt.tv/oauth/authorize?...",
  "state": "random_state_string"
}
```

```http
GET /trakt_access_token?code={code}
```

Gets Trakt access token after authentication.

#### Parameters
- `code`: Authorization code returned by Trakt

#### Response
```json
{
  "access_token": "token_string",
  "token_type": "bearer",
  "expires_in": 7776000,
  "refresh_token": "refresh_token_string",
  "scope": "public",
  "created_at": 1234567890
}
```

### Proxy Status
```http
GET /api/proxy/status
```

Checks the proxy configuration status.

#### Response
```json
{
  "enabled": true,
  "host": "127.0.0.1",
  "port": 40000,
  "protocol": "socks5",
  "working": true
}
```

### Image Processing
```http
GET /api/image/blur?url={imageUrl}
```

Returns a blurred version of an image (useful for backgrounds).

#### Parameters
- `url`: URL of the image to be processed

#### Response
Blurred JPEG image (Content-Type: image/jpeg)

## Error Responses

The API uses standard HTTP response codes:

- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized (usually when API key is missing or invalid)
- `404`: Not Found
- `500`: Internal Server Error

Error response format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `TMDB_API_KEY_MISSING`: TMDB API key not provided or invalid
- `TRAKT_TOKEN_MISSING`: Trakt access token not provided
- `INVALID_TMDB_ID`: Invalid or not found TMDB ID
- `PROXY_ERROR`: Error connecting through proxy

## Rate Limiting

The API implements rate limiting to prevent abuse. Limits are applied per IP:

- 100 requests per minute per IP
- 1000 requests per hour per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1613937600
```

**Note**: Rate limiting may vary depending on server configuration.

## Caching

The API implements caching for better performance:

- **Manifest**: 12 hours (with stale-while-revalidate of 14 days)
- **Catalog**: 1 day (with stale-while-revalidate of 7 days)
- **Meta (Movies)**: 14 days (with stale-while-revalidate of 20 days)
- **Meta (Series)**: 1 day for ongoing series, 14 days for ended series

Cache headers:
```
Cache-Control: public, max-age=86400, stale-while-revalidate=604800, stale-if-error=1209600
```

**Note**: Cache times can be configured through the `META_TTL` and `CATALOG_TTL` environment variables.

## Examples

### Fetch Popular Movies
```http
GET /catalog/movie/tmdb.popular.json
GET /catalog/movie/tmdb.popular/genre=Action.json
GET /catalog/movie/tmdb.popular/skip=20.json
```

### Fetch Trending TV Shows
```http
GET /catalog/series/tmdb.trending.json
```

### Search with Search Term
```http
GET /catalog/movie/tmdb.search/search=matrix.json
```

### Search with AI
```http
GET /catalog/movie/tmdb.aisearch/search=science%20fiction%20movies.json
```

### Get Movie Details
```http
GET /meta/movie/tmdb:106646.json
GET /meta/movie/tt0816692.json  # Using IMDb ID
```

### Get TV Show Details
```http
GET /meta/series/tmdb:1396.json
```

### Access TMDB Favorites
```http
GET /catalog/movie/tmdb.favorites.json?sessionId={session_id}
```

### Access Trakt Watchlist
```http
GET /catalog/movie/trakt.watchlist.json?traktAccessToken={access_token}
```

### Configure the Addon
```http
GET /configure
```

## Development

For development and testing, you can use the following tools:

1. **Postman Collection**:
   Download our Postman collection for easy API testing.

2. **Development Environment**:
   ```bash
   npm run dev:server
   ```

## Additional Resources

- [Stremio Addon SDK Documentation](https://github.com/Stremio/stremio-addon-sdk)
- [TMDB API Documentation](https://developers.themoviedb.org/3)
- [Fanart.tv API Documentation](https://fanarttv.docs.apiary.io/) 