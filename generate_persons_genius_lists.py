#!/usr/bin/env python3
"""
Generate Genius person categories from filmography data for the iOS app.

Creates person-based categories for the Genius feed similar to awards structure.
This generates a static JSON file to be bundled with the iOS app.
"""

import json
from pathlib import Path
from typing import Dict, List, Any
from collections import OrderedDict

DATA_DIR = Path("data")
OUTPUT_DIR = Path("ios/moviegenius/moviegenius/Resources")

def load_persons_data() -> Dict[str, Any]:
    """Load persons list with IDs."""
    filepath = Path("persons-list-with-ids.json")
    with open(filepath, 'r') as f:
        return json.load(f)

def load_filmographies() -> Dict[str, Any]:
    """Load all filmographies data."""
    filepath = DATA_DIR / "all_filmographies.json"
    with open(filepath, 'r') as f:
        return json.load(f)

def create_person_tier(person_name: str, person_type: str, tmdb_id: int, filmography: List[Dict]) -> Dict:
    """Create a tier for a single person with their top films."""

    # Sort films by vote_average descending, then by year descending
    sorted_films = sorted(
        filmography,
        key=lambda x: (x.get('vote_average', 0), x.get('year', 0)),
        reverse=True
    )

    # Take top 10 films
    top_films = sorted_films[:10]

    # Create film entries with tmdbId
    films = []
    for film in top_films:
        films.append({
            "title": film.get('title', ''),
            "year": film.get('year'),
            "tmdbId": film.get('tmdb_id')
        })

    # Sort by year descending for display
    films.sort(key=lambda x: x.get('year', 0), reverse=True)

    subtitle = {
        'actors': f"Essential performances",
        'actresses': f"Essential performances",
        'directors': f"Essential films"
    }.get(person_type, "Key works")

    return {
        "name": person_name,
        "subtitle": subtitle,
        "personTmdbId": tmdb_id,  # Add person's TMDB ID for future use
        "films": films
    }

def create_persons_genius_categories() -> Dict:
    """Create the complete persons genius structure."""

    print("Loading data...")
    persons_data = load_persons_data()
    filmographies = load_filmographies()

    result = {
        "schemaVersion": 1,
        "categories": []
    }

    # Process Actors
    print("\nProcessing actors...")
    actor_tiers = []
    for i, actor in enumerate(persons_data['actors']):
        name = actor['name']
        tmdb_id = actor['tmdbId']

        # Get filmography from all_filmographies.json
        filmography = filmographies.get('actors', {}).get(name, [])

        if filmography:
            tier = create_person_tier(name, 'actors', tmdb_id, filmography)
            tier['order'] = i
            actor_tiers.append(tier)
            print(f"  ✓ {name}: {len(tier['films'])} films")
        else:
            print(f"  ✗ {name}: No filmography found")

    if actor_tiers:
        result['categories'].append({
            "category": "Great Actors",
            "tiers": actor_tiers
        })

    # Process Actresses
    print("\nProcessing actresses...")
    actress_tiers = []
    for i, actress in enumerate(persons_data['actresses']):
        name = actress['name']
        tmdb_id = actress['tmdbId']

        # Get filmography from all_filmographies.json
        filmography = filmographies.get('actresses', {}).get(name, [])

        if filmography:
            tier = create_person_tier(name, 'actresses', tmdb_id, filmography)
            tier['order'] = i
            actress_tiers.append(tier)
            print(f"  ✓ {name}: {len(tier['films'])} films")
        else:
            print(f"  ✗ {name}: No filmography found")

    if actress_tiers:
        result['categories'].append({
            "category": "Great Actresses",
            "tiers": actress_tiers
        })

    # Process Directors
    print("\nProcessing directors...")
    director_tiers = []
    for i, director in enumerate(persons_data['directors']):
        name = director['name']
        tmdb_id = director['tmdbId']

        # Get filmography from all_filmographies.json
        filmography = filmographies.get('directors', {}).get(name, [])

        if filmography:
            tier = create_person_tier(name, 'directors', tmdb_id, filmography)
            tier['order'] = i
            director_tiers.append(tier)
            print(f"  ✓ {name}: {len(tier['films'])} films")
        else:
            print(f"  ✗ {name}: No filmography found")

    if director_tiers:
        result['categories'].append({
            "category": "Master Directors",
            "tiers": director_tiers
        })

    # Statistics
    total_persons = len(actor_tiers) + len(actress_tiers) + len(director_tiers)
    total_films = sum(len(t['films']) for c in result['categories'] for t in c['tiers'])

    print(f"\n=== SUMMARY ===")
    print(f"Total persons: {total_persons}")
    print(f"  Actors: {len(actor_tiers)}")
    print(f"  Actresses: {len(actress_tiers)}")
    print(f"  Directors: {len(director_tiers)}")
    print(f"Total unique films: ~{total_films}")

    return result

def main():
    """Generate the persons genius JSON file."""

    # Create output directory if it doesn't exist
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Generate the data
    persons_data = create_persons_genius_categories()

    # Write to JSON file
    output_file = OUTPUT_DIR / "genius_persons.json"
    with open(output_file, 'w') as f:
        json.dump(persons_data, f, indent=2, ensure_ascii=False)

    # File size
    file_size = output_file.stat().st_size / 1024
    print(f"\n✅ Written to: {output_file}")
    print(f"📦 File size: {file_size:.1f} KB")

    # Sample output for verification
    print(f"\n=== SAMPLE OUTPUT ===")
    print(f"First actor: {persons_data['categories'][0]['tiers'][0]['name']}")
    print(f"Films: {len(persons_data['categories'][0]['tiers'][0]['films'])}")
    for film in persons_data['categories'][0]['tiers'][0]['films'][:3]:
        print(f"  - {film['title']} ({film['year']})")

if __name__ == "__main__":
    main()