"""
NewsAPI Integration
FREE tier: 100 requests/dia
"""

import requests
from datetime import datetime, timedelta
from typing import List, Dict

class NewsAPIClient:
    """Cliente para NewsAPI"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://newsapi.org/v2"
    
    def get_financial_news(self, query: str = "forex OR federal reserve OR economy", limit: int = 10) -> List[Dict]:
        """
        Busca notícias financeiras
        
        Args:
            query: Query de busca
            limit: Número de notícias
        
        Returns:
            Lista de notícias
        """
        try:
            url = f"{self.base_url}/everything"
            
            # Últimas 24 horas
            from_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
            
            params = {
                'q': query,
                'from': from_date,
                'sortBy': 'publishedAt',
                'language': 'en',
                'apiKey': self.api_key,
                'pageSize': limit
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                articles = data.get('articles', [])
                
                # Normaliza
                normalized = []
                for article in articles:
                    normalized.append({
                        'title': article.get('title'),
                        'description': article.get('description'),
                        'url': article.get('url'),
                        'source': article.get('source', {}).get('name'),
                        'published_at': article.get('publishedAt'),
                        'image': article.get('urlToImage')
                    })
                
                print(f"✅ NewsAPI: {len(normalized)} notícias carregadas")
                return normalized
            else:
                print(f"❌ NewsAPI erro: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"❌ NewsAPI exception: {e}")
            return []
    
    def get_critical_alerts(self) -> List[Dict]:
        """Retorna alertas críticos (breaking news)"""
        return self.get_financial_news(
            query="(federal reserve OR fed OR interest rate OR inflation) AND (decision OR meeting OR announcement)",
            limit=5
        )


# Função auxiliar
def get_financial_news_alerts(api_key: str = "53dfa28df50144239c12c3dc09d8216a") -> List[Dict]:
    """Retorna alertas de notícias financeiras"""
    client = NewsAPIClient(api_key)
    return client.get_critical_alerts()