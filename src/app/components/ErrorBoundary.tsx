import { Component, type ReactNode } from 'react';
import { StickFigure } from './StickFigure';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          {/* Distressed stick figure */}
          <div className="flex justify-center mb-6">
            <StickFigure pose="thinking" size={80} animate={false} />
          </div>

          {/* Newspaper headline style */}
          <div className="border-t-4 border-b-2 border-black py-3 mb-6">
            <p
              className="font-[Inter] text-black/30 uppercase tracking-[0.2em] mb-1"
              style={{ fontSize: '0.6rem' }}
            >
              Breaking News
            </p>
            <h1
              className="font-[Playfair_Display] text-black leading-tight"
              style={{ fontSize: '2rem' }}
            >
              Something Went Wrong
            </h1>
          </div>

          <p className="font-[Inter] text-black/50 mb-2" style={{ fontSize: '0.9rem' }}>
            An unexpected error interrupted your investigation.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <details className="mb-6 text-left">
              <summary
                className="font-[Inter] text-black/30 cursor-pointer hover:text-black/50 transition-colors"
                style={{ fontSize: '0.75rem' }}
              >
                Technical details
              </summary>
              <pre
                className="mt-2 p-3 bg-black/5 border border-black/10 overflow-auto font-[JetBrains_Mono] text-black/50"
                style={{ fontSize: '0.7rem' }}
              >
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleGoHome}
              className="px-5 py-2.5 border-2 border-black/20 font-[Inter] text-black/60 hover:border-black/50 hover:text-black transition-[color,background-color,border-color,opacity,transform,box-shadow]"
              style={{ fontSize: '0.85rem' }}
            >
              ← Go Home
            </button>
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-black text-white font-[Inter] hover:bg-black/80 transition-colors"
              style={{ fontSize: '0.85rem' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
