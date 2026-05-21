#!/usr/bin/env python3
"""
Generate Genius list categories from award data for the iOS app.

Creates award-based categories for the Genius feed with proper tmdbId enrichment.
"""

import json
import os
import time
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

import requests

DATA_DIR = Path("data")
OUTPUT_DIR = Path("ios/moviegenius/moviegenius/Resources")

def load_award_data() -> Dict[str, List]:
    """Load all award JSON files from data directory."""
    awards = {}

    # Oscar categories
    oscar_files = [
        ("oscar_best_picture.json", "Best Picture"),
        ("oscar_best_actor.json", "Best Actor"),
        ("oscar_best_actress.json", "Best Actress"),
        ("oscar_best_director.json", "Best Director"),
        ("oscar_best_supporting_actor.json", "Best Supporting Actor"),
        ("oscar_best_supporting_actress.json", "Best Supporting Actress")
    ]

    # Festival awards
    festival_files = [
        ("palme_dor.json", "Palme d'Or"),
        ("venice_golden_lion.json", "Venice Golden Lion"),
        ("berlin_golden_bear.json", "Berlin Golden Bear"),
        ("bafta_best_film.json", "BAFTA Best Film")
    ]

    # Golden Globes
    globe_files = [
        ("golden_globe_drama.json", "Golden Globe Drama"),
        ("golden_globe_comedy.json", "Golden Globe Comedy")
    ]

    all_files = oscar_files + festival_files + globe_files

    for filename, award_name in all_files:
        filepath = DATA_DIR / filename
        if filepath.exists():
            with open(filepath, 'r') as f:
                data = json.load(f)

                # Handle different file formats
                if isinstance(data, dict) and 'entries' in data:
                    awards[award_name] = data['entries']
                elif isinstance(data, list):
                    awards[award_name] = data
                else:
                    print(f"  Unknown format in {filename}")

    return awards

def get_tmdb_id(title: str, year: Optional[int] = None) -> Optional[int]:
    """Fetch TMDB ID for a movie."""
    api_key = os.environ.get('TMDB_API_KEY')
    if not api_key:
        return None

    search_url = "https://api.themoviedb.org/3/search/movie"
    params = {
        'api_key': api_key,
        'query': title
    }
    if year:
        params['year'] = year

    try:
        response = requests.get(search_url, params=params)
        data = response.json()

        if data.get('results'):
            return data['results'][0]['id']
    except:
        pass

    return None

