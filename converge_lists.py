#!/usr/bin/env python3

"""
Semantic Clustering of Movie Lists
Converge 200K+ micro-themes into 2-5K substantial lists using TF-IDF + KMeans
"""

import json
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import numpy as np
from collections import Counter
import time

def load_themes():
    """Load themes from JSON and prepare for clustering"""
    print("📁 Loading themes from all-themes.json...")
    
    with open('./generated-lists-batch/all-themes.json', 'r') as f:
        themes = json.load(f)
    
    print(f"📊 Loaded {len(themes)} theme entries")
    
    # Convert to DataFrame for easier processing
    df = pd.DataFrame(themes)
    print(f"🔍 Found {df['listName'].nunique()} unique theme names")
    
    return df

def prepare_clustering_data(df):
    """Group by theme name and prepare data for clustering"""
    print("🔄 Grouping themes by name and aggregating movies...")
    
    # Group by theme name to get unique lists with all their movies
    grouped = df.groupby('listName').agg({
        'tmdbId': list,
        'slug': 'first',
        'description': 'first', 
        'category': 'first',
        'connectionReason': list
    }).reset_index()
    
    # Add movie count
    grouped['movieCount'] = grouped['tmdbId'].apply(lambda x: len(set(x)))
    
    # Remove duplicates from movie lists
    grouped['tmdbId'] = grouped['tmdbId'].apply(lambda x: list(set(x)))
    grouped['connectionReason'] = grouped['connectionReason'].apply(lambda x: x[0] if x else '')
    
    print(f"📋 Prepared {len(grouped)} unique theme lists for clustering")
    print(f"📊 Movie count distribution:")
    
    size_dist = grouped['movieCount'].value_counts().sort_index()
    for count, freq in size_dist.head(10).items():
        print(f"  {count} movies: {freq} lists")
    
    return grouped

def perform_clustering(grouped_df, target_clusters=3000):
    """Perform TF-IDF vectorization and KMeans clustering"""
    print(f"🧠 Vectorizing {len(grouped_df)} theme titles with TF-IDF...")
    
    # Extract titles for clustering
    titles = grouped_df['listName'].tolist()
    
    # TF-IDF vectorization
    vectorizer = TfidfVectorizer(
        max_features=2000,           # Increased features for better semantics
        stop_words='english',
        ngram_range=(1, 3),         # Include 1-3 word phrases
        min_df=2,                   # Word must appear at least 2 times
        max_df=0.95                 # Ignore words in >95% of documents
    )
    
    X = vectorizer.fit_transform(titles)
    print(f"📈 Created {X.shape[1]} features from titles")
    
    # Determine optimal number of clusters (start with target, may adjust)
    print(f"🎯 Performing KMeans clustering with {target_clusters} clusters...")
    
    kmeans = KMeans(
        n_clusters=target_clusters,
        random_state=42,
        max_iter=300,
        n_init=10
    )
    
    start_time = time.time()
    cluster_labels = kmeans.fit_predict(X)
    clustering_time = time.time() - start_time
    
    print(f"⚡ Clustering completed in {clustering_time:.1f} seconds")
    
    # Add cluster labels to dataframe
    grouped_df = grouped_df.copy()
    grouped_df['cluster'] = cluster_labels
    
    # Calculate silhouette score for quality assessment
    print("📏 Calculating clustering quality (silhouette score)...")
    
    # Sample for silhouette score if too large (it's computationally expensive)
    sample_size = min(10000, len(grouped_df))
    if len(grouped_df) > sample_size:
        sample_idx = np.random.choice(len(grouped_df), sample_size, replace=False)
        X_sample = X[sample_idx]
        labels_sample = cluster_labels[sample_idx]
    else:
        X_sample = X
        labels_sample = cluster_labels
    
    silhouette_avg = silhouette_score(X_sample, labels_sample)
    print(f"📊 Silhouette Score: {silhouette_avg:.3f}")
    print("   (>0.2 is decent, >0.3 is good for text clustering)")
    
    return grouped_df, vectorizer, kmeans, silhouette_avg

