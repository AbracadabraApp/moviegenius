#!/usr/bin/env python3
"""
extract_genius_to_json.py - Extract hardcoded Genius data from Swift to JSON

Parses GeniusView.swift case statements and TierTmdbLookup.swift dictionary
to produce a single genius_data.json file with merged film data.

USAGE:
    python extract_genius_to_json.py \\
        --geniusview ios/moviegenius/moviegenius/Views/GeniusView.swift \\
        --tmdblookup ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift \\
        --out ios/moviegenius/moviegenius/Resources/genius_data.json

Exit code 0 = success, 1 = failure (suitable for CI)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path


def parse_genius_view(path: Path) -> dict[tuple[str, str], list[tuple[str, int]]]:
    """
    Extract (category, tier) -> [(title, year)] from GeniusView.swift.

    Returns dictionary where:
        key: (category, tier) tuple
        value: list of (title, year) tuples
    """
    content = path.read_text(encoding="utf-8")

    # Pattern to match case statements: case ("Crime", "Essential"):
    case_pattern = re.compile(
        r'case\s+\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)\s*:',
        re.MULTILINE
    )

    # Pattern to match film tuples: ("The Godfather", 1972),
    # Handle titles with apostrophes, colons, question marks, ellipses
    film_pattern = re.compile(
        r'\(\s*"([^"]+)"\s*,\s*(\d{4})\s*\)',
        re.MULTILINE
    )

    results: dict[tuple[str, str], list[tuple[str, int]]] = {}

    # Find all case blocks
    for match in case_pattern.finditer(content):
        category = match.group(1)
        tier = match.group(2)

        # Extract text after this case until next case or closing bracket
        start = match.end()

        # Find the return statement block
        # Look for "return [" and extract until the closing "]"
        return_match = re.search(r'return\s*\[', content[start:])
        if not return_match:
            continue

        block_start = start + return_match.end()

        # Find matching closing bracket (count bracket depth)
        depth = 1
        block_end = block_start
        for i, char in enumerate(content[block_start:], start=block_start):
            if char == '[':
                depth += 1
            elif char == ']':
                depth -= 1
                if depth == 0:
                    block_end = i
                    break

        block = content[block_start:block_end]

        # Extract all film tuples from this block
        films = []
        for film_match in film_pattern.finditer(block):
            title = film_match.group(1)
            year = int(film_match.group(2))
            films.append((title, year))

        if films:
            results[(category, tier)] = films

    return results


def parse_tmdb_lookup(path: Path) -> dict[str, int]:
    """
    Extract "Category|Tier|Title|Year": tmdbId from TierTmdbLookup.swift.

    Returns dictionary where:
        key: "Category|Tier|Title|Year" composite key
        value: TMDB ID (int)
    """
    content = path.read_text(encoding="utf-8")

    # Pattern to match dictionary entries:
    # "Action|Essential|Die Hard|1988": 562,
    entry_pattern = re.compile(
        r'"([^"]+)\|([^"]+)\|([^"]+)\|(\d{4})"\s*:\s*(\d+)',
        re.MULTILINE
    )

    results: dict[str, int] = {}

    for match in entry_pattern.finditer(content):
        category = match.group(1)
        tier = match.group(2)
        title = match.group(3)
        year = match.group(4)
        tmdb_id = int(match.group(5))

        key = f"{category}|{tier}|{title}|{year}"
        results[key] = tmdb_id

    return results


def merge_data(
    genius_films: dict[tuple[str, str], list[tuple[str, int]]],
    tmdb_lookup: dict[str, int]
) -> tuple[dict, list[str], list[str]]:
    """
    Merge genius films with TMDB IDs.

    Returns:
        (data_dict, warnings, errors)
    """
    warnings: list[str] = []
    errors: list[str] = []

    # Only migrate 18 genre categories (exclude Awards, Actors, Actresses, Directors)
    GENRE_CATEGORIES = {
        "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
        "Documentary", "Drama", "Espionage", "Fantasy", "History", "Horror",
        "Mystery", "Noir", "Romance", "Science Fiction", "Thriller", "War", "Western"
    }

    # Skip 3 films without TMDB IDs (TV series / obscure silent films)
    SKIP_FILMS = {
        ("Documentary", "Connoisseur", "An American Family", 1973),
        ("Fantasy", "Master", "The Beautiful Sufferings of the Blonde-Haired Lady", 1909),
        ("History", "Connoisseur", "The Age of the Medici", 1973),
    }

    # Build category -> tier -> films structure
    categories_dict: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))

    # Track which TMDB entries we used
    tmdb_used: set[str] = set()

    for (category, tier), films in genius_films.items():
        # Skip non-genre categories
        if category not in GENRE_CATEGORIES:
            continue

        for title, year in films:
            # Skip films without TMDB IDs
            if (category, tier, title, year) in SKIP_FILMS:
                continue

            # Look up TMDB ID
            key = f"{category}|{tier}|{title}|{year}"
            tmdb_id = tmdb_lookup.get(key)

            if tmdb_id is None:
                errors.append(f"Missing TMDB ID: {key}")
                tmdb_id = 0  # Sentinel value
            else:
                tmdb_used.add(key)

            film_obj = {
                "title": title,
                "year": year,
                "tmdbId": tmdb_id
            }

            categories_dict[category][tier].append(film_obj)

    # Check for TMDB entries not used
    tmdb_unused = set(tmdb_lookup.keys()) - tmdb_used
    for key in sorted(tmdb_unused):
        warnings.append(f"TMDB entry not matched to film: {key}")

    # Build final JSON structure with ordered tiers
    tier_order = [
        "Essential", "Foundational", "Classics", "Well-Versed", "Devotee",
        "Connoisseur", "Deep Cuts", "Specialist", "Archivist", "Master"
    ]

    categories_list = []
    for category in sorted(categories_dict.keys()):
        tiers_list = []

        for order, tier_name in enumerate(tier_order):
            if tier_name in categories_dict[category]:
                tier_obj = {
                    "name": tier_name,
                    "order": order,
                    "films": categories_dict[category][tier_name]
                }
                tiers_list.append(tier_obj)

        category_obj = {
            "category": category,
            "tiers": tiers_list
        }
        categories_list.append(category_obj)

    data = {
        "schemaVersion": 1,
        "categories": categories_list
    }

    return data, warnings, errors


def print_reconciliation_report(
    genius_films: dict[tuple[str, str], list[tuple[str, int]]],
    tmdb_lookup: dict[str, int],
    warnings: list[str],
    errors: list[str]
) -> None:
    """Print detailed reconciliation report."""

    total_genius = sum(len(films) for films in genius_films.values())
    total_tmdb = len(tmdb_lookup)

    print("=" * 80)
    print("EXTRACTION RECONCILIATION REPORT")
    print("=" * 80)
    print()

    print(f"GeniusView.swift:      {total_genius:4d} films across {len(genius_films)} (category, tier) pairs")
    print(f"TierTmdbLookup.swift:  {total_tmdb:4d} TMDB entries")
    print()

    # Category breakdown
    category_counts: dict[str, int] = defaultdict(int)
    for (category, tier), films in genius_films.items():
        category_counts[category] += len(films)

    print("Films per category:")
    for category in sorted(category_counts.keys()):
        print(f"  {category:20s} {category_counts[category]:3d} films")
    print()

    # Report issues
    if warnings:
        print(f"--- {len(warnings)} warning(s) ---")
        for w in warnings[:10]:  # Show first 10
            print(f"  WARN  {w}")
        if len(warnings) > 10:
            print(f"  ... and {len(warnings) - 10} more warnings")
        print()

    if errors:
        print(f"--- {len(errors)} error(s) ---")
        for e in errors:
            print(f"  ERROR {e}")
        print()

    if not errors:
        print("✅ EXTRACTION SUCCESSFUL")
        print(f"   {total_genius} films extracted with TMDB IDs")
    else:
        print("❌ EXTRACTION FAILED")
        print(f"   {len(errors)} error(s) must be fixed")

    print()


def main():
    parser = argparse.ArgumentParser(
        description="Extract Genius data from Swift to JSON"
    )
    parser.add_argument(
        "--geniusview",
        type=Path,
        required=True,
        help="Path to GeniusView.swift"
    )
    parser.add_argument(
        "--tmdblookup",
        type=Path,
        required=True,
        help="Path to TierTmdbLookup.swift"
    )
    parser.add_argument(
        "--out",
        type=Path,
        required=True,
        help="Output path for genius_data.json"
    )

    args = parser.parse_args()

    # Validate inputs
    if not args.geniusview.exists():
        print(f"ERROR: GeniusView file not found: {args.geniusview}")
        sys.exit(1)

    if not args.tmdblookup.exists():
        print(f"ERROR: TierTmdbLookup file not found: {args.tmdblookup}")
        sys.exit(1)

    # Parse files
    print("Parsing GeniusView.swift...")
    genius_films = parse_genius_view(args.geniusview)

    print("Parsing TierTmdbLookup.swift...")
    tmdb_lookup = parse_tmdb_lookup(args.tmdblookup)

    print("Merging data...")
    data, warnings, errors = merge_data(genius_films, tmdb_lookup)

    # Print report
    print_reconciliation_report(genius_films, tmdb_lookup, warnings, errors)

    # Write output if no errors
    if errors:
        print(f"\nNOT writing output due to {len(errors)} error(s).")
        print("Fix errors and run again.")
        sys.exit(1)

    # Create output directory if needed
    args.out.parent.mkdir(parents=True, exist_ok=True)

    # Write JSON
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Wrote: {args.out}")
    print(f"   {args.out.stat().st_size:,} bytes")
    print()

    if warnings:
        print(f"⚠️  {len(warnings)} warning(s) - review but not blocking")

    sys.exit(0)


if __name__ == "__main__":
    main()
