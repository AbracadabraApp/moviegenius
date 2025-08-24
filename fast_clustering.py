#!/usr/bin/env python3

"""
Fast Semantic Clustering - Optimized for 200K+ themes
Uses more efficient algorithms and sampling for speed
"""

import json
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import MiniBatchKMeans  # Faster than regular KMeans
from collections import Counter, defaultdict
import time
import numpy as np

def load_and_group_themes():
    """Load themes and group by name efficiently"""
    print("📁 Loading and grouping themes...")
    
    with open('./generated-lists-batch/all-themes.json', 'r') as f:
        themes = json.load(f)
    
    print(f"📊 Processing {len(themes)} theme entries...")
    
    # Group by theme name using defaultdict for speed
    grouped = defaultdict(lambda: {'movies': set(), 'meta': None})
    
    for theme in themes:
        name = theme['listName']
        grouped[name]['movies'].add(theme['tmdbId'])
        
        if grouped[name]['meta'] is None:
            grouped[name]['meta'] = {
                'slug': theme['slug'],
                'description': theme['description'],
                'category': theme['category']
            }
    
    # Convert to list format
    theme_lists = []
    for name, data in grouped.items():
        theme_lists.append({
            'name': name,
            'movies': list(data['movies']),
            'movieCount': len(data['movies']),
            'slug': data['meta']['slug'],
            'description': data['meta']['description'],
            'category': data['meta']['category']
        })
    
    print(f"📋 Created {len(theme_lists)} unique theme lists")
    
    # Show distribution
    counts = [t['movieCount'] for t in theme_lists]
    print(f"📊 Movie count distribution:")
    print(f"  1 movie: {sum(1 for c in counts if c == 1):,} lists")
    print(f"  2-4 movies: {sum(1 for c in counts if 2 <= c <= 4):,} lists") 
    print(f"  5+ movies: {sum(1 for c in counts if c >= 5):,} lists")
    
    return theme_lists

def fast_clustering(theme_lists, target_clusters=2500):
    """Perform fast clustering using MiniBatchKMeans"""
    print(f"🧠 Fast clustering {len(theme_lists)} themes into ~{target_clusters} clusters...")
    
    # Extract titles
    titles = [theme['name'] for theme in theme_lists]
    
    # Fast TF-IDF with reduced features
    print("📈 Vectorizing titles...")
    vectorizer = TfidfVectorizer(
        max_features=1000,      # Reduced for speed
        stop_words='english',
        ngram_range=(1, 2),     # Reduced n-gram range  
        min_df=2,
        max_df=0.9
    )
    
    X = vectorizer.fit_transform(titles)
    print(f"✅ Created {X.shape[1]} features")
    
    # Fast clustering with MiniBatchKMeans
    print(f"⚡ Running MiniBatchKMeans clustering...")
    start_time = time.time()
    
    kmeans = MiniBatchKMeans(
        n_clusters=target_clusters,
        random_state=42,
        batch_size=1000,        # Process in batches
        max_iter=100           # Fewer iterations for speed
    )
    
    labels = kmeans.fit_predict(X)
    clustering_time = time.time() - start_time
    
    print(f"⚡ Clustering completed in {clustering_time:.1f} seconds")
    
    # Add cluster labels to themes
    for i, theme in enumerate(theme_lists):
        theme['cluster'] = int(labels[i])
    
    return theme_lists, labels

