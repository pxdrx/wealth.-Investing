import React, { useEffect, useState } from 'react';
import { getSubscriptionMe, createSubscription, cancelSubscription } from '../services/api';

const SubscriptionModal = ({ isOpen, onClose, token, user }) => {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  const userEmail = user?.email;

  useEffect(() => {
    if (isOpen && userEmail && token) {
      setLoading(true);
      setError(null);
      getSubscriptionMe(token, userEmail)
        .then((r) => {
          setSub(r.subscription ?? null);
        })
        .catch((e) => setError(e.message || 'Erro ao carregar assinatura'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, userEmail, token]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleAssinar = async (plan) => {
    if (!userEmail || !token) return;
    setActionLoading(plan);
    setError(null);
    try {
      const r = await createSubscription(token, userEmail, plan);
      if (r.redirect_url) window.location.href = r.redirect_url;
      else setSub(r.subscription ?? sub);
    } catch (e) {
      setError(e.message || 'Erro ao criar assinatura');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelar = async () => {
    if (!userEmail || !token) return;
    setActionLoading('cancel');
    setError(null);
    try {
      await cancelSubscription(token, userEmail);
      const r = await getSubscriptionMe(token, userEmail);
      setSub(r.subscription ?? null);
    } catch (e) {
      setError(e.message || 'Erro ao cancelar');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  const statusLabel = sub?.status === 'active' ? 'Ativo' : sub?.status === 'trial' ? 'Trial' : sub?.status === 'past_due' ? 'Pagamento pendente' : sub?.status === 'canceled' ? 'Cancelado' : sub?.status === 'expired' ? 'Expirado' : sub?.status ?? '—';
  const planLabel = sub?.plan === 'ANNUAL' ? 'Anual' : sub?.plan === 'MONTHLY' ? 'Mensal' : '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-white text-xl font-bold">Assinatura</h2>
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

        <div className="p-6 bg-gray-950 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200 text-sm">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              <div className="space-y-2 text-gray-300">
                <p><span className="text-gray-500">Plano atual:</span> {planLabel}</p>
                <p><span className="text-gray-500">Status:</span> {statusLabel}</p>
                {sub?.current_period_end && (
                  <p><span className="text-gray-500">Renovação:</span> {sub.current_period_end}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleAssinar('MONTHLY')}
                  disabled={!!actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {actionLoading === 'MONTHLY' ? '...' : 'Assinar Mensal'}
                </button>
                <button
                  onClick={() => handleAssinar('ANNUAL')}
                  disabled={!!actionLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {actionLoading === 'ANNUAL' ? '...' : 'Assinar Anual'}
                </button>
                {sub && sub.status !== 'canceled' && sub.status !== 'expired' && (
                  <button
                    onClick={handleCancelar}
                    disabled={!!actionLoading}
                    className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {actionLoading === 'cancel' ? '...' : 'Cancelar assinatura'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
