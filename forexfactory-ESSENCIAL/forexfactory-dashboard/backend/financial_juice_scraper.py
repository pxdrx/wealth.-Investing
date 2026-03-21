"""
Financial Juice Scraper
Coleta notícias de alto impacto
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict
import time

class FinancialJuiceScraper:
    """Scraper de notícias do Financial Juice"""
    
    def __init__(self):
        self.base_url = "https://www.financialjuice.com"
        self.driver = None
    
    def _init_driver(self):
        """Inicializa Chrome"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        
        print("🔧 Inicializando Chrome...")
        
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            print("✅ Chrome inicializado")
            return True
        except Exception as e:
            print(f"❌ Erro: {e}")
            return False
    
    def get_latest_news(self, limit: int = 10) -> List[Dict]:
        """Busca últimas notícias de alto impacto"""
        
        if not self._init_driver():
            return []
        
        try:
            print(f"🌐 Acessando: {self.base_url}")
            self.driver.get(self.base_url)
            
            # Aguarda carregar
            print("⏳ Aguardando página carregar...")
            time.sleep(8)
            
            # Scroll
            print("📜 Fazendo scroll...")
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            self.driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(1)
            
            # Pega HTML
            html = self.driver.page_source
            
            # Salva HTML para debug (opcional)
            # with open('fj_debug.html', 'w', encoding='utf-8') as f:
            #     f.write(html)
            
            # Parse
            news = self._parse_news(html, limit)
            
            return news
        
        except Exception as e:
            print(f"❌ Erro: {e}")
            import traceback
            traceback.print_exc()
            return []
        finally:
            if self.driver:
                self.driver.quit()
                print("🔒 Chrome fechado")
    
    def _parse_news(self, html: str, limit: int) -> List[Dict]:
        """Parse do HTML"""
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            news_items = []
            
            # Financial Juice - estrutura pode variar
            # Vamos tentar múltiplas estratégias
            
            # Estratégia 1: Procura por articles
            articles = soup.find_all('article', limit=limit*2)
            
            if not articles:
                # Estratégia 2: Procura por divs com classes comuns
                articles = soup.find_all('div', class_=lambda x: x and ('post' in x.lower() or 'article' in x.lower() or 'news' in x.lower()) if x else False, limit=limit*2)
            
            if not articles:
                # Estratégia 3: Procura por qualquer div com título
                articles = soup.find_all('div', limit=limit*2)
            
            print(f"📰 Encontrados {len(articles)} elementos para processar")
            
            for article in articles:
                try:
                    # Título
                    title_elem = article.find(['h1', 'h2', 'h3', 'h4'])
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    
                    if not title or len(title) < 10:
                        continue
                    
                    # Link
                    link_elem = article.find('a', href=True)
                    link = None
                    if link_elem:
                        href = link_elem.get('href')
                        if href:
                            link = href if href.startswith('http') else f"{self.base_url}{href}"
                    
                    # Data/hora
                    time_elem = article.find('time')
                    published = None
                    if time_elem:
                        published = time_elem.get('datetime') or time_elem.get_text(strip=True)
                    
                    if not published:
                        published = datetime.now().isoformat()
                    
                    # Resumo
                    summary_elem = article.find('p')
                    summary = None
                    if summary_elem:
                        summary = summary_elem.get_text(strip=True)
                    
                    news_item = {
                        'title': title,
                        'link': link,
                        'published': published,
                        'summary': summary,
                        'source': 'Financial Juice',
                        'impact': 'HIGH'
                    }
                    
                    news_items.append(news_item)
                    
                    if len(news_items) >= limit:
                        break
                
                except Exception as e:
                    continue
            
            print(f"✅ {len(news_items)} notícias coletadas")
            
            return news_items
        
        except Exception as e:
            print(f"❌ Erro no parse: {e}")
            import traceback
            traceback.print_exc()
            return []


def get_financial_juice_news(limit: int = 10) -> List[Dict]:
    """Função auxiliar"""
    scraper = FinancialJuiceScraper()
    return scraper.get_latest_news(limit)


if __name__ == "__main__":
    print("🚀 Financial Juice Scraper - Teste")
    print("=" * 50)
    print()
    
    news = get_financial_juice_news(limit=5)
    
    print()
    print(f"📰 {len(news)} notícias encontradas:")
    
    for i, item in enumerate(news, 1):
        print(f"\n{i}. {item['title']}")
        if item.get('link'):
            print(f"   🔗 {item['link']}")
        print(f"   📅 {item['published']}")
        if item.get('summary'):
            print(f"   📝 {item['summary'][:100]}...")
    
    # Salva no banco
    if news:
        from database import get_db
        
        print()
        response = input("💾 Salvar no banco de dados? (s/n): ").strip().lower()
        
        if response == 's':
            db = get_db()
            saved = db.save_news(news)
            print(f"✅ {saved} notícias salvas!")