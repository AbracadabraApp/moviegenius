# MovieGenius Docker Setup

This document provides comprehensive Docker configuration for MovieGenius, optimized for Node 20.x and production deployment.

## 🚀 Quick Start

### Prerequisites
- Docker 20.10+ 
- Docker Compose 2.0+
- Node.js 20.x (for local development)

### Environment Setup
1. Copy environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your actual values
```

2. Build and run:
```bash
npm run docker:dev
```

## 📦 Available Commands

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build optimized production image |
| `npm run docker:dev` | Start development environment |
| `npm run docker:test` | Build and test image |

## 🐳 Docker Configuration

### Dockerfile Features
- **Base Image**: `node:20-bookworm-slim` (matches package.json engines)
- **Puppeteer Support**: Pre-installed Chromium and dependencies
- **Memory Optimization**: 4GB Node.js heap limit
- **Security**: Non-root user, minimal attack surface
- **Multi-stage**: Optimized for production builds
- **Health Checks**: Built-in application monitoring

### Environment Variables
Required for production:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Volume Mounts
- `./nuclear-static:/app/nuclear-static:ro` - Nuclear static files (optional)

## 🔧 Development vs Production

### Development Mode
```bash
# With hot reload and debugging
npm run docker:dev
```

### Production Mode
```bash
# Optimized build
docker-compose up --profile production
```

## 🚨 Troubleshooting

### Common Issues

**1. Environment Variables Not Loading**
```bash
# Check .env.local exists and has correct format
cat .env.local
```

**2. Puppeteer Issues**
```bash
# Verify Chromium installation in container
docker exec moviegenius_container chromium --version
```

**3. Build Failures**
```bash
# Check logs
docker-compose logs moviegenius
```

**4. Memory Issues**
```bash
# Increase Docker memory limit in Docker Desktop
# Or use smaller NODE_OPTIONS value in Dockerfile
```

### Performance Optimization
- Use Docker BuildKit for faster builds
- Enable Docker layer caching
- Consider multi-stage builds for smaller images

## 🔍 Monitoring

### Health Checks
The container includes automatic health monitoring:
- Endpoint: `/api/health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

### Logs
```bash
# View application logs
docker-compose logs -f moviegenius

# View specific service logs
docker logs moviegenius_container
```

## 🌐 Deployment

### Local Testing
```bash
# Test production build locally
npm run docker:test
```

### Production Deployment
The Docker configuration is ready for:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- Kubernetes clusters
- Self-hosted environments

### Scaling
For high-traffic deployments:
1. Use container orchestration (Kubernetes, Docker Swarm)
2. Add Redis for session storage
3. Configure load balancers
4. Set up monitoring (Prometheus, Grafana)

## 📋 Best Practices

1. **Security**
   - Never commit .env.local to version control
   - Use secrets management in production
   - Regularly update base images

2. **Performance**
   - Use .dockerignore to exclude unnecessary files
   - Leverage multi-stage builds
   - Cache dependencies appropriately

3. **Monitoring**
   - Implement proper logging
   - Set up health checks
   - Monitor resource usage

## 🤝 Contributing

When modifying Docker configuration:
1. Test changes locally
2. Update this documentation
3. Verify production compatibility
4. Test on different platforms if possible

## 📖 References

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)