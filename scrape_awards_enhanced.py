#!/usr/bin/env python3
"""
MovieGenius Enhanced Award Scraper - Multiple Sources

Primary sources:
- 101bananas.com for Oscars (cleaner, more complete)
- Wikipedia for festivals and guilds
- OpenIntro dataset as fallback

Outputs same format as scrape_awards_oscars.py for compatibility.
"""

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse

import requests
from bs4 import BeautifulSoup

# Create directories
DATA_DIR = Path("data")
CACHE_DIR = Path(".cache")
DATA_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

def fetch_html(url: str, use_cache: bool = True) -> str:
    """Fetch HTML from URL with caching."""
    # Clean URL for filename
    cache_name = url.replace('https://', '').replace('http://', '').replace('/', '_').replace('?', '_')
    cache_file = CACHE_DIR / f"{cache_name}.html"

    if use_cache and cache_file.exists():
        print(f"  Using cached: {cache_file.name}")
        return cache_file.read_text(encoding='utf-8')

    print(f"  Fetching: {url}")
    response = requests.get(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; MovieGeniusScraper/2.0)'
    })
    response.raise_for_status()

    # Save to cache
    cache_file.write_text(response.text, encoding='utf-8')
    time.sleep(0.5)  # Be polite

    return response.text

def parse_101bananas_oscars(html: str) -> Dict[str, List[Dict]]:
    """Parse Oscar data from 101bananas.com."""
    soup = BeautifulSoup(html, 'lxml')

    # Categories to extract
    categories = {
        'Best Motion Picture': 'oscar_best_picture',
        'Actor in a Leading Role': 'oscar_best_actor',
        'Actress in a Leading Role': 'oscar_best_actress',
        'Director': 'oscar_best_director',
        'International Feature Film': 'oscar_international'
    }

    results = {key: [] for key in categories.values()}

    # Find main content
    content = soup.find('div', class_='content') or soup.find('body')
    if not content:
        return results

    # Process by year sections
    current_year = None
    current_category = None

    for element in content.descendants:
        if not hasattr(element, 'name'):
            continue

        text = element.get_text().strip() if element else ''

        # Year headers (e.g., "2025", "2024")
        if element.name in ['h2', 'h3', 'strong']:
            year_match = re.match(r'^(19\d{2}|20\d{2})$', text)
            if year_match:
                current_year = int(year_match.group(1))
                continue

        # Category headers
        for cat_name, cat_key in categories.items():
            if cat_name in text:
                current_category = cat_key
                break

        # Winner entries (in capitals)
        if current_year and current_category and text and text[0].isupper():
            # Parse winner line
            # Format: "WINNER NAME in Film Title" or "FILM TITLE"

            if current_category == 'oscar_best_picture':
                # Film entries
                if text.isupper() and ' in ' not in text:
                    # It's a film title in all caps
                    title = text.title()  # Convert to title case
                    results[current_category].append({
                        'year': current_year,
                        'title': title
                    })

            elif current_category in ['oscar_best_actor', 'oscar_best_actress', 'oscar_best_director']:
                # Person entries
                if ' in ' in text or ' for ' in text:
                    parts = re.split(r' (?:in|for) ', text, 1)
                    if len(parts) == 2:
                        person = parts[0].strip()
                        film = parts[1].strip()

                        # Clean up formatting
                        if person.isupper():
                            person = person.title()
                        if film.isupper():
                            film = film.title()

                        entry = {
                            'year': current_year,
                            'person': person,
                            'film': film,
                            'title': film  # For uniform access
                        }

                        results[current_category].append(entry)

            elif current_category == 'oscar_international':
                # International films (might include country)
                if text.isupper():
                    # Parse "TITLE (Country)" format
                    match = re.match(r'(.+?)\s*(?:\(([^)]+)\))?$', text)
                    if match:
                        title = match.group(1).strip().title()
                        country = match.group(2)

                        entry = {
                            'year': current_year,
                            'title': title
                        }
                        if country:
                            entry['country'] = country

                        results[current_category].append(entry)

    return results

