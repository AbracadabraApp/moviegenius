#!/usr/bin/env python3
"""
tmdb_filmographies.py — Build "mostly complete" leading-role filmographies
for MovieGenius from the TMDB API.

Takes the 30 actors + 30 actresses lists, resolves each name to a TMDB
person, pulls their full movie credits, filters to LEADING roles, and
writes two clean JSON files.

Outputs:
    data/actors_filmographies.json
    data/actresses_filmographies.json
    data/all_filmographies.json   (combined)

What counts as a "leading role":
    A movie cast credit is kept if ANY of these is true:
      - billing order <= LEAD_ORDER_MAX  (default 2 -> top-3 billed)
      - the role is the title character (heuristic name match)
    Documentaries, talk-show / "as himself" credits, TV, and uncredited
    parts are dropped. See is_leading() and KEEP filters below.

Usage:
    pip install requests
    export TMDB_API_KEY=your_v3_key_here        # the v3 key, not v4 bearer
    python tmdb_filmographies.py                 # both lists
    python tmdb_filmographies.py --only actors
    python tmdb_filmographies.py --only actresses
    python tmdb_filmographies.py --lead-order 1  # stricter: top-2 billed only
    python tmdb_filmographies.py --min-year 1925
    python tmdb_filmographies.py --no-cache

Notes:
  - Uses the TMDB v3 REST API. Get a free key at
    https://www.themoviedb.org/settings/api
  - All API responses are cached to .cache_tmdb/ so re-runs are free and you
    can re-filter (different --lead-order) without re-hitting the API.
  - Sleeps 30ms between calls; ~60 people resolves in about a minute.
  - Person name -> ID resolution takes the most-popular exact match. A few
    names below are pinned by TMDB ID to avoid ambiguity (see PINNED).
"""

import argparse
import json
import os
import re
import sys
import time

try:
    import requests
except ImportError:
    sys.exit("Missing dep. Run:  pip install requests")

API = "https://api.themoviedb.org/3"
CACHE_DIR = ".cache_tmdb"
DATA_DIR = "data"
CALL_SLEEP = 0.03

# --------------------------------------------------------------------------
# The 60 names
# --------------------------------------------------------------------------

ACTORS = [
    "Humphrey Bogart", "James Stewart", "Cary Grant", "Henry Fonda",
    "Spencer Tracy", "James Cagney", "Robert Mitchum", "Burt Lancaster",
    "Kirk Douglas", "Gregory Peck", "John Wayne", "Sidney Poitier",
    "Paul Newman", "Marlon Brando", "Jack Nicholson", "Robert De Niro",
    "Al Pacino", "Dustin Hoffman", "Gene Hackman", "Robert Duvall",
    "Clint Eastwood", "Peter O'Toole", "Daniel Day-Lewis", "Anthony Hopkins",
    "Tom Hanks", "Denzel Washington", "Philip Seymour Hoffman",
    "Joaquin Phoenix", "Leonardo DiCaprio", "Toshiro Mifune",
]

ACTRESSES = [
    "Bette Davis", "Katharine Hepburn", "Barbara Stanwyck", "Ingrid Bergman",
    "Audrey Hepburn", "Elizabeth Taylor", "Vivien Leigh", "Greta Garbo",
    "Marlene Dietrich", "Faye Dunaway", "Jane Fonda", "Liv Ullmann",
    "Vanessa Redgrave", "Sissy Spacek", "Jessica Lange", "Diane Keaton",
    "Meryl Streep", "Cate Blanchett", "Julianne Moore", "Frances McDormand",
    "Nicole Kidman", "Kate Winslet", "Tilda Swinton", "Viola Davis",
    "Helen Mirren", "Judi Dench", "Isabelle Huppert", "Catherine Deneuve",
    "Jeanne Moreau", "Setsuko Hara",
]

# Pin tricky names to a TMDB person ID to avoid wrong matches.
# (Verified IDs; the resolver will use these directly and skip search.)
PINNED = {
    "Bette Davis": 9576,
    "Katharine Hepburn": 12073,
    "Henry Fonda": 4958,  # Corrected ID (was 4955)
    "Jane Fonda": 6352,   # Corrected ID (was 5256)
    "Setsuko Hara": 33409,
    "Toshiro Mifune": 9192,
}

# --------------------------------------------------------------------------
# HTTP with disk cache
# --------------------------------------------------------------------------

def _cache_file(key):
    safe = re.sub(r"[^A-Za-z0-9_.-]", "_", key)
    return os.path.join(CACHE_DIR, safe + ".json")


