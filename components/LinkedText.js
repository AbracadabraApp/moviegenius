// components/LinkedText.js
import { useRouter } from 'next/router';

/**
 * Component to render text with movie links
 * Handles output from processMovieLinksForReact
 */
export default function LinkedText({ 
  parts, 
  style = {},
  linkStyle = {},
  enableLinking = true 
}) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const router = useRouter();

  // Early return - but hooks are already called above
  if (!enableLinking || !Array.isArray(parts)) {
    // Fallback to plain text
    const text = Array.isArray(parts) ? parts.join('') : parts;
    return <span style={style}>{text}</span>;
  }

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    router.push(href);
  };

  return (
    <span style={style}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return part;
        } else if (part.type === 'link' || part.type === 'movie-link') {
          return (
            <a
              key={index}
              href={part.href}
              onClick={(e) => handleLinkClick(e, part.href)}
              style={{
                color: 'inherit',
                textDecoration: 'underline',
                textDecorationColor: '#d4af37',
                textDecorationThickness: '1px',
                textUnderlineOffset: '2px',
                fontWeight: '500',
                cursor: 'pointer',
                ...linkStyle
              }}
              data-movie-id={part.movieId}
              data-movie-year={part.year}
              title={`${part.text} (${part.year})`}
            >
              {part.text}
            </a>
          );
        } else if (part.type === 'person-link') {
          return (
            <a
              key={index}
              href={part.href}
              onClick={(e) => handleLinkClick(e, part.href)}
              style={{
                color: 'inherit',
                textDecoration: 'underline',
                textDecorationColor: '#d4af37',
                textDecorationThickness: '1px',
                textUnderlineOffset: '2px',
                fontWeight: '500',
                cursor: 'pointer',
                ...linkStyle
              }}
              data-person-id={part.personId}
              data-person-role={part.role}
              title={`${part.name} (${part.role})`}
            >
              {part.text}
            </a>
          );
        } else {
          return part.toString();
        }
      })}
    </span>
  );
}