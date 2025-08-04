#!/bin/bash
# Docker build script for MovieGenius

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Building MovieGenius Docker Image${NC}"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  Warning: .env.local not found. Create it with required environment variables.${NC}"
fi

# Build the Docker image
echo -e "${GREEN}📦 Building Docker image...${NC}"
docker build -t moviegenius:latest -t moviegenius:$(date +%Y%m%d) .

# Optional: Run a quick test
if [ "$1" = "--test" ]; then
    echo -e "${GREEN}🧪 Running quick container test...${NC}"
    docker run --rm -d --name moviegenius-test -p 3001:3000 moviegenius:latest
    
    # Wait for container to start
    echo "Waiting for container to start..."
    sleep 10
    
    # Test health endpoint
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Container test passed!${NC}"
    else
        echo -e "${RED}❌ Container test failed!${NC}"
    fi
    
    # Cleanup
    docker stop moviegenius-test
fi

echo -e "${GREEN}✅ Docker build completed!${NC}"
echo -e "${YELLOW}💡 Run with: docker-compose up${NC}"