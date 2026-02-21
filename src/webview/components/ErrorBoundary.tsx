import React from 'react';
import '../styles/errorBoundary.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[Quartz] ErrorBoundary caught an error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    if (this.state.error) {
      const message = this.state.error.message || 'An unexpected error occurred';
      const truncatedMessage = message.length > 300 ? message.slice(0, 300) + '...' : message;

      return (
        <div className="quartz-error-boundary">
          <div className="quartz-error-boundary-card">
            <div className="quartz-error-boundary-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 10.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM8.75 8a.75.75 0 0 1-1.5 0V4.5a.75.75 0 0 1 1.5 0V8z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h2 className="quartz-error-boundary-title">Something went wrong</h2>
            <p className="quartz-error-boundary-message">{truncatedMessage}</p>
            <div className="quartz-error-boundary-actions">
              <button
                className="quartz-error-boundary-btn quartz-error-boundary-btn-primary"
                onClick={this.handleReload}
              >
                Reload Editor
              </button>
              <button
                className="quartz-error-boundary-btn quartz-error-boundary-btn-secondary"
                onClick={this.handleDismiss}
              >
                Try to Continue
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
