# Self-Hosting Guide

This guide provides instructions for self-hosting the TMDB Addon for Stremio.

## Table of Contents
- [Self-Hosting Guide](#self-hosting-guide)
  - [Table of Contents](#table-of-contents)
  - [Important Note: MongoDB Deprecation](#important-note-mongodb-deprecation)
  - [Vercel Deployment (Easiest)](#vercel-deployment-easiest)
  - [Docker Installation (Recommended)](#docker-installation-recommended)
    - [Using Docker Compose](#using-docker-compose)
  - [Manual Installation](#manual-installation)
  - [Environment Variables](#environment-variables)
  - [Getting API Keys](#getting-api-keys)
    - [TMDB API](#tmdb-api)
    - [Fanart.tv API](#fanarttv-api)
    - [Redis (Optional)](#redis-optional)
  - [Verifying Installation](#verifying-installation)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)

## Important Note: MongoDB Deprecation

**Starting from version 3.1.6**, MongoDB is no longer required for the addon to function. The caching system has been migrated from MongoDB to a more flexible solution:

- **Default**: In-memory caching (no external dependencies)
- **Optional**: Redis for distributed caching (recommended for production)

If you're upgrading from v3.1.5 or earlier, you can safely remove the `MONGODB_URI` environment variable. The addon will work with in-memory caching by default. For production deployments, consider using Redis for better performance and scalability.

For more details, see [issue #1215](https://github.com/mrcanelas/tmdb-addon/issues/1215).

## Vercel Deployment (Easiest)

Vercel is the easiest way to deploy this addon. It provides:
- **Free hosting** with generous limits
- **Automatic HTTPS** and CDN
- **Zero configuration** - the `vercel.json` file is already set up
- **Automatic deployments** on every push to your repository

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mrcanelas/tmdb-addon&env=TMDB_API&env=FANART_API&env=HOST_NAME)

1. Click the button above to deploy to Vercel
2. Sign in to Vercel (or create a free account)
3. Import the repository
4. Configure environment variables (see below)
5. Click **Deploy**

### Manual Vercel Setup

If you prefer to set up manually:

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Follow the prompts** and configure your project

### Environment Variables for Vercel

After deploying, configure these environment variables in your Vercel project settings:

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TMDB_API` | TMDB API key | `your_tmdb_api_key` |
| `FANART_API` | Fanart.tv API key | `your_fanart_api_key` |
| `HOST_NAME` | Your Vercel deployment URL | `https://your-project.vercel.app` |

> **Note**: `HOST_NAME` will be automatically set by Vercel, but you can override it if needed.

#### Optional Variables

Configure these if you want to use additional features:

- `TRAKT_CLIENT_ID` - For Trakt integration
- `TRAKT_CLIENT_SECRET` - For Trakt integration
- `REDIS_URL` - For distributed caching (recommended for production)
- `GEMINI_API_KEY` - For AI search with Gemini
- `GROQ_API_KEY` - For AI search with Groq
- `MDBLIST_API_KEY` - For MDBList integration
- `RPDB_API_KEY` - For RPDB integration
- `TMDB_PROXY_ENABLED` - Enable proxy for TMDB requests
- `TMDB_PROXY_HOST` - Proxy host
- `TMDB_PROXY_PORT` - Proxy port
- `TMDB_PROXY_PROTOCOL` - Proxy protocol (http, https, socks5)

### Setting Environment Variables in Vercel

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on **Settings**
3. Go to **Environment Variables**
4. Add each variable with its value
5. Select the environments (Production, Preview, Development)
6. Click **Save**

### Vercel Configuration

The project includes a `vercel.json` file that configures:
- Build settings for the frontend (React/Vite)
- Serverless functions for the backend (Express)
- Routing rules for all endpoints

No additional configuration is needed - Vercel will automatically detect and use this file.

### Vercel Limitations

**Free Tier Limits:**
- 100GB bandwidth per month
- Serverless function execution time: 10 seconds (Hobby plan)
- 100 serverless function invocations per day (Hobby plan)

**For Production:**
- Consider upgrading to Vercel Pro for higher limits
- Use Redis for caching to reduce API calls
- Monitor your usage in the Vercel dashboard

### Updating Your Deployment

Vercel automatically deploys on every push to your repository. You can also:

1. **Manual deploy** via Vercel Dashboard
2. **Redeploy** via CLI:
   ```bash
   vercel --prod
   ```

### Custom Domain

To use a custom domain:

1. Go to your project **Settings** > **Domains**
2. Add your domain
3. Follow the DNS configuration instructions
4. Update `HOST_NAME` environment variable with your custom domain

## Docker Installation (Recommended)

The easiest way to run this addon is using Docker. The image is available on Docker Hub.

```bash
docker run -d \
  --name tmdb-addon \
  -p 1337:1337 \
  -e FANART_API=your_fanart_key \
  -e TMDB_API=your_tmdb_key \
  -e HOST_NAME=http://your_domain:1337 \
  -e TRAKT_CLIENT_ID=your_trakt_client_id \
  -e TRAKT_CLIENT_SECRET=your_trakt_client_secret \
  mrcanelas/tmdb-addon:latest
```

### Using Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3'
services:
  tmdb-addon:
    image: mrcanelas/tmdb-addon:latest
    container_name: tmdb-addon
    ports:
      - "1337:1337"
    environment:
      - FANART_API=your_fanart_key
      - TMDB_API=your_tmdb_key
      - HOST_NAME=http://your_domain:1337
      - TRAKT_CLIENT_ID=your_trakt_client_id
      - TRAKT_CLIENT_SECRET=your_trakt_client_secret
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d
```

## Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/mrcanelas/tmdb-addon.git
cd tmdb-addon
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Create a `.env` file in the root directory
   - Fill in the required variables (see example below)

Example `.env` file:
```env
# TMDB API Configuration
TMDB_API=your_tmdb_api_key_here

# Fanart.tv API Configuration
FANART_API=your_fanart_api_key_here

# Server Configuration
HOST_NAME=http://localhost:1337
PORT=1337

# Trakt OAuth Configuration (Optional)
TRAKT_CLIENT_ID=your_trakt_client_id_here
TRAKT_CLIENT_SECRET=your_trakt_client_secret_here

# Redis Cache Configuration (Optional - recommended for production)
REDIS_URL=redis://localhost:6379

# AI Search Integrations (Optional)
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# MDBList Integration (Optional)
MDBLIST_API_KEY=your_mdblist_api_key_here

# RPDB Integration (Optional)
RPDB_API_KEY=your_rpdb_api_key_here

# Proxy Configuration (Optional)
TMDB_PROXY_ENABLED=false
TMDB_PROXY_HOST=127.0.0.1
TMDB_PROXY_PORT=1080
TMDB_PROXY_PROTOCOL=http
TMDB_PROXY_AUTH=false
TMDB_PROXY_USERNAME=
TMDB_PROXY_PASSWORD=

# Cache Configuration (Optional)
META_TTL=604800  # 7 days in seconds
CATALOG_TTL=86400  # 1 day in seconds
NO_CACHE=false

# Analytics (Optional)
METRICS_USER=admin
METRICS_PASSWORD=your_password_here

# GitHub Integration (Optional - for season checking)
GITHUB_TOKEN=your_github_token_here
GITHUB_REPO=mrcanelas/tmdb-addon
```

4. Build the project:
```bash
npm run build
```

5. Start the server:
```bash
node addon/server.js
```

## Environment Variables

### Required Variables

| Variable | Description |
|----------|-------------|
| `TMDB_API` | TMDB API key |
| `FANART_API` | Fanart.tv API key |
| `HOST_NAME` | Public URL of your addon (e.g., http://your_domain:1337) |

### Optional Variables - Server

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 1337 |

### Optional Variables - Integrations

| Variable | Description |
|----------|-------------|
| `TRAKT_CLIENT_ID` | Trakt OAuth Client ID (for Trakt integration) |
| `TRAKT_CLIENT_SECRET` | Trakt OAuth Client Secret (for Trakt integration) |
| `TRAKT_REDIRECT_URI` | Trakt OAuth Redirect URI (auto-detected if not set) |
| `GEMINI_API_KEY` | Google Gemini API key (for AI search) |
| `GROQ_API_KEY` | Groq API key (for AI search) |
| `MDBLIST_API_KEY` | MDBList API key |
| `RPDB_API_KEY` | RPDB API key |

### Optional Variables - Cache

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis URL for distributed cache | - |
| `META_TTL` | Metadata cache TTL in seconds | 604800 (7 days) |
| `CATALOG_TTL` | Catalog cache TTL in seconds | 86400 (1 day) |
| `NO_CACHE` | Disable cache completely | false |

**Cache Behavior:**
- If `REDIS_URL` is not set, the addon uses in-memory caching (default)
- If `REDIS_URL` is set, the addon uses Redis for distributed caching
- If `NO_CACHE=true`, caching is completely disabled

### Optional Variables - Proxy

| Variable | Description | Default |
|----------|-------------|---------|
| `TMDB_PROXY_ENABLED` | Enable proxy for TMDB requests | false |
| `TMDB_PROXY_HOST` | Proxy host | 127.0.0.1 |
| `TMDB_PROXY_PORT` | Proxy port | 1080 |
| `TMDB_PROXY_PROTOCOL` | Proxy protocol: http, https, or socks5 | http |
| `TMDB_PROXY_AUTH` | Enable proxy authentication | false |
| `TMDB_PROXY_USERNAME` | Proxy username | - |
| `TMDB_PROXY_PASSWORD` | Proxy password | - |

### Optional Variables - Other

| Variable | Description |
|----------|-------------|
| `METRICS_USER` | Username for metrics access |
| `METRICS_PASSWORD` | Password for metrics access |
| `GITHUB_TOKEN` | GitHub token (for season checking) |
| `GITHUB_REPO` | GitHub repository (format: owner/repo) |

## Getting API Keys

### TMDB API
1. Visit [TMDB Developer](https://www.themoviedb.org/settings/api)
2. Create an account if you don't have one
3. Request an API key
4. Use the API Read Access Token (v4 auth)

### Fanart.tv API
1. Visit [Fanart.tv API](https://fanart.tv/get-an-api-key/)
2. Register for an account
3. Request a personal API key

### Redis (Optional)
For production deployments, Redis is recommended for distributed caching:

1. **Local Redis**: Install Redis locally or use Docker:
   ```bash
   docker run -d --name redis -p 6379:6379 redis:alpine
   ```

2. **Cloud Redis**: Use a managed Redis service:
   - [Upstash](https://upstash.com/) - Free tier available
   - [Redis Cloud](https://redis.com/try-free/) - Free tier available
   - [AWS ElastiCache](https://aws.amazon.com/elasticache/)
   - [Google Cloud Memorystore](https://cloud.google.com/memorystore)

3. Set the `REDIS_URL` environment variable:
   ```env
   REDIS_URL=redis://localhost:6379
   # or for cloud services:
   REDIS_URL=rediss://default:password@host:6379
   ```

### Google Gemini API (Optional)
To enable AI search using Gemini:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an account or sign in
3. Generate a new API key
4. Add the key as `GEMINI_API_KEY` in environment variables

### Groq API (Optional)
To enable AI search using Groq:
1. Visit [Groq Console](https://console.groq.com/)
2. Create an account or sign in
3. Generate a new API key
4. Add the key as `GROQ_API_KEY` in environment variables

### MDBList API (Optional)
To enable MDBList integration:
1. Visit [MDBList](https://mdblist.com/)
2. Create an account or sign in
3. Go to Settings > API
4. Generate a new API key
5. Add the key as `MDBLIST_API_KEY` in environment variables

### RPDB API (Optional)
To enable RPDB integration:
1. Visit [Rating Poster Database](https://ratingposterdb.com/)
2. Create an account or sign in
3. Get your API key
4. Add the key as `RPDB_API_KEY` in environment variables

### Trakt OAuth (Optional)
To enable Trakt integration (watchlist and recommendations sync):

1. Visit [Trakt OAuth Applications](https://trakt.tv/oauth/applications)
2. Click "New Application"
3. Fill in the application details:
   - **Name**: Your application name (e.g., "TMDB Addon")
   - **Description**: Brief description of your application
   - **Redirect URI**: Add all your instance URLs, one per line:
     ```
     https://your-instance1.com/configure
     https://your-instance2.com/configure
     http://localhost:1337/configure
     ```
     > **Note**: The redirect URI is automatically detected from the request host. You only need to add all possible URLs where your addon will be hosted.
4. Click "Save Application"
5. Copy the **Client ID** and **Client Secret**
6. Add them to your environment variables:
   ```env
   TRAKT_CLIENT_ID=your_client_id
   TRAKT_CLIENT_SECRET=your_client_secret
   ```

> **Important**: If you're hosting multiple instances, add all redirect URIs (one per line) in the Trakt OAuth application settings. The code will automatically detect which instance is being used.

## Verifying Installation

After installation, verify that the addon is working by accessing:
- `http://your_domain:1337/manifest.json`
- `http://your_domain:1337/configure`

To add the addon to Stremio, use the URL:
`stremio://your_domain:1337/manifest.json`

## Troubleshooting

### Common Issues

1. **API Keys not working**
   - Verify the keys are correctly copied
   - Check if the API services are operational
   - Ensure you're using the correct API key type

2. **Addon not accessible**
   - Verify the port 1337 is open on your firewall
   - Check if the HOST_NAME variable matches your actual domain
   - Ensure your domain/IP is accessible from the internet

3. **Cache not working**
   - If using Redis, verify the REDIS_URL is correct
   - Check Redis connection: `redis-cli ping` (should return PONG)
   - For in-memory cache, no additional setup is needed

4. **Performance issues**
   - Consider using Redis for distributed caching in production
   - Adjust cache TTL values (META_TTL, CATALOG_TTL) if needed
   - Check if NO_CACHE is set to false

For additional help, please open an issue on [GitHub](https://github.com/mrcanelas/tmdb-addon/issues).
