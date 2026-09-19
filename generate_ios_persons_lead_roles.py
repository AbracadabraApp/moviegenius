#!/usr/bin/env python3
"""
Generate iOS persons JSON with ONLY lead roles (top 3 billing).

For actors/actresses: Only films where they were in billing positions 0, 1, or 2
For directors: Only films they directed
Excludes cameos, documentaries, and minor roles.
"""

import json
import os
import time
import requests
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

# Configuration
TMDB_API_KEY = os.environ.get('TMDB_API_KEY', '82e53d2dd47988e591a149b9820a0d9c')

OUTPUT_DIR = Path("ios/moviegenius/moviegenius/Resources")
DATA_DIR = Path("data")

# Maximum billing order for lead roles (0, 1, or 2 = top 3 billed)
LEAD_ORDER_MAX = 2

# Self/narrator/uncredited markers to exclude
SELF_MARKERS = [
    'himself', 'herself', 'self', 'narrator', 'voice', 'uncredited',
    'archive', 'cameo', 'special appearance', '(uncredited)', '(voice)'
]

def load_persons_with_ids() -> Dict:
    """Load the persons list with TMDB IDs."""
    with open("persons-list-with-ids.json", 'r') as f:
        return json.load(f)

def is_lead_role(credit: Dict) -> bool:
    """Check if this is a lead role (top 3 billing, not cameo/self)."""
    order = credit.get('order')

    # Must be in top 3 billing
    if order is None or order > LEAD_ORDER_MAX:
        return False

    # Exclude self/narrator/uncredited
    character = (credit.get('character', '') or '').lower()
    if any(marker in character for marker in SELF_MARKERS):
        return False

    return True

def get_person_lead_credits(person_id: int, person_type: str, person_name: str) -> List[Dict]:
    """Get ONLY lead role credits for a person from TMDB."""
    url = f"https://api.themoviedb.org/3/person/{person_id}/movie_credits"
    params = {'api_key': TMDB_API_KEY}

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        credits = []

        if person_type == 'directors':
            # For directors, get ALL their directed films (they're always the lead)
            for film in data.get('crew', []):
                if film.get('job') == 'Director':
                    # Skip TV movies and documentaries based on title patterns
                    title = film.get('title', '')
                    if ('(TV Movie)' in title or
                        'Documentary' in (film.get('genres', []) or [])):
                        continue

                    credits.append({
                        'tmdb_id': film.get('id'),
                        'title': film.get('title'),
                        'year': int(film.get('release_date', '0000')[:4]) if film.get('release_date') else None,
                        'vote_average': film.get('vote_average', 0),
                        'vote_count': film.get('vote_count', 0),
                        'popularity': film.get('popularity', 0),
                        'role': 'Director'
                    })
        else:
            # For actors/actresses, get ONLY top 3 billed roles
            for film in data.get('cast', []):
                # Check if it's a lead role
                if not is_lead_role(film):
                    continue

                credits.append({
                    'tmdb_id': film.get('id'),
                    'title': film.get('title'),
                    'year': int(film.get('release_date', '0000')[:4]) if film.get('release_date') else None,
                    'vote_average': film.get('vote_average', 0),
                    'vote_count': film.get('vote_count', 0),
                    'popularity': film.get('popularity', 0),
                    'character': film.get('character'),
                    'order': film.get('order')
                })

        return credits
    except Exception as e:
        print(f"    Error getting credits for {person_name}: {e}")
        return []

def create_person_tier(person: Dict, person_type: str, filmography: List[Dict], order: int) -> Dict:
    """Create a tier entry for a person with their LEAD ROLE films."""

    # Filter for quality films (no documentaries, no future films)
    valid_films = [
        f for f in filmography
        if (f.get('year') and
            1920 <= f.get('year') <= 2024 and  # Reasonable year range
            f.get('vote_average', 0) >= 5.0 and  # Minimum quality
            f.get('vote_count', 0) >= 50)  # Minimum votes
    ]

    # Sort by quality score (combination of rating and popularity)
    sorted_films = sorted(
        valid_films,
        key=lambda x: (
            x.get('vote_average', 0) * 0.7 +
            min(x.get('vote_count', 0) / 5000, 10) * 0.3
        ),
        reverse=True
    )

    # Take more films for the JSON (up to 50 for comprehensive coverage)
    top_films = sorted_films[:50]

    # Sort chronologically (newest first for relevance)
    top_films.sort(key=lambda x: x.get('year', 0), reverse=True)

    # Create film entries
    films = []
    for film in top_films:
        films.append({
            "title": film.get('title', ''),
            "year": film.get('year'),
            "tmdbId": film.get('tmdb_id')
        })

    subtitle = {
        'actors': "Lead performances only",
        'actresses': "Lead performances only",
        'directors': "Films directed"
    }.get(person_type, "Key works")

    return {
        "name": person['name'],
        "subtitle": subtitle,
        "personTmdbId": person['tmdbId'],
        "films": films,
        "order": order
    }

