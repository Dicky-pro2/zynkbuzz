import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icons } from './icons/Icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Route Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto">
            <Icons.Warning size={22} className="text-red-400" />
          </div>
          <div>
            <h2 className="font-sora font-bold text-lg mb-1">Page Error</h2>
            <p className="text-slatec text-sm">
              This page ran into a problem. Try refreshing or navigating away.
            </p>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details className="text-left">
              <summary className="text-xs text-slatec cursor-pointer hover:text-white transition-colors">
                Show error details
              </summary>
              <div className="bg-navy-2 border border-red-500/20 rounded-xl p-3 mt-2">
                <p className="text-red-400 text-xs font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Icons.Refresh size={14} /> Try Again
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Icons.Dashboard size={14} /> Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}