def parse_openintro_dataset() -> Dict[str, List[Dict]]:
    """Fetch and parse OpenIntro Oscar dataset (1929-2018)."""
    url = "https://www.openintro.org/data/csv/oscars.csv"

    try:
        print("  Fetching OpenIntro dataset...")
        response = requests.get(url)
        response.raise_for_status()

        # Parse CSV manually (avoid pandas dependency)
        lines = response.text.strip().split('\n')
        if not lines:
            return {}

        # Parse header
        header = lines[0].split(',')

        results = {
            'oscar_best_picture': [],
            'oscar_best_director': [],
            'oscar_best_actor': [],
            'oscar_best_actress': []
        }

        # Parse data rows
        for line in lines[1:]:
            # Handle quoted values with commas
            values = []
            current = []
            in_quotes = False

            for char in line:
                if char == '"':
                    in_quotes = not in_quotes
                elif char == ',' and not in_quotes:
                    values.append(''.join(current).strip('"'))
                    current = []
                else:
                    current.append(char)
            values.append(''.join(current).strip('"'))

            if len(values) < 6:
                continue

            # Map columns (adjust based on actual CSV structure)
            year = int(values[0]) if values[0].isdigit() else None
            if not year:
                continue

            # Add entries for each category
            if len(values) > 1 and values[1]:  # Best Picture
                results['oscar_best_picture'].append({
                    'year': year,
                    'title': values[1]
                })

            if len(values) > 2 and values[2]:  # Best Director
                results['oscar_best_director'].append({
                    'year': year,
                    'person': values[2],
                    'film': values[1],
                    'title': values[1]
                })

            if len(values) > 3 and values[3]:  # Best Actor
                results['oscar_best_actor'].append({
                    'year': year,
                    'person': values[3],
                    'film': values[1],
                    'title': values[1]
                })

            if len(values) > 4 and values[4]:  # Best Actress
                results['oscar_best_actress'].append({
                    'year': year,
                    'person': values[4],
                    'film': values[1],
                    'title': values[1]
                })

        return results

    except Exception as e:
        print(f"  Error fetching OpenIntro dataset: {e}")
        return {}

def deduplicate_entries(entries: List[Dict]) -> List[Dict]:
    """Remove duplicate entries, preferring entries with more data."""
    seen = {}

    for entry in entries:
        # Create key from year and title/person
        if 'person' in entry:
            key = (entry['year'], entry['person'], entry.get('film', ''))
        else:
            key = (entry['year'], entry.get('title', ''))

        if key not in seen:
            seen[key] = entry
        else:
            # Keep entry with more fields
            if len(entry) > len(seen[key]):
                seen[key] = entry

    # Sort by year
    return sorted(seen.values(), key=lambda x: x['year'])

def merge_sources(*sources: List[Dict]) -> List[Dict]:
    """Merge multiple data sources, removing duplicates."""
    all_entries = []
    for source in sources:
        if source:
            all_entries.extend(source)

    return deduplicate_entries(all_entries)

def fetch_wikipedia_festivals() -> Dict[str, List[Dict]]:
    """Fetch festival awards from Wikipedia."""
    results = {}

    # Venice Golden Lion
    venice_url = "https://en.wikipedia.org/wiki/Golden_Lion"
    venice_html = fetch_html(venice_url)
    results['venice_golden_lion'] = parse_wikipedia_festival(venice_html, 'venice')

    # Berlin Golden Bear
    berlin_url = "https://en.wikipedia.org/wiki/Golden_Bear"
    berlin_html = fetch_html(berlin_url)
    results['berlin_golden_bear'] = parse_wikipedia_festival(berlin_html, 'berlin')

    # Golden Globes
    globe_drama_url = "https://en.wikipedia.org/wiki/Golden_Globe_Award_for_Best_Motion_Picture_%E2%80%93_Drama"
    globe_drama_html = fetch_html(globe_drama_url)
    results['golden_globe_drama'] = parse_wikipedia_golden_globe(globe_drama_html)

    globe_comedy_url = "https://en.wikipedia.org/wiki/Golden_Globe_Award_for_Best_Motion_Picture_%E2%80%93_Musical_or_Comedy"
    globe_comedy_html = fetch_html(globe_comedy_url)
    results['golden_globe_comedy'] = parse_wikipedia_golden_globe(globe_comedy_html)

    # SAG
    sag_url = "https://en.wikipedia.org/wiki/Screen_Actors_Guild_Award_for_Outstanding_Performance_by_a_Cast_in_a_Motion_Picture"
    sag_html = fetch_html(sag_url)
    results['sag_outstanding_cast'] = parse_wikipedia_sag(sag_html)

    return results

def parse_wikipedia_festival(html: str, festival: str) -> List[Dict]:
    """Parse Venice or Berlin festival winners from Wikipedia."""
    soup = BeautifulSoup(html, 'lxml')
    winners = []

    for table in soup.find_all('table', class_='wikitable'):
        for row in table.find_all('tr'):
            cells = row.find_all('td')
            if len(cells) < 3:
                continue

            # Extract year
            year_text = cells[0].get_text()
            year_match = re.search(r'\b(19\d{2}|20\d{2})\b', year_text)
            if not year_match:
                continue

            year = int(year_match.group(1))

            # Extract film title
            film_elem = cells[1].find('i') or cells[1].find('a') or cells[1]
            title = film_elem.get_text().strip()

            # Extract director and country
            director = None
            country = None

            for i, cell in enumerate(cells[2:], 2):
                text = cell.get_text().strip()

                # Look for director (usually a linked person)
                if not director and cell.find('a'):
                    link = cell.find('a')
                    if '/wiki/' in link.get('href', ''):
                        director = link.get_text().strip()

                # Last cell is often country
                if i == len(cells) - 1:
                    country = text

            entry = {'year': year, 'title': title}
            if director:
                entry['director'] = director
            if country:
                entry['country'] = country

            winners.append(entry)

    return winners

