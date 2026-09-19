#!/usr/bin/env python3
"""
MovieGenius Award Scraper — Oscars + Festivals + Guilds

Scrapes major prestige awards from Wikipedia and saves as clean JSON.
Complements the original scrape_awards.py with additional categories.
"""

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
import argparse

import requests
from bs4 import BeautifulSoup

# Create directories
DATA_DIR = Path("data")
CACHE_DIR = Path(".cache")
DATA_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

# Award sources
SOURCES = {
    # Academy Awards
    "oscar_best_picture": {
        "url": "https://en.wikipedia.org/wiki/Academy_Award_for_Best_Picture",
        "name": "Academy Award — Best Picture"
    },
    "oscar_best_director": {
        "url": "https://en.wikipedia.org/wiki/Academy_Award_for_Best_Director",
        "name": "Academy Award — Best Director"
    },
    "oscar_best_actor": {
        "url": "https://en.wikipedia.org/wiki/Academy_Award_for_Best_Actor",
        "name": "Academy Award — Best Actor"
    },
    "oscar_best_actress": {
        "url": "https://en.wikipedia.org/wiki/Academy_Award_for_Best_Actress",
        "name": "Academy Award — Best Actress"
    },
    "oscar_best_supporting_actor": {
        "url": "https://en.wikipedia.org/wiki/Academy_Award_for_Best_Supporting_Actor",
        "name": "Academy Award — Best Supporting Actor"
    },
    "oscar_best_supporting_actress": {
        "url": "https://en.wikipedia.org/wiki/Academy_Award_for_Best_Supporting_Actress",
        "name": "Academy Award — Best Supporting Actress"
    },

    # Film Festivals
    "venice_golden_lion": {
        "url": "https://en.wikipedia.org/wiki/Golden_Lion",
        "name": "Venice — Golden Lion"
    },
    "berlin_golden_bear": {
        "url": "https://en.wikipedia.org/wiki/Golden_Bear",
        "name": "Berlin — Golden Bear"
    },

    # Golden Globes
    "golden_globe_drama": {
        "url": "https://en.wikipedia.org/wiki/Golden_Globe_Award_for_Best_Motion_Picture_%E2%80%93_Drama",
        "name": "Golden Globe — Best Picture, Drama"
    },
    "golden_globe_comedy": {
        "url": "https://en.wikipedia.org/wiki/Golden_Globe_Award_for_Best_Motion_Picture_%E2%80%93_Musical_or_Comedy",
        "name": "Golden Globe — Best Picture, Musical or Comedy"
    },

    # SAG Awards
    "sag_outstanding_cast": {
        "url": "https://en.wikipedia.org/wiki/Screen_Actors_Guild_Award_for_Outstanding_Performance_by_a_Cast_in_a_Motion_Picture",
        "name": "SAG — Outstanding Cast"
    }
}

def fetch_html(url: str, use_cache: bool = True) -> str:
    """Fetch HTML from URL with caching."""
    cache_file = CACHE_DIR / f"{url.split('/')[-1]}.html"

    if use_cache and cache_file.exists():
        print(f"  Using cached: {cache_file.name}")
        return cache_file.read_text(encoding='utf-8')

    print(f"  Fetching: {url}")
    response = requests.get(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; MovieGeniusScraper/1.0)'
    })
    response.raise_for_status()

    # Save to cache
    cache_file.write_text(response.text, encoding='utf-8')
    time.sleep(0.5)  # Be polite to Wikipedia

    return response.text

def extract_year(cell) -> Optional[int]:
    """Extract year from a table cell, avoiding italic film titles."""
    # Get text that's not in italics (film titles)
    non_italic_text = ''.join([
        elem.get_text() if elem.name != 'i' else ''
        for elem in cell.children
    ])

    # Look for 4-digit year
    year_match = re.search(r'\b(19\d{2}|20\d{2})\b', non_italic_text)
    if year_match:
        return int(year_match.group(1))
    return None

def is_winner_row(row) -> bool:
    """Check if a table row represents a winner (not nominee)."""
    # Check for ‡ marker (dagger symbol)
    if '‡' in row.get_text():
        return True

    # Check for winner highlight color
    if row.get('style') and '#FAEB86' in row.get('style'):
        return True

    # Check cells for winner background
    for cell in row.find_all(['td', 'th']):
        if cell.get('style') and '#FAEB86' in cell.get('style'):
            return True
        if cell.get('bgcolor') and 'FAEB86' in cell.get('bgcolor'):
            return True

    return False