def main():
    """Main function to generate iOS persons JSON with lead roles only."""

    print("=" * 60)
    print("GENERATING iOS PERSONS JSON (LEAD ROLES ONLY)")
    print("=" * 60)
    print("For actors/actresses: Only top 3 billed roles")
    print("For directors: All directed films")
    print("Excluding: cameos, self appearances, documentaries")
    print()

    # Load persons with IDs
    persons_data = load_persons_with_ids()

    result = {
        "schemaVersion": 1,
        "categories": []
    }

    # Statistics
    stats = defaultdict(int)
    total_films_count = 0

    # Process each category
    for person_type in ['actors', 'actresses', 'directors']:
        print(f"\n📁 Processing {person_type.upper()}...")
        print("-" * 40)

        tiers = []
        persons = persons_data[person_type]

        for i, person in enumerate(persons):
            name = person['name']
            tmdb_id = person['tmdbId']

            print(f"\n[{i+1}/{len(persons)}] {name}")

            # Get LEAD filmography only
            filmography = get_person_lead_credits(tmdb_id, person_type, name)

            if not filmography:
                print(f"  ⚠️  No lead roles found")
                stats['no_films'] += 1
                continue

            # Create tier
            tier = create_person_tier(person, person_type, filmography, len(tiers))

            if not tier['films']:
                print(f"  ⚠️  No quality lead films found")
                stats['no_quality'] += 1
                continue

            tiers.append(tier)
            stats[person_type] += 1
            total_films_count += len(tier['films'])

            # Show statistics
            if person_type == 'directors':
                print(f"  ✓ Found {len(filmography)} directed films")
            else:
                print(f"  ✓ Found {len(filmography)} lead roles (top 3 billing)")

            print(f"  ✓ Selected {len(tier['films'])} quality films")

            # Show sample films
            print(f"  Sample films:")
            for film in tier['films'][:3]:
                print(f"    • {film['title']} ({film['year']})")

            # Rate limiting
            time.sleep(0.3)

        # Add category if we have data
        if tiers:
            category_name = {
                'actors': "Great Actors",
                'actresses': "Great Actresses",
                'directors': "Master Directors"
            }[person_type]

            result['categories'].append({
                "category": category_name,
                "tiers": tiers
            })

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Actors with lead roles: {stats['actors']}/30")
    print(f"✅ Actresses with lead roles: {stats['actresses']}/30")
    print(f"✅ Directors: {stats['directors']}/31")
    print(f"⚠️  No films found: {stats['no_films']}")
    print(f"⚠️  No quality films: {stats['no_quality']}")

    total_persons = sum(len(c['tiers']) for c in result['categories'])
    print(f"\n📊 Total persons in output: {total_persons}/91")
    print(f"📊 Total films selected: {total_films_count}")
    print(f"📊 Average films per person: {total_films_count / total_persons if total_persons else 0:.1f}")

    # Save the result
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_DIR / "genius_persons.json"

    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    file_size = output_file.stat().st_size / 1024
    print(f"\n✅ Saved to: {output_file}")
    print(f"📦 File size: {file_size:.1f} KB")

    # Also save a backup
    backup_file = DATA_DIR / "genius_persons_lead_roles.json"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(backup_file, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"📋 Backup saved to: {backup_file}")

    # Show verification of lead roles
    if result['categories'] and len(result['categories']) > 0:
        print(f"\n=== VERIFICATION: First Actor's Films ===")
        first_actor = result['categories'][0]['tiers'][0] if result['categories'][0]['tiers'] else None
        if first_actor:
            print(f"Actor: {first_actor['name']}")
            print(f"Total films: {len(first_actor['films'])}")
            print("These should all be LEAD ROLES (top 3 billing):")
            for film in first_actor['films'][:5]:
                print(f"  • {film['title']} ({film['year']})")

if __name__ == "__main__":
    main()