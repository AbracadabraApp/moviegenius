#!/bin/bash
#
# Xcode Build Phase Script: Validate Code Quality
# Add this to Build Phases in Xcode:
# 1. Select moviegenius target
# 2. Build Phases tab
# 3. + → New Run Script Phase
# 4. Paste: ${SRCROOT}/Scripts/validate-code-quality.sh
#
# Purpose: Enforce code quality standards at build time
# Last Updated: 2026-05-20

set -e

# Color codes for Xcode output
# Note: Xcode console supports limited formatting
echo "note: Starting MovieGenius code quality validation..."

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Track errors and warnings
ERRORS=0
WARNINGS=0

# Function to report error to Xcode
report_error() {
    echo "error: $1"
    ((ERRORS++))
}

# Function to report warning to Xcode
report_warning() {
    echo "warning: $1"
    ((WARNINGS++))
}

# 1. Check for navigation bar hiding violations
echo "note: Checking navigation patterns..."

# Find all Swift files in Views directory
find "$PROJECT_ROOT/moviegenius/Views" -name "*.swift" -print0 | while IFS= read -r -d '' file; do
    # Check for navigationBarHidden(true)
    if grep -q "\.navigationBarHidden(true)" "$file"; then
        LINE=$(grep -n "\.navigationBarHidden(true)" "$file" | head -1 | cut -d: -f1)
        report_error "$file:$LINE:1: Never use .navigationBarHidden(true) - breaks swipe-back gestures"
    fi

    # Check for navigationBarBackButtonHidden(true)
    if grep -q "\.navigationBarBackButtonHidden(true)" "$file"; then
        LINE=$(grep -n "\.navigationBarBackButtonHidden(true)" "$file" | head -1 | cut -d: -f1)
        report_error "$file:$LINE:1: Never hide back button - breaks navigation gestures"
    fi

    # Check for UINavigationBar.appearance()
    if grep -q "UINavigationBar\.appearance()" "$file"; then
        LINE=$(grep -n "UINavigationBar\.appearance()" "$file" | head -1 | cut -d: -f1)
        report_warning "$file:$LINE:1: Avoid global navigation appearance changes - use view modifiers"
    fi
done

# 2. Check for hardcoded colors (excluding utility files)
echo "note: Checking theme consistency..."

find "$PROJECT_ROOT/moviegenius/Views" -name "*.swift" -print0 | while IFS= read -r -d '' file; do
    # Skip color definition files
    if [[ "$file" == *"Colors.swift" ]] || [[ "$file" == *"CategoryBadgeColors.swift" ]]; then
        continue
    fi

    # Check for Color.white, Color.black, etc.
    for color in white black gray red blue green yellow orange purple pink; do
        if grep -q "Color\.$color" "$file"; then
            # Check if it's using Color.mg* instead
            if ! grep -q "Color\.mg" "$file"; then
                LINE=$(grep -n "Color\.$color" "$file" | head -1 | cut -d: -f1)
                report_warning "$file:$LINE:1: Use Color.mg* semantic colors instead of Color.$color for dark mode support"
            fi
        fi
    done

    # Check for hardcoded shadows
    if grep -q "\.shadow(" "$file"; then
        if ! grep -q "\.mgShadow" "$file"; then
            LINE=$(grep -n "\.shadow(" "$file" | head -1 | cut -d: -f1)
            report_warning "$file:$LINE:1: Use .mgShadow* modifiers instead of hardcoded shadows"
        fi
    fi
done

# 3. Check for terminology violations
echo "note: Checking terminology..."

find "$PROJECT_ROOT/moviegenius" -name "*.swift" -print0 | while IFS= read -r -d '' file; do
    # Skip resource files
    if [[ "$file" == *"/Resources/"* ]]; then
        continue
    fi

    # Check for "film" usage
    if grep -qi "\bfilm\b" "$file"; then
        # Allow in comments or legacy markers
        if ! grep -q "// Legacy\|// film" "$file"; then
            LINE=$(grep -ni "\bfilm\b" "$file" | head -1 | cut -d: -f1)
            report_warning "$file:$LINE:1: Use 'movie' instead of 'film' for consistency"
        fi
    fi

    # Check for "bookmark" usage
    if grep -qi "\bbookmark" "$file"; then
        LINE=$(grep -ni "\bbookmark" "$file" | head -1 | cut -d: -f1)
        report_warning "$file:$LINE:1: Use 'queue' (watchlist) or 'loved' (seen) instead of 'bookmark'"
    fi
