"""
Pipeline de análise institucional - Parse e validação de markdown.
"""

from pathlib import Path
from datetime import date
import json
from typing import Optional

from schemas.institutional_analysis_schema import (
    InstitutionalAnalysis,
    RegionalOverview,
    Narrative,
    Conclusion,
    Asset,
    Probability
)
from parsers.institutional_analysis_parser import InstitutionalAnalysisParser
from validators.institutional_analysis_validator import InstitutionalAnalysisValidator


class InstitutionalAnalysisPipeline:
    """Pipeline para processar markdown de análise institucional."""
    
    def __init__(self, markdown_path: str, output_dir: str):
        self.markdown_path = Path(markdown_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.parsed_data = None
        self.validated_analysis = None
        
    def run(self) -> bool:
        """Executa pipeline completo."""
        try:
            # Parse
            parser = InstitutionalAnalysisParser()
            self.parsed_data = parser.parse(self.markdown_path)
            
            # Validate
            validator = InstitutionalAnalysisValidator()
            self.validated_analysis = validator.validate(self.parsed_data)
            
            # Generate JSON
            self._generate_output_json()
            
            return True
            
        except Exception as e:
            print(f"Pipeline error: {e}")
            return False
    
    def _generate_output_json(self):
        """Gera arquivo JSON de saída."""
        output_file = self.output_dir / f"institutional_analysis_{self.validated_analysis.week_start.strftime('%Y%m%d')}.json"
        
        output_data = self.validated_analysis.to_dict()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)