#!/usr/bin/env python3
"""
Fetch TMDB IDs and filmographies for all persons, then generate iOS JSON.

This script:
1. Fetches TMDB person IDs for all 91 persons
2. Fetches their filmographies (cast/crew credits)
3. Generates the iOS-compatible genius_persons.json
"""

import json
import os
import time
import requests
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict

# Configuration
TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
if not TMDB_API_KEY:
    print("ERROR: Set TMDB_API_KEY environment variable")
    exit(1)

OUTPUT_DIR = Path("ios/moviegenius/moviegenius/Resources")
DATA_DIR = Path("data")

# The complete list of persons
PERSONS_LIST = {
    "actors": [
        "Marlon Brando", "Humphrey Bogart", "James Stewart", "Cary Grant",
        "Spencer Tracy", "Henry Fonda", "Gregory Peck", "Sidney Poitier",
        "Laurence Olivier", "Jack Nicholson", "Al Pacino", "Robert De Niro",
        "Dustin Hoffman", "Gene Hackman", "Paul Newman", "Anthony Hopkins",
        "Michael Caine", "Morgan Freeman", "Daniel Day-Lewis", "Denzel Washington",
        "Tom Hanks", "Philip Seymour Hoffman", "Gary Oldman", "Joaquin Phoenix",
        "Christian Bale", "Leonardo DiCaprio", "Mahershala Ali", "Oscar Isaac",
        "Adam Driver", "Robert Duvall"
    ],
    "actresses": [
        "Katharine Hepburn", "Bette Davis", "Ingrid Bergman", "Audrey Hepburn",
        "Vivien Leigh", "Barbara Stanwyck", "Faye Dunaway", "Jane Fonda",
        "Maggie Smith", "Vanessa Redgrave", "Diane Keaton", "Jessica Lange",
        "Meryl Streep", "Cate Blanchett", "Frances McDormand", "Viola Davis",
        "Kate Winslet", "Julianne Moore", "Tilda Swinton", "Saoirse Ronan",
        "Toni Collette", "Florence Pugh", "Nicole Kidman", "Judi Dench",
        "Helen Mirren", "Glenn Close", "Sigourney Weaver", "Michelle Yeoh",
        "Olivia Colman", "Gena Rowlands"
    ],
    "directors": [
        "Alfred Hitchcock", "Stanley Kubrick", "Akira Kurosawa", "Orson Welles",
        "Ingmar Bergman", "Federico Fellini", "John Ford", "Billy Wilder",
        "Francis Ford Coppola", "Martin Scorsese", "Steven Spielberg", "Sidney Lumet",
        "Roman Polanski", "David Lean", "Jean-Luc Godard", "Andrei Tarkovsky",
        "Yasujiro Ozu", "David Lynch", "Quentin Tarantino", "Joel Coen",
        "Ethan Coen", "Paul Thomas Anderson", "David Fincher", "Christopher Nolan",
        "Spike Lee", "Hayao Miyazaki", "Wong Kar-wai", "Pedro Almodovar",
        "Greta Gerwig", "Bong Joon-ho", "Denis Villeneuve"
    ]
}

