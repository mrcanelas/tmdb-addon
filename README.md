# TMDB Addon for Stremio
THIS IS BASED ON THE OFFICIAL TMDB ADDON WITH NO CHANGES EXCEPT FOR THE INCLUSION OF ACTOR IMAGES AND CHARACTER DATA (CODE TAKEN FROM FROM @stekc FORK)

IMAGE IS ON DOCKER HUB doesitblend1/tmdb-addon:latest  Current Version is TMDB ADDON 3.1.4

![TMDB](https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg)

> A powerful Stremio addon that enhances your streaming experience with TMDB metadata

## 🌟 Features

- **Multi-language Support**: Get metadata in your preferred language
- **Extended Catalog**: Access titles not available in Stremio's default catalog
- **Rich Metadata**: High-quality posters, backgrounds, and detailed information
- **TMDB Integration**: Connect with your TMDB account for personalized experience
- **Integrations**: Watchlist Sync, Rating Support, Custom Lists
- **Modern UI**: Beautiful and intuitive configuration interface
- **IMDb Support**: Full compatibility with IMDb-based addons

## 📥 Installation

### Quick Install

1. Visit the [TMDB Addon Configuration Page](https://94c8cb9f702d-tmdb-addon.baby-beamup.club/)
2. Configure your preferences
3. Click "Install"
4. Approve the installation in Stremio

## ⚙️ Configuration

### Language Settings
Choose from any language supported by TMDB for your metadata.

### Catalog Options
Customize which catalogs appear on your Stremio:
- Movies
  - Popular
  - Year
  - Language
  - Trending
- TV Shows
  - Popular
  - Year
  - Language
  - Trending

### Integration Features
- TMDB Account Connection
- Watchlist Sync
- Rating Posters Support
- Custom Lists

## 🛠️ Self-Hosting

For detailed instructions on hosting your own instance, check our [Self-Hosting Guide](docs/self-hosting.md).

### Quick Start with Docker
```bash
docker run -d \
  --name tmdb-addon \
  -p 1337:1337 \
  -e MONGODB_URI=your_mongodb_uri \
  -e FANART_API=your_fanart_key \
  -e TMDB_API=your_tmdb_key \
  -e HOST_NAME=http://your_domain:1337 \
  mrcanelas/tmdb-addon:latest
```

## 📚 Documentation

- [Self-Hosting Guide](docs/self-hosting.md) - Complete instructions for hosting your own instance
- [Development Guide](docs/development.md) - Guide for developers and contributors
- [Contributing Guide](docs/contributing.md) - How to contribute to the project
- [API Documentation](docs/api.md) - Complete API reference

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](docs/contributing.md) to get started.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/mrcanelas/tmdb-addon.git

# Install dependencies
npm install

# Start development servers
npm run dev:server  # Backend
npm run dev         # Frontend
```

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for providing the metadata
- [Fanart.tv](https://fanart.tv/) for additional artwork
- [Stremio](https://www.stremio.com/) for the amazing streaming platform
- All our [contributors](https://github.com/mrcanelas/tmdb-addon/graphs/contributors)

## ⚠️ Disclaimer

The metadata is provided by [TMDB](https://themoviedb.org/) and is subject to change. We cannot guarantee data validity and are not responsible for any inconveniences caused by invalid or inappropriate metadata.

---

<p align="center">
Made with ❤️ by the TMDB Addon community
</p>



 
