// components/AskInputBar.js
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
// Removed Mic import, using film clapper icon instead

export default function AskInputBar({
  placeholder = 'Ask me about movies...',
  isLoading = false,
}) {
  const [question, setQuestion] = useState('');
  const inputRef = useRef(null);
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;
    
    // Always navigate to ask page with query parameter
    router.push(`/ask?q=${encodeURIComponent(trimmed)}`);
    setQuestion('');
  };

  // Allow clicking anywhere in the bar to focus input
  useEffect(() => {
    const bar = document.getElementById('ask-bar');
    if (bar && inputRef.current) {
      bar.onclick = () => inputRef.current.focus();
    }
  }, []);

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div id="ask-bar" style={styles.bar}>
        <input
          ref={inputRef}
          type="text"
          placeholder={isLoading ? 'Please wait...' : placeholder}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isLoading}
          style={{
            ...styles.input,
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'text'
          }}
        />
        <button 
          type="submit" 
          style={styles.submitButton}
          aria-label="Submit question"
        >
          <img 
            src="/icons/loading/chair-director-outline-icon.png" 
            alt="Submit" 
            style={styles.clapperIcon}
          />
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    width: '100%',
    paddingTop: '4px',
  },
  bar: {
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    backgroundColor: '#fff',
    borderRadius: '28px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '100%',
    cursor: 'text',
  },
  input: {
    flex: 1,
    fontSize: '16px',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    marginRight: '12px',
  },
  submitButton: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
  },
  clapperIcon: {
    width: '20px',
    height: '20px',
    opacity: 0.7,
    transition: 'opacity 0.2s ease',
  },
};