done

# 4. Check for state management violations
echo "note: Checking state management..."

find "$PROJECT_ROOT/moviegenius/Views" -name "*.swift" -print0 | while IFS= read -r -d '' file; do
    # Check for local favorites state
    if grep -q "@State.*private.*var.*isLoved\|@State.*private.*var.*isQueued" "$file"; then
        LINE=$(grep -n "@State.*private.*var.*isLoved\|@State.*private.*var.*isQueued" "$file" | head -1 | cut -d: -f1)
        report_warning "$file:$LINE:1: Use FavoritesManager.shared instead of local @State for favorites"
    fi

    # Check for direct UserDefaults access (outside managers)
    if [[ ! "$file" == *"Manager.swift" ]] && [[ ! "$file" == *"Settings"* ]]; then
        if grep -q "UserDefaults\.standard\." "$file"; then
            LINE=$(grep -n "UserDefaults\.standard\." "$file" | head -1 | cut -d: -f1)
            report_warning "$file:$LINE:1: Use FavoritesManager or SettingsManager instead of direct UserDefaults"
        fi
    fi
done

# 5. Check for component duplication
echo "note: Checking component usage..."

# Find card components that aren't StandardMovieCard
find "$PROJECT_ROOT/moviegenius/Views" -name "*Card*.swift" -print0 | while IFS= read -r -d '' file; do
    BASENAME=$(basename "$file")
    if [[ "$BASENAME" != "StandardMovieCard.swift" ]] && [[ "$BASENAME" != "MediaCard.swift" ]]; then
        # Check if it's a movie card variant
        if grep -q "posterUrl\|tmdbId\|MovieDestination" "$file"; then
            report_warning "$file:1:1: Consider using StandardMovieCard instead of custom card: $BASENAME"
        fi
    fi
done

# 6. Check for memory leaks
echo "note: Checking memory management..."

find "$PROJECT_ROOT/moviegenius" -name "*.swift" -print0 | while IFS= read -r -d '' file; do
    # Check for [self] captures without weak/unowned
    if grep -q "\[self\]" "$file"; then
        LINE=$(grep -n "\[self\]" "$file" | head -1 | cut -d: -f1)
        report_warning "$file:$LINE:1: Use [weak self] or [unowned self] to prevent retain cycles"
    fi
done

# 7. Check tier naming
echo "note: Checking tier names..."

VALID_TIERS="Wanderer Explorer Adventurer Seeker Genius"
INVALID_TIERS="Archivist Connoisseur Sage Scholar Essential Foundational Specialist"

find "$PROJECT_ROOT/moviegenius" -name "*.swift" -print0 | while IFS= read -r -d '' file; do
    for tier in $INVALID_TIERS; do
        if grep -q "$tier" "$file"; then
            # Check if it's in a comment or migration code
            if ! grep -q "// Legacy\|// Old tier" "$file"; then
                LINE=$(grep -n "$tier" "$file" | head -1 | cut -d: -f1)
                report_error "$file:$LINE:1: Invalid tier name '$tier'. Valid tiers: $VALID_TIERS"
            fi
        fi
    done
done

# 8. Validate StandardMovieCard if modified
if [ -n "$SCRIPT_INPUT_FILE_LIST_PATH" ]; then
    # Check if StandardMovieCard.swift was modified
    if grep -q "StandardMovieCard.swift" "$SCRIPT_INPUT_FILE_LIST_PATH"; then
        echo "warning: StandardMovieCard.swift was modified - ensure poster dimensions (125x188) and FavoriteButtons placement unchanged"
    fi
fi

# Final report
echo "note: Code quality validation complete"

if [ $ERRORS -gt 0 ]; then
    echo "error: Found $ERRORS error(s) and $WARNINGS warning(s)"
    echo "error: Build failed due to code quality violations"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "warning: Found $WARNINGS warning(s) - consider fixing these issues"
    exit 0
else
    echo "note: ✅ All code quality checks passed"
    exit 0
fi