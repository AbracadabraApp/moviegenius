/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * @see https://reactjs.org/docs/error-boundaries.html
 */
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service in production
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // In production, you might want to log to a service like Sentry
    // if (process.env.NODE_ENV === 'production') {
    //   logErrorToService(error, errorInfo);
    // }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <h2 style={styles.title}>Oops! Something went wrong</h2>
            <p style={styles.message}>
              We&apos;re sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button style={styles.button} onClick={() => window.location.reload()}>
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Development)</summary>
                <pre style={styles.errorText}>
                  {this.state.error?.stack || this.state.error?.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    padding: '20px',
    backgroundColor: '#f9fafb',
  },
  content: {
    textAlign: 'center',
    maxWidth: '400px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#dc2626',
  },
  message: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  button: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  details: {
    marginTop: '16px',
    textAlign: 'left',
  },
  summary: {
    cursor: 'pointer',
    fontSize: '12px',
    color: '#6b7280',
  },
  errorText: {
    fontSize: '10px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '8px',
    borderRadius: '4px',
    overflow: 'hidden',
    maxHeight: '100px',
    wordWrap: 'break-word',
  },
};

export default ErrorBoundary;
