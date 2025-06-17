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
  const router = useRouter();

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
        } else if (part.type === 'link') {
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