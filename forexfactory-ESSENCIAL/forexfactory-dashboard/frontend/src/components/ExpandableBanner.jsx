import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// REGRA ABSOLUTA: todo banner inicia recolhido. Abertura SOMENTE via clique.
const ExpandableBanner = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  gradientFrom, 
  gradientTo, 
  defaultOpen,
  children 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white py-4 px-6 flex items-center justify-between hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon size={24} className="text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold leading-tight">{title}</h3>
            <p className="text-sm text-white/80 leading-tight">{subtitle}</p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          {isExpanded ? (
            <ChevronUp size={24} className="text-white" />
          ) : (
            <ChevronDown size={24} className="text-white" />
          )}
        </div>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6 bg-gray-950">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ExpandableBanner;