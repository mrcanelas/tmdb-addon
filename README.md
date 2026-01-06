# TMDB Addon for Stremio

![TMDB](https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg)

> A powerful Stremio addon that enhances your streaming experience with TMDB metadata

[![Version](https://img.shields.io/badge/version-3.1.7-blue.svg)](https://github.com/mrcanelas/tmdb-addon)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

## 🌟 Features

- **Multi-language Support**: Get metadata in your preferred language (200+ languages supported)
- **Extended Catalog**: Access titles not available in Stremio's default catalog
- **Rich Metadata**: High-quality posters, backgrounds, and detailed information
- **TMDB Integration**: Connect with your TMDB account for personalized experience
- **Modern UI**: Beautiful and intuitive configuration interface
- **IMDb Support**: Full compatibility with IMDb-based addons
- **Proxy Support**: Optional proxy configuration to bypass regional blocks (e.g., India)
- **AI-Powered Search**: Enhanced search with AI (Gemini and Groq)
- **Multiple Integrations**: Support for Trakt, MDBList, RPDB, and more

## 🔌 Available Integrations

### 🎬 TMDB Lists
Sync your TMDB lists (favorites and watchlist) to discover new movies and TV shows.

### 📊 Rating Poster Database (RPDB)
Add ratings and scores to your movies and TV shows posters.

### 📺 Streaming Catalogs
Set up your streaming services to see content availability. Based on [rleroi/Stremio-Streaming-Catalogs-Addon](https://github.com/rleroi/Stremio-Streaming-Catalogs-Addon).

### 📋 MDBList
Integrate your MDBList lists to expand your content library.

### 🤖 Gemini AI Search
Improve your searches using Google Gemini's artificial intelligence.

### ⚡ Groq AI Search
Ultra-fast AI search using Groq (Llama 3).

### 📈 Trakt
Track what you watch and sync your progress with Trakt.tv.

## 🌐 Proxy Support

This addon supports optional proxy configuration to bypass regional blocks where TMDB is blocked (such as in India). The proxy is only used for TMDB API calls, keeping all other requests direct.

### Quick Proxy Setup

```bash
# Enable proxy
TMDB_PROXY_ENABLED=true
TMDB_PROXY_HOST=127.0.0.1
TMDB_PROXY_PORT=40000
TMDB_PROXY_PROTOCOL=socks5
```

For more details, see the [Proxy Documentation](docs/proxy-implementation.md).

## 📥 Installation

### Quick Install

1. Visit the [TMDB Addon Configuration Page](https://94c8cb9f702d-tmdb-addon.baby-beamup.club/)
2. Configure your preferences
3. Click "Install"
4. Approve the installation in Stremio

### Manual Installation in Stremio

1. Open Stremio
2. Go to **Addons**
3. Scroll to the bottom and click **+**
4. Paste the manifest URL: `https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json`
5. Click **Add**

## ⚙️ Configuration

### Language Settings
Choose any language supported by TMDB for your metadata. 200+ languages available!

### Catalog Options
Customize which catalogs appear on your Stremio:

**Movies:**
- Popular
- By Year
- By Language
- Trending
- Search
- AI Search

**TV Shows:**
- Popular
- By Year
- By Language
- Trending
- Search
- AI Search

### Integration Features

- **TMDB Account Connection**: Sync your TMDB favorites and watchlist
- **Trakt Integration**: Sync your Trakt watchlist and get personalized recommendations
- **Watchlist Sync**: Keep your watchlists synchronized across platforms
- **Rating Posters Support**: Display ratings on posters (RPDB integration)
- **Custom Lists**: Import custom lists from MDBList
- **Streaming Catalogs**: See which streaming services have the content available
- **AI Search**: Use AI to improve your searches (Gemini or Groq)

## 🛠️ Self-Hosting

For detailed instructions on hosting your own instance, check our [Self-Hosting Guide](docs/self-hosting.md).

### Deploy to Vercel (One-Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mrcanelas/tmdb-addon&env=TMDB_API&env=FANART_API&env=HOST_NAME)

The easiest way to deploy this addon is using Vercel's one-click deploy. After clicking the button above:

1. **Import the repository** to your Vercel account
2. **Configure environment variables** (see below)
3. **Deploy** - Vercel will automatically build and deploy your addon

**Required Environment Variables for Vercel:**
- `TMDB_API` - Your TMDB API key
- `FANART_API` - Your Fanart.tv API key
- `HOST_NAME` - Your Vercel deployment URL (will be set automatically, but you can override it)

**Optional Environment Variables:**
- `TRAKT_CLIENT_ID` - For Trakt integration
- `TRAKT_CLIENT_SECRET` - For Trakt integration
- `REDIS_URL` - For distributed caching (recommended for production)
- `GEMINI_API_KEY` - For AI search
- `GROQ_API_KEY` - For AI search
- `MDBLIST_API_KEY` - For MDBList integration
- `RPDB_API_KEY` - For RPDB integration

> **Note**: The `vercel.json` file is already configured. Vercel will automatically detect it and use the correct build settings.

### Quick Start with Docker
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

### Docker with Proxy Support
```bash
docker run -d \
  --name tmdb-addon \
  -p 1337:1337 \
  -e TMDB_API=your_tmdb_key \
  -e TMDB_PROXY_ENABLED=true \
  -e TMDB_PROXY_HOST=127.0.0.1 \
  -e TMDB_PROXY_PORT=40000 \
  -e TMDB_PROXY_PROTOCOL=socks5 \
  mrcanelas/tmdb-addon:latest
```

For complete proxy setup with Cloudflare WARP, see [docker-compose.proxy.yml](docker-compose.proxy.yml).

### Environment Variables

#### Required Variables

| Variable | Description |
|----------|-------------|
| `TMDB_API` | TMDB API key |
| `FANART_API` | Fanart.tv API key |
| `HOST_NAME` | Public URL of your addon (e.g., http://your_domain:1337) |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 1337 |
| `TRAKT_CLIENT_ID` | Trakt OAuth Client ID | - |
| `TRAKT_CLIENT_SECRET` | Trakt OAuth Client Secret | - |
| `TMDB_PROXY_ENABLED` | Enable proxy for TMDB requests | false |
| `TMDB_PROXY_HOST` | Proxy host | 127.0.0.1 |
| `TMDB_PROXY_PORT` | Proxy port | 1080 |
| `TMDB_PROXY_PROTOCOL` | Proxy protocol (http, https, socks5) | http |
| `REDIS_URL` | Redis URL for distributed cache (optional) | - |
| `GEMINI_API_KEY` | Google Gemini API key (for AI search) | - |
| `GROQ_API_KEY` | Groq API key (for AI search) | - |
| `MDBLIST_API_KEY` | MDBList API key | - |
| `RPDB_API_KEY` | RPDB API key | - |

> **Note**: Starting from v3.1.6, MongoDB is no longer required. The addon uses in-memory caching by default, with optional Redis support for distributed caching. See [issue #1215](https://github.com/mrcanelas/tmdb-addon/issues/1215) for more details.

## 📚 Documentation

- [Self-Hosting Guide](docs/self-hosting.md) - Complete instructions for hosting your own instance
- [Development Guide](docs/development.md) - Guide for developers and contributors
- [Contributing Guide](docs/contributing.md) - How to contribute to the project
- [API Documentation](docs/api.md) - Complete API reference
- [Proxy Implementation](docs/proxy-implementation.md) - Guide for proxy configuration

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](docs/contributing.md) to get started.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/mrcanelas/tmdb-addon.git
cd tmdb-addon

# Install dependencies
npm install

# Start development servers
npm run dev:server  # Backend (port 1337)
npm run dev         # Frontend (port 5173)
```

### Available Scripts
```bash
npm run dev          # Start frontend development server
npm run dev:server   # Start backend development server
npm run build        # Build project for production
npm run lint         # Run linter
npm start            # Start production server
npm run test:proxy  # Test proxy configuration
```

## 🛠️ Technologies Used

- **Backend**: Node.js, Express
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Cache**: Redis (optional), cache-manager (in-memory by default)
- **APIs**: TMDB, Fanart.tv, Trakt, MDBList, RPDB, Gemini, Groq
- **Containerization**: Docker

## 📊 Project Structure

```
tmdb-addon/
├── addon/              # Backend server code
│   ├── lib/           # Main modules (getMeta, getCatalog, etc.)
│   ├── utils/         # Utilities (httpClient, imageProcessor, etc.)
│   └── static/        # Static files (translations, catalog types)
├── configure/         # Frontend configuration UI
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Application pages
│   │   ├── integrations/ # Integration components
│   │   └── contexts/    # React contexts
├── docs/              # Documentation
├── public/            # Public files (images, favicon)
└── package.json       # Project configuration
```

## ⚖️ License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for providing the metadata
- [Fanart.tv](https://fanart.tv/) for additional artwork
- [Stremio](https://www.stremio.com/) for the amazing streaming platform
- [rleroi](https://github.com/rleroi) for the Streaming Catalogs addon
- All our [contributors](https://github.com/mrcanelas/tmdb-addon/graphs/contributors)

## ⚠️ Disclaimer

The metadata is provided by [TMDB](https://themoviedb.org/) and is subject to change. We cannot guarantee data validity and are not responsible for any inconveniences caused by invalid or inappropriate metadata.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/mrcanelas/tmdb-addon/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mrcanelas/tmdb-addon/discussions)

---

<p align="center">
Made with ❤️ by the Stremio community
</p>
