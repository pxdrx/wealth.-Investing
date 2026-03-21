import React, { useEffect, useState } from 'react';

/** Origem dos dados: implícita na lógica; não exposta na UI. */
const CORRELATION_IFRAME_SRC = 'https://www.mataf.net/en/forex/tools/correlation';

const CorrelationModal = ({ isOpen, onClose }) => {
  const [iframeFailed, setIframeFailed] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIframeFailed(false);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setIframeFailed(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-purple-900 to-blue-900 p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-white text-xl font-bold">Correlação</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-gray-950">
          {iframeFailed ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-gray-400 text-center text-lg">
                Dados de correlação temporariamente indisponíveis
              </p>
            </div>
          ) : (
            <iframe
              title="Correlação"
              src={CORRELATION_IFRAME_SRC}
              className="w-full flex-1 min-h-[60vh] border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
              referrerPolicy="no-referrer"
              onError={() => setIframeFailed(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrelationModal;
