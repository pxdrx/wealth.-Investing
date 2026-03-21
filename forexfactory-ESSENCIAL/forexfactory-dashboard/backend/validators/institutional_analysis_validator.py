"""Validator usando Pydantic schema."""

from schemas.institutional_analysis_schema import (
    InstitutionalAnalysis,
    RegionalOverview,
    Narrative,
    Conclusion,
    Asset,
    Probability
)


class InstitutionalAnalysisValidator:
    """Valida dados parsed."""
    
    def validate(self, parsed_data: dict) -> InstitutionalAnalysis:
        """Valida e retorna modelo Pydantic."""
        
        # Construir regional overview
        regional_overview = [
            RegionalOverview(**region)
            for region in parsed_data['regional_overview']
        ]
        
        # Construir narrative
        narrative = Narrative(**parsed_data['narrative'])
        
        # Construir conclusion
        conclusion = Conclusion(**parsed_data['conclusion'])
        
        # Construir assets
        assets = []
        for asset_data in parsed_data['assets']:
            probability = Probability(**asset_data['probability'])
            asset = Asset(
                name=asset_data['name'],
                scenario_base=asset_data['scenario_base'],
                driver_macro=asset_data['driver_macro'],
                probability=probability
            )
            assets.append(asset)
        
        # Construir análise completa
        analysis = InstitutionalAnalysis(
            week_start=parsed_data['metadata']['week_start'],
            week_end=parsed_data['metadata']['week_end'],
            generated_at=parsed_data['metadata']['generated_at'],
            analyst=parsed_data['metadata']['analyst'],
            source=parsed_data['metadata']['source'],
            regional_overview=regional_overview,
            narrative=narrative,
            conclusion=conclusion,
            assets=assets
        )
        
        return analysis