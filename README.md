# 🎬 MovieGenius

**AI-Powered Movie Discovery Platform**

MovieGenius is a sophisticated movie discovery platform that combines cinematic analysis with intelligent recommendations. Built with Next.js and powered by Claude AI, it offers deep film analysis, personalized recommendations, and lightning-fast performance through our nuclear static generation system.

## ✨ Key Features

- **🧠 AI-Powered Analysis**: Deep cinematic analysis using Claude AI for 6000+ movies
- **⚡ Nuclear Static System**: Sub-200ms page loads with pre-generated static content
- **🔗 Intelligent Linking**: Automatic cross-referencing between related films
- **📱 Mobile-First Design**: Optimized phone-frame interface for mobile discovery
- **🎯 Smart Recommendations**: Context-aware film suggestions and discovery paths
- **📚 Browse Collections**: 3,500+ optimized movie collections (6-30 movies each) for perfect discovery
- **⚙️ Zero-Waste Architecture**: Efficient content generation with cost optimization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Claude AI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/AbracadabraApp/moviegenius.git
cd moviegenius

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see MovieGenius in action.

## 🏗️ Architecture

### Core Systems

- **Nuclear Static Generation**: Pre-built movie pages for instant loading
- **Analysis Service**: Claude AI integration for movie analysis
- **Browse Collection System**: 3,500+ optimized collections across 20+ genres
- **Entity Linking**: Automatic movie cross-referencing
- **Cache Optimization**: Multi-layer caching (Redis + HTTP + ISR)
- **Railway Deployment**: Production hosting on Railway

### Performance

- **Page Load Times**: <200ms for nuclear static pages
- **Cache Hit Rate**: >95% for optimized content delivery
- **Analysis Coverage**: 6000+ movies with rich AI-generated content
- **Browse Collections**: 8,700 → 3,500 collections optimized (60% reduction)
- **Mobile Optimization**: Responsive design with phone-frame UI

## 📚 Documentation

**📖 [Complete Documentation](docs/README.md)** - Comprehensive guide with organized structure

### Quick Links
- **🚀 [Getting Started](docs/getting-started/)** - Development setup and code standards
- **🏗️ [Architecture](docs/architecture/)** - Nuclear static system and performance analysis  
- **⚙️ [Operations](docs/operations/)** - Deployment, caching, and rollback procedures
- **🧪 [Testing](docs/testing/)** - Testing framework and engineering guidelines
- **📊 [Project Status](docs/project-status/)** - Launch readiness and system analysis

### Essential Documentation
- **[Movie Collection Consolidation System](MOVIE_COLLECTION_CONSOLIDATION_SYSTEM.md)** - Browse optimization system
- **[Consolidation Results Summary](CONSOLIDATION_RESULTS_SUMMARY.md)** - Executive summary of optimization results
- **[API Reference](docs/API_REFERENCE.md)** - Complete API endpoint documentation
- **[Contributing Guide](docs/CONTRIBUTING.md)** - How to contribute to MovieGenius
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🛠️ Development Commands

### Core Development
```bash
npm run dev          # Start development server
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

### Nuclear Static System
```bash
npm run nuclear:batch         # Generate nuclear static files
npm run nuclear:test          # Test nuclear generation (5 files)
npm run nuclear:process       # Process 50 files
npm run nuclear:expand        # Process 1000 files
npm run build:nuclear-static  # Build complete nuclear static system
```

### Testing
```bash
npm run test                    # Run all tests
npm run test:nuclear           # Run nuclear static tests
npm run test:nuclear-content   # Test content transformation
npm run test:nuclear-performance # Test performance metrics
npm run validate:nuclear-static # Validate nuclear system
```

### Browse Collection System
```bash
node consolidate-collections.js [genre]    # Consolidate collections for genre
node browse-collection-generator.js [genre] [count]  # Generate browse collections
```

### Nuclear System Management
```bash
npm run nuclear:start    # Start autonomous nuclear system
npm run nuclear:stop     # Stop autonomous nuclear system  
npm run nuclear:restart  # Restart autonomous nuclear system
npm run nuclear:status   # Check nuclear system status
```

## 📊 System Status

- **🟢 Production Status**: Launch Ready
- **🟢 Nuclear System**: 99.3% Complete (6024/6065 files)
- **🟢 Browse Collections**: 3,500+ optimized collections across 20+ genres
- **🟢 Performance**: <200ms average page load
- **🟢 Analysis Coverage**: 6000+ movies analyzed
- **🟢 Cache Efficiency**: >95% hit rate

## 🤝 Contributing

1. Read our [Engineering Decision Rules](ENGINEERING-DECISION-RULES.md)
2. Follow [Code Standards](CODE-STANDARDS.md)
3. Ensure tests pass: `npm run test`
4. Submit pull request with clear description

## 🔧 Troubleshooting

### Common Issues

**Movie pages not loading:**
- Check nuclear static files: `ls public/nuclear-static/`
- Verify environment variables in `.env.local`
- Check Railway deployment status

**Nuclear system issues:**
- Run nuclear tests: `npm run test:nuclear`
- Check system status: `npm run nuclear:status`
- Review [Nuclear Testing Framework](NUCLEAR_STATIC_TESTING_FRAMEWORK.md)

**Performance issues:**
- Check cache status: `npm run cache:status`
- Review [Performance Analysis](PERFORMANCE-ANALYSIS.md)
- Monitor Railway logs

### Get Help

- 📖 Check our comprehensive documentation above
- 🐛 Report issues on GitHub
- 📧 Contact the development team

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🏆 Acknowledgments

- **Claude AI** for powerful movie analysis capabilities
- **TMDB** for comprehensive movie data
- **Railway** for reliable deployment platform
- **Supabase** for robust database infrastructure

---

**Built with ❤️ for movie lovers who deserve better discovery experiences.**

*Last updated: August 24, 2025*