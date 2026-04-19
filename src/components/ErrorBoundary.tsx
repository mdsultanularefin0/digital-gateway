import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary catching all uncaught render/runtime errors.
 * Chunk-load errors are handled separately by ChunkErrorBoundary.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl border border-border bg-card shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. You can try again or reload the page.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground/80 font-mono bg-muted/40 rounded-md p-2 break-words">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition"
              >
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
