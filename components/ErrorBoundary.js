/**
 * Enhanced Error Boundary Component with Production Observability
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors with full context for production monitoring,
 * and displays a fallback UI instead of crashing.
 * Integrated with MovieGenius observability system.
 *
 * @see https://reactjs.org/docs/error-boundaries.html
 */
import React from 'react';
import { AlertCircle, RefreshCw, Home, Search } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to production observability system
    this.logErrorToObservability(error, errorInfo);
  }

  // Enhanced error logging with full context
  logErrorToObservability = (error, errorInfo) => {
    const errorData = {
      error_boundary: true,
      level: this.props.level || 'section',
      component_stack: errorInfo?.componentStack,
      error_message: error?.message,
      error_name: error?.name,
      error_stack: error?.stack,
      retry_count: this.state.retryCount,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : null,
      memory: typeof performance !== 'undefined' && performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      } : null
    };

    // Send to error tracking endpoint
    if (typeof fetch !== 'undefined') {
      fetch('/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'frontend_error',
          source: 'error_boundary',
          data: errorData
        })
      }).catch(fetchError => {
        // Fallback: log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to send error to tracking:', fetchError);
          console.error('Original error:', error, errorInfo);
        }
      });
    }

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
      console.error('Context:', errorData);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  handleSearch = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/search';
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallback: CustomFallback, level = 'section' } = this.props;
      
      if (CustomFallback) {
        return <CustomFallback error={this.state.error} onRetry={this.handleRetry} />;
      }

      const isPageLevel = level === 'page';
      
      // Silent failure for section-level errors - return null
      if (!isPageLevel) {
        return null;
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-6">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                404 - Page Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                The page you're looking for doesn't exist.
              </p>
            </div>

            <div className="space-y-3">
              {this.state.retryCount < 2 && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try again
                </button>
              )}
              
              {isPageLevel && (
                <>
                  <button
                    onClick={this.handleGoHome}
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to homepage
                  </button>
                  
                  <button
                    onClick={this.handleSearch}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search movies
                  </button>
                </>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-500 mb-2">
                  Error details (development only)
                </summary>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
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


export default ErrorBoundary;
