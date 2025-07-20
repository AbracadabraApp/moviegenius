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
  // If linking is disabled, return plain text
  if (!text || linkingStyle === 'off' || !linkMovies) {
    return (
      <span className={className} style={style}>
        {text}
      </span>
    );
  }

  // For now, just render the text as-is since processing should happen server-side
  // TODO: Integrate with movie-analysis-linker.js for server-side processing
  return <span className={className} style={style} dangerouslySetInnerHTML={{ __html: text }} />;
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
