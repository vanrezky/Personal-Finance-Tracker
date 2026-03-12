import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold text-rose-600 mb-2">Terjadi kesalahan</h2>
            <p className="text-slate-600 mb-4 text-sm">
              Terjadi kesalahan yang tidak terduga. Silakan coba muat ulang halaman.
            </p>
            <pre className="bg-slate-100 p-3 rounded-xl text-xs overflow-auto max-h-40 mb-4 text-slate-800">
              {this.state.error instanceof Error ? this.state.error.message : String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