def merge_clusters(clustered_df):
    """Merge themes within each cluster"""
    print("🔗 Merging themes within clusters...")
    
    merged_lists = []
    cluster_stats = []
    
    for cluster_id in sorted(clustered_df['cluster'].unique()):
        cluster_themes = clustered_df[clustered_df['cluster'] == cluster_id]
        
        if len(cluster_themes) == 1:
            # Single theme - keep as is
            theme = cluster_themes.iloc[0]
            merged_lists.append({
                'name': theme['listName'],
                'slug': theme['slug'],
                'description': theme['description'],
                'category': theme['category'],
                'movies': theme['tmdbId'],
                'movieCount': theme['movieCount'],
                'sourceThemes': 1,
                'clusterSize': 1,
                'processingType': 'original'
            })
        else:
            # Multiple themes - merge them
            
            # Choose canonical name (most common words + shortest)
            canonical_name = choose_canonical_name(cluster_themes['listName'].tolist())
            
            # Merge all movies
            all_movies = []
            for movie_list in cluster_themes['tmdbId']:
                all_movies.extend(movie_list)
            unique_movies = list(set(all_movies))
            
            # Choose best description and category
            canonical_desc = cluster_themes['description'].iloc[0]
            canonical_category = cluster_themes['category'].mode().iloc[0]
            canonical_slug = canonical_name.lower().replace(' ', '-').replace('[^a-z0-9-]', '')[:50]
            
            merged_lists.append({
                'name': canonical_name,
                'slug': canonical_slug,
                'description': f"{canonical_desc} (merged from {len(cluster_themes)} related themes)",
                'category': canonical_category,
                'movies': unique_movies,
                'movieCount': len(unique_movies),
                'sourceThemes': len(cluster_themes),
                'clusterSize': len(cluster_themes),
                'processingType': 'clustered'
            })
            
            cluster_stats.append({
                'cluster_id': cluster_id,
                'source_themes': len(cluster_themes),
                'source_movies': sum(cluster_themes['movieCount']),
                'merged_movies': len(unique_movies),
                'canonical_name': canonical_name
            })
    
    print(f"✅ Created {len(merged_lists)} merged theme lists")
    
    # Show clustering stats
    if cluster_stats:
        cluster_df = pd.DataFrame(cluster_stats)
        print(f"\n📊 Clustering Statistics:")
        print(f"  Clusters with multiple themes: {len(cluster_stats)}")
        print(f"  Average themes per cluster: {cluster_df['source_themes'].mean():.1f}")
        print(f"  Max themes in cluster: {cluster_df['source_themes'].max()}")
        print(f"  Average movie gain per cluster: {(cluster_df['merged_movies'] - cluster_df['source_movies']/cluster_df['source_themes']).mean():.1f}")
    
    return merged_lists, cluster_stats

def choose_canonical_name(names):
    """Choose the best canonical name from a cluster of similar names"""
    
    # Strategy: Find most common words, prefer shorter names
    all_words = []
    for name in names:
        words = name.lower().split()
        all_words.extend(words)
    
    # Get most common words (excluding stop words)
    stop_words = {'films', 'movies', 'film', 'movie', 'the', 'and', 'or', 'in', 'with', 'of', 'for', 'a', 'an'}
    meaningful_words = [w for w in all_words if w not in stop_words and len(w) > 2]
    
    if meaningful_words:
        word_counts = Counter(meaningful_words)
        top_words = [word for word, count in word_counts.most_common(4)]
        
        # Find name that contains most top words and is reasonably short
        scored_names = []
        for name in names:
            name_lower = name.lower()
            word_score = sum(1 for word in top_words if word in name_lower)
            length_penalty = len(name) / 100  # Slight penalty for length
            total_score = word_score - length_penalty
            scored_names.append((total_score, name))
        
        # Return highest scoring name
        best_name = max(scored_names, key=lambda x: x[0])[1]
        return best_name
    
    # Fallback: shortest name
    return min(names, key=len)

