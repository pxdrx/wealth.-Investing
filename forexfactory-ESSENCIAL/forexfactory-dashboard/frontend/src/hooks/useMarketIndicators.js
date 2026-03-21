import { useState, useEffect } from 'react';

/**
 * Hook para buscar valores de Fear & Greed Index e VIX Index.
 * Retorna valores atuais para classificação de regime de risco.
 * 
 * @returns {object} - { fearGreedValue: number | null, vixValue: number | null, loading: boolean }
 */
export const useMarketIndicators = () => {
  const [fearGreedValue, setFearGreedValue] = useState(null);
  const [vixValue, setVixValue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIndicators();
    const interval = setInterval(fetchIndicators, 300000); // 5 minutos
    return () => clearInterval(interval);
  }, []);

  const fetchIndicators = async () => {
    try {
      // Fear & Greed Index
      const fngResponse = await fetch('https://api.alternative.me/fng/?limit=1');
      const fngResult = await fngResponse.json();
      if (fngResult.data && fngResult.data.length > 0) {
        setFearGreedValue(parseInt(fngResult.data[0].value));
      }

      // VIX Index (hardcoded por enquanto, como no VIXProfessional)
      // TODO: Substituir por API real quando disponível
      setVixValue(15.8); // Valor atual do VIXProfessional
    } catch (error) {
      console.error('Erro ao buscar indicadores de mercado:', error);
    } finally {
      setLoading(false);
    }
  };

  return { fearGreedValue, vixValue, loading };
};
