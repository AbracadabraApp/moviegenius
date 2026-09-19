#!/usr/bin/env python3
"""Quick test to fetch a few persons and verify the process."""

import json
import os
import requests
import time

TMDB_API_KEY = os.environ.get('TMDB_API_KEY', '82e53d2dd47988e591a149b9820a0d9c')

# Load persons with IDs
with open("persons-list-with-ids.json", 'r') as f:
    persons_data = json.load(f)

# Test with first 3 of each category
test_persons = {
    'actors': persons_data['actors'][:3],
    'actresses': persons_data['actresses'][:3],
    'directors': persons_data['directors'][:3]
}

result = {"schemaVersion": 1, "categories": []}

for person_type, persons in test_persons.items():
    print(f"\n{person_type.upper()}:")
    tiers = []

    for person in persons:
        name = person['name']
        tmdb_id = person['tmdbId']
        print(f"  {name} (ID: {tmdb_id})")

        # Get credits
        url = f"https://api.themoviedb.org/3/person/{tmdb_id}/movie_credits"
        response = requests.get(url, params={'api_key': TMDB_API_KEY})

        if response.status_code == 200:
            data = response.json()

            if person_type == 'directors':
                films = [f for f in data.get('crew', []) if f.get('job') == 'Director']
            else:
                films = data.get('cast', [])

            # Get top 5 films by rating
            films = sorted(films, key=lambda x: x.get('vote_average', 0), reverse=True)[:5]

            tier_films = []
            for f in films:
                if f.get('release_date'):
                    year = int(f['release_date'][:4])
                    tier_films.append({
                        "title": f['title'],
                        "year": year,
                        "tmdbId": f['id']
                    })

            tiers.append({
                "name": name,
                "subtitle": "Top films",
                "personTmdbId": tmdb_id,
                "films": tier_films,
                "order": len(tiers)
            })

            print(f"    ✓ Found {len(films)} films")
        else:
            print(f"    ✗ Error: {response.status_code}")

        time.sleep(0.25)

    if tiers:
        category_names = {
            'actors': "Great Actors",
            'actresses': "Great Actresses",
            'directors': "Master Directors"
        }
        result['categories'].append({
            "category": category_names[person_type],
            "tiers": tiers
        })

# Save test output
with open("test_persons_output.json", 'w') as f:
    json.dump(result, f, indent=2)

print(f"\n✅ Test complete! Saved to test_persons_output.json")
print(f"Generated {sum(len(c['tiers']) for c in result['categories'])} persons")