// components/EntityLinkedText.js
// Simple text renderer for pre-processed movie links
// Content processing now happens server-side using movie-analysis-linker.js

import { useState } from 'react';

/**
 * Component that renders pre-processed text with movie links
 *
 * Content processing now happens server-side during getStaticProps using movie-analysis-linker.js
 * This component simply renders the pre-processed HTML content
 */
export default function EntityLinkedText({
  text,
  entities = null,
  linkPeople = true,
  linkMovies = true,
  currentEntity = null,
  className = '',
  style = {},
  linkingStyle = 'on',
}) {
  // Strip ** markers for clean presentation while keeping stored data unchanged
  const cleanText = text ? text.replace(/\*\*([^*]+)\*\*/g, '$1') : '';

  // If linking is disabled, return plain text
  if (!cleanText || linkingStyle === 'off' || !linkMovies) {
    return (
      <span className={className} style={style}>
        {cleanText}
      </span>
    );
  }

  // Check if the text contains HTML links (from processed_content)
  const containsHtmlLinks = cleanText.includes('<a href=');
  
  if (containsHtmlLinks) {
    // Render HTML content with links using dangerouslySetInnerHTML
    return (
      <span 
        className={className} 
        style={style}
        dangerouslySetInnerHTML={{ __html: cleanText }}
      />
    );
  }

  // For plain text content, render as normal
  return <span className={className} style={style}>{cleanText}</span>;
}

/**
 * Simplified approach:
 * - Content processing moved to server-side using movie-analysis-linker.js
 * - This component now just renders pre-processed HTML
 * - Direct links to /movie/TMDB_ID (no search page middleman)
 * - Self-reference prevention handled server-side
 */

// Legacy export for MovieAnalysisWithEntities
export function MovieAnalysisWithEntities({ children, ...props }) {
  // Just render children without entity processing
  return <div {...props}>{children}</div>;
}