def parse_oscar_best_picture(html: str) -> List[Dict]:
    """Parse Best Picture winners."""
    soup = BeautifulSoup(html, 'lxml')
    winners = []

    # Find the main awards table
    for table in soup.find_all('table', class_='wikitable'):
        # Skip summary/records tables
        if 'Most awards' in table.get_text() or 'Most nominations' in table.get_text():
            continue

        for row in table.find_all('tr'):
            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                continue

            # Check if winner
            if not is_winner_row(row):
                continue

            year = extract_year(cells[0])
            if not year:
                continue

            # Film title is in italics in the second cell
            film_elem = cells[1].find('i')
            if film_elem:
                title = film_elem.get_text().strip()
                winners.append({
                    "year": year,
                    "title": title
                })

    return winners

def parse_oscar_person_award(html: str, award_type: str) -> List[Dict]:
    """Parse Oscar acting/directing awards."""
    soup = BeautifulSoup(html, 'lxml')
    winners = []

    for table in soup.find_all('table', class_='wikitable'):
        # Skip summary tables
        if 'Most awards' in table.get_text() or 'Most nominations' in table.get_text():
            continue

        current_year = None

        for row in table.find_all('tr'):
            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                continue

            # Extract year from first cell if present
            year = extract_year(cells[0])
            if year:
                current_year = year

            # For director page, first entry of each year block is winner
            # For actor pages, look for ‡ marker
            if award_type == "director":
                # On director page, winner is first row with this year
                if year == current_year and year:
                    is_winner = True
                else:
                    is_winner = False
            else:
                is_winner = is_winner_row(row)

            if not is_winner or not current_year:
                continue

            # Find person name (usually a link)
            person = None
            film = None

            for cell in cells[1:]:  # Skip year cell
                # Person name
                if not person:
                    person_link = cell.find('a')
                    if person_link and '/wiki/' in person_link.get('href', ''):
                        person_text = person_link.get_text().strip()
                        # Skip if it's a film title (in italics)
                        if not cell.find('i'):
                            person = person_text

                # Film title (in italics)
                if not film:
                    film_elem = cell.find('i')
                    if film_elem:
                        film = film_elem.get_text().strip()

            if person and film:
                winners.append({
                    "year": current_year,
                    "person": person,
                    "film": film,
                    "title": film  # Include for uniform access
                })

    return winners

def parse_festival_award(html: str, festival: str) -> List[Dict]:
    """Parse Venice Golden Lion or Berlin Golden Bear."""
    soup = BeautifulSoup(html, 'lxml')
    winners = []

    # Find winners table
    for table in soup.find_all('table', class_='wikitable'):
        # Look for "Year" and "Film" headers
        headers = [th.get_text().strip() for th in table.find_all('th')]
        if 'Year' not in headers:
            continue

        for row in table.find_all('tr'):
            cells = row.find_all('td')
            if len(cells) < 3:
                continue

            year = extract_year(cells[0])
            if not year:
                continue

            # Film title (often in italics or as a link)
            film_elem = cells[1].find('i') or cells[1].find('a')
            if not film_elem:
                film_elem = cells[1]
            title = film_elem.get_text().strip()

            # Director (usually in the next cell with a person link)
            director = None
            country = None

            for i, cell in enumerate(cells[2:], 2):
                # Skip cells that might be original language titles
                cell_text = cell.get_text().strip()

                # Director is usually a linked person
                if not director:
                    director_link = cell.find('a')
                    if director_link and '/wiki/' in director_link.get('href', ''):
                        # Check it's not a country link
                        if not any(word in director_link.get('href', '') for word in ['Germany', 'France', 'Italy', 'United']):
                            director = director_link.get_text().strip()

                # Country is usually the last cell
                if i == len(cells) - 1:
                    country = cell_text

            entry = {
                "year": year,
                "title": title
            }
            if director:
                entry["director"] = director
            if country:
                entry["country"] = country

            winners.append(entry)

    return winners

def parse_golden_globe(html: str) -> List[Dict]:
    """Parse Golden Globe Best Picture winners."""
    soup = BeautifulSoup(html, 'lxml')
    winners = []

    for table in soup.find_all('table', class_='wikitable'):
        # Skip summary tables
        if 'Most wins' in table.get_text():
            continue

        for row in table.find_all('tr'):
            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                continue

            # Check if winner
            if not is_winner_row(row):
                continue

            year = extract_year(cells[0])
            if not year:
                continue

            # Film title (in italics or as text)
            film_elem = cells[1].find('i')
            if not film_elem:
                # Sometimes just text
                film_text = cells[1].get_text().strip()
                # Remove any markers
                film_text = film_text.replace('‡', '').strip()
                if film_text:
                    title = film_text
                else:
                    continue
            else:
                title = film_elem.get_text().strip()

            winners.append({
                "year": year,
                "title": title
            })

    return winners

