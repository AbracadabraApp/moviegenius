# MovieGenius Production Dockerfile
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for better compatibility and Puppeteer
RUN apk add --no-cache \
    libc6-compat \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Copy package files
COPY package*.json ./

# Set Node.js memory limit and install dependencies
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm ci

# Copy source code
COPY . .

# Create non-root user for security before building
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Change ownership of all app files to nodejs user
RUN chown -R nextjs:nodejs /app

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nextjs

# Start the application
CMD ["npm", "start"]