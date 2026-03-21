"""
ForexFactory Slow Scraper
Scrape LENTO com delays grandes para evitar bloqueio
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from typing import List, Dict
import time
import threading
import random

class ForexFactorySlowScraper:
    """Scraper com delays longos para evitar bloqueio"""
    
    def __init__(self):
        self.base_url = "https://www.forexfactory.com/calendar"
        self.driver = None
        
        # Cache
        self.cache = {
            'events': [],
            'timestamp': None,
            'cache_duration': 180
        }
        
        self.lock = threading.Lock()
        self.scraping = False
    
    def _init_driver(self):
        """Inicializa Chrome com configurações anti-detecção"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        
        # User-Agent mais realista
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]
        
        chrome_options.add_argument(f'--user-agent={random.choice(user_agents)}')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        
        # Configurações extras para parecer mais humano
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        print("🔧 Inicializando Chrome...")
        
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # Remove flag do webdriver
            self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                'source': '''
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    })
                '''
            })
            
            print("✅ Chrome inicializado")
            return True
        except Exception as e:
            print(f"❌ Erro ao inicializar Chrome: {e}")
            return False
    
    def is_cache_valid(self) -> bool:
        if not self.cache['timestamp']:
            return False
        age = (datetime.now() - self.cache['timestamp']).total_seconds()
        return age < self.cache['cache_duration']
    
    def get_cache_age(self) -> int:
        if not self.cache['timestamp']:
            return 999999
        return int((datetime.now() - self.cache['timestamp']).total_seconds())
    
    def get_week_events(self, force_refresh: bool = False) -> List[Dict]:
        """Busca eventos da semana"""
        
        with self.lock:
            if not force_refresh and self.is_cache_valid():
                cache_age = self.get_cache_age()
                print(f"📦 Usando cache ({cache_age}s atrás)")
                return self.cache['events']
            
            if self.scraping:
                print("⏳ Scrape em andamento, usando cache")
                return self.cache['events']
            
            self.scraping = True
        
        try:
            print("🌐 Iniciando scrape LENTO (ForexFactory)...")
            print("⚠️  Isso vai demorar ~2-3 MINUTOS!")
            events = self._scrape_week_slow()
            
            if events:
                with self.lock:
                    self.cache['events'] = events
                    self.cache['timestamp'] = datetime.now()
                print(f"✅ Cache atualizado: {len(events)} eventos")
            else:
                print("⚠️ Scrape vazio, mantendo cache anterior")
            
            return events if events else self.cache['events']
        
        except Exception as e:
            print(f"❌ Erro no scrape: {e}")
            import traceback
            traceback.print_exc()
            return self.cache['events']
        finally:
            self.scraping = False
    
    def _scrape_week_slow(self) -> List[Dict]:
        """Scrape com delays longos"""
        
        if not self._init_driver():
            return []
        
        all_events = []
        
        try:
            # Calcula datas da semana
            now = datetime.now()
            start_of_week = now - timedelta(days=now.weekday())
            
            # Para cada dia da semana
            for day_offset in range(5):  # Seg a Sex
                target_date = start_of_week + timedelta(days=day_offset)
                date_str = target_date.strftime('%b%d.%Y').lower()
                
                print(f"\n📆 [{day_offset + 1}/5] {target_date.strftime('%A, %d/%m/%Y')}...")
                
                # Monta URL
                url = f"{self.base_url}?day={date_str}"
                print(f"   🌐 URL: {url}")
                
                # Acessa página
                self.driver.get(url)
                
                # Delay inicial (randomizado)
                initial_delay = random.uniform(8, 12)
                print(f"   ⏳ Aguardando {initial_delay:.1f}s (Cloudflare + carregamento)...")
                time.sleep(initial_delay)
                
                # Aguarda tabela
                try:
                    WebDriverWait(self.driver, 25).until(
                        EC.presence_of_element_located((By.CLASS_NAME, "calendar__table"))
                    )
                    print(f"   ✅ Tabela carregada!")
                except:
                    print(f"   ❌ Timeout esperando tabela")
                    
                    # Se falhou, tenta aguardar mais um pouco
                    print(f"   🔄 Tentando aguardar mais 10s...")
                    time.sleep(10)
                
                # Comportamento "humano": scroll
                try:
                    print(f"   📜 Simulando scroll...")
                    self.driver.execute_script("window.scrollTo(0, 500);")
                    time.sleep(random.uniform(0.5, 1.5))
                    self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    time.sleep(random.uniform(1, 2))
                    self.driver.execute_script("window.scrollTo(0, 0);")
                    time.sleep(random.uniform(0.5, 1))
                except:
                    pass
                
                # Pega HTML
                html = self.driver.page_source
                
                # Parse
                day_events = self._parse_calendar(html, str(target_date.date()))
                
                if day_events:
                    high = len([e for e in day_events if e['impact'] == 'HIGH'])
                    medium = len([e for e in day_events if e['impact'] == 'MEDIUM'])
                    low = len([e for e in day_events if e['impact'] == 'LOW'])
                    
                    print(f"   ✅ {len(day_events)} eventos → HIGH:{high} MEDIUM:{medium} LOW:{low}")
                    all_events.extend(day_events)
                else:
                    print(f"   ⚠️ Nenhum evento encontrado")
                
                # DELAY LONGO entre requisições (exceto no último)
                if day_offset < 4:
                    delay = random.uniform(15, 25)  # 15-25 segundos!
                    print(f"   ⏸️  Aguardando {delay:.1f}s antes do próximo dia...")
                    time.sleep(delay)
            
            # Remove duplicatas
            unique_events = self._remove_duplicates(all_events)
            
            # Estatísticas finais
            impact_stats = {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
            dates_found = set()
            
            for event in unique_events:
                impact_stats[event['impact']] += 1
                dates_found.add(event['date'])
            
            print(f"\n📊 TOTAL FINAL: {len(unique_events)} eventos únicos")
            print(f"   🔴 HIGH: {impact_stats['HIGH']}")
            print(f"   🟠 MEDIUM: {impact_stats['MEDIUM']}")
            print(f"   🟡 LOW: {impact_stats['LOW']}")
            print(f"📅 Datas coletadas: {sorted(dates_found)}")
            
            return unique_events
        
        except Exception as e:
            print(f"❌ Erro: {e}")
            import traceback
            traceback.print_exc()
            return all_events
        finally:
            if self.driver:
                self.driver.quit()
                print("🔒 Chrome fechado")
    
    def _parse_calendar(self, html: str, target_date: str) -> List[Dict]:
        """Parse do HTML"""
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            table = soup.find('table', class_='calendar__table')
            
            if not table:
                return []
            
            events = []
            rows = table.find_all('tr', class_=lambda x: x and 'calendar__row' in x)
            
            for row in rows:
                try:
                    # Hora
                    time_cell = row.find('td', class_='calendar__time')
                    time_str = time_cell.get_text(strip=True) if time_cell else ''
                    
                    # Moeda
                    currency_cell = row.find('td', class_='calendar__currency')
                    currency = currency_cell.get_text(strip=True) if currency_cell else ''
                    
                    # Impacto
                    impact_cell = row.find('td', class_='calendar__impact')
                    impact = 'LOW'
                    
                    if impact_cell:
                        impact_span = impact_cell.find('span')
                        if impact_span:
                            classes = impact_span.get('class', [])
                            class_str = ' '.join(classes).lower() if classes else ''
                            
                            if 'icon--ff-impact-red' in class_str:
                                impact = 'HIGH'
                            elif 'icon--ff-impact-ora' in class_str:
                                impact = 'MEDIUM'
                            elif 'icon--ff-impact-yel' in class_str:
                                impact = 'LOW'
                    
                    # Nome
                    event_cell = row.find('td', class_='calendar__event')
                    if not event_cell:
                        continue
                    
                    event_span = event_cell.find('span', class_='calendar__event-title')
                    event_name = event_span.get_text(strip=True) if event_span else ''
                    
                    if not event_name:
                        continue
                    
                    # Valores
                    actual_cell = row.find('td', class_='calendar__actual')
                    forecast_cell = row.find('td', class_='calendar__forecast')
                    previous_cell = row.find('td', class_='calendar__previous')
                    
                    event = {
                        'id': f"ff_{target_date}_{time_str}_{currency}_{event_name[:20]}".replace(' ', '_').replace('/', '-'),
                        'title': event_name,
                        'event': event_name,
                        'currency': currency or 'USD',
                        'impact': impact,
                        'date': target_date,
                        'time': time_str or '00:00',
                        'datetime': f"{target_date}T{time_str or '00:00'}:00",
                        'forecast': forecast_cell.get_text(strip=True) if forecast_cell else None,
                        'previous': previous_cell.get_text(strip=True) if previous_cell else None,
                        'actual': actual_cell.get_text(strip=True) if actual_cell else None,
                        'source': 'ForexFactory (Slow)'
                    }
                    
                    events.append(event)
                
                except:
                    continue
            
            return events
        
        except Exception as e:
            return []
    
    def _remove_duplicates(self, events: List[Dict]) -> List[Dict]:
        """Remove duplicatas"""
        seen = set()
        unique = []
        
        for event in events:
            if event['id'] not in seen:
                seen.add(event['id'])
                unique.append(event)
        
        return unique
    
    def get_cache_info(self) -> Dict:
        return {
            'cached_events': len(self.cache['events']),
            'cache_age_seconds': self.get_cache_age(),
            'cache_valid': self.is_cache_valid(),
            'last_update': self.cache['timestamp'].isoformat() if self.cache['timestamp'] else None,
            'scraping': self.scraping
        }


# Singleton
_ff_slow_scraper = None

def get_ff_slow_calendar(force_refresh: bool = False) -> List[Dict]:
    global _ff_slow_scraper
    
    if _ff_slow_scraper is None:
        _ff_slow_scraper = ForexFactorySlowScraper()
    
    return _ff_slow_scraper.get_week_events(force_refresh=force_refresh)


def get_ff_slow_cache_info() -> Dict:
    global _ff_slow_scraper
    
    if _ff_slow_scraper is None:
        return {
            'cached_events': 0,
            'cache_age_seconds': 0,
            'cache_valid': False,
            'last_update': None,
            'scraping': False
        }
    
    return _ff_slow_scraper.get_cache_info()