def parse_sag_cast(html: str) -> List[Dict]:
    """Parse SAG Outstanding Cast winners."""
    soup = BeautifulSoup(html, 'lxml')
    winners = []

    for table in soup.find_all('table', class_='wikitable'):
        for row in table.find_all('tr'):
            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                continue

            # Check if winner
            if not is_winner_row(row):
                continue

            year = extract_year(cells[0])
            if not year:
                continue

            # Film title
            film_elem = cells[1].find('i')
            if film_elem:
                title = film_elem.get_text().strip()
                winners.append({
                    "year": year,
                    "title": title
                })

    return winners

def enrich_with_tmdb(entries: List[Dict], api_key: str) -> List[Dict]:
    """Add TMDB data to entries."""
    print("  Enriching with TMDB data...")

    for entry in entries:
        title = entry.get('title') or entry.get('film')
        year = entry.get('year')

        if not title:
            continue

        # Search TMDB
        search_url = f"https://api.themoviedb.org/3/search/movie"
        params = {
            'api_key': api_key,
            'query': title,
            'year': year
        }

        try:
            response = requests.get(search_url, params=params)
            data = response.json()

            if data.get('results'):
                movie = data['results'][0]
                entry['tmdb_id'] = movie['id']
                entry['poster_path'] = movie.get('poster_path')
                entry['overview'] = movie.get('overview')
                entry['release_date'] = movie.get('release_date')

            time.sleep(0.25)  # Rate limit
        except Exception as e:
            print(f"    TMDB error for {title}: {e}")

    return entries

def main():
    parser = argparse.ArgumentParser(description='Scrape award winners from Wikipedia')
    parser.add_argument('--only', choices=['oscars', 'festivals', 'globes', 'sag'],
                        help='Only scrape specific group')
    parser.add_argument('--no-cache', action='store_true',
                        help='Force fresh fetch from Wikipedia')
    parser.add_argument('--tmdb', action='store_true',
                        help='Enrich with TMDB data (requires TMDB_API_KEY env var)')

    args = parser.parse_args()

    # Determine which sources to process
    if args.only == 'oscars':
        sources_to_process = {k: v for k, v in SOURCES.items() if k.startswith('oscar_')}
    elif args.only == 'festivals':
        sources_to_process = {k: v for k, v in SOURCES.items() if k in ['venice_golden_lion', 'berlin_golden_bear']}
    elif args.only == 'globes':
        sources_to_process = {k: v for k, v in SOURCES.items() if k.startswith('golden_globe_')}
    elif args.only == 'sag':
        sources_to_process = {'sag_outstanding_cast': SOURCES['sag_outstanding_cast']}
    else:
        sources_to_process = SOURCES

    all_awards = []

    for source_key, source_info in sources_to_process.items():
        print(f"\n{source_info['name']}")

        # Fetch HTML
        html = fetch_html(source_info['url'], use_cache=not args.no_cache)

        # Parse based on source type
        if source_key == 'oscar_best_picture':
            entries = parse_oscar_best_picture(html)
        elif source_key == 'oscar_best_director':
            entries = parse_oscar_person_award(html, 'director')
        elif source_key.startswith('oscar_best'):
            entries = parse_oscar_person_award(html, 'actor')
        elif source_key in ['venice_golden_lion', 'berlin_golden_bear']:
            festival = 'venice' if 'venice' in source_key else 'berlin'
            entries = parse_festival_award(html, festival)
        elif source_key.startswith('golden_globe'):
            entries = parse_golden_globe(html)
        elif source_key == 'sag_outstanding_cast':
            entries = parse_sag_cast(html)
        else:
            entries = []

        if not entries:
            print(f"  WARNING: No entries found for {source_key}")
            continue

        # Enrich with TMDB if requested
        if args.tmdb:
            api_key = os.environ.get('TMDB_API_KEY')
            if not api_key:
                print("  ERROR: TMDB_API_KEY environment variable not set")
                sys.exit(1)
            entries = enrich_with_tmdb(entries, api_key)

        # Save individual file
        output_file = DATA_DIR / f"{source_key}.json"
        with open(output_file, 'w') as f:
            json.dump(entries, f, indent=2)

        print(f"  Saved {len(entries)} entries to {output_file}")

        # Add to combined list
        for entry in entries:
            entry['award'] = source_info['name']
        all_awards.extend(entries)

    # Save combined file
    if all_awards:
        combined_file = DATA_DIR / "all_awards.json"
        with open(combined_file, 'w') as f:
            json.dump(all_awards, f, indent=2)
        print(f"\nTotal: {len(all_awards)} entries saved to {combined_file}")

    print("\nDone!")

if __name__ == "__main__":
    main()