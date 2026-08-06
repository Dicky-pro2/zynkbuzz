import { Component, type ErrorInfo, type ReactNode } from "react";
import { Icons } from "./icons/Icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // When backend is ready, send to error tracking (e.g. Sentry)
    console.error("Zynk Error Boundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-navy">
          {/* Background orbs */}
          <div className="absolute w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[100px] -top-32 -left-32 pointer-events-none" />
          <div className="absolute w-[400px] h-[400px] bg-violet/10 rounded-full blur-[100px] -bottom-24 -right-24 pointer-events-none" />

          <div className="card p-8 w-full max-w-lg relative z-10 text-center">
            {/* Logo */}
            <div className="font-sora font-extrabold text-xl mb-8">
              Zy<span className="text-violet-light">nk</span>
            </div>

            {/* Error icon */}
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <Icons.Warning size={28} className="text-red-400" />
            </div>

            <h1 className="font-sora font-bold text-xl mb-2">
              Something went wrong
            </h1>
            <p className="text-slatec text-sm leading-relaxed mb-6">
              An unexpected error occurred. This has been logged and we'll look
              into it. You can try reloading the page or going back to the home
              screen.
            </p>

            {/* Error details — dev only */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mb-6">
                <summary className="text-xs text-slatec cursor-pointer hover:text-white transition-colors mb-2 flex items-center gap-1.5">
                  <Icons.HelpCircle size={13} /> Show error details (dev only)
                </summary>
                <div className="bg-navy-2 border border-red-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-red-400 text-xs font-mono break-all">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="text-slatec text-[10px] font-mono overflow-auto max-h-32 whitespace-pre-wrap break-all">
                      {this.state.error.stack}
                    </pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-slatec text-[10px] font-mono overflow-auto max-h-32 whitespace-pre-wrap break-all">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <Icons.Refresh size={16} /> Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Icons.Home size={16} /> Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