def create_award_genius_categories(awards: Dict[str, List]) -> List[Dict]:
    """Create Genius categories from award data."""
    categories = []

    # 1. Oscar Winners Category
    oscar_category = {
        "category": "Academy Awards",
        "tiers": []
    }

    # Recent Oscar Best Picture Winners (last 25 years)
    best_picture_data = awards.get("Best Picture", [])
    recent_winners = [
        entry for entry in best_picture_data
        if entry.get('year', 0) >= 2000
    ][-25:]  # Last 25 winners

    if recent_winners:
        films = []
        for entry in recent_winners:
            film = {
                "title": entry.get('title') or entry.get('film'),
                "year": entry.get('year')
            }

            # Try to get TMDB ID if available
            if os.environ.get('TMDB_API_KEY'):
                tmdb_id = get_tmdb_id(film['title'], film['year'])
                if tmdb_id:
                    film['tmdbId'] = tmdb_id
                    time.sleep(0.25)  # Rate limit

            films.append(film)

        oscar_category['tiers'].append({
            "name": "Best Picture Winners",
            "subtitle": "Recent Academy Award winners",
            "order": 0,
            "films": films
        })

    # Classic Oscar Winners (pre-2000)
    classic_winners = [
        entry for entry in best_picture_data
        if entry.get('year', 0) < 2000
    ][-25:]  # 25 classic winners

    if classic_winners:
        films = []
        for entry in classic_winners:
            film = {
                "title": entry.get('title') or entry.get('film'),
                "year": entry.get('year')
            }
            films.append(film)

        oscar_category['tiers'].append({
            "name": "Classic Winners",
            "subtitle": "Timeless Oscar champions",
            "order": 1,
            "films": films
        })

    # Acting Legends (multiple Oscar winners)
    actor_winners = defaultdict(list)
    for award_type in ["Best Actor", "Best Actress"]:
        if award_type in awards:
            for entry in awards[award_type]:
                person = entry.get('person')
                if person:
                    actor_winners[person].append(entry)

    # Find actors with multiple wins
    multiple_winners = {
        person: films
        for person, films in actor_winners.items()
        if len(films) >= 2
    }

    if multiple_winners:
        films = []
        for person, entries in list(multiple_winners.items())[:15]:  # Top 15
            # Add their winning films
            for entry in entries[:2]:  # Max 2 films per actor
                film = {
                    "title": entry.get('film') or entry.get('title'),
                    "year": entry.get('year')
                }
                if film not in films:
                    films.append(film)

        oscar_category['tiers'].append({
            "name": "Acting Legends",
            "subtitle": "Multiple Oscar winners",
            "order": 2,
            "films": films[:25]  # Limit to 25 films
        })

    categories.append(oscar_category)

    # 2. International Cinema Category
    international_category = {
        "category": "World Cinema",
        "tiers": []
    }

    # Palme d'Or Winners
    if "Palme d'Or" in awards:
        recent_palme = [
            entry for entry in awards["Palme d'Or"]
            if entry.get('year', 0) >= 2000
        ][-20:]

        films = []
        for entry in recent_palme:
            film = {
                "title": entry.get('title'),
                "year": entry.get('year')
            }
            if entry.get('director'):
                film['director'] = entry['director']
            if entry.get('country'):
                film['country'] = entry['country']
            films.append(film)

        international_category['tiers'].append({
            "name": "Palme d'Or Winners",
            "subtitle": "Cannes Film Festival",
            "order": 0,
            "films": films
        })

    # Venice + Berlin Combined
    festival_films = []
    for festival in ["Venice Golden Lion", "Berlin Golden Bear"]:
        if festival in awards:
            recent = [
                entry for entry in awards[festival]
                if entry.get('year', 0) >= 2005
            ][-10:]  # Last 10 from each

            for entry in recent:
                film = {
                    "title": entry.get('title'),
                    "year": entry.get('year'),
                    "festival": festival.split()[0]  # Venice or Berlin
                }
                festival_films.append(film)

    if festival_films:
        international_category['tiers'].append({
            "name": "European Masters",
            "subtitle": "Venice & Berlin winners",
            "order": 1,
            "films": festival_films[:20]
        })

    categories.append(international_category)

    # 3. Golden Globe Category
    globes_category = {
        "category": "Golden Globes",
        "tiers": []
    }

    # Drama Winners
    if "Golden Globe Drama" in awards:
        recent_drama = [
            entry for entry in awards["Golden Globe Drama"]
            if entry.get('year', 0) >= 2000
        ][-20:]

        films = []
        for entry in recent_drama:
            films.append({
                "title": entry.get('title'),
                "year": entry.get('year')
            })

        globes_category['tiers'].append({
            "name": "Best Drama",
            "subtitle": "Powerful storytelling",
            "order": 0,
            "films": films
        })

    # Comedy/Musical Winners
    if "Golden Globe Comedy" in awards:
        recent_comedy = [
            entry for entry in awards["Golden Globe Comedy"]
            if entry.get('year', 0) >= 2000
        ][-20:]

        films = []
        for entry in recent_comedy:
            films.append({
                "title": entry.get('title'),
                "year": entry.get('year')
            })

        globes_category['tiers'].append({
            "name": "Best Comedy/Musical",
            "subtitle": "Feel-good winners",
            "order": 1,
            "films": films
        })

    categories.append(globes_category)

    return categories

def generate_genius_award_data():
    """Main function to generate award-based Genius lists."""
    print("Loading award data...")
    awards = load_award_data()

    print(f"Found {len(awards)} award categories")
    for award, entries in awards.items():
        print(f"  {award}: {len(entries)} entries")

    print("\nGenerating Genius categories...")
    categories = create_award_genius_categories(awards)

    # Create output structure matching genius_data.json format
    genius_awards = {
        "schemaVersion": 1,
        "categories": categories
    }

    # Save to file
    output_file = OUTPUT_DIR / "genius_awards.json"
    with open(output_file, 'w') as f:
        json.dump(genius_awards, f, indent=2)

    print(f"\nSaved {len(categories)} award categories to {output_file}")

    # Summary
    for cat in categories:
        print(f"\n{cat['category']}:")
        for tier in cat['tiers']:
            print(f"  {tier['name']}: {len(tier['films'])} films")

    return genius_awards

def merge_with_existing_genius():
    """Merge award categories with existing genius_data.json."""
    genius_file = OUTPUT_DIR / "genius_data.json"
    awards_file = OUTPUT_DIR / "genius_awards.json"

    if not awards_file.exists():
        print("Run generate_genius_award_data() first")
        return

    # Load existing data
    with open(genius_file, 'r') as f:
        genius_data = json.load(f)

    with open(awards_file, 'r') as f:
        award_data = json.load(f)

    # Add award categories at the beginning (prestigious placement)
    merged_categories = award_data['categories'] + genius_data['categories']

    genius_data['categories'] = merged_categories

    # Save merged data
    output_file = OUTPUT_DIR / "genius_data_with_awards.json"
    with open(output_file, 'w') as f:
        json.dump(genius_data, f, indent=2)

    print(f"Merged data saved to {output_file}")
    print(f"Total categories: {len(merged_categories)}")

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--merge":
        merge_with_existing_genius()
    else:
        generate_genius_award_data()
        print("\nRun with --merge to combine with existing genius_data.json")