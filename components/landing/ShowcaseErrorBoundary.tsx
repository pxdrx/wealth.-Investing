"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ShowcaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Intentionally swallow to keep the landing alive; log for diagnostics.
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[ShowcaseErrorBoundary]", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="rounded-[22px] border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600"
        >
          Não foi possível carregar este painel — recarregue a página.
        </div>
      );
    }
    return this.props.children;
  }
}
