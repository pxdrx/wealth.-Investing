import React from 'react';
import { Calendar } from 'lucide-react';

/**
 * Botão ícone discreto para abrir o histórico semanal.
 * - aria-label obrigatório
 * - tooltip via title
 */
const HistoryIconButton = ({ onClick, disabled = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Abrir histórico semanal"
      title="Histórico semanal"
      className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Calendar className="w-4 h-4" />
    </button>
  );
};

export default HistoryIconButton;

