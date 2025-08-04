#!/bin/bash
# Docker development script for MovieGenius

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Starting MovieGenius Development Environment${NC}"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local not found!${NC}"
    echo -e "${YELLOW}Create .env.local with the following variables:${NC}"
    echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your_service_key"
    echo "NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key"
    echo "ANTHROPIC_API_KEY=your_anthropic_key"
    exit 1
fi

# Load environment variables
set -a
source .env.local
set +a

# Start with docker-compose
echo -e "${GREEN}🚀 Starting services...${NC}"
docker-compose up --build

echo -e "${GREEN}✅ Development environment ready!${NC}"
echo -e "${YELLOW}💡 Access at: http://localhost:3000${NC}"