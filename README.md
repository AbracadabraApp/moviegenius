# 🎬 MovieGenius

**AI-Powered Movie Discovery Platform**

MovieGenius is a sophisticated movie discovery platform that combines cinematic analysis with intelligent recommendations. Built with Next.js and powered by Claude AI, it offers deep film analysis, personalized recommendations, and lightning-fast performance through our 2-tier static generation system.

## ✨ Key Features

- **🧠 AI-Powered Analysis**: Deep cinematic analysis using Claude AI for 21,275+ movies
- **⚡ Static Generation System**: Sub-200ms page loads with pre-generated static content (2-tier architecture)
- **🔗 Intelligent Linking**: Automatic cross-referencing between related films
- **📱 Mobile-First Design**: Optimized phone-frame interface for mobile discovery
- **🎯 Smart Recommendations**: Context-aware film suggestions and discovery paths
- **📚 Browse Collections**: 3,500+ optimized movie collections (6-30 movies each) for perfect discovery
- **⚙️ Zero-Waste Architecture**: Efficient content generation with cost optimization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (Railway)
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

### 2-Tier Static/Dynamic System

MovieGenius uses a clean 2-tier architecture for optimal performance:
- **Tier 1: Static Pages** - Pre-built files served instantly (<100ms)
- **Tier 2: Dynamic Pages** - Generated on-demand for new/rare content

### Core Systems

- **Static Generation System**: Pre-built movie pages with complete data for instant loading
- **Analysis Service**: Claude AI integration for 21,275+ movie analyses in Railway PostgreSQL database
- **Browse Collection System**: 3,500+ optimized collections across 20+ genres
- **Entity Linking**: Automatic movie cross-referencing across analyses
- **Cache Optimization**: Multi-layer caching strategy for performance
- **Railway Deployment**: Production hosting with PostgreSQL database

### Performance

- **Page Load Times**: <100ms for static pages (Tier 1), standard SSR for dynamic (Tier 2)
- **Cache Hit Rate**: >95% for optimized content delivery
- **Analysis Coverage**: 21,275+ movies with rich AI-generated content in database
- **Browse Collections**: 3,500+ optimized collections (60% reduction from 8,700)
- **Mobile Optimization**: Responsive design with phone-frame UI

## 📚 Documentation

**📖 [Complete Documentation](docs/README.md)** - Comprehensive guide with organized structure

### Quick Links
- **🚀 [Getting Started](docs/getting-started/)** - Development setup and code standards
- **🏗️ [Architecture](docs/architecture/)** - 2-tier static/dynamic system and design decisions
- **⚙️ [Operations](docs/operations/)** - Deployment, caching, and rollback procedures
- **🧪 [Testing](docs/testing/)** - Testing framework and engineering guidelines
- **📊 [Project Status](docs/project-status/)** - Launch readiness and system analysis

### Essential Documentation
- **[Movie Collection Consolidation System](docs/architecture/MOVIE_COLLECTION_CONSOLIDATION_SYSTEM.md)** - Browse optimization system
- **[Static Generation Strategy](docs/strategies/STATIC_GENERATION_STRATEGY.md)** - 2-tier architecture and performance optimization
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

### Static Generation System
*Note: Commands use "nuclear" naming for backwards compatibility with existing codebase*

```bash
npm run nuclear:batch         # Generate static files in batch
npm run nuclear:test          # Test static generation (5 files)
npm run nuclear:process       # Process 50 files
npm run nuclear:expand        # Process 1000 files
npm run build:nuclear-static  # Build complete static generation system
```

### Testing
```bash
npm run test                    # Run all tests
npm run test:nuclear           # Run static generation tests
npm run test:nuclear-content   # Test content transformation
npm run test:nuclear-performance # Test performance metrics
npm run validate:nuclear-static # Validate static generation system
```

### Browse Collection System
```bash
node consolidate-collections.js [genre]    # Consolidate collections for genre
node browse-collection-generator.js [genre] [count]  # Generate browse collections
```

### Static System Management
```bash
npm run nuclear:start    # Start autonomous static generation system
npm run nuclear:stop     # Stop autonomous static generation system
npm run nuclear:restart  # Restart autonomous static generation system
npm run nuclear:status   # Check static generation system status
```

## 📊 System Status

- **🟢 Production Status**: Launch Ready
- **🟢 Database**: 21,275 complete movie analyses in Railway PostgreSQL
- **🟢 Static Generation**: 2-tier architecture (Tier 1: static files, Tier 2: dynamic fallback)
- **🟢 Browse Collections**: 3,500+ optimized collections across 20+ genres
- **🟢 Performance**: <100ms for static pages, standard SSR for dynamic
- **🟢 Cache Efficiency**: >95% hit rate

## 🤝 Contributing

1. Read our [Engineering Decision Rules](docs/reference/ENGINEERING-DECISION-RULES.md)
2. Follow [Code Standards](CODE-STANDARDS.md)
3. Ensure tests pass: `npm run test`
4. Submit pull request with clear description

## 🔧 Troubleshooting

### Common Issues

**Movie pages not loading:**
- Check static files: `ls public/nuclear-static/` or `ls public/data/production/`
- Verify environment variables in `.env.local`
- Check Railway deployment status and database connectivity

**Static generation system issues:**
- Run static generation tests: `npm run test:nuclear`
- Check system status: `npm run nuclear:status`
- Review [Static Generation Strategy](docs/strategies/STATIC_GENERATION_STRATEGY.md)

**Performance issues:**
- Check cache status: `npm run cache:status`
- Review [Performance Optimization Plan](docs/strategies/PERFORMANCE_OPTIMIZATION_PLAN.md)
- Monitor Railway logs for database query performance

### Get Help

- 📖 Check our comprehensive documentation above
- 🐛 Report issues on GitHub
- 📧 Contact the development team

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🏆 Acknowledgments

- **Claude AI** for powerful movie analysis capabilities
- **TMDB** for comprehensive movie data
- **Railway** for reliable deployment platform and PostgreSQL database
- **Next.js** for the powerful React framework

---

**Built with ❤️ for movie lovers who deserve better discovery experiences.**

## 📁 Documentation Structure

All documentation has been organized into `/docs` for easy navigation:
- `/docs/architecture` - System design and architecture
- `/docs/guides` - Setup and deployment guides
- `/docs/features` - Feature specifications
- `/docs/strategies` - Strategic planning documents
- `/docs/reference` - Technical reference
- `/docs/archive` - Historical documentation

*Last updated: March 17, 2026*