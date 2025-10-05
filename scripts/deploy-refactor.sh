#!/bin/bash
# Movie Page Refactor - Deployment Script
#
# Usage:
#   ./scripts/deploy-refactor.sh validate   # Validate code only
#   ./scripts/deploy-refactor.sh phase1     # Deploy parallel route
#   ./scripts/deploy-refactor.sh phase4     # Switch to refactored (cutover)
#   ./scripts/deploy-refactor.sh rollback   # Revert to legacy

set -e  # Exit on error

PHASE=$1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Movie Page Refactor Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function: Validate code
validate() {
  echo -e "${YELLOW}Running validation tests...${NC}"
  node scripts/validate-refactor.js

  if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Validation passed! Code is ready to deploy.${NC}"
    return 0
  else
    echo ""
    echo -e "${RED}❌ Validation failed. Fix issues before deploying.${NC}"
    return 1
  fi
}

# Function: Phase 1 - Deploy parallel route
phase1() {
  echo -e "${YELLOW}Phase 1: Deploying refactored route (parallel)${NC}"
  echo ""

  # Run validation first
  validate
  if [ $? -ne 0 ]; then
    exit 1
  fi

  echo ""
  echo -e "${YELLOW}Adding files to git...${NC}"
  git add lib/types/movie-page-data.js \
          lib/movie-page-loader.js \
          pages/movie/[id]-refactored.js \
          scripts/validate-refactor.js \
          scripts/test-refactored-page.js \
          scripts/deploy-refactor.sh \
          MOVIE_PAGE_REFACTOR.md \
          DEPLOYMENT_CHECKLIST.md \
          REFACTOR_SUMMARY.md

  echo ""
  echo -e "${YELLOW}Creating commit...${NC}"
  git commit -m "Add refactored movie page (parallel deployment)

- New unified data loader with single output format
- Simplified page component (388 lines → 180 lines)
- Comprehensive validation and type checking
- Zero changes to existing /movie/[id] route
- Ready for A/B testing and gradual rollout"

  echo ""
  echo -e "${YELLOW}Pushing to production...${NC}"
  git push

  echo ""
  echo -e "${GREEN}✅ Phase 1 complete!${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "  1. Wait for Railway deployment to complete"
  echo "  2. Test refactored pages:"
  echo "     - https://yoursite.com/movie/550-refactored"
  echo "     - https://yoursite.com/movie/680-refactored"
  echo "  3. Compare with originals:"
  echo "     - https://yoursite.com/movie/550"
  echo "     - https://yoursite.com/movie/680"
  echo "  4. Monitor for 24 hours"
  echo "  5. If stable, run: ./scripts/deploy-refactor.sh phase4"
  echo ""
}

# Function: Phase 4 - Switch to refactored (cutover)
phase4() {
  echo -e "${YELLOW}Phase 4: Switching to refactored version${NC}"
  echo ""

  # Confirm with user
  echo -e "${RED}⚠️  WARNING: This will change the production route!${NC}"
  echo ""
  echo "This will:"
  echo "  - Move /movie/[id].js to /movie/[id]-legacy.js (backup)"
  echo "  - Move /movie/[id]-refactored.js to /movie/[id].js (activate)"
  echo "  - Deploy to production"
  echo ""
  echo -e "${YELLOW}Have you:${NC}"
  echo "  - Tested the refactored route for 24+ hours?"
  echo "  - Verified zero errors in logs?"
  echo "  - Confirmed performance is acceptable?"
  echo ""
  read -p "Continue? (yes/no): " confirm

  if [ "$confirm" != "yes" ]; then
    echo ""
    echo -e "${RED}Aborted by user.${NC}"
    exit 1
  fi

  echo ""
  echo -e "${YELLOW}Backing up original file...${NC}"
  git mv pages/movie/[id].js pages/movie/[id]-legacy.js

  echo -e "${YELLOW}Activating refactored version...${NC}"
  git mv pages/movie/[id]-refactored.js pages/movie/[id].js

  echo ""
  echo -e "${YELLOW}Creating commit...${NC}"
  git commit -m "Switch to refactored movie page

- Original preserved as [id]-legacy.js for quick rollback
- Refactored version tested and stable for 24+ hours
- Can rollback instantly with: ./scripts/deploy-refactor.sh rollback"

  echo ""
  echo -e "${YELLOW}Pushing to production...${NC}"
  git push

  echo ""
  echo -e "${GREEN}✅ Phase 4 complete!${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "  1. Monitor production for 2 hours"
  echo "  2. Check error logs in Railway"
  echo "  3. Verify page loads correctly"
  echo "  4. If issues occur: ./scripts/deploy-refactor.sh rollback"
  echo "  5. If stable for 1 week: remove legacy code"
  echo ""
}

# Function: Rollback to legacy
rollback() {
  echo -e "${YELLOW}Rolling back to legacy version${NC}"
  echo ""

  # Check if we can revert
  LAST_COMMIT=$(git log -1 --pretty=%B)
  if [[ "$LAST_COMMIT" == *"Switch to refactored movie page"* ]]; then
    echo -e "${YELLOW}Using git revert (fastest method)...${NC}"
    git revert HEAD --no-edit
    git push
    echo ""
    echo -e "${GREEN}✅ Rollback complete via git revert!${NC}"
  else
    echo -e "${YELLOW}Manual rollback required...${NC}"

    # Check if files exist
    if [ -f "pages/movie/[id]-legacy.js" ]; then
      echo -e "${YELLOW}Swapping files...${NC}"
      git mv pages/movie/[id].js pages/movie/[id]-broken.js
      git mv pages/movie/[id]-legacy.js pages/movie/[id].js

      git commit -m "Rollback to legacy movie page

Issue with refactored version - reverted for investigation"
      git push

      echo ""
      echo -e "${GREEN}✅ Rollback complete via file swap!${NC}"
    else
      echo ""
      echo -e "${RED}❌ Cannot rollback: legacy file not found${NC}"
      echo ""
      echo "Manual rollback required:"
      echo "  git log --oneline"
      echo "  git reset --hard <last-good-commit>"
      echo "  git push --force-with-lease"
      exit 1
    fi
  fi

  echo ""
  echo -e "${BLUE}Rollback complete. Next steps:${NC}"
  echo "  1. Verify original version is working"
  echo "  2. Investigate issue with refactored version"
  echo "  3. Fix and redeploy when ready"
  echo ""
}

# Main logic
case "$PHASE" in
  validate)
    validate
    ;;
  phase1)
    phase1
    ;;
  phase4)
    phase4
    ;;
  rollback)
    rollback
    ;;
  *)
    echo -e "${RED}Invalid phase specified.${NC}"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deploy-refactor.sh validate   # Validate code"
    echo "  ./scripts/deploy-refactor.sh phase1     # Deploy parallel route"
    echo "  ./scripts/deploy-refactor.sh phase4     # Switch to refactored"
    echo "  ./scripts/deploy-refactor.sh rollback   # Revert to legacy"
    echo ""
    exit 1
    ;;
esac
