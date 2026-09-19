#!/usr/bin/env python3
"""
validate_genius_json.py — Integrity checks for migrated Genius JSON.

Run this after extract_genius_to_json.py and after the 10->5 tier collapse.
It catches the error classes that hardcoded Swift could never be checked
for: missing TMDB ids, duplicate films, malformed tier ordering, schema
drift.

USAGE:
  python validate_genius_json.py path/to/Resources/genius_data.json

Exit code 0 = clean, 1 = problems found (suitable for CI).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


REQUIRED_TOP_KEYS = {"schemaVersion", "categories"}
REQUIRED_CATEGORY_KEYS = {"category", "tiers"}
REQUIRED_TIER_KEYS = {"name", "order", "films"}
REQUIRED_FILM_KEYS = {"title", "year", "tmdbId"}

# Expected totals (18 genre categories only)
# Awards/Actors/Actresses/Directors excluded (separate migration systems)
EXPECTED_TOTAL_FILMS = 1825  # Approximate
EXPECTED_CATEGORIES = 19  # 18 genres + 1 (some variation expected)

# Known genre category names (alphabetical)
KNOWN_CATEGORIES = {
    "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
    "Documentary", "Drama", "Espionage", "Fantasy", "History", "Horror",
    "Mystery", "Noir", "Romance", "Science Fiction", "Thriller", "War", "Western"
}


def validate_file(json_path: Path) -> int:
    """
    Validate genius_data.json file.

    Returns:
        0 if valid, 1 if errors found
    """
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"ERROR: invalid JSON — {e}")
        return 1
    except FileNotFoundError:
        print(f"ERROR: file not found: {json_path}")
        return 1

    errors: list[str] = []
    warnings: list[str] = []
    total_films = 0
    all_tmdb_ids: dict[int, str] = {}  # tmdbId -> "category/tier/title" first seen

    # Top-level shape
    missing = REQUIRED_TOP_KEYS - data.keys()
    if missing:
        errors.append(f"Missing top-level keys: {missing}")
        return 1

    if data["schemaVersion"] != 1:
        errors.append(f"Expected schemaVersion: 1, got {data['schemaVersion']}")

    categories = data.get("categories", [])

    # Category count check
    if len(categories) != EXPECTED_CATEGORIES:
        warnings.append(
            f"Expected {EXPECTED_CATEGORIES} categories, found {len(categories)}"
        )

    category_names_seen = set()

    for cat in categories:
        # Category-level shape
        missing_cat = REQUIRED_CATEGORY_KEYS - cat.keys()
        if missing_cat:
            errors.append(f"Category missing keys {missing_cat}: {cat}")
            continue

        cat_name = cat["category"]
        ctx = cat_name

        if cat_name in category_names_seen:
            errors.append(f"Duplicate category: '{cat_name}'")
        category_names_seen.add(cat_name)

        if cat_name not in KNOWN_CATEGORIES:
            warnings.append(f"Unknown category: '{cat_name}'")

        tiers = cat.get("tiers", [])

        # Tier order must be 0..N-1 with no gaps or dupes
        orders = sorted(t.get("order", -1) for t in tiers)
        expected_orders = list(range(len(tiers)))
        if orders != expected_orders:
            errors.append(
                f"{ctx}: tier 'order' values {orders} should be {expected_orders}"
            )

        tier_names_seen = set()

        for tier in tiers:
            missing_t = REQUIRED_TIER_KEYS - tier.keys()
            if missing_t:
                errors.append(f"{ctx}: tier missing keys {missing_t}")
                continue

            tname = tier["name"]
            if tname in tier_names_seen:
                errors.append(f"{ctx}: duplicate tier name '{tname}'")
            tier_names_seen.add(tname)

            films = tier.get("films", [])
            if not films:
                warnings.append(f"{ctx} [{tname}]: tier has zero films")

            films_seen = set()
            for film in films:
                total_films += 1
                missing_f = REQUIRED_FILM_KEYS - film.keys()
                if missing_f:
                    errors.append(
                        f"{ctx} [{tname}]: film missing keys {missing_f}: {film}"
                    )
                    continue

                title = film["title"]
                year = film["year"]
                tmdb = film["tmdbId"]
                label = f"{cat_name}/{tname}/{title} ({year})"

                # TMDB id sanity
                if tmdb == 0:
                    errors.append(
                        f"{ctx} [{tname}]: '{title}' has tmdbId 0 (sentinel — missing id)"
                    )
                elif not isinstance(tmdb, int) or tmdb < 0:
                    errors.append(
                        f"{ctx} [{tname}]: '{title}' has bad tmdbId {tmdb!r}"
                    )

                # Year sanity
                if not isinstance(year, int) or year < 1888 or year > 2030:
                    warnings.append(
                        f"{ctx} [{tname}]: '{title}' has suspicious year {year}"
                    )

                # Duplicate film within a tier
                fkey = (title.lower(), year)
                if fkey in films_seen:
                    errors.append(
                        f"{ctx} [{tname}]: duplicate film '{title}' ({year})"
                    )
                films_seen.add(fkey)

                # Same TMDB id appearing in multiple places
                if tmdb and tmdb != 0:
                    if tmdb in all_tmdb_ids:
                        warnings.append(
                            f"tmdbId {tmdb} appears twice: "
                            f"{all_tmdb_ids[tmdb]} and {label}"
                        )
                    else:
                        all_tmdb_ids[tmdb] = label

    # Total film count check
    if total_films != EXPECTED_TOTAL_FILMS:
        warnings.append(
            f"Expected {EXPECTED_TOTAL_FILMS} total films, found {total_films}"
        )

    # Report
    print(f"Checked {len(categories)} categories, {total_films} film entries.\n")

    if warnings:
        print(f"--- {len(warnings)} warning(s) ---")
        for w in warnings:
            print(f"  WARN  {w}")
        print()

    if errors:
        print(f"--- {len(errors)} error(s) ---")
        for e in errors:
            print(f"  ERROR {e}")
        print(f"\nFAILED: {len(errors)} error(s) must be fixed.")
        return 1

    print("✅ PASSED: no errors.")
    if warnings:
        print(f"({len(warnings)} warning(s) — review but not blocking.)")
    return 0


def main():
    if len(sys.argv) != 2:
        print("Usage: python validate_genius_json.py path/to/genius_data.json")
        sys.exit(2)

    json_path = Path(sys.argv[1])

    if not json_path.exists():
        print(f"ERROR: file not found: {json_path}")
        sys.exit(2)

    sys.exit(validate_file(json_path))


if __name__ == "__main__":
    main()
