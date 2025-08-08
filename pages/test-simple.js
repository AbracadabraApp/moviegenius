/**
 * Simple Test Page - Basic test without complex imports
 */

import { useState, useEffect } from 'react';
import PhoneFrame from '../components/PhoneFrame';

export default function TestSimplePage() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    setMessage('Simple test page loaded successfully!');
  }, []);

  return (
    <PhoneFrame>
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: 'white',
          minHeight: '100vh',
        }}
      >
        <h1>Simple Test Page</h1>
        <p>{message}</p>
        <button
          onClick={() => setMessage('Button clicked!')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Test Button
        </button>
      </div>
    </PhoneFrame>
  );
}
