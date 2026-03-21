import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o state para que a próxima renderização mostre a UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log do erro para console (em produção, enviar para serviço de logging)
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // UI de fallback customizada
      return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl p-6">
          <div className="bg-red-900/20 rounded-lg p-4 border border-red-700/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⚠️</span>
              <h3 className="text-sm font-semibold text-red-400">Erro ao Carregar Componente</h3>
            </div>
            <p className="text-red-200 text-sm mb-2">
              Ocorreu um erro ao renderizar este componente. A página continua funcional.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-3 text-xs text-red-300">
                <summary className="cursor-pointer mb-1">Detalhes do erro (dev)</summary>
                <pre className="bg-gray-900/50 p-2 rounded overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
