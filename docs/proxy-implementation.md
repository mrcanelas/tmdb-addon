# Proxy Implementation - Technical Documentation

This document explains the technical implementation of the proxy system in TMDB Addon.

## Architecture

### Main Components

1. **`addon/utils/httpClient.js`** - Custom HTTP client with proxy support
2. **`addon/utils/tmdbClient.js`** - MovieDb wrapper with proxy integration
3. **Environment variable configuration** - Flexible proxy control

### Request Flow

```
Request → httpClient.js → Check domain → Proxy (if TMDB) → Response
```

## Detailed Implementation

### 1. Custom HTTP Client (`httpClient.js`)

```javascript
// Configuration based on environment variables
const PROXY_CONFIG = {
  enabled: process.env.TMDB_PROXY_ENABLED === 'true',
  host: process.env.TMDB_PROXY_HOST || '127.0.0.1',
  port: process.env.TMDB_PROXY_PORT || 1080,
  protocol: process.env.TMDB_PROXY_PROTOCOL || 'http'
};

// Domain verification
function shouldUseProxy(url) {
  const TMDB_DOMAINS = ['api.themoviedb.org', 'image.tmdb.org', 'www.themoviedb.org'];
  const urlObj = new URL(url);
  return TMDB_DOMAINS.some(domain => urlObj.hostname.includes(domain));
}
```

### 2. MovieDb Wrapper (`tmdbClient.js`)

```javascript
class TMDBClient extends MovieDb {
  constructor(apiKey) {
    super(apiKey);
    
    // Replace default request method
    this._request = async (url, options = {}) => {
      const instance = createAxiosInstance(url);
      return instance.request({ url, ...options });
    };
  }
}
```

### 3. Module Integration

All modules that make requests to TMDB have been updated to use `TMDBClient`:

- `getTmdb.js`
- `getMeta.js`
- `getSearch.js`
- `getCatalog.js`
- `getTrending.js`
- `getPersonalLists.js`
- `getLogo.js`
- `getLanguages.js`
- `getGenreList.js`
- `getEpisodes.js`
- `getSession.js`

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TMDB_PROXY_ENABLED` | `false` | Enable/disable proxy |
| `TMDB_PROXY_HOST` | `127.0.0.1` | Proxy host |
| `TMDB_PROXY_PORT` | `1080` | Proxy port |
| `TMDB_PROXY_PROTOCOL` | `http` | Protocol (http, https, socks4, socks5) |
| `TMDB_PROXY_AUTH` | `false` | Enable authentication |
| `TMDB_PROXY_USERNAME` | - | Proxy username |
| `TMDB_PROXY_PASSWORD` | - | Proxy password |

### Configuration Examples

#### HTTP Proxy
```bash
TMDB_PROXY_ENABLED=true
TMDB_PROXY_HOST=proxy.example.com
TMDB_PROXY_PORT=8080
TMDB_PROXY_PROTOCOL=http
```

#### SOCKS5 Proxy (Cloudflare WARP)
```bash
TMDB_PROXY_ENABLED=true
TMDB_PROXY_HOST=127.0.0.1
TMDB_PROXY_PORT=40000
TMDB_PROXY_PROTOCOL=socks5
```

#### Proxy with Authentication
```bash
TMDB_PROXY_ENABLED=true
TMDB_PROXY_HOST=proxy.example.com
TMDB_PROXY_PORT=8080
TMDB_PROXY_PROTOCOL=http
TMDB_PROXY_AUTH=true
TMDB_PROXY_USERNAME=user
TMDB_PROXY_PASSWORD=pass
```

## Monitoring APIs

### Proxy Status

```
GET /api/proxy/status
```

Response:
```json
{
  "enabled": true,
  "host": "127.0.0.1",
  "port": 40000,
  "protocol": "socks5",
  "working": true
}
```

## Logs and Debugging

### Automatic Logs

The system automatically logs when using proxy:

```
Usando proxy para: https://api.themoviedb.org/3/configuration
```

### Manual Testing

```bash
# Test configuration
npm run test:proxy

# Test endpoint
curl http://localhost:1337/api/proxy/status
```

## Security

### Considerations

1. **Isolation**: Only TMDB requests use proxy
2. **Credentials**: Stored only in environment variables
3. **Logs**: Do not log sensitive credentials
4. **Timeout**: Configured timeout to prevent hanging

### Recommendations

- Use trusted proxies (Cloudflare WARP, etc.)
- Monitor logs for issues
- Test connectivity regularly
- Use HTTPS when possible

## Performance

### Optimizations

1. **Cache**: Addon maintains cache to reduce requests
2. **Timeout**: Configured timeout to prevent hanging
3. **Selective**: Only TMDB uses proxy, other requests are direct

### Monitoring

- Use `/api/proxy/status` to verify operation
- Monitor logs for latency
- Configure appropriate timeouts

## Troubleshooting

### Common Issues

1. **Proxy not connecting**
   - Check if proxy is running
   - Test with `curl --proxy`
   - Verify configurations

2. **Timeout**
   - Increase timeout in configurations
   - Use closer proxy
   - Check bandwidth

3. **Authentication error**
   - Verify credentials
   - Ensure `TMDB_PROXY_AUTH=true`
   - Test authentication independently

### Debugging

```bash
# Test proxy independently
curl --proxy socks5://127.0.0.1:40000 https://api.themoviedb.org/3/configuration

# Check addon logs
docker logs tmdb-addon

# Test configuration
npm run test:proxy
```

## Extensibility

### Adding New Domains

To add new domains that should use proxy:

```javascript
// In httpClient.js
const TMDB_DOMAINS = [
  'api.themoviedb.org',
  'image.tmdb.org',
  'www.themoviedb.org',
  'new-domain.com'  // Add here
];
```

### Support for New Protocols

The system uses axios, which automatically supports HTTP, HTTPS, SOCKS4 and SOCKS5.

## References

- [Axios Proxy Documentation](https://axios-http.com/docs/req_config)
- [Cloudflare WARP](https://developers.cloudflare.com/warp-client/)
- [AIOStreams Implementation](https://github.com/Viren070/AIOStreams/blob/3a53e3575672a299c98e297b31d6f9bc692b7e6b/packages/core/src/utils/http.ts#L96-L122) 