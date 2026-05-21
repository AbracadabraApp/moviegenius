#!/usr/bin/env python3
"""
build_local_database.py - Build local SQLite database for MovieGenius v2

Combines all data sources into a single, optimized SQLite database for bundling
with the iOS app. This eliminates network dependencies and enables instant,
offline-capable performance.

Usage:
    python build_local_database.py [--compress] [--validate]

Output:
    moviegenius_v2.sqlite (15-20MB) ready for app bundle
"""

import json
import sqlite3
import os
import hashlib
import gzip
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

# Configuration
DATA_DIR = Path("data")
OUTPUT_DB = "moviegenius_v2.sqlite"
SCHEMA_VERSION = "2.0.0"

# Schema definition
SCHEMA = """
-- Core movie data
CREATE TABLE IF NOT EXISTS movies (
    tmdb_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER,
    overview TEXT,
    poster_path TEXT,
    vote_average REAL,
    popularity REAL,
    release_date TEXT,
    runtime INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI-generated analysis
CREATE TABLE IF NOT EXISTS movie_analysis (
    movie_id INTEGER PRIMARY KEY,
    why_watch TEXT,
    analysis TEXT,
    themes TEXT,
    mood TEXT,
    FOREIGN KEY (movie_id) REFERENCES movies(tmdb_id)
);

-- Collections (Genius lists)
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtitle TEXT,
    category TEXT,
    display_order INTEGER,
    tier_name TEXT,
    tier_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Movies in collections
CREATE TABLE IF NOT EXISTS collection_movies (
    collection_id TEXT,
    movie_id INTEGER,
    position INTEGER,
    PRIMARY KEY (collection_id, movie_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id),
    FOREIGN KEY (movie_id) REFERENCES movies(tmdb_id)
);

-- People (actors, directors)
CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    known_for TEXT,
    profile_path TEXT,
    popularity REAL
);

-- Filmographies
CREATE TABLE IF NOT EXISTS filmographies (
    person_id INTEGER,
    movie_id INTEGER,
    character_name TEXT,
    billing_order INTEGER,
    is_director BOOLEAN DEFAULT 0,
    PRIMARY KEY (person_id, movie_id),
    FOREIGN KEY (person_id) REFERENCES people(id),
    FOREIGN KEY (movie_id) REFERENCES movies(tmdb_id)
);

-- Awards
CREATE TABLE IF NOT EXISTS awards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    year INTEGER,
    festival TEXT
);

-- Award winners
CREATE TABLE IF NOT EXISTS award_winners (
    award_id INTEGER,
    movie_id INTEGER,
    person_id INTEGER,
    year INTEGER,
    PRIMARY KEY (award_id, movie_id),
    FOREIGN KEY (award_id) REFERENCES awards(id),
    FOREIGN KEY (movie_id) REFERENCES movies(tmdb_id),
    FOREIGN KEY (person_id) REFERENCES people(id)
);

-- Metadata
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_movies_year ON movies(year);
CREATE INDEX idx_collection_movies_movie ON collection_movies(movie_id);
CREATE INDEX idx_filmographies_movie ON filmographies(movie_id);
CREATE INDEX idx_people_name ON people(name);
"""

