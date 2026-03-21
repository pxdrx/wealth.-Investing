import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchLatestAnalysis = async () => {
  try {
    // MODO DASHBOARD_COMMIT_STRICT = TRUE
    // Forçar invalidação de cache com timestamp
    const cacheBuster = `?t=${Date.now()}`;
    const response = await api.get(`/analysis/latest${cacheBuster}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Tempo de conexão esgotado. Tente novamente.');
    }
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Análise não encontrada.');
      }
      if (error.response.status === 500) {
        throw new Error('Erro no servidor. Tente novamente mais tarde.');
      }
      throw new Error(`Erro ${error.response.status}: ${error.response.statusText}`);
    }
    if (error.request) {
      throw new Error('Sem conexão com o servidor. Verifique se o backend está rodando em http://127.0.0.1:8000');
    }
    throw new Error('Erro ao carregar análise.');
  }
};

export const fetchAnalysisByWeek = async (weekStart) => {
  try {
    const response = await api.get(`/analysis/${weekStart}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Análise não encontrada para esta semana.');
    }
    throw new Error('Erro ao carregar análise.');
  }
};

/**
 * Lista histórico de análises (metadata apenas).
 * Contrato backend: 200 com { items: [], limit, offset, total }.
 * items ausente -> default []. Erro de rede/500 -> estado indisponível sem crash.
 */
export const fetchAnalysisList = async (limit = 50, offset = 0) => {
  try {
    const response = await api.get('/analysis/list', {
      params: { limit, offset }
    });
    const data = response?.data;
    if (!data || typeof data !== 'object') {
      return { status: "ok", reason: null, items: [], limit: limit, offset, total: 0 };
    }
    return {
      status: "ok",
      reason: null,
      items: Array.isArray(data.items) ? data.items : [],
      limit: data.limit ?? limit,
      offset: data.offset ?? offset,
      total: typeof data.total === 'number' ? data.total : 0,
    };
  } catch (error) {
    // Tratar como opcional - não lançar erro; retornar schema estável para UI não quebrar
    const reason =
      error?.response?.data?.detail ||
      error?.message ||
      'Endpoint /analysis/list indisponível';
    if (error?.response?.status !== 500) {
      console.warn('Histórico de análises não disponível:', reason);
    }
    return { status: "unavailable", reason, items: [], limit, offset, total: 0 };
  }
};

const getAuthHeaders = (token, userEmail) => {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (userEmail) h['X-User-Email'] = userEmail;
  return h;
};

export const getSubscriptionMe = async (token, userEmail) => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  const res = await fetch(`${base}/api/subscriptions/me`, {
    headers: getAuthHeaders(token, userEmail),
  });
  if (!res.ok) throw new Error('Erro ao buscar assinatura');
  return res.json();
};

export const createSubscription = async (token, userEmail, plan) => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  const res = await fetch(`${base}/api/subscriptions`, {
    method: 'POST',
    headers: getAuthHeaders(token, userEmail),
    body: JSON.stringify({ plan, user_email: userEmail }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erro ao criar assinatura');
  }
  return res.json();
};

export const cancelSubscription = async (token, userEmail) => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  const res = await fetch(`${base}/api/subscriptions/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(token, userEmail),
  });
  if (!res.ok) throw new Error('Erro ao cancelar assinatura');
  return res.json();
};

export default api;