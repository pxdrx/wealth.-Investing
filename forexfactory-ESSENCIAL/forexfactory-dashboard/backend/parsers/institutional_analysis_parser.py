"""Parser de markdown para análise institucional."""

from pathlib import Path
from datetime import datetime
import re


class InstitutionalAnalysisParser:
    """Parse markdown estruturado."""
    
    def parse(self, markdown_path: Path) -> dict:
        """Parse arquivo markdown."""
        with open(markdown_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        data = {}
        
        # Parse metadata
        data['metadata'] = self._parse_metadata(content)
        
        # Parse seções
        data['regional_overview'] = self._parse_regional_overview(content)
        data['narrative'] = self._parse_narrative(content)
        data['conclusion'] = self._parse_conclusion(content)
        data['assets'] = self._parse_assets(content)
        
        return data
    
    def _parse_metadata(self, content: str) -> dict:
        """Parse seção Metadata."""
        metadata = {}
        
        # Week Start
        match = re.search(r'Week Start:\s*(\d{4}-\d{2}-\d{2})', content)
        if match:
            metadata['week_start'] = datetime.strptime(match.group(1), '%Y-%m-%d').date()
        
        # Week End
        match = re.search(r'Week End:\s*(\d{4}-\d{2}-\d{2})', content)
        if match:
            metadata['week_end'] = datetime.strptime(match.group(1), '%Y-%m-%d').date()
        
        # Generated At
        match = re.search(r'Generated At:\s*(\d{4}-\d{2}-\d{2})', content)
        if match:
            metadata['generated_at'] = datetime.strptime(match.group(1), '%Y-%m-%d').date()
        
        # Analyst
        match = re.search(r'Analyst:\s*(.+)', content)
        if match:
            metadata['analyst'] = match.group(1).strip()
        
        # Source
        match = re.search(r'Source:\s*(.+)', content)
        if match:
            metadata['source'] = match.group(1).strip()
        
        return metadata
    
    def _parse_regional_overview(self, content: str) -> list:
        """Parse panorama regional."""
        regions = []
        
        # Américas
        match = re.search(r'### Américas\n(.+?)(?=\n###|\n##|$)', content, re.DOTALL)
        if match:
            regions.append({"region": "Américas", "content": match.group(1).strip()})
        
        # Europa
        match = re.search(r'### Europa\n(.+?)(?=\n###|\n##|$)', content, re.DOTALL)
        if match:
            regions.append({"region": "Europa", "content": match.group(1).strip()})
        
        # Ásia-Pacífico
        match = re.search(r'### Ásia-Pacífico\n(.+?)(?=\n###|\n##|$)', content, re.DOTALL)
        if match:
            regions.append({"region": "Ásia-Pacífico", "content": match.group(1).strip()})
        
        return regions
    
    def _parse_narrative(self, content: str) -> dict:
        """Parse interpretação narrativa."""
        narrative = {}
        
        sections = {
            'politica_monetaria': 'Política Monetária',
            'crescimento_economico': 'Crescimento Econômico',
            'inflacao_pressoes': 'Inflação e Pressões',
            'risco_apetite': 'Risco e Apetite'
        }
        
        for key, title in sections.items():
            match = re.search(rf'### {title}\n(.+?)(?=\n###|\n##|$)', content, re.DOTALL)
            if match:
                narrative[key] = match.group(1).strip()
        
        return narrative
    
    def _parse_conclusion(self, content: str) -> dict:
        """Parse conclusão operacional."""
        conclusion = {}
        
        # Síntese da Semana
        match = re.search(r'### Síntese da Semana\n(.+?)(?=\n###|\n##|$)', content, re.DOTALL)
        if match:
            conclusion['sintese_semana'] = match.group(1).strip()
        
        # Precificação de Mercado
        match = re.search(r'### Precificação de Mercado\n(.+?)(?=\n###|\n##|$)', content, re.DOTALL)
        if match:
            conclusion['precificacao_mercado'] = match.group(1).strip()
        
        return conclusion
    
    def _parse_assets(self, content: str) -> list:
        """Parse análise de ativos."""
        assets = []
        
        asset_names = ['DXY', 'XAUUSD', 'S&P 500', 'Nasdaq', 'EURUSD', 'Bitcoin']
        
        for name in asset_names:
            pattern = rf'### {re.escape(name)}\n- Scenario Base: (Alta|Lateral|Baixa)\n- Driver Macro: (.+?)\n- Probability:\n\s+- Alta: (Alta|Média|Baixa)\n\s+- Lateral: (Alta|Média|Baixa)\n\s+- Baixa: (Alta|Média|Baixa)'
            
            match = re.search(pattern, content, re.DOTALL)
            if match:
                assets.append({
                    "name": name,
                    "scenario_base": match.group(1),
                    "driver_macro": match.group(2).strip(),
                    "probability": {
                        "alta": match.group(3),
                        "lateral": match.group(4),
                        "baixa": match.group(5)
                    }
                })
        
        return assets