class LocalDatabaseBuilder:
    """Build optimized local database for MovieGenius v2"""

    def __init__(self, output_path: str = OUTPUT_DB):
        self.output_path = output_path
        self.conn = None
        self.cursor = None
        self.stats = {
            'movies': 0,
            'collections': 0,
            'people': 0,
            'awards': 0,
            'relationships': 0
        }

    def build(self):
        """Main build process"""
        print("🏗️  Building MovieGenius v2 Local Database")
        print("=" * 50)

        # Initialize database
        self.init_database()

        # Load data sources
        self.load_genius_data()
        self.load_filmographies()
        self.load_award_data()
        self.load_movie_details()

        # Add metadata
        self.add_metadata()

        # Optimize
        self.optimize_database()

        # Report
        self.print_summary()

        print(f"\n✅ Database built successfully: {self.output_path}")

    def init_database(self):
        """Initialize SQLite database with schema"""
        print("\n📋 Initializing database schema...")

        # Remove old database if exists
        if os.path.exists(self.output_path):
            os.remove(self.output_path)

        # Create new database
        self.conn = sqlite3.connect(self.output_path)
        self.cursor = self.conn.cursor()

        # Create schema
        self.cursor.executescript(SCHEMA)
        self.conn.commit()

        print("   ✓ Schema created")

    def load_genius_data(self):
        """Load Genius collections and movies"""
        print("\n📚 Loading Genius collections...")

        genius_file = DATA_DIR / "../ios/moviegenius/moviegenius/Resources/genius_data.json"
        if not genius_file.exists():
            print("   ⚠️  genius_data.json not found")
            return

        with open(genius_file) as f:
            data = json.load(f)

        for category_data in data.get('categories', []):
            category_name = category_data['category']

            for tier in category_data.get('tiers', []):
                collection_id = f"{category_name}_{tier['name']}".replace(' ', '_').lower()

                # Insert collection
                self.cursor.execute("""
                    INSERT OR IGNORE INTO collections
                    (id, name, subtitle, category, display_order, tier_name, tier_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    collection_id,
                    tier['name'],
                    tier.get('subtitle', ''),
                    category_name,
                    category_data.get('order', 0),
                    tier['name'],
                    tier.get('order', 0)
                ))

                self.stats['collections'] += 1

                # Insert movies
                for position, movie in enumerate(tier.get('films', [])):
                    # Add movie if not exists
                    self.cursor.execute("""
                        INSERT OR IGNORE INTO movies (tmdb_id, title, year)
                        VALUES (?, ?, ?)
                    """, (
                        movie.get('tmdbId', 0),
                        movie['title'],
                        movie.get('year')
                    ))

                    # Link to collection
                    if movie.get('tmdbId'):
                        self.cursor.execute("""
                            INSERT OR IGNORE INTO collection_movies
                            (collection_id, movie_id, position)
                            VALUES (?, ?, ?)
                        """, (collection_id, movie['tmdbId'], position))
                        self.stats['relationships'] += 1

        self.conn.commit()
        print(f"   ✓ Loaded {self.stats['collections']} collections")

    def load_filmographies(self):
        """Load actor/actress filmographies"""
        print("\n🎬 Loading filmographies...")

        # Load actors
        actors_file = DATA_DIR / "actors_filmographies.json"
        if actors_file.exists():
            with open(actors_file) as f:
                actors = json.load(f)
                self._process_filmographies(actors, 'Actor')

        # Load actresses
        actresses_file = DATA_DIR / "actresses_filmographies.json"
        if actresses_file.exists():
            with open(actresses_file) as f:
                actresses = json.load(f)
                self._process_filmographies(actresses, 'Actress')

        self.conn.commit()
        print(f"   ✓ Loaded {self.stats['people']} people")

    def _process_filmographies(self, people_data: Dict, known_for: str):
        """Process filmography data for people"""
        for person_name, films in people_data.items():
            # Generate person ID (simplified - in production use TMDB person ID)
            person_id = abs(hash(person_name)) % (10**8)

            # Insert person
            self.cursor.execute("""
                INSERT OR IGNORE INTO people (id, name, known_for)
                VALUES (?, ?, ?)
            """, (person_id, person_name, known_for))

            self.stats['people'] += 1

            # Insert filmography
            for film in films:
                if film.get('tmdb_id'):
                    # Add movie
                    self.cursor.execute("""
                        INSERT OR IGNORE INTO movies
                        (tmdb_id, title, year, vote_average, release_date)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        film['tmdb_id'],
                        film.get('title', ''),
                        film.get('year'),
                        film.get('vote_average'),
                        film.get('release_date')
                    ))

                    # Link person to movie
                    self.cursor.execute("""
                        INSERT OR IGNORE INTO filmographies
                        (person_id, movie_id, character_name, billing_order)
                        VALUES (?, ?, ?, ?)
                    """, (
                        person_id,
                        film['tmdb_id'],
                        film.get('character'),
                        film.get('billing_order')
                    ))

                    self.stats['movies'] += 1

    def load_award_data(self):
        """Load award winners"""
        print("\n🏆 Loading award data...")

        # Load Oscar winners
        oscar_files = [
            "oscar_best_picture.json",
            "oscar_best_actor.json",
            "oscar_best_actress.json",
            "oscar_best_director.json"
        ]

        for filename in oscar_files:
            filepath = DATA_DIR / filename
            if filepath.exists():
                award_type = filename.replace('oscar_', '').replace('.json', '').replace('_', ' ').title()

                with open(filepath) as f:
                    winners = json.load(f)

                for entry in winners:
                    # Insert award
                    self.cursor.execute("""
                        INSERT INTO awards (name, category, year, festival)
                        VALUES (?, ?, ?, ?)
                    """, (
                        f"Oscar - {award_type}",
                        award_type,
                        entry.get('year'),
                        'Academy Awards'
                    ))

                    award_id = self.cursor.lastrowid
                    self.stats['awards'] += 1

                    # Link to movie if we have it
                    # (In production, would resolve movie title to TMDB ID)

        self.conn.commit()
        print(f"   ✓ Loaded {self.stats['awards']} awards")

    def load_movie_details(self):
        """Load additional movie details and analysis"""
        print("\n🎭 Loading movie details...")

        # This would load from your curated movie analysis files
        # For now, using placeholder

        # Count total unique movies
        self.cursor.execute("SELECT COUNT(DISTINCT tmdb_id) FROM movies")
        total_movies = self.cursor.fetchone()[0]

        print(f"   ✓ Total movies in database: {total_movies}")
        self.stats['movies'] = total_movies

    def add_metadata(self):
        """Add metadata for version tracking"""
        print("\n📊 Adding metadata...")

        metadata = {
            'schema_version': SCHEMA_VERSION,
            'data_version': datetime.now().strftime('%Y.%m.%d'),
            'build_date': datetime.now().isoformat(),
            'movie_count': str(self.stats['movies']),
            'collection_count': str(self.stats['collections']),
            'person_count': str(self.stats['people'])
        }

        for key, value in metadata.items():
            self.cursor.execute("""
                INSERT OR REPLACE INTO metadata (key, value)
                VALUES (?, ?)
            """, (key, value))

        self.conn.commit()
        print("   ✓ Metadata added")

    def optimize_database(self):
        """Optimize database for size and performance"""
        print("\n⚡ Optimizing database...")

        # Analyze for query planning
        self.cursor.execute("ANALYZE")

        # Vacuum to reclaim space
        self.cursor.execute("VACUUM")

        self.conn.commit()

        # Get final size
        file_size = os.path.getsize(self.output_path) / (1024 * 1024)
        print(f"   ✓ Final size: {file_size:.1f} MB")

    def print_summary(self):
        """Print build summary"""
        print("\n" + "=" * 50)
        print("📊 BUILD SUMMARY")
        print("=" * 50)
        print(f"Movies:       {self.stats['movies']:,}")
        print(f"Collections:  {self.stats['collections']:,}")
        print(f"People:       {self.stats['people']:,}")
        print(f"Awards:       {self.stats['awards']:,}")
        print(f"Relationships: {self.stats['relationships']:,}")

        # Database info
        file_size = os.path.getsize(self.output_path) / (1024 * 1024)
        print(f"\nDatabase size: {file_size:.1f} MB")
        print(f"Location: {self.output_path}")

    def validate(self):
        """Validate database integrity"""
        print("\n🔍 Validating database...")

        # Check foreign key constraints
        self.cursor.execute("PRAGMA foreign_key_check")
        fk_errors = self.cursor.fetchall()

        if fk_errors:
            print(f"   ⚠️  Found {len(fk_errors)} foreign key violations")
        else:
            print("   ✓ All foreign keys valid")

        # Check for orphaned records
        self.cursor.execute("""
            SELECT COUNT(*) FROM collection_movies cm
            WHERE NOT EXISTS (
                SELECT 1 FROM movies m WHERE m.tmdb_id = cm.movie_id
            )
        """)
        orphans = self.cursor.fetchone()[0]

        if orphans > 0:
            print(f"   ⚠️  Found {orphans} orphaned collection entries")
        else:
            print("   ✓ No orphaned records")

        return fk_errors == [] and orphans == 0

def main():
    """Main entry point"""
    builder = LocalDatabaseBuilder()
    builder.build()

    # Validate if requested
    import sys
    if '--validate' in sys.argv:
        if builder.validate():
            print("\n✅ Validation passed!")
        else:
            print("\n⚠️  Validation issues found")
            sys.exit(1)

    # Compress if requested
    if '--compress' in sys.argv:
        print("\n📦 Compressing database...")
        with open(OUTPUT_DB, 'rb') as f_in:
            with gzip.open(f"{OUTPUT_DB}.gz", 'wb') as f_out:
                f_out.writelines(f_in)

        compressed_size = os.path.getsize(f"{OUTPUT_DB}.gz") / (1024 * 1024)
        print(f"   ✓ Compressed to {compressed_size:.1f} MB")

if __name__ == "__main__":
    main()