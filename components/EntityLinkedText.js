// components/EntityLinkedText.js
// Simple movie linking based on **Movie** (Year) format

import { useState, useEffect } from 'react';

/**
 * Component that renders text with movie links for movie title patterns
 * 
 * Detects two formats:
 * 1. **Movie Title** (Year) - Bold format from new Claude responses
 * 2. Movie Title (Year) - Legacy format from existing content (strict capitalization)
 * 
 * Both formats link to /movie/search?q=Title+Year for TMDB-first discovery
 */
export default function EntityLinkedText({ 
  text, 
  entities = null,
  linkPeople = true, 
  linkMovies = true,
  currentEntity = null,
  className = '',
  style = {},
  linkingStyle = 'on'
}) {
  const [linkedText, setLinkedText] = useState(text);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // DISABLED: Movie linking creates broken search URLs - only use direct tmdb_id links
    if (!text || linkingStyle === 'off' || !linkMovies || true) {
      setLinkedText(text);
      return;
    }

    let isMounted = true;
    setIsProcessing(true);

    const processText = async () => {
      try {
        console.log('🔗 Processing text for movie linking:', text.substring(0, 100) + '...');
        
        // Step 1: Remove SUBHEAD lines before processing
        let cleanText = text.replace(/^SUBHEAD:.*$/gm, '');
        
        // Step 2: Find all movie title patterns (both new and legacy formats)
        const matches = [];
        
        // Pattern 1: New format with bold markers **Movie Title** (Year)
        const boldPattern = /\*\*([^*]+)\*\* \((\d{4})\)/g;
        let match;
        
        while ((match = boldPattern.exec(cleanText)) !== null) {
          const title = match[1].trim();
          const year = parseInt(match[2]);
          
          console.log(`🎬 Found bold movie: "${title}" (${year})`);
          
          matches.push({
            fullMatch: match[0],
            title: title,
            year: year,
            start: match.index,
            end: match.index + match[0].length,
            type: 'bold'
          });
        }
        
        // Pattern 2: Legacy format with strict capitalization Movie Title (Year)
        const legacyPattern = /\b([A-Z][a-z]+(?: [A-Z][a-z]+)+) \((\d{4})\)\b/g;
        
        // Reset regex state for second pass
        legacyPattern.lastIndex = 0;
        
        while ((match = legacyPattern.exec(cleanText)) !== null) {
          const title = match[1].trim();
          const year = parseInt(match[2]);
          
          // Check if this overlaps with any bold pattern matches
          const overlaps = matches.some(existingMatch => 
            (match.index >= existingMatch.start && match.index < existingMatch.end) ||
            (existingMatch.start >= match.index && existingMatch.start < match.index + match[0].length)
          );
          
          if (!overlaps) {
            console.log(`🎬 Found legacy movie: "${title}" (${year})`);
            
            matches.push({
              fullMatch: match[0],
              title: title,
              year: year,
              start: match.index,
              end: match.index + match[0].length,
              type: 'legacy'
            });
          }
        }
        
        // Sort matches by position for processing
        matches.sort((a, b) => a.start - b.start);
        
        if (isMounted) {
          if (matches.length > 0) {
            // Step 3: Create links for all marked movies (TMDB-first approach)
            let processedText = cleanText;
            let linksCreated = 0;
            
            // Process matches in reverse order to maintain text positions
            for (const movieMatch of matches.reverse()) {
              // Generate TMDB search URL for the movie
              const searchQuery = encodeURIComponent(`${movieMatch.title} ${movieMatch.year}`);
              const tmdbUrl = `/movie/search?q=${searchQuery}`;
              
              // Both patterns generate same link format: linked title + plain year
              const link = `<a href="${tmdbUrl}" class="movie-title" data-movie-title="${movieMatch.title}" data-movie-year="${movieMatch.year}">${movieMatch.title}</a> (${movieMatch.year})`;
              
              processedText = processedText.slice(0, movieMatch.start) + link + processedText.slice(movieMatch.end);
              linksCreated++;
              console.log(`✅ Linked (${movieMatch.type}): "${movieMatch.title}" (${movieMatch.year}) -> TMDB search`);
            }
            
            setLinkedText(processedText);
            
            // Summary logging
            const boldCount = matches.filter(m => m.type === 'bold').length;
            const legacyCount = matches.filter(m => m.type === 'legacy').length;
            console.log(`🔗 Created ${linksCreated} movie links: ${boldCount} bold format, ${legacyCount} legacy format`);
          } else {
            setLinkedText(cleanText);
            console.log('🔗 No marked movies found');
          }
        }
      } catch (error) {
        console.error('Movie linking error:', error);
        if (isMounted) {
          setLinkedText(text);
        }
      } finally {
        if (isMounted) {
          setIsProcessing(false);
        }
      }
    };

    processText();

    return () => {
      isMounted = false;
    };
  }, [text, linkMovies, linkingStyle]);

  if (isProcessing && !linkedText) {
    return <span className={className} style={style}>{text}</span>;
  }

  return (
    <span 
      className={className} 
      style={style}
      dangerouslySetInnerHTML={{ __html: linkedText }}
    />
  );
}

/**
 * TMDB-first linking approach
 * All movie links go to /movie/search route which handles:
 * 1. Database lookup (our 2% coverage)
 * 2. TMDB search and discovery (remaining 98%)
 * 3. Movie page creation/routing
 */

// Legacy export for MovieAnalysisWithEntities
export function MovieAnalysisWithEntities({ children, ...props }) {
  // Just render children without entity processing
  return <div {...props}>{children}</div>;
}