"""
ForexFactory Week Scraper - VERSÃO PÚBLICA
Acessa https://www.forexfactory.com/calendar e pega a semana toda
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
import re

class ForexFactoryWeekScraper:
    """Scraper da semana completa do ForexFactory"""
    
    def __init__(self):
        self.base_url = "https://www.forexfactory.com/calendar"
        self.driver = None
        
        # Cache
        self.cache = {
            'events': [],
            'timestamp': None,
            'cache_duration': 180  # 3 minutos
        }
        
        self.lock = threading.Lock()
        self.scraping = False
    
    def _init_driver(self):
        """Inicializa Chrome"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
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
            print("🌐 Iniciando scrape (ForexFactory público)...")
            events = self._scrape_events()
            
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
            return self.cache['events']
        finally:
            self.scraping = False
    
    def _scrape_events(self) -> List[Dict]:
        """Scrape principal"""
        
        if not self._init_driver():
            return []
        
        try:
            print(f"🌐 Acessando: {self.base_url}")
            self.driver.get(self.base_url)
            
            # Aguarda Cloudflare
            print("⏳ Aguardando Cloudflare...")
            time.sleep(8)
            
            # Aguarda tabela
            try:
                WebDriverWait(self.driver, 20).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "calendar__table"))
                )
                print("✅ Tabela carregada!")
            except:
                print("⚠️ Timeout aguardando tabela")
            
            # Scroll
            print("📜 Fazendo scroll...")
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            self.driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(2)
            
            # Pega HTML
            html = self.driver.page_source
            
            # Parse
            events = self._parse_calendar(html)
            
            return events
        
        except Exception as e:
            print(f"❌ Erro no scrape: {e}")
            return []
        finally:
            if self.driver:
                self.driver.quit()
                print("🔒 Chrome fechado")
    
    def _get_week_range(self):
        """Range da semana (Seg-Sex)"""
        now = datetime.now()
        start_of_week = now - timedelta(days=now.weekday())
        end_of_week = start_of_week + timedelta(days=4)
        return start_of_week.date(), end_of_week.date()
    
    def _parse_date_from_cell(self, date_text: str) -> str:
        """
        Parse de data do ForexFactory
        Exemplos: "Thu Dec 12", "Fri Dec 13"
        """
        try:
            now = datetime.now()
            
            # Remove espaços extras
            date_text = ' '.join(date_text.split())
            
            # Parse: "Thu Dec 12" -> ["Thu", "Dec", "12"]
            parts = date_text.split()
            
            if len(parts) >= 3:
                month_str = parts[1]  # "Dec"
                day = int(parts[2])    # "12"
                
                months = {
                    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4,
                    'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8,
                    'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
                }
                
                month = months.get(month_str, now.month)
                year = now.year
                
                # Se o mês é anterior ao atual, é ano que vem
                if month < now.month:
                    year += 1
                
                return datetime(year, month, day).strftime('%Y-%m-%d')
            
            return now.strftime('%Y-%m-%d')
        except Exception as e:
            print(f"⚠️ Erro parseando data '{date_text}': {e}")
            return datetime.now().strftime('%Y-%m-%d')
    
    def _parse_calendar(self, html: str) -> List[Dict]:
        """Parse do HTML"""
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            table = soup.find('table', class_='calendar__table')
            
            if not table:
                print("❌ Tabela não encontrada")
                return []
            
            events = []
            current_date = None
            
            week_start, week_end = self._get_week_range()
            print(f"📅 Semana alvo: {week_start.strftime('%d/%m')} (Seg) → {week_end.strftime('%d/%m/%Y')} (Sex)")
            
            rows = table.find_all('tr', class_=lambda x: x and 'calendar__row' in x)
            print(f"📊 Processando {len(rows)} linhas...")
            
            impact_stats = {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
            dates_found = set()
            
            for row in rows:
                try:
                    # Data
                    date_cell = row.find('td', class_='calendar__date')
                    if date_cell:
                        date_span = date_cell.find('span')
                        if date_span:
                            date_text = date_span.get_text(strip=True)
                            if date_text:
                                current_date = self._parse_date_from_cell(date_text)
                                dates_found.add(current_date)
                    
                    if not current_date:
                        continue
                    
                    # Verifica se está na semana
                    try:
                        date_obj = datetime.strptime(current_date, '%Y-%m-%d').date()
                        
                        # Apenas dias úteis
                        if date_obj.weekday() >= 5:
                            continue
                        
                        # Apenas semana atual
                        if not (week_start <= date_obj <= week_end):
                            continue
                    except:
                        continue
                    
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
                        'id': f"ff_{current_date}_{time_str}_{currency}_{event_name[:20]}".replace(' ', '_').replace('/', '-'),
                        'title': event_name,
                        'event': event_name,
                        'currency': currency or 'USD',
                        'impact': impact,
                        'date': current_date,
                        'time': time_str or '00:00',
                        'datetime': f"{current_date}T{time_str or '00:00'}:00",
                        'forecast': forecast_cell.get_text(strip=True) if forecast_cell else None,
                        'previous': previous_cell.get_text(strip=True) if previous_cell else None,
                        'actual': actual_cell.get_text(strip=True) if actual_cell else None,
                        'source': 'ForexFactory (Week)'
                    }
                    
                    events.append(event)
                    impact_stats[impact] += 1
                
                except Exception as e:
                    continue
            
            print(f"✅ {len(events)} eventos extraídos")
            print(f"📊 Distribuição: HIGH={impact_stats['HIGH']}, MEDIUM={impact_stats['MEDIUM']}, LOW={impact_stats['LOW']}")
            print(f"📅 Datas encontradas: {sorted(dates_found)}")
            
            return events
        
        except Exception as e:
            print(f"❌ Erro no parse: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def get_cache_info(self) -> Dict:
        return {
            'cached_events': len(self.cache['events']),
            'cache_age_seconds': self.get_cache_age(),
            'cache_valid': self.is_cache_valid(),
            'last_update': self.cache['timestamp'].isoformat() if self.cache['timestamp'] else None,
            'scraping': self.scraping
        }


# Singleton
_ff_week_scraper = None

def get_ff_week_calendar(force_refresh: bool = False) -> List[Dict]:
    global _ff_week_scraper
    
    if _ff_week_scraper is None:
        _ff_week_scraper = ForexFactoryWeekScraper()
    
    return _ff_week_scraper.get_week_events(force_refresh=force_refresh)


def get_ff_week_cache_info() -> Dict:
    global _ff_week_scraper
    
    if _ff_week_scraper is None:
        return {
            'cached_events': 0,
            'cache_age_seconds': 0,
            'cache_valid': False,
            'last_update': None,
            'scraping': False
        }
    
    return _ff_week_scraper.get_cache_info()