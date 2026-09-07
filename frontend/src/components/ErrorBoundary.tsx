"use client";

import * as React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted, #aaa)" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>😵</p>
            <p>Something went wrong. Please refresh the page.</p>
            <button
              type="button"
              style={{ marginTop: 16, padding: "8px 20px", cursor: "pointer" }}
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
