// components/EntityLinkedText.js
import { useState, useEffect } from 'react';

/**
 * Component that renders text with entity links using pre-processed entity data
 * Uses entity data from claude_response.entity_data when available
 */
export default function EntityLinkedText({ 
  text, 
  entities = null,           // Pre-processed entity data from deployment
  linkPeople = true, 
  linkMovies = true,
  currentEntity = null,
  className = '',
  style = {},
  linkingStyle = 'off'       // 'off' | 'subtle' | 'bold' | 'minimal' - DEFAULT OFF
}) {
  const [processedContent, setProcessedContent] = useState(null);

  useEffect(() => {
    if (!text || typeof text !== 'string') {
      setProcessedContent(text);
      return;
    }

    // If no entity data or linking is disabled, return plain text
    if (!entities || linkingStyle === 'off' || (!linkPeople && !linkMovies)) {
      setProcessedContent(text);
      return;
    }

    try {
      const processedText = processTextWithEntities(text, entities, {
        linkPeople,
        linkMovies,
        currentEntity,
        linkingStyle
      });

      setProcessedContent(processedText);
    } catch (error) {
      console.error('🚨 EntityLinkedText Error:', error);
      console.error('🚨 Entity data that caused error:', entities);
      // Fallback to plain text if processing fails
      setProcessedContent(text);
    }
  }, [text, entities, linkPeople, linkMovies, currentEntity?.slug, linkingStyle]);

  const combinedClassName = `entity-linked-text ${linkingStyle} ${className}`.trim();

  return (
    <div 
      className={combinedClassName}
      style={style}
      dangerouslySetInnerHTML={{ __html: processedContent || text }}
    />
  );
}

/**
 * Process text with pre-processed entity data
 */
function processTextWithEntities(text, entities, options) {
  const { linkPeople, linkMovies, currentEntity, linkingStyle } = options;
  
  // Debug logging to catch the issue
  console.log('🐛 EntityLinkedText Debug:', {
    entities,
    entitiesType: typeof entities,
    moviesType: entities?.movies ? typeof entities.movies : 'undefined',
    moviesIsArray: entities?.movies ? Array.isArray(entities.movies) : false,
    peopleType: entities?.people ? typeof entities.people : 'undefined', 
    peopleIsArray: entities?.people ? Array.isArray(entities.people) : false
  });
  
  // Collect all entities to process
  const allEntities = [];
  
  if (linkMovies && entities.movies && Array.isArray(entities.movies)) {
    console.log('🔍 Processing movies array:', entities.movies);
    entities.movies.forEach((movie, index) => {
      console.log(`🎬 Movie ${index}:`, movie, 'type:', typeof movie);
      
      // Additional safety check for null/undefined movie objects
      if (!movie || typeof movie !== 'object') {
        console.warn(`⚠️ Skipping invalid movie at index ${index}:`, movie);
        return;
      }
      
      // Handle both data formats: { text: "Movie Title" } or { title: "Movie Title" }
      const movieText = movie.text || movie.title;
      if (!movieText || typeof movieText !== 'string') {
        console.warn(`⚠️ Skipping movie with invalid text/title at index ${index}:`, movie);
        return;
      }
      
      // Skip self-reference
      if (currentEntity && movieText.toLowerCase() === currentEntity.title?.toLowerCase()) {
        return;
      }
      
      allEntities.push({
        ...movie,
        text: movieText, // Normalize to text property
        type: 'movie',
        url: `/movies/${createSlug(movieText)}`
      });
    });
  }
  
  if (linkPeople && entities.people && Array.isArray(entities.people)) {
    entities.people.forEach(person => {
      // Skip self-reference
      if (currentEntity && person.text.toLowerCase() === currentEntity.name?.toLowerCase()) {
        return;
      }
      
      allEntities.push({
        ...person,
        type: 'person',
        url: `/people/${createSlug(person.text)}`
      });
    });
  }
  
  if (allEntities.length === 0) {
    return text;
  }
  
  // Sort by position if available, otherwise by length (longer first)
  allEntities.sort((a, b) => {
    if (a.start !== undefined && b.start !== undefined) {
      return a.start - b.start;
    }
    return b.text.length - a.text.length;
  });
  
  let processedText = text;
  let offset = 0;
  
  // Process entities from end to beginning to maintain positions
  const processedPositions = new Set();
  
  for (const entity of allEntities.reverse()) {
    const entityText = entity.text;
    const regex = new RegExp(`\\b${escapeRegex(entityText)}\\b`, 'gi');
    
    processedText = processedText.replace(regex, (match, index) => {
      // Check for overlaps
      const start = index;
      const end = index + match.length;
      
      let hasOverlap = false;
      for (let i = start; i < end; i++) {
        if (processedPositions.has(i)) {
          hasOverlap = true;
          break;
        }
      }
      
      if (hasOverlap) {
        return match; // Skip overlapping entities
      }
      
      // Mark positions as processed
      for (let i = start; i < end; i++) {
        processedPositions.add(i);
      }
      
      const cssClass = `entity-link entity-${entity.type}`;
      const confidenceAttr = entity.confidence ? ` data-confidence="${entity.confidence.toFixed(2)}"` : '';
      const titleAttr = `title="${entity.type}: ${entityText}${entity.confidence ? ` (${Math.round(entity.confidence * 100)}% confidence)` : ''}"`;
      
      return `<a href="${entity.url}" class="${cssClass}"${confidenceAttr} ${titleAttr}>${match}</a>`;
    });
  }
  
  return processedText;
}

/**
 * Create URL-friendly slug from text
 */
function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .trim();
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Hook version for getting entity data from analysis
 */
export function useEntityData(analysis) {
  return analysis?.claude_response?.entity_data?.entities || null;
}

/**
 * Component specifically for movie analysis content
 */
export function MovieAnalysisWithEntities({ analysis, currentMovie, className = '', style = {} }) {
  const entities = useEntityData(analysis);
  const content = analysis?.claude_response?.raw_content;
  
  if (!content) {
    return null;
  }
  
  // Extract main paragraph content
  const paragraphMatch = content.match(/PARAGRAPH:\s*(.+?)(?=\n[A-Z]+:|$)/s);
  const mainContent = paragraphMatch ? paragraphMatch[1].trim() : content;
  
  return (
    <EntityLinkedText
      text={mainContent}
      entities={entities}
      currentEntity={currentMovie}
      className={className}
      style={style}
      linkingStyle="off"
    />
  );
}