def merge_clusters_fast(clustered_themes):
    """Fast cluster merging"""
    print("🔗 Merging clusters...")
    
    # Group by cluster
    clusters = defaultdict(list)
    for theme in clustered_themes:
        clusters[theme['cluster']].append(theme)
    
    merged_results = []
    merge_stats = []
    
    for cluster_id, themes in clusters.items():
        if len(themes) == 1:
            # Single theme - keep as original
            theme = themes[0]
            merged_results.append({
                'name': theme['name'],
                'slug': theme['slug'],
                'description': theme['description'],
                'category': theme['category'],
                'movies': theme['movies'],
                'movieCount': theme['movieCount'],
                'sourceThemes': 1,
                'processingType': 'original'
            })
        else:
            # Multiple themes - merge
            all_movies = set()
            for theme in themes:
                all_movies.update(theme['movies'])
            
            # Choose canonical name (shortest with most movies)
            best_theme = max(themes, key=lambda t: (t['movieCount'], -len(t['name'])))
            
            merged_theme = {
                'name': best_theme['name'],
                'slug': best_theme['slug'], 
                'description': f"{best_theme['description']} (merged from {len(themes)} themes)",
                'category': best_theme['category'],
                'movies': list(all_movies),
                'movieCount': len(all_movies),
                'sourceThemes': len(themes),
                'processingType': 'clustered'
            }
            
            merged_results.append(merged_theme)
            merge_stats.append({
                'cluster_id': cluster_id,
                'source_count': len(themes),
                'merged_movies': len(all_movies)
            })
    
    print(f"✅ Merged into {len(merged_results)} total themes")
    print(f"📊 {len(merge_stats)} clusters had multiple themes")
    
    if merge_stats:
        avg_merge = sum(s['source_count'] for s in merge_stats) / len(merge_stats)
        max_merge = max(s['source_count'] for s in merge_stats)
        print(f"📈 Average themes per merged cluster: {avg_merge:.1f}")
        print(f"📈 Largest cluster: {max_merge} themes")
    
    return merged_results

def analyze_results(merged_themes):
    """Analyze final results"""
    print("🔍 Analyzing results...")
    
    # Filter for valid themes
    valid_themes = [t for t in merged_themes if t['movieCount'] >= 5 and t['movieCount'] <= 100]
    
    print(f"\n📊 Final Results:")
    print(f"  Total themes: {len(merged_themes):,}")
    print(f"  Valid themes (5-100 movies): {len(valid_themes):,}")
    print(f"  Original valid themes: 524")
    print(f"  Improvement: {len(valid_themes)/524:.1f}x")
    
    # Size distribution
    size_counts = Counter()
    for theme in valid_themes:
        count = theme['movieCount']
        if count <= 10:
            size_counts['5-10'] += 1
        elif count <= 20:
            size_counts['11-20'] += 1  
        elif count <= 50:
            size_counts['21-50'] += 1
        else:
            size_counts['51-100'] += 1
    
    print(f"\n📈 Size Distribution:")
    for size_range, count in sorted(size_counts.items()):
        print(f"  {size_range} movies: {count:,} themes")
    
    # Processing types
    proc_counts = Counter(t['processingType'] for t in valid_themes)
    print(f"\n🔄 Processing Types:")
    for proc_type, count in proc_counts.items():
        print(f"  {proc_type}: {count:,} themes")
    
    # Top clustered examples
    clustered = [t for t in valid_themes if t['processingType'] == 'clustered']
    clustered.sort(key=lambda t: t['movieCount'], reverse=True)
    
    print(f"\n🎬 Top 10 Clustered Themes:")
    for i, theme in enumerate(clustered[:10], 1):
        print(f"  {i}. \"{theme['name']}\" ({theme['movieCount']} movies from {theme['sourceThemes']} sources)")
    
    return valid_themes

def save_results(valid_themes, all_themes):
    """Save results to JSON"""
    print("💾 Saving results...")
    
    results = {
        'metadata': {
            'originalThemes': 211836,
            'totalMergedThemes': len(all_themes),
            'validThemes': len(valid_themes),
            'improvementFactor': round(len(valid_themes) / 524, 1),
            'method': 'TF-IDF + MiniBatchKMeans',
            'generatedAt': pd.Timestamp.now().isoformat()
        },
        'validThemes': valid_themes,
        'allThemes': all_themes[:1000]  # Limit size for performance
    }
    
    output_path = './generated-lists-batch/fast-clustered-themes.json'
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"✅ Saved to: {output_path}")
    return len(valid_themes)

def main():
    """Fast clustering pipeline"""
    print("🚀 Starting fast semantic clustering...\n")
    
    start_time = time.time()
    
    # Load and group themes
    theme_lists = load_and_group_themes()
    
    # Perform clustering  
    clustered_themes, labels = fast_clustering(theme_lists, target_clusters=2500)
    
    # Merge clusters
    merged_themes = merge_clusters_fast(clustered_themes)
    
    # Analyze results
    valid_themes = analyze_results(merged_themes)
    
    # Save results
    final_count = save_results(valid_themes, merged_themes)
    
    total_time = time.time() - start_time
    print(f"\n🎉 Fast clustering completed in {total_time:.1f} seconds!")
    print(f"📈 Generated {final_count:,} substantial theme lists")
    
    return final_count

if __name__ == "__main__":
    main()