def search_person(name: str) -> Optional[Dict]:
    """Search for a person on TMDB and return their data."""
    url = "https://api.themoviedb.org/3/search/person"
    params = {
        'api_key': TMDB_API_KEY,
        'query': name
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        if data['results']:
            # Return the first (most relevant) result
            return data['results'][0]
    except Exception as e:
        print(f"    Error searching for {name}: {e}")

    return None

def get_person_credits(person_id: int, person_type: str) -> List[Dict]:
    """Get movie credits for a person."""
    url = f"https://api.themoviedb.org/3/person/{person_id}/movie_credits"
    params = {'api_key': TMDB_API_KEY}

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        # Get cast or crew credits based on person type
        if person_type == 'directors':
            # For directors, get their directing credits
            credits = []
            for film in data.get('crew', []):
                if film.get('job') == 'Director':
                    credits.append({
                        'tmdb_id': film.get('id'),
                        'title': film.get('title'),
                        'year': int(film.get('release_date', '0000')[:4]) if film.get('release_date') else None,
                        'vote_average': film.get('vote_average', 0),
                        'popularity': film.get('popularity', 0),
                        'poster_path': film.get('poster_path')
                    })
        else:
            # For actors/actresses, get their cast credits
            credits = []
            for film in data.get('cast', []):
                credits.append({
                    'tmdb_id': film.get('id'),
                    'title': film.get('title'),
                    'year': int(film.get('release_date', '0000')[:4]) if film.get('release_date') else None,
                    'vote_average': film.get('vote_average', 0),
                    'popularity': film.get('popularity', 0),
                    'poster_path': film.get('poster_path'),
                    'character': film.get('character'),
                    'order': film.get('order')
                })

        return credits
    except Exception as e:
        print(f"    Error getting credits for person {person_id}: {e}")

    return []

def create_person_tier(name: str, person_type: str, person_id: int, filmography: List[Dict]) -> Dict:
    """Create a tier entry for a person with their top films."""

    # Filter out films with no year or very low ratings
    valid_films = [f for f in filmography if f.get('year') and f.get('vote_average', 0) > 0]

    # Sort by combination of rating and popularity
    sorted_films = sorted(
        valid_films,
        key=lambda x: (x.get('vote_average', 0) * 0.7 + min(x.get('popularity', 0)/100, 10) * 0.3),
        reverse=True
    )

    # Take top 10-12 films
    top_films = sorted_films[:12]

    # Sort by year descending for display
    top_films.sort(key=lambda x: x.get('year', 0), reverse=True)

    # Create film entries
    films = []
    for film in top_films[:10]:  # Limit to 10 for space
        films.append({
            "title": film.get('title', ''),
            "year": film.get('year'),
            "tmdbId": film.get('tmdb_id')
        })

    subtitle = {
        'actors': "Essential performances",
        'actresses': "Essential performances",
        'directors': "Essential films"
    }.get(person_type, "Key works")

    return {
        "name": name,
        "subtitle": subtitle,
        "personTmdbId": person_id,
        "films": films
    }

def fetch_all_data():
    """Main function to fetch all data and generate iOS JSON."""

    print("=" * 60)
    print("FETCHING ALL PERSON DATA FOR iOS")
    print("=" * 60)

    result = {
        "schemaVersion": 1,
        "categories": []
    }

    # Statistics
    stats = defaultdict(int)

    for person_type, names in PERSONS_LIST.items():
        print(f"\n📁 Processing {person_type.upper()}...")
        print("-" * 40)

        tiers = []

        for i, name in enumerate(names):
            print(f"\n[{i+1}/{len(names)}] {name}")

            # Search for person
            person_data = search_person(name)
            if not person_data:
                print(f"  ❌ Not found on TMDB")
                stats['not_found'] += 1
                continue

            person_id = person_data['id']
            print(f"  ✓ Found: ID {person_id}")

            # Get filmography
            filmography = get_person_credits(person_id, person_type)
            if not filmography:
                print(f"  ⚠️  No filmography found")
                stats['no_films'] += 1
                continue

            print(f"  ✓ Found {len(filmography)} films")

            # Create tier
            tier = create_person_tier(name, person_type, person_id, filmography)
            tier['order'] = len(tiers)
            tiers.append(tier)
            stats[person_type] += 1

            # Show sample films
            for film in tier['films'][:3]:
                print(f"    • {film['title']} ({film['year']})")

            # Rate limiting
            time.sleep(0.25)  # Be nice to TMDB API

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

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Actors processed: {stats['actors']}/30")
    print(f"✅ Actresses processed: {stats['actresses']}/30")
    print(f"✅ Directors processed: {stats['directors']}/31")
    print(f"⚠️  Not found: {stats['not_found']}")
    print(f"⚠️  No films: {stats['no_films']}")

    total_persons = sum(len(c['tiers']) for c in result['categories'])
    total_films = sum(len(t['films']) for c in result['categories'] for t in c['tiers'])
    print(f"\n📊 Total persons: {total_persons}")
    print(f"📊 Total films: {total_films}")

    # Save the result
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_DIR / "genius_persons.json"

    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    file_size = output_file.stat().st_size / 1024
    print(f"\n✅ Saved to: {output_file}")
    print(f"📦 File size: {file_size:.1f} KB")

    # Also save a backup with all data
    backup_file = DATA_DIR / "persons_complete_data.json"
    with open(backup_file, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"📋 Backup saved to: {backup_file}")

if __name__ == "__main__":
    fetch_all_data()