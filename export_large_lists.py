#!/usr/bin/env python3

"""
Export large lists (36-60 movies) in usable data format
Format: List_ID|List_Title|Movie_TMDB_ID
"""

import json
import csv

def export_large_lists():
    print("📊 Exporting large lists (36-60 movies) in usable format...")
    
    # Load current themes
    with open('./generated-lists-batch/current-themes.json', 'r') as f:
        data = json.load(f)
    
    themes = data['validThemes']
    
    # Filter for large lists (36-60 movies)
    large_lists = [t for t in themes if 36 <= t['movieCount'] <= 60]
    
    print(f"📋 Found {len(large_lists)} large lists")
    
    # Export as pipe-delimited text
    output_rows = []
    
    for list_id, theme in enumerate(large_lists, 1):
        list_title = theme['name']
        
        for movie_id in theme['movies']:
            output_rows.append(f"{list_id}|{list_title}|{movie_id}")
    
    # Save to text file
    txt_file = './generated-lists-batch/large_lists_export.txt'
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write("# Large Movie Lists Export (36-60 movies per list)\n")
        f.write("# Format: List_ID|List_Title|Movie_TMDB_ID\n")
        f.write("# Total Lists: " + str(len(large_lists)) + "\n")
        f.write("# Total Rows: " + str(len(output_rows)) + "\n")
        f.write("#" + "="*70 + "\n\n")
        
        for row in output_rows:
            f.write(row + "\n")
    
    # Also save as CSV for Excel compatibility
    csv_file = './generated-lists-batch/large_lists_export.csv'
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['List_ID', 'List_Title', 'Movie_TMDB_ID'])
        
        for list_id, theme in enumerate(large_lists, 1):
            list_title = theme['name']
            for movie_id in theme['movies']:
                writer.writerow([list_id, list_title, movie_id])
    
    # Summary file with list metadata
    summary_file = './generated-lists-batch/large_lists_summary.txt'
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write("LARGE LISTS SUMMARY (36-60 movies)\n")
        f.write("="*50 + "\n\n")
        
        for list_id, theme in enumerate(large_lists, 1):
            f.write(f"List {list_id}: {theme['name']}\n")
            f.write(f"  Movies: {theme['movieCount']}\n")
            f.write(f"  Category: {theme.get('category', 'unknown')}\n")
            f.write(f"  Description: {theme.get('description', '')[:100]}...\n")
            f.write(f"  Source themes: {theme.get('sourceThemes', 1)}\n")
            f.write("\n")
    
    print(f"✅ Exported {len(output_rows)} rows to:")
    print(f"   📄 Text: {txt_file}")
    print(f"   📊 CSV: {csv_file}") 
    print(f"   📋 Summary: {summary_file}")
    
    # Show sample of first few lists
    print(f"\n🎬 Sample of first 3 large lists:")
    for list_id, theme in enumerate(large_lists[:3], 1):
        print(f"  {list_id}. \"{theme['name']}\" ({theme['movieCount']} movies)")
    
    return len(large_lists), len(output_rows)

if __name__ == "__main__":
    list_count, row_count = export_large_lists()
    print(f"\n📊 Export complete: {list_count} lists, {row_count} total rows")