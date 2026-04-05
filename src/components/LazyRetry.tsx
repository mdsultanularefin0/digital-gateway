import { lazy, Component, type ReactNode, type ComponentType } from "react";

// Retry dynamic imports up to 3 times with a short delay
export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3
) {
  return lazy(() => attempt(factory, retries));
}

async function attempt<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries: number
): Promise<{ default: T }> {
  try {
    return await factory();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, 1000));
    return attempt(factory, retries - 1);
  }
}

// Error boundary that auto-reloads once on chunk failures
interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (
      error.message.includes("dynamically imported module") ||
      error.message.includes("Failed to fetch") ||
      error.message.includes("Loading chunk")
    ) {
      const reloaded = sessionStorage.getItem("chunk-reload");
      if (!reloaded) {
        sessionStorage.setItem("chunk-reload", "1");
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <p className="text-lg font-semibold">Something went wrong</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