def parse_wikipedia_golden_globe(html: str) -> List[Dict]:
    """Parse Golden Globe winners from Wikipedia."""
    soup = BeautifulSoup(html, 'lxml')
    winners = []

    for table in soup.find_all('table', class_='wikitable'):
        for row in table.find_all('tr'):
            # Check if winner (has ‡ marker or yellow background)
            if '‡' not in row.get_text() and '#FAEB86' not in str(row):
                continue

            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                continue

            # Extract year
            year_text = cells[0].get_text()
            year_match = re.search(r'\b(19\d{2}|20\d{2})\b', year_text)
            if not year_match:
                continue

            year = int(year_match.group(1))

            # Extract film
            film_elem = cells[1].find('i') or cells[1]
            title = film_elem.get_text().strip().replace('‡', '').strip()

            winners.append({'year': year, 'title': title})

    return winners

def parse_wikipedia_sag(html: str) -> List[Dict]:
    """Parse SAG Outstanding Cast winners from Wikipedia."""
    soup = BeautifulSoup(html, 'lxml')
    winners = []

    for table in soup.find_all('table', class_='wikitable'):
        for row in table.find_all('tr'):
            # Check if winner
            if '‡' not in row.get_text() and '#FAEB86' not in str(row):
                continue

            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                continue

            # Extract year
            year_text = cells[0].get_text()
            year_match = re.search(r'\b(19\d{2}|20\d{2})\b', year_text)
            if not year_match:
                continue

            year = int(year_match.group(1))

            # Extract film
            film_elem = cells[1].find('i') or cells[1]
            title = film_elem.get_text().strip().replace('‡', '').strip()

            winners.append({'year': year, 'title': title})

    return winners

def main():
    parser = argparse.ArgumentParser(description='Enhanced award scraper with multiple sources')
    parser.add_argument('--source', choices=['101bananas', 'wikipedia', 'openintro', 'all'],
                        default='all', help='Data source to use')
    parser.add_argument('--no-cache', action='store_true',
                        help='Force fresh fetch')
    parser.add_argument('--tmdb', action='store_true',
                        help='Enrich with TMDB data')

    args = parser.parse_args()

    all_data = {}

    # Fetch from 101bananas
    if args.source in ['101bananas', 'all']:
        print("\n101bananas.com Oscar Data")
        bananas_html = fetch_html('https://www.101bananas.com/film/oscars.html',
                                 use_cache=not args.no_cache)
        bananas_data = parse_101bananas_oscars(bananas_html)

        for category, entries in bananas_data.items():
            if entries:
                all_data[category] = entries
                print(f"  {category}: {len(entries)} entries")

    # Fetch from OpenIntro
    if args.source in ['openintro', 'all']:
        print("\nOpenIntro Dataset (1929-2018)")
        openintro_data = parse_openintro_dataset()

        for category, entries in openintro_data.items():
            if entries:
                # Merge with existing data
                if category in all_data:
                    all_data[category] = merge_sources(all_data[category], entries)
                else:
                    all_data[category] = entries
                print(f"  {category}: {len(entries)} entries")

    # Fetch festivals and guilds from Wikipedia
    if args.source in ['wikipedia', 'all']:
        print("\nWikipedia Festival & Guild Awards")
        wiki_data = fetch_wikipedia_festivals()

        for category, entries in wiki_data.items():
            if entries:
                all_data[category] = entries
                print(f"  {category}: {len(entries)} entries")

    # Save individual files
    for category, entries in all_data.items():
        if entries:
            output_file = DATA_DIR / f"{category}.json"
            with open(output_file, 'w') as f:
                json.dump(entries, f, indent=2)
            print(f"Saved {output_file}")

    # Save combined file
    all_awards = []
    for category, entries in all_data.items():
        for entry in entries:
            entry['award_category'] = category
        all_awards.extend(entries)

    if all_awards:
        combined_file = DATA_DIR / "all_awards_enhanced.json"
        with open(combined_file, 'w') as f:
            json.dump(all_awards, f, indent=2)
        print(f"\nTotal: {len(all_awards)} entries saved to {combined_file}")

    print("\nDone! Use --source=101bananas for most complete Oscar data.")

if __name__ == "__main__":
    main()