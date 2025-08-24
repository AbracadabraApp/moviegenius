#!/usr/bin/env python3
"""
Analyze word overlap in collection names
"""
import json
from collections import defaultdict
from itertools import combinations

def clean_word(word):
    """Clean and normalize word for comparison"""
    # Remove common particles and convert to lowercase
    stop_words = {'the', 'a', 'an', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'by', 'from', 'at', 'on', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being'}
    word = word.lower().strip('.,!?;:()-')
    return word if word not in stop_words else None

def get_meaningful_words(name):
    """Extract meaningful words from collection name"""
    words = []
    for word in name.split():
        cleaned = clean_word(word)
        if cleaned and len(cleaned) > 2:  # Only words longer than 2 chars
            words.append(cleaned)
    return set(words)

def count_word_overlaps(names):
    """Count pairs by number of shared words"""
    overlap_counts = defaultdict(int)
    
    # Get meaningful words for each name
    name_words = {}
    for name in names:
        name_words[name] = get_meaningful_words(name)
    
    # Compare all pairs
    for name1, name2 in combinations(names, 2):
        words1 = name_words[name1]
        words2 = name_words[name2]
        
        # Count shared words
        shared = len(words1.intersection(words2))
        overlap_counts[shared] += 1
    
    return overlap_counts

def main():
    # Load Musical collection names
    with open('/Users/josh.petersen/moviegenius/list-analysis-output/musical-build-state.json', 'r') as f:
        data = json.load(f)
    
    names = list(data['allLists'].keys())
    print(f"Analyzing {len(names)} Musical collection names")
    print(f"Total possible pairs: {len(names) * (len(names) - 1) // 2}")
    print()
    
    overlap_counts = count_word_overlaps(names)
    
    print("Word Overlap Analysis:")
    print("=====================")
    
    # Show all counts from 0-5+ words
    total_pairs = sum(overlap_counts.values())
    for shared_words in range(6):  # 0 through 5
        count = overlap_counts.get(shared_words, 0)
        percentage = (count / total_pairs) * 100 if total_pairs > 0 else 0
        print(f"{shared_words} words in common: {count:6d} pairs ({percentage:5.1f}%)")
    
    # Show any higher counts if they exist
    higher_counts = {k: v for k, v in overlap_counts.items() if k > 5}
    if higher_counts:
        print("\nHigher overlap counts:")
        for shared_words in sorted(higher_counts.keys(), reverse=True):
            count = higher_counts[shared_words]
            percentage = (count / total_pairs) * 100
            print(f"{shared_words} words in common: {count:6d} pairs ({percentage:5.1f}%)")
    
    # Show examples for high overlap cases
    if max(overlap_counts.keys()) >= 3:
        print(f"\nExamples of high overlap (3+ words):")
        name_words = {name: get_meaningful_words(name) for name in names}
        
        examples_shown = 0
        for name1, name2 in combinations(names, 2):
            if examples_shown >= 10:  # Limit examples
                break
                
            words1 = name_words[name1]
            words2 = name_words[name2]
            shared = words1.intersection(words2)
            
            if len(shared) >= 3:
                print(f"  '{name1}' & '{name2}'")
                print(f"    Shared: {', '.join(sorted(shared))}")
                examples_shown += 1

if __name__ == "__main__":
    main()