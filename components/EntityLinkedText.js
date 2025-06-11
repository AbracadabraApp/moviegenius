// components/EntityLinkedText.js
// DEPRECATED: Entity detection system has been disabled

/**
 * Component that used to render text with entity links
 * Now returns plain text without any entity processing
 */
export default function EntityLinkedText({ 
  text, 
  entities = null,
  linkPeople = true, 
  linkMovies = true,
  currentEntity = null,
  className = '',
  style = {},
  linkingStyle = 'off'
}) {
  // Entity detection system deprecated - return plain text only
  return <span className={className} style={style}>{text}</span>;
}

// Legacy export for MovieAnalysisWithEntities
export function MovieAnalysisWithEntities({ children, ...props }) {
  // Just render children without entity processing
  return <div {...props}>{children}</div>;
}