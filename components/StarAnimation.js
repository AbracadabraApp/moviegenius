import { useState, useEffect } from 'react';

export default function StarAnimation({
  size = 40,
  color = '#d4af37', // Gold color
  className = '',
  style = {}
}) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 30) % 360);
    }, 100); // Smooth rotation

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={className}
      style={{
        display: 'inline-block',
        ...style
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.1s linear'
        }}
      >
        {/* Claude-style starburst pattern */}
        <g fill={color}>
          {/* Main rays */}
          <path d="M12 2 L12.5 11.5 L12 12 L11.5 11.5 Z" />
          <path d="M22 12 L12.5 12.5 L12 12 L12.5 11.5 Z" />
          <path d="M12 22 L11.5 12.5 L12 12 L12.5 12.5 Z" />
          <path d="M2 12 L11.5 11.5 L12 12 L11.5 12.5 Z" />
          
          {/* Diagonal rays */}
          <path d="M19.07 4.93 L12.35 11.65 L12 12 L11.65 11.65 Z" />
          <path d="M19.07 19.07 L11.65 12.35 L12 12 L12.35 12.35 Z" />
          <path d="M4.93 19.07 L11.65 11.65 L12 12 L11.65 12.35 Z" />
          <path d="M4.93 4.93 L12.35 12.35 L12 12 L12.35 11.65 Z" />
          
          {/* Shorter intermediate rays */}
          <path d="M17.66 6.34 L12.24 11.76 L12 12 L11.76 11.76 Z" />
          <path d="M17.66 17.66 L11.76 12.24 L12 12 L12.24 12.24 Z" />
          <path d="M6.34 17.66 L11.76 11.76 L12 12 L11.76 12.24 Z" />
          <path d="M6.34 6.34 L12.24 12.24 L12 12 L12.24 11.76 Z" />
          
          {/* Central circle */}
          <circle cx="12" cy="12" r="1.5" />
        </g>
      </svg>
    </div>
  );
}