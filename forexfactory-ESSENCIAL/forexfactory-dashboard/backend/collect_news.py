"""
Coleta notícias de alto impacto usando NewsAPI
"""

import requests
from datetime import datetime, timedelta
from typing import List, Dict
import os

def get_market_news(api_key: str = None, days_back: int = 1, limit: int = 10) -> List[Dict]:
    """
    Busca notícias de mercado usando NewsAPI
    
    Args:
        api_key: NewsAPI key (se None, tenta pegar do .env)
        days_back: Quantos dias atrás buscar
        limit: Número máximo de notícias
    """
    
    # Tenta pegar API key
    if not api_key:
        api_key = os.environ.get('NEWSAPI_KEY')
    
    if not api_key:
        print("❌ NewsAPI key não configurada!")
        print("   Configure: NEWSAPI_KEY no arquivo .env")
        print("   Ou pegue grátis em: https://newsapi.org")
        return []
    
    # Calcula data
    from_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
    
    # Palavras-chave de mercado
    keywords = '(Fed OR "Federal Reserve" OR ECB OR "interest rate" OR inflation OR GDP OR employment OR "central bank" OR forex OR stocks OR "financial markets")'
    
    # Parâmetros
    params = {
        'apiKey': api_key,
        'q': keywords,
        'from': from_date,
        'sortBy': 'publishedAt',
        'language': 'en',
        'pageSize': limit
    }
    
    try:
        print(f"🌐 Buscando notícias (últimos {days_back} dias)...")
        
        response = requests.get('https://newsapi.org/v2/everything', params=params, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Erro HTTP: {response.status_code}")
            print(f"   {response.text[:200]}")
            return []
        
        data = response.json()
        
        if data.get('status') != 'ok':
            print(f"❌ Erro na API: {data.get('message', 'Erro desconhecido')}")
            return []
        
        articles = data.get('articles', [])
        
        print(f"✅ {len(articles)} notícias encontradas")
        
        # Converte para nosso formato
        news_items = []
        
        for article in articles:
            news_item = {
                'title': article.get('title', 'N/A'),
                'link': article.get('url'),
                'published': article.get('publishedAt'),
                'summary': article.get('description'),
                'source': article.get('source', {}).get('name', 'NewsAPI'),
                'impact': 'HIGH'  # NewsAPI filtra por palavras-chave relevantes
            }
            
            news_items.append(news_item)
        
        return news_items
    
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return []


def save_news_to_db(news_items: List[Dict]) -> int:
    """Salva notícias no banco"""
    from database import get_db
    
    if not news_items:
        return 0
    
    db = get_db()
    saved = db.save_news(news_items)
    
    return saved


if __name__ == "__main__":
    print("🚀 MRKT Edge - Coleta de Notícias")
    print("=" * 50)
    print()
    
    # Busca notícias
    news = get_market_news(days_back=1, limit=10)
    
    if news:
        print()
        print(f"📰 {len(news)} notícias:")
        
        for i, item in enumerate(news, 1):
            print(f"\n{i}. {item['title']}")
            print(f"   🔗 {item['link']}")
            print(f"   📅 {item['published']}")
            if item.get('summary'):
                print(f"   📝 {item['summary'][:100]}...")
        
        # Pergunta se quer salvar
        print()
        response = input("💾 Salvar no banco de dados? (s/n): ").strip().lower()
        
        if response == 's':
            saved = save_news_to_db(news)
            print(f"✅ {saved} notícias salvas!")
    else:
        print()
        print("⚠️ Nenhuma notícia encontrada")
        print()
        print("💡 Para usar NewsAPI:")
        print("   1. Acesse: https://newsapi.org")
        print("   2. Crie conta grátis")
        print("   3. Copie sua API key")
        print("   4. Adicione no .env: NEWSAPI_KEY=sua-key")