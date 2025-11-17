# Self-Hosting Guide

This guide provides instructions for self-hosting the TMDB Addon for Stremio.

## Table of Contents
- [Self-Hosting Guide](#self-hosting-guide)
  - [Table of Contents](#table-of-contents)
  - [Docker Installation (Recommended)](#docker-installation-recommended)
    - [Using Docker Compose](#using-docker-compose)
  - [Manual Installation](#manual-installation)
  - [Environment Variables](#environment-variables)
  - [Getting API Keys](#getting-api-keys)
    - [TMDB API](#tmdb-api)
    - [Fanart.tv API](#fanarttv-api)
    - [MongoDB](#mongodb)
  - [Verifying Installation](#verifying-installation)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)

## Docker Installation (Recommended)

The easiest way to run this addon is using Docker. The image is available on Docker Hub.

```bash
docker run -d \
  --name tmdb-addon \
  -p 1337:1337 \
  -e MONGODB_URI=your_mongodb_uri \
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
      - MONGODB_URI=your_mongodb_uri
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
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

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

# Proxy Configuration (Optional)
TMDB_PROXY_ENABLED=false
TMDB_PROXY_HOST=127.0.0.1
TMDB_PROXY_PORT=1080
TMDB_PROXY_PROTOCOL=http
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

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection URI | Yes |
| `FANART_API` | Fanart.tv API key | Yes |
| `TMDB_API` | TMDB API key | Yes |
| `HOST_NAME` | Public URL of your addon (e.g., http://your_domain:1337) | Yes |
| `PORT` | Server port (default: 1337) | No |
| `TRAKT_CLIENT_ID` | Trakt OAuth Client ID (for Trakt integration) | No |
| `TRAKT_CLIENT_SECRET` | Trakt OAuth Client Secret (for Trakt integration) | No |
| `TRAKT_REDIRECT_URI` | Trakt OAuth Redirect URI (auto-detected if not set) | No |
| `TMDB_PROXY_ENABLED` | Enable proxy for TMDB requests (default: false) | No |
| `TMDB_PROXY_HOST` | Proxy host (default: 127.0.0.1) | No |
| `TMDB_PROXY_PORT` | Proxy port (default: 1080) | No |
| `TMDB_PROXY_PROTOCOL` | Proxy protocol: http, https, or socks5 (default: http) | No |

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

### MongoDB
1. Create an account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Set up a free cluster
3. Get your connection string
4. Replace `<password>` in the connection string with your database user password

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

1. **Cannot connect to MongoDB**
   - Verify your MongoDB URI is correct
   - Ensure your IP is whitelisted in MongoDB Atlas
   - Check if the database user has correct permissions

2. **API Keys not working**
   - Verify the keys are correctly copied
   - Check if the API services are operational
   - Ensure you're using the correct API key type

3. **Addon not accessible**
   - Verify the port 1337 is open on your firewall
   - Check if the HOST_NAME variable matches your actual domain
   - Ensure your domain/IP is accessible from the internet

For additional help, please open an issue on GitHub.