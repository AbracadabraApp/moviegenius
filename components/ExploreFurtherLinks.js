/**
 * Explore Further Links Component
 * 
 * Transforms EXPLORE_FURTHER topics from movie analyses into clickable links
 * that trigger streaming topic explorations with typewriter effect.
 */

import { useState } from 'react';
import { ChevronRightIcon, PlayIcon } from '@heroicons/react/24/solid';

export default function ExploreFurtherLinks({ topics, movieTitle }) {
  const [expandedTopic, setExpandedTopic] = useState(null);
  
  if (!topics || topics.length === 0) {
    return null;
  }

  return (
    <div className="explore-further-section">
      <h3 className="section-title">
        <PlayIcon className="w-5 h-5 text-blue-500 mr-2" />
        Explore Further
      </h3>
      
      <div className="topics-grid">
        {topics.map((topic, index) => (
          <ExploreFurtherTopic
            key={index}
            topic={topic}
            movieTitle={movieTitle}
            isExpanded={expandedTopic === index}
            onToggle={() => setExpandedTopic(expandedTopic === index ? null : index)}
          />
        ))}
      </div>
      
      <style jsx>{`
        .explore-further-section {
          margin: 2rem 0;
          padding: 1.5rem;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 12px;
          border: 1px solid #2d3748;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          font-size: 1.25rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 1rem;
        }
        
        .topics-grid {
          display: grid;
          gap: 0.75rem;
        }
        
        @media (min-width: 768px) {
          .topics-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

function ExploreFurtherTopic({ topic, movieTitle, isExpanded, onToggle }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  
  // Convert topic to URL-safe format
  const topicSlug = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  
  const handleTopicClick = async () => {
    if (isExpanded && !isStreaming) {
      // Collapse if already expanded
      onToggle();
      return;
    }
    
    if (isStreaming) return; // Prevent double-clicks
    
    // Expand and start streaming
    if (!isExpanded) {
      onToggle();
    }
    
    setIsStreaming(true);
    setStreamContent('');
    
    try {
      console.log(`🎬 Starting topic exploration: ${topic}`);
      
      const response = await fetch(`/api/explore-further/${topicSlug}`);
      
      if (!response.body) {
        throw new Error('No response body');
      }
      
      const reader = response.body.getReader();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        
        if (chunk.includes('__EXPLORATION_COMPLETE__')) {
          console.log('✅ Topic exploration complete');
          break;
        } else {
          buffer += chunk;
          setStreamContent(buffer);
        }
      }
      
    } catch (error) {
      console.error('❌ Topic streaming failed:', error);
      setStreamContent('Sorry, this exploration failed to load. Please try again.');
    } finally {
      setIsStreaming(false);
    }
  };
  
  return (
    <div className="topic-card">
      <button
        onClick={handleTopicClick}
        className={`topic-button ${isExpanded ? 'expanded' : ''}`}
        disabled={isStreaming}
      >
        <div className="topic-content">
          <span className="topic-title">{topic}</span>
          <ChevronRightIcon 
            className={`topic-icon ${isExpanded ? 'rotated' : ''} ${isStreaming ? 'spinning' : ''}`} 
          />
        </div>
        
        {isStreaming && (
          <div className="streaming-indicator">
            <div className="streaming-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            Generating exploration...
          </div>
        )}
      </button>
      
      {isExpanded && (
        <div className="topic-exploration">
          {isStreaming && !streamContent && (
            <div className="exploration-starting">
              <div className="cursor-blink">█</div>
              <span>Starting exploration...</span>
            </div>
          )}
          
          {streamContent && (
            <div className="stream-content">
              <pre className="exploration-text">{streamContent}</pre>
              {isStreaming && <span className="live-cursor">█</span>}
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .topic-card {
          background: rgba(45, 55, 72, 0.5);
          border-radius: 8px;
          border: 1px solid rgba(66, 153, 225, 0.2);
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .topic-card:hover {
          border-color: rgba(66, 153, 225, 0.4);
          transform: translateY(-1px);
        }
        
        .topic-button {
          width: 100%;
          padding: 1rem;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .topic-button:hover {
          background: rgba(66, 153, 225, 0.1);
        }
        
        .topic-button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
        
        .topic-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .topic-title {
          color: #e2e8f0;
          font-weight: 500;
          line-height: 1.4;
        }
        
        .topic-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #4299e1;
          transition: transform 0.3s ease;
          flex-shrink: 0;
          margin-left: 0.75rem;
        }
        
        .topic-icon.rotated {
          transform: rotate(90deg);
        }
        
        .topic-icon.spinning {
          animation: spin 1s linear infinite;
        }
        
        .streaming-indicator {
          display: flex;
          align-items: center;
          margin-top: 0.75rem;
          color: #4299e1;
          font-size: 0.875rem;
        }
        
        .streaming-dots {
          display: flex;
          margin-right: 0.5rem;
        }
        
        .streaming-dots span {
          width: 4px;
          height: 4px;
          background: #4299e1;
          border-radius: 50%;
          margin-right: 2px;
          animation: dot-pulse 1.4s infinite ease-in-out;
        }
        
        .streaming-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .streaming-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        .topic-exploration {
          border-top: 1px solid rgba(66, 153, 225, 0.2);
          background: rgba(26, 32, 44, 0.8);
        }
        
        .exploration-starting {
          display: flex;
          align-items: center;
          padding: 1rem;
          color: #4299e1;
          font-family: 'Courier New', monospace;
        }
        
        .cursor-blink {
          margin-right: 0.5rem;
          animation: blink 1s infinite;
        }
        
        .stream-content {
          padding: 1rem;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          line-height: 1.6;
        }
        
        .exploration-text {
          color: #e2e8f0;
          white-space: pre-wrap;
          margin: 0;
          font-family: inherit;
        }
        
        .live-cursor {
          color: #4299e1;
          animation: blink 1s infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        @keyframes dot-pulse {
          0%, 20% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.7; }
          80%, 100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}