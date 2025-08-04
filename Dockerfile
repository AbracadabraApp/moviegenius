# MovieGenius Dockerfile - Optimized for Node 20.x
FROM node:20-bookworm-slim

# Install system dependencies for Puppeteer and build tools
RUN apt-get update && apt-get install -y \
    # Puppeteer dependencies
    chromium \
    fonts-liberation \
    libxss1 \
    libgconf-2-4 \
    libxtst6 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    # Additional fonts and SSL
    ca-certificates \
    fonts-freefont-ttf \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Configure Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set Node.js memory limit for large builds
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with CI for faster, reliable builds
RUN npm ci --only=production --verbose

# Copy source code
COPY . .

# Set build-time environment variables with fallbacks
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-https://placeholder.supabase.co}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-placeholder-anon-key}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-placeholder-service-key}
ENV NEXT_PUBLIC_TMDB_API_KEY=${NEXT_PUBLIC_TMDB_API_KEY:-placeholder-tmdb-key}
ENV ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-placeholder-anthropic-key}

# Set production environment
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]

# Metadata
LABEL maintainer="MovieGenius Team"
LABEL version="1.0.3"
LABEL description="MovieGenius - AI-powered movie analysis platform"