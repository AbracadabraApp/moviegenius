#!/usr/bin/env python3
"""
scrape_awards.py — Source three film award/list datasets for MovieGenius.

Sources:
  1. Cannes Palme d'Or winners (Wikipedia)
  2. BAFTA Best Film winners (Wikipedia)
  3. Sight & Sound Greatest Films 2022 — Critics' Poll + Directors' Poll (Wikipedia)

Outputs:
  data/palme_dor.json
  data/bafta_best_film.json
  data/sight_and_sound_2022_critics.json
  data/sight_and_sound_2022_directors.json
  data/all_lists.json   (combined)

Optional:
  --tmdb            Enrich each entry with TMDB id, poster, overview, release_date.
                    Requires TMDB_API_KEY env var (v3 API key, not the v4 bearer).

Usage:
  pip install requests beautifulsoup4 lxml
  python scrape_awards.py                  # scrape all three
  python scrape_awards.py --only palme     # scrape one
  python scrape_awards.py --tmdb           # scrape + TMDB enrich
  python scrape_awards.py --no-cache       # ignore disk cache

The script is polite to Wikipedia: descriptive User-Agent per their bot policy,
small sleep between requests, and HTML is cached to disk so re-runs are free.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup, Tag

# --- Configuration ---------------------------------------------------------

ROOT = Path(__file__).parent
DATA_DIR = ROOT / "data"
CACHE_DIR = ROOT / ".cache"
DATA_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

# Wikipedia requires a descriptive UA per https://meta.wikimedia.org/wiki/User-Agent_policy
UA = "MovieGeniusBot/1.0 (https://moviegenius.ai; research scraper)"
SLEEP_BETWEEN = 1.0  # seconds — be a good citizen
TIMEOUT = 30

SOURCES = {
    "palme":   "https://en.wikipedia.org/wiki/Palme_d%27Or",
    "bafta":   "https://en.wikipedia.org/wiki/BAFTA_Award_for_Best_Film",
    "ss2022":  "https://en.wikipedia.org/wiki/The_Sight_and_Sound_Greatest_Films_of_All_Time_2022",
}


# --- Data model ------------------------------------------------------------

@dataclass
class FilmEntry:
    year: Optional[int] = None          # award year (or release year for S&S)
    rank: Optional[int] = None          # for ranked lists
    title: str = ""
    original_title: Optional[str] = None
    director: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    # TMDB enrichment (optional)
    tmdb_id: Optional[int] = None
    tmdb_release_date: Optional[str] = None
    tmdb_poster_path: Optional[str] = None
    tmdb_overview: Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        return {k: v for k, v in d.items() if v is not None and v != ""}


@dataclass
class AwardList:
    name: str
    source_url: str
    description: str
    entries: list[FilmEntry] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "source_url": self.source_url,
            "description": self.description,
            "count": len(self.entries),
            "entries": [e.to_dict() for e in self.entries],
        }


# --- Fetching (with disk cache) -------------------------------------------

def fetch(url: str, use_cache: bool = True) -> str:
    """Fetch a URL with caching. Raises on non-200."""
    key = re.sub(r"[^A-Za-z0-9._-]", "_", url)[:180]
    cached = CACHE_DIR / f"{key}.html"
    if use_cache and cached.exists():
        return cached.read_text(encoding="utf-8")

    print(f"  GET {url}")
    r = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT)
    r.raise_for_status()
    cached.write_text(r.text, encoding="utf-8")
    time.sleep(SLEEP_BETWEEN)
    return r.text


# --- Parsing helpers -------------------------------------------------------

def clean(s: str) -> str:
    """Normalize whitespace and strip Wikipedia footnote brackets."""
    s = re.sub(r"\[[^\]]*\]", "", s)        # [1], [a], [note 1]
    s = re.sub(r"\s+", " ", s).strip()
    return s


def get_cell_links(cell: Tag) -> list[str]:
    """Return non-citation link texts inside a cell."""
    links = []
    for a in cell.find_all("a"):
        if a.get("href", "").startswith("#cite"):
            continue
        txt = clean(a.get_text())
        if txt:
            links.append(txt)
    return links


def extract_year(text: str) -> Optional[int]:
    m = re.search(r"\b(19|20)\d{2}\b", text)
    return int(m.group(0)) if m else None


# --- Parser: Palme d'Or ----------------------------------------------------

def parse_palme(html: str) -> AwardList:
    """
    Palme d'Or winners. The Wikipedia page has multiple wikitables; we collect
    rows whose first cell is a 4-digit year and which look like winner rows.
    """
    soup = BeautifulSoup(html, "lxml")
    out = AwardList(
        name="Cannes Palme d'Or",
        source_url=SOURCES["palme"],
        description="Highest prize at the Cannes Film Festival, awarded annually since 1955.",
    )

    tables = soup.find_all("table", class_="wikitable")
    seen = set()  # (year, title)

    for table in tables:
        # Get header signature to identify winner tables
        first_row = table.find("tr")
        if not first_row:
            continue
        header_text = " ".join(th.get_text(" ", strip=True).lower()
                               for th in first_row.find_all(["th", "td"]))
        # Skip tables that are clearly something else (jury, records, etc.)
        if "film" not in header_text and "title" not in header_text:
            continue

        # Walk rows; expect [year, film, director, ...] roughly
        rows = table.find_all("tr")
        last_year = None
        for tr in rows[1:]:
            cells = tr.find_all(["th", "td"])
            if len(cells) < 2:
                continue

            # First cell may be year (or rowspan'd year carried over)
            first_text = clean(cells[0].get_text(" "))
            year = extract_year(first_text)
            if year:
                last_year = year
                title_idx = 1
            else:
                year = last_year
                title_idx = 0

            if year is None or year < 1939 or year > 2030:
                continue
            if title_idx >= len(cells):
                continue

            title_cell = cells[title_idx]
            # Skip header-like rows that have <th> as the title cell
            if title_cell.name == "th":
                continue

            title_links = get_cell_links(title_cell)
            title = title_links[0] if title_links else clean(title_cell.get_text(" "))
            # Some rows are headers like "1955 — winners"; bail if empty
            if not title or len(title) > 200:
                continue
            # Skip pure-year rows
            if re.fullmatch(r"\d{4}", title):
                continue

            director = None
            if title_idx + 1 < len(cells):
                dlinks = get_cell_links(cells[title_idx + 1])
                director = ", ".join(dlinks) if dlinks else clean(cells[title_idx + 1].get_text(" "))
                director = director[:150] if director else None

            country = None
            if title_idx + 2 < len(cells):
                clinks = get_cell_links(cells[title_idx + 2])
                country = ", ".join(clinks) if clinks else clean(cells[title_idx + 2].get_text(" "))
                country = country[:100] if country else None

            key = (year, title.lower())
            if key in seen:
                continue
            seen.add(key)

            out.entries.append(FilmEntry(
                year=year,
                title=title,
                director=director,
                country=country,
            ))

    out.entries.sort(key=lambda e: (e.year or 0, e.title))
    return out


# --- Parser: BAFTA Best Film ----------------------------------------------

def parse_bafta(html: str) -> AwardList:
    """
    BAFTA Best Film. Wikipedia structures this as 'wikitable' blocks per decade,
    where winner rows have a gold background and are bolded. We detect winners
    by the row style/class or by the bold tag on the title.
    """
    soup = BeautifulSoup(html, "lxml")
    out = AwardList(
        name="BAFTA Award for Best Film",
        source_url=SOURCES["bafta"],
        description="British Academy Film Awards top prize, given annually since 1947.",
    )

    tables = soup.find_all("table", class_="wikitable")
    seen = set()

    for table in tables:
        rows = table.find_all("tr")
        if not rows:
            continue
        # Heuristic: BAFTA winner tables include a 'Film' column
        header_text = " ".join(th.get_text(" ", strip=True).lower()
                               for th in rows[0].find_all(["th", "td"]))
        if "film" not in header_text:
            continue

        last_year = None
        for tr in rows[1:]:
            cells = tr.find_all(["th", "td"])
            if len(cells) < 2:
                continue

            # Identify winners: row background-color set OR title in <b>
            row_style = (tr.get("style") or "").lower()
            is_winner_row = "background" in row_style and ("ffd" in row_style or "gold" in row_style or "fae" in row_style or "fad" in row_style)

            first_text = clean(cells[0].get_text(" "))
            year = extract_year(first_text)
            if year:
                last_year = year
                title_idx = 1
            else:
                year = last_year
                title_idx = 0

            if year is None or year < 1947 or year > 2030:
                continue
            if title_idx >= len(cells):
                continue

            title_cell = cells[title_idx]
            if title_cell.name == "th":
                continue

            # Title-cell bold detection (alternate winner signal)
            has_bold = title_cell.find("b") is not None or title_cell.find("strong") is not None

            if not (is_winner_row or has_bold):
                continue

            title_links = get_cell_links(title_cell)
            title = title_links[0] if title_links else clean(title_cell.get_text(" "))
            if not title or re.fullmatch(r"\d{4}", title):
                continue
            # BAFTA cell sometimes has director after title in same cell
            title = title.split("—")[0].split(" – ")[0].strip()

            director = None
            if title_idx + 1 < len(cells):
                dcell = cells[title_idx + 1]
                dlinks = get_cell_links(dcell)
                director = ", ".join(dlinks) if dlinks else clean(dcell.get_text(" "))
                director = director[:200] if director else None

            key = (year, title.lower())
            if key in seen:
                continue
            seen.add(key)

            out.entries.append(FilmEntry(year=year, title=title, director=director))

    out.entries.sort(key=lambda e: (e.year or 0, e.title))
    return out


# --- Parser: Sight & Sound 2022 -------------------------------------------

def parse_sight_and_sound(html: str) -> tuple[AwardList, AwardList]:
    """
    Sight & Sound 2022 page has two main wikitables: critics' poll (top 100)
    and directors' poll (top 100). Both have rank, film, director, year, country.
    """
    soup = BeautifulSoup(html, "lxml")

    critics = AwardList(
        name="Sight & Sound Greatest Films 2022 — Critics' Poll",
        source_url=SOURCES["ss2022"],
        description="BFI Sight & Sound decennial poll, 1,639 critics voting. Top 100.",
    )
    directors = AwardList(
        name="Sight & Sound Greatest Films 2022 — Directors' Poll",
        source_url=SOURCES["ss2022"],
        description="BFI Sight & Sound decennial poll, 480 directors voting. Top 100.",
    )

    tables = soup.find_all("table", class_="wikitable")
    poll_tables = []
    for t in tables:
        first_row = t.find("tr")
        if not first_row:
            continue
        headers = [th.get_text(" ", strip=True).lower() for th in first_row.find_all(["th", "td"])]
        joined = " | ".join(headers)
        # Looking for rank + film columns
        if ("rank" in joined or "no." in joined or "no " in joined) and ("film" in joined or "title" in joined):
            poll_tables.append((t, headers))

    if len(poll_tables) < 2:
        print(f"  WARNING: expected 2 poll tables, found {len(poll_tables)}", file=sys.stderr)

    targets = [critics, directors]
    for idx, (table, headers) in enumerate(poll_tables[:2]):
        target = targets[idx]
        # Map column positions
        def col(name_options):
            for i, h in enumerate(headers):
                for opt in name_options:
                    if opt in h:
                        return i
            return None

        rank_i = col(["rank", "no."])
        film_i = col(["film", "title"])
        director_i = col(["director"])
        year_i = col(["year"])
        country_i = col(["country"])

        for tr in table.find_all("tr")[1:]:
            cells = tr.find_all(["th", "td"])
            if len(cells) < 2:
                continue

            def cell(i):
                if i is None or i >= len(cells):
                    return None
                return cells[i]

            rank_cell = cell(rank_i)
            film_cell = cell(film_i)
            if film_cell is None:
                continue

            rank_txt = clean(rank_cell.get_text(" ")) if rank_cell else ""
            rank = None
            m = re.match(r"=?(\d+)", rank_txt)
            if m:
                rank = int(m.group(1))

            film_links = get_cell_links(film_cell)
            title = film_links[0] if film_links else clean(film_cell.get_text(" "))
            if not title:
                continue

            director = None
            dcell = cell(director_i)
            if dcell is not None:
                dlinks = get_cell_links(dcell)
                director = ", ".join(dlinks) if dlinks else clean(dcell.get_text(" "))

            year = None
            ycell = cell(year_i)
            if ycell is not None:
                year = extract_year(ycell.get_text(" "))

            country = None
            ccell = cell(country_i)
            if ccell is not None:
                country = clean(ccell.get_text(" "))[:120] or None

            target.entries.append(FilmEntry(
                rank=rank,
                year=year,
                title=title,
                director=director,
                country=country,
            ))

        target.entries.sort(key=lambda e: (e.rank or 9999, e.title))

    return critics, directors


# --- Optional TMDB enrichment ---------------------------------------------

def tmdb_lookup(title: str, year: Optional[int], api_key: str) -> Optional[dict]:
    """Search TMDB for a movie. Returns the first reasonable hit or None."""
    url = "https://api.themoviedb.org/3/search/movie"
    params = {"api_key": api_key, "query": title, "include_adult": "false"}
    if year:
        params["year"] = year
    try:
        r = requests.get(url, params=params, timeout=TIMEOUT)
        r.raise_for_status()
        results = r.json().get("results") or []
        if not results and year:
            # retry without year (some Wikipedia years are award-year, not release-year)
            params.pop("year")
            r = requests.get(url, params=params, timeout=TIMEOUT)
            r.raise_for_status()
            results = r.json().get("results") or []
        if not results:
            return None
        # If we have a year, prefer the closest match
        if year:
            def year_diff(item):
                rd = item.get("release_date") or ""
                ry = int(rd[:4]) if rd[:4].isdigit() else 0
                return abs(ry - year)
            results = sorted(results, key=year_diff)
        return results[0]
    except Exception as e:
        print(f"    TMDB error for '{title}': {e}", file=sys.stderr)
        return None


def enrich_with_tmdb(award_list: AwardList, api_key: str) -> None:
    print(f"  Enriching {award_list.name} ({len(award_list.entries)} entries)…")
    for i, entry in enumerate(award_list.entries, 1):
        hit = tmdb_lookup(entry.title, entry.year, api_key)
        if hit:
            entry.tmdb_id = hit.get("id")
            entry.tmdb_release_date = hit.get("release_date") or None
            entry.tmdb_poster_path = hit.get("poster_path") or None
            entry.tmdb_overview = hit.get("overview") or None
        if i % 25 == 0:
            print(f"    {i}/{len(award_list.entries)}")
        time.sleep(0.15)  # respect TMDB rate limits


# --- Main ------------------------------------------------------------------

def write_list(award_list: AwardList, filename: str) -> None:
    path = DATA_DIR / filename
    path.write_text(json.dumps(award_list.to_dict(), indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  Wrote {path}  ({len(award_list.entries)} entries)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", choices=["palme", "bafta", "ss"], help="Run only one source")
    ap.add_argument("--tmdb", action="store_true", help="Enrich entries via TMDB (needs TMDB_API_KEY)")
    ap.add_argument("--no-cache", action="store_true", help="Ignore disk cache, force fresh fetch")
    args = ap.parse_args()

    use_cache = not args.no_cache
    tmdb_key = os.environ.get("TMDB_API_KEY") if args.tmdb else None
    if args.tmdb and not tmdb_key:
        print("ERROR: --tmdb requires TMDB_API_KEY env var", file=sys.stderr)
        sys.exit(2)

    all_lists: list[AwardList] = []

    if args.only in (None, "palme"):
        print("Cannes Palme d'Or…")
        html = fetch(SOURCES["palme"], use_cache)
        palme = parse_palme(html)
        if tmdb_key:
            enrich_with_tmdb(palme, tmdb_key)
        write_list(palme, "palme_dor.json")
        all_lists.append(palme)

    if args.only in (None, "bafta"):
        print("BAFTA Best Film…")
        html = fetch(SOURCES["bafta"], use_cache)
        bafta = parse_bafta(html)
        if tmdb_key:
            enrich_with_tmdb(bafta, tmdb_key)
        write_list(bafta, "bafta_best_film.json")
        all_lists.append(bafta)

    if args.only in (None, "ss"):
        print("Sight & Sound 2022…")
        html = fetch(SOURCES["ss2022"], use_cache)
        critics, directors = parse_sight_and_sound(html)
        if tmdb_key:
            enrich_with_tmdb(critics, tmdb_key)
            enrich_with_tmdb(directors, tmdb_key)
        write_list(critics, "sight_and_sound_2022_critics.json")
        write_list(directors, "sight_and_sound_2022_directors.json")
        all_lists.extend([critics, directors])

    # Combined output
    if len(all_lists) > 1:
        combined = {"lists": [l.to_dict() for l in all_lists]}
        (DATA_DIR / "all_lists.json").write_text(
            json.dumps(combined, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"\nWrote {DATA_DIR / 'all_lists.json'}  ({sum(len(l.entries) for l in all_lists)} total entries)")

    print("\nDone.")


if __name__ == "__main__":
    main()