def filter_and_analyze_results(merged_lists):
    """Filter results and provide analysis"""
    print("🔍 Filtering and analyzing results...")
    
    # Convert to DataFrame for analysis
    results_df = pd.DataFrame(merged_lists)
    
    # Filter for valid themes (5+ movies)
    valid_themes = results_df[results_df['movieCount'] >= 5].copy()
    
    # Also filter out extremely large themes (>100 movies) as potentially too broad
    final_themes = valid_themes[valid_themes['movieCount'] <= 100].copy()
    
    print(f"\n📊 Final Results:")
    print(f"  Total merged themes: {len(merged_lists)}")
    print(f"  Valid themes (5-100 movies): {len(final_themes)}")
    print(f"  Improvement over original: {len(final_themes)} vs 524 = {len(final_themes)/524:.1f}x")
    
    # Size distribution
    print(f"\n📈 Size Distribution (valid themes):")
    size_ranges = {
        '5-10': len(final_themes[(final_themes['movieCount'] >= 5) & (final_themes['movieCount'] <= 10)]),
        '11-20': len(final_themes[(final_themes['movieCount'] >= 11) & (final_themes['movieCount'] <= 20)]),
        '21-50': len(final_themes[(final_themes['movieCount'] >= 21) & (final_themes['movieCount'] <= 50)]),
        '51-100': len(final_themes[(final_themes['movieCount'] >= 51) & (final_themes['movieCount'] <= 100)])
    }
    
    for range_name, count in size_ranges.items():
        print(f"  {range_name} movies: {count} themes")
    
    # Processing type distribution
    processing_dist = final_themes['processingType'].value_counts()
    print(f"\n🔄 Processing Distribution:")
    for proc_type, count in processing_dist.items():
        print(f"  {proc_type}: {count} themes")
    
    # Show top clustered themes
    clustered_themes = final_themes[final_themes['processingType'] == 'clustered'].sort_values('movieCount', ascending=False)
    
    if len(clustered_themes) > 0:
        print(f"\n🎬 Top 10 Successfully Clustered Themes:")
        for idx, theme in clustered_themes.head(10).iterrows():
            print(f"  \"{theme['name']}\" ({theme['movieCount']} movies from {theme['sourceThemes']} themes)")
    
    return final_themes, results_df

def save_results(final_themes, all_results, cluster_stats):
    """Save results to files"""
    print("💾 Saving results...")
    
    # Convert DataFrame to dict format for JSON serialization
    final_themes_list = final_themes.to_dict('records')
    all_results_list = all_results.to_dict('records')
    
    # Prepare comprehensive results
    results = {
        'metadata': {
            'totalOriginalThemes': 211836,  # From original count
            'totalMergedThemes': len(all_results),
            'validThemes': len(final_themes),
            'clusteringMethod': 'TF-IDF + KMeans',
            'targetClusters': 3000,
            'generatedAt': pd.Timestamp.now().isoformat()
        },
        'validThemes': final_themes_list,
        'allMergedThemes': all_results_list,
        'clusteringStats': cluster_stats
    }
    
    # Save main results
    output_path = './generated-lists-batch/clustered-consolidated-themes.json'
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"✅ Results saved to: {output_path}")
    
    # Save CSV for easy inspection
    csv_path = './generated-lists-batch/clustered-themes.csv'
    final_themes[['name', 'movieCount', 'sourceThemes', 'category', 'processingType']].to_csv(csv_path, index=False)
    print(f"📊 Summary CSV saved to: {csv_path}")
    
    return output_path

def main():
    """Main clustering pipeline"""
    print("🚀 Starting semantic clustering of movie theme lists...\n")
    
    try:
        # Step 1: Load and prepare data
        df = load_themes()
        grouped_df = prepare_clustering_data(df)
        
        # Step 2: Perform clustering
        clustered_df, vectorizer, kmeans, silhouette_score = perform_clustering(grouped_df, target_clusters=3000)
        
        # Step 3: Merge clusters
        merged_lists, cluster_stats = merge_clusters(clustered_df)
        
        # Step 4: Filter and analyze
        final_themes, all_results = filter_and_analyze_results(merged_lists)
        
        # Step 5: Save results
        output_path = save_results(final_themes, all_results, cluster_stats)
        
        print(f"\n🎉 Semantic clustering completed successfully!")
        print(f"📈 Converted 211,836 micro-themes into {len(final_themes)} substantial theme lists")
        print(f"🎯 Improvement: {len(final_themes)/524:.1f}x more themes than original 524")
        print(f"💾 Results available at: {output_path}")
        
        return len(final_themes)
        
    except Exception as e:
        print(f"❌ Error during clustering: {str(e)}")
        raise e

if __name__ == "__main__":
    result_count = main()