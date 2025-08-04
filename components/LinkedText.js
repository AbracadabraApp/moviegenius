// components/LinkedText.js
import { useRouter } from 'next/router';
import { memo, useCallback, useMemo } from 'react';
import Link from 'next/link';

/**
 * Component to render text with movie links
 * Handles output from processMovieLinksForReact
 */
function LinkedText({ parts, style = {}, linkStyle = {}, enableLinking = true }) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const router = useRouter();

  // Early return - but hooks are already called above
  if (!enableLinking || !Array.isArray(parts)) {
    // Fallback to plain text
    const text = Array.isArray(parts) ? parts.join('') : parts;
    return <span style={style}>{text}</span>;
  }

  return (
    <span style={style}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return part;
        } else if (part.type === 'link' || part.type === 'movie-link') {
          return (
            <Link
              key={index}
              href={part.href}
              style={{
                color: 'inherit',
                textDecoration: 'underline',
                textDecorationColor: '#d4af37',
                textDecorationThickness: '1px',
                textUnderlineOffset: '2px',
                fontWeight: '500',
                cursor: 'pointer',
                ...linkStyle,
              }}
              data-movie-id={part.movieId}
              data-movie-year={part.year}
              title={`${part.text} (${part.year})`}
            >
              {part.text}
            </Link>
          );
        } else if (part.type === 'person-link') {
          return (
            <Link
              key={index}
              href={part.href}
              style={{
                color: 'inherit',
                textDecoration: 'underline',
                textDecorationColor: '#d4af37',
                textDecorationThickness: '1px',
                textUnderlineOffset: '2px',
                fontWeight: '500',
                cursor: 'pointer',
                ...linkStyle,
              }}
              data-person-id={part.personId}
              data-person-role={part.role}
              title={`${part.name} (${part.role})`}
            >
              {part.text}
            </Link>
          );
        } else {
          return part.toString();
        }
      })}
    </span>
  );
}

// Memoized LinkedText with custom comparison
const LinkedTextMemo = memo(LinkedText, (prevProps, nextProps) => {
  // Compare parts array length first (quick check)
  if (!Array.isArray(prevProps.parts) || !Array.isArray(nextProps.parts)) {
    return prevProps.parts === nextProps.parts;
  }

  if (prevProps.parts.length !== nextProps.parts.length) {
    return false;
  }

  // Deep comparison of parts array
  const partsEqual = prevProps.parts.every((part, index) => {
    const nextPart = nextProps.parts[index];

    // For string parts
    if (typeof part === 'string' && typeof nextPart === 'string') {
      return part === nextPart;
    }

    // For link objects
    if (typeof part === 'object' && typeof nextPart === 'object') {
      return (
        part.type === nextPart.type && part.text === nextPart.text && part.href === nextPart.href
      );
    }

    return part === nextPart;
  });

  return (
    partsEqual &&
    prevProps.enableLinking === nextProps.enableLinking &&
    prevProps.style === nextProps.style &&
    prevProps.linkStyle === nextProps.linkStyle
  );
});

export default LinkedTextMemo;
