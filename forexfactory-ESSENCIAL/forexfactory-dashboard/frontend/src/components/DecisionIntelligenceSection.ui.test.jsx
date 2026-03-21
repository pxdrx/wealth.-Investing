/**
 * Teste obrigatório: UI nunca renderiza listas vazias.
 * Macro SEMPRE gera ≥1 ativo em destaque.
 * Se qualquer teste falhar → build falha.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DecisionIntelligenceSection from './DecisionIntelligenceSection';

describe('DecisionIntelligenceSection – nunca renderiza listas vazias', () => {
  it('com hasData=true mas ativos vazios, expandido mostra fallback DXY', async () => {
    const user = userEvent.setup();
    render(
      <DecisionIntelligenceSection
        ativoDominanteSemana={null}
        ativosCorrelacionadosSemana={[]}
        direcionamentoSemanal="Bullish"
        interpretacaoNarrativaAtivo={null}
        fluxoRisco={null}
      />
    );
    const btn = screen.getByRole('button');
    await user.click(btn);
    // Após expandir, deve mostrar "Ativos em Destaque na Semana" com ≥1 ativo (fallback DXY)
    expect(screen.getByText(/Ativos em Destaque na Semana/i)).toBeTruthy();
    expect(screen.getByText('DXY')).toBeTruthy();
  });

  it('com ativo_dominante_semana válido, expandido mostra ≥1 ativo', async () => {
    const user = userEvent.setup();
    render(
      <DecisionIntelligenceSection
        ativoDominanteSemana={{ ativo: 'EURUSD', justificativa: 'Teste' }}
        ativosCorrelacionadosSemana={[]}
        direcionamentoSemanal={null}
        interpretacaoNarrativaAtivo={null}
        fluxoRisco={null}
      />
    );
    const btn = screen.getByRole('button');
    await user.click(btn);
    expect(screen.getByText(/Ativos em Destaque na Semana/i)).toBeTruthy();
    expect(screen.getByText('EURUSD')).toBeTruthy();
  });
});