def api_get(path, params, cache_key, use_cache=True):
    """GET {API}{path} with params. Cache JSON by cache_key."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    cf = _cache_file(cache_key)
    if use_cache and os.path.exists(cf):
        with open(cf, "r", encoding="utf-8") as f:
            return json.load(f)

    key = os.environ.get("TMDB_API_KEY")
    if not key:
        sys.exit("TMDB_API_KEY not set. Get a v3 key at "
                 "https://www.themoviedb.org/settings/api")

    p = dict(params)
    p["api_key"] = key
    r = requests.get(API + path, params=p, timeout=30)
    r.raise_for_status()
    data = r.json()

    with open(cf, "w", encoding="utf-8") as f:
        json.dump(data, f)
    time.sleep(CALL_SLEEP)
    return data

# --------------------------------------------------------------------------
# Resolve a name -> TMDB person id
# --------------------------------------------------------------------------

def resolve_person(name, use_cache=True):
    """Return (person_id, resolved_name) or (None, None)."""
    if name in PINNED:
        return PINNED[name], name

    data = api_get("/search/person", {"query": name, "include_adult": "false"},
                   f"search_{name}", use_cache)
    results = data.get("results", [])
    if not results:
        return None, None

    # Prefer an exact case-insensitive name match; among those, highest
    # popularity. Otherwise fall back to the top (most popular) result.
    exact = [r for r in results if r.get("name", "").lower() == name.lower()]
    pool = exact if exact else results
    pool.sort(key=lambda r: r.get("popularity", 0), reverse=True)
    best = pool[0]
    return best.get("id"), best.get("name")

# --------------------------------------------------------------------------
# Leading-role filtering
# --------------------------------------------------------------------------

# Cast 'character' strings that signal a non-fiction / self appearance.
SELF_MARKERS = ("self", "himself", "herself", "narrator", "host",
                "uncredited", "archive footage")

# TMDB genre id 99 = Documentary.
DOC_GENRE_ID = 99


def is_leading(credit, lead_order_max):
    """
    True if a TMDB movie cast credit counts as a leading role.

    Keep when billing order is within lead_order_max (0-indexed, so 2 keeps
    the top-3 billed). Drop self/host/narrator/uncredited roles.
    """
    order = credit.get("order")
    if order is None:
        return False
    if order > lead_order_max:
        return False

    char = (credit.get("character") or "").lower()
    if any(m in char for m in SELF_MARKERS):
        return False

    return True


def clean_movie(credit):
    """Shape a TMDB cast credit into a MovieGenius filmography entry."""
    title = credit.get("title") or credit.get("original_title") or ""
    date = credit.get("release_date") or ""
    year = None
    if date and len(date) >= 4 and date[:4].isdigit():
        year = int(date[:4])
    return {
        "title": title,
        "year": year,
        "character": credit.get("character") or None,
        "billing_order": credit.get("order"),
        "tmdb_id": credit.get("id"),
        "release_date": date or None,
        "poster_path": credit.get("poster_path"),
        "vote_average": credit.get("vote_average"),
    }


def build_filmography(person_id, lead_order_max, min_year, use_cache=True):
    """Return a sorted list of leading-role movie entries for a person."""
    data = api_get(f"/person/{person_id}/movie_credits", {},
                   f"credits_{person_id}", use_cache)
    cast = data.get("cast", [])

    seen = set()
    films = []
    for c in cast:
        # genre filter: skip pure documentaries
        if DOC_GENRE_ID in (c.get("genre_ids") or []):
            continue
        if not is_leading(c, lead_order_max):
            continue
        entry = clean_movie(c)
        if not entry["title"] or entry["year"] is None:
            continue
        if min_year and entry["year"] < min_year:
            continue
        if entry["tmdb_id"] in seen:
            continue
        seen.add(entry["tmdb_id"])
        films.append(entry)

    films.sort(key=lambda e: (e["year"], e["title"]))
    return films

# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def process(names, label, lead_order_max, min_year, use_cache):
    out = {}
    for name in names:
        pid, resolved = resolve_person(name, use_cache)
        if pid is None:
            print(f"  [!] {name}: no TMDB match — skipped")
            out[name] = []
            continue

        films = build_filmography(pid, lead_order_max, min_year, use_cache)
        out[name] = films

        note = ""
        if resolved and resolved.lower() != name.lower():
            note = f"  (matched TMDB name: {resolved})"
        print(f"  {name}: {len(films)} leading roles{note}")

    total = sum(len(v) for v in out.values())
    print(f"{label}: {len(out)} people, {total} leading-role films")
    return out


def main():
    ap = argparse.ArgumentParser(
        description="Build leading-role filmographies from TMDB.")
    ap.add_argument("--only", choices=["actors", "actresses"],
                    help="Process just one list.")
    ap.add_argument("--lead-order", type=int, default=2,
                    help="Max billing order to count as a lead "
                         "(0-indexed; 2 = top-3 billed). Default 2.")
    ap.add_argument("--min-year", type=int, default=None,
                    help="Drop films before this year.")
    ap.add_argument("--no-cache", action="store_true",
                    help="Ignore cached API responses.")
    args = ap.parse_args()

    use_cache = not args.no_cache
    os.makedirs(DATA_DIR, exist_ok=True)

    combined = {}

    if args.only != "actresses":
        print("\nACTORS")
        actors = process(ACTORS, "Actors", args.lead_order,
                         args.min_year, use_cache)
        with open(os.path.join(DATA_DIR, "actors_filmographies.json"),
                  "w", encoding="utf-8") as f:
            json.dump(actors, f, indent=2, ensure_ascii=False)
        combined["actors"] = actors

    if args.only != "actors":
        print("\nACTRESSES")
        actresses = process(ACTRESSES, "Actresses", args.lead_order,
                            args.min_year, use_cache)
        with open(os.path.join(DATA_DIR, "actresses_filmographies.json"),
                  "w", encoding="utf-8") as f:
            json.dump(actresses, f, indent=2, ensure_ascii=False)
        combined["actresses"] = actresses

    with open(os.path.join(DATA_DIR, "all_filmographies.json"),
              "w", encoding="utf-8") as f:
        json.dump(combined, f, indent=2, ensure_ascii=False)

    print("\nDone. Files in data/.")
    print("Re-run with a different --lead-order anytime; the cache makes it")
    print("instant and offline. Spot-check a few people the first time —")
    print("billing order on TMDB is crowd-sourced and occasionally odd.")


if __name__ == "__main__":
    main()