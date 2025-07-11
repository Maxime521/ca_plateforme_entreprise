// components/ErrorBoundary.js - React Error Boundary for graceful error handling
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
      console.error('Production error logged:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI based on component type
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <ErrorFallback 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
function ErrorFallback({ error, errorInfo, onRetry, componentName = 'Component' }) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-[200px] flex items-center justify-center p-8">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {componentName} encountered an unexpected error
        </p>

        {isDevelopment && error && (
          <details className="text-left mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <summary className="text-sm font-medium text-red-800 dark:text-red-300 cursor-pointer mb-2">
              Error Details (Development Only)
            </summary>
            <div className="text-xs text-red-700 dark:text-red-300 space-y-2">
              <div>
                <strong>Error:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap text-xs mt-1 p-2 bg-red-100 dark:bg-red-900/30 rounded">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

// Specialized error boundaries for different components
export function SearchErrorBoundary({ children }) {
  return (
    <ErrorBoundary 
      componentName="Search"
      fallback={(error, retry) => (
        <div className="max-w-2xl mx-auto text-center p-8">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Search Error
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Unable to perform search. Please try again.
          </p>
          <button
            onClick={retry}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105"
          >
            Retry Search
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export function CompanyCardErrorBoundary({ children, companyName }) {
  return (
    <ErrorBoundary 
      componentName="Company Card"
      fallback={(error, retry) => (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-3">⚠️</span>
            <div>
              <h4 className="text-red-800 dark:text-red-300 font-medium">
                Error loading company data
              </h4>
              <p className="text-red-600 dark:text-red-400 text-sm">
                {companyName ? `Unable to display ${companyName}` : 'Company information unavailable'}
              </p>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;