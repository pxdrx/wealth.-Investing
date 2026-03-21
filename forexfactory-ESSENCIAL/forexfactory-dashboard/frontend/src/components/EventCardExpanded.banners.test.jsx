/**
 * Teste obrigatório: todo banner expansivo DEVE iniciar recolhido.
 * Nenhum banner pode abrir automaticamente na montagem, na chegada de dados,
 * em re-render ou em mudança de props. Colapso mútuo via openEventId no pai.
 */
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventCardExpanded from './EventCardExpanded';

const makeEvent = (overrides = {}) => ({
  id: `ev-${Math.random().toString(36).slice(2, 9)}`,
  event_id: `evt_${Math.random().toString(36).slice(2, 10)}`,
  event: 'CPI',
  currency: 'USD',
  impact: 'HIGH',
  print_time_label: '10:00',
  time_raw: '10:00',
  time: '10:00',
  ...overrides,
});

describe('EventCardExpanded – banners sempre recolhidos', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        analysis: { context: 'Descrição do evento.', ativo_beneficiado_evento: { principal: 'DXY', secundarios: [] } },
      }),
    }));
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const noop = () => {};
  const closedId = null;

  it('renderiza lista de eventos com TODOS os banners recolhidos', () => {
    const events = [
      makeEvent({ id: 'a1' }),
      makeEvent({ id: 'a2' }),
      makeEvent({ id: 'a3' }),
    ];
    render(
      <div>
        {events.map((e) => (
          <EventCardExpanded key={e.id} event={e} token={null} openEventId={closedId} onExpandClick={noop} />
        ))}
      </div>
    );
    expect(screen.queryAllByText('Análise do Evento').length).toBe(0);
    expect(screen.queryAllByText(/Carregando análise/).length).toBe(0);
  });

  it('após simular chegada de novos dados, banners continuam recolhidos', async () => {
    const initialEvents = [makeEvent({ id: 'b1' }), makeEvent({ id: 'b2' })];
    const { rerender } = render(
      <div>
        {initialEvents.map((e) => (
          <EventCardExpanded key={e.id} event={e} token={null} openEventId={closedId} onExpandClick={noop} />
        ))}
      </div>
    );
    expect(screen.queryAllByText('Análise do Evento').length).toBe(0);

    const newEvents = [...initialEvents, makeEvent({ id: 'b3' })];
    rerender(
      <div>
        {newEvents.map((e) => (
          <EventCardExpanded key={e.id} event={e} token={null} openEventId={closedId} onExpandClick={noop} />
        ))}
      </div>
    );
    expect(screen.queryAllByText('Análise do Evento').length).toBe(0);
  });

  it('banner abre SOMENTE após clique do usuário; colapso mútuo via openEventId', async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [openEventId, setOpenEventId] = useState(null);
      const event = makeEvent({ id: 'c1' });
      return (
        <EventCardExpanded
          event={event}
          token={null}
          openEventId={openEventId}
          onExpandClick={(id) => setOpenEventId((prev) => (prev === id ? null : id))}
        />
      );
    }
    render(<Wrapper />);
    expect(screen.queryByText('Análise do Evento')).toBeNull();

    const btn = screen.getByRole('button', { name: /Análise do Evento/i });
    await user.click(btn);
    expect(screen.getByText('Análise do Evento')).toBeTruthy();
  });

  it('apenas 1 banner pode ficar aberto; abrir outro fecha o anterior', async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [openEventId, setOpenEventId] = useState(null);
      const events = [makeEvent({ id: 'd1', event: 'CPI' }), makeEvent({ id: 'd2', event: 'NFP' })];
      return (
        <div>
          {events.map((e) => (
            <EventCardExpanded
              key={e.id}
              event={e}
              token={null}
              openEventId={openEventId}
              onExpandClick={(id) => setOpenEventId((prev) => (prev === id ? null : id))}
            />
          ))}
        </div>
      );
    }
    render(<Wrapper />);
    expect(screen.queryAllByText('Análise do Evento').length).toBe(0);

    const buttons = screen.getAllByRole('button', { name: /Análise do Evento/i });
    await user.click(buttons[0]);
    expect(screen.queryAllByText('Análise do Evento').length).toBe(1);

    await user.click(buttons[1]);
    expect(screen.queryAllByText('Análise do Evento').length).toBe(1);
  });

  it('evento sem actual exibe mensagem e não esconde ativos favorecidos', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        analysis: { context: 'Descrição do evento.', ativo_beneficiado_evento: { principal: '', secundarios: [] } },
      }),
    }));

    function Wrapper() {
      const [openEventId, setOpenEventId] = useState(null);
      const event = makeEvent({
        id: 'e-no-actual',
        event_id: 'evt_no_actual',
        actual: null,
        favored_assets: ['DXY', 'XAUUSD'],
      });
      return (
        <EventCardExpanded
          event={event}
          token={null}
          openEventId={openEventId}
          onExpandClick={(id) => setOpenEventId((prev) => (prev === id ? null : id))}
        />
      );
    }

    render(<Wrapper />);
    expect(screen.getByText(/Resultado ainda não divulgado/i)).toBeTruthy();

    const btn = screen.getByRole('button', { name: /Análise do Evento/i });
    await user.click(btn);

    // Ativos devem aparecer mesmo sem actual e mesmo se a análise não trouxer ativo_beneficiado_evento
    expect(await screen.findByText(/Índice Dólar \(DXY\)|DXY/)).toBeTruthy();
  });
});
