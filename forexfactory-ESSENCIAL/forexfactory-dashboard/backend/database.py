"""
Database para MRKT Edge
Armazena eventos, panoramas semanais, notícias e análises de eventos.

ELIMINAÇÃO TOTAL DE TIMEZONE: colunas date/time armazenam RÓTULOS VISUAIS do print
(print_date_label, print_time_label). Não são valores temporais.
"""
import sqlite3
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import json

# Semana fixa 25–31 Jan 2026: rótulos do print para filtro. Nunca usar como data.
FIXED_WEEK_PRINT_DATE_LABELS: Tuple[str, ...] = (
    "Sun Jan 25", "Mon Jan 26", "Tue Jan 27", "Wed Jan 28",
    "Thu Jan 29", "Fri Jan 30", "Sat Jan 31",
)

class MRKTDatabase:
    def __init__(self, db_path: str = "mrkt_edge.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Cria tabelas se não existirem"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela de eventos (com campos de timezone)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                time TEXT,
                datetime TEXT,
                title TEXT NOT NULL,
                currency TEXT,
                impact TEXT,
                forecast TEXT,
                previous TEXT,
                actual TEXT,
                source TEXT,
                timezone TEXT,
                weekday_local INTEGER,
                timezone_valid INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Adicionar colunas de timezone se não existirem (migração)
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN timezone TEXT")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN weekday_local INTEGER")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN timezone_valid INTEGER DEFAULT 1")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN narrative_sensitive INTEGER DEFAULT 0")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN weekday TEXT")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN sort_time_key INTEGER")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN print_row_index INTEGER")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN week_key TEXT")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN event_uid TEXT")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE events ADD COLUMN actual_source TEXT")
        except:
            pass
        
        # Tabela de panoramas semanais (COM REGIONAL_SUMMARIES!)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS weekly_panoramas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_start TEXT NOT NULL,
                week_end TEXT NOT NULL,
                panorama_type TEXT NOT NULL,
                narrative TEXT,
                market_impacts TEXT,
                regional_analysis TEXT,
                regional_summaries TEXT,
                event_summary TEXT,
                generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(week_start, panorama_type)
            )
        """)
        
        # Verifica se a coluna regional_summaries existe, se não, adiciona
        try:
            cursor.execute("SELECT regional_summaries FROM weekly_panoramas LIMIT 1")
        except sqlite3.OperationalError:
            print("⚠️  Adicionando coluna regional_summaries...")
            cursor.execute("ALTER TABLE weekly_panoramas ADD COLUMN regional_summaries TEXT")
            conn.commit()
            print("✅ Coluna regional_summaries adicionada!")
        
        # Tabela de notícias
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                link TEXT,
                published TEXT,
                summary TEXT,
                source TEXT,
                impact TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabela de análises de eventos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS event_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL,
                summary TEXT,
                expected_impact TEXT,
                forex_pairs TEXT,
                us_indices TEXT,
                metals TEXT,
                ativo_beneficiado_evento TEXT,
                generated_at TEXT,
                UNIQUE(event_id)
            )
        """)
        
        # Tabela de assinaturas NeonPay
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                plan TEXT NOT NULL,
                neonpay_customer_id TEXT,
                neonpay_subscription_id TEXT,
                status TEXT NOT NULL,
                current_period_start TEXT,
                current_period_end TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)")
        except Exception:
            pass
        
        # Índices
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_impact ON events(impact)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_panoramas_week ON weekly_panoramas(week_start)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_published ON news(published)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_analysis_event ON event_analysis(event_id)")
        
        conn.commit()
        conn.close()
        
        # Usar print seguro para evitar erros de encoding
        try:
            print("[OK] Database inicializado")
        except:
            pass
    
    def delete_events_for_week(self, week_start: str = None, week_end: str = None) -> int:
        """
        Remove eventos da semana fixa. Usa rótulos do print (FIXED_WEEK_PRINT_DATE_LABELS).
        date/time são rótulos visuais, não datas — filtro por date IN (labels).
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        if week_start == "2026-01-25" and week_end == "2026-01-31":
            placeholders = ",".join("?" * len(FIXED_WEEK_PRINT_DATE_LABELS))
            cursor.execute(
                f"DELETE FROM events WHERE date IN ({placeholders})",
                FIXED_WEEK_PRINT_DATE_LABELS,
            )
        else:
            cursor.execute(
                "DELETE FROM events WHERE date >= ? AND date <= ?",
                (week_start or "2026-01-25", week_end or "2026-01-31"),
            )
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        return deleted

    # weekday = ENUM textual fixo. Normalizar (abrev -> completo) e validar antes de salvar.
    _VALID_WEEKDAYS = frozenset({"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday", "Saturday"})
    _NORM_WEEKDAY = {"monday": "Monday", "tuesday": "Tuesday", "wednesday": "Wednesday", "thursday": "Thursday", "friday": "Friday", "sunday": "Sunday", "saturday": "Saturday", "mon": "Monday", "tue": "Tuesday", "wed": "Wednesday", "thu": "Thursday", "fri": "Friday", "sun": "Sunday", "sat": "Saturday"}

    def save_events(self, events: List[Dict]) -> int:
        """
        Salva eventos. date/time = rótulos visuais (print_date_label, print_time_label).
        sort_time_key obrigatório (INTEGER = minutos desde 00:00) para eventos da semana.
        weekday obrigatório: um de Monday,Tuesday,Wednesday,Thursday,Friday,Sunday,Saturday.
        print_row_index obrigatório para identidade determinística.
        week_key obrigatório para amarrar ao snapshot da semana.
        """
        from utils.event_identity import generate_event_uid, get_week_key, normalize_event_name
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        count = 0
        
        # Determinar week_key da semana (assumindo que todos eventos são da mesma semana)
        week_key = None
        if events:
            # Tentar extrair week_key do primeiro evento ou usar semana fixa
            first_event = events[0]
            if 'week_key' in first_event:
                week_key = first_event['week_key']
            else:
                # Usar semana fixa padrão
                week_key = get_week_key("2026-01-25", "2026-01-31")
        
        for idx, event in enumerate(events):
            pdl = event.get('print_date_label') or event.get('date', '')
            ptl = event.get('print_time_label') or event.get('time', '')
            w_raw = str(event.get('weekday', '')).strip()
            wd = self._NORM_WEEKDAY.get(w_raw.lower()) or w_raw or ''
            if not wd or wd not in self._VALID_WEEKDAYS:
                raise ValueError(f"weekday vazio ou inválido ao salvar evento: {event.get('weekday')!r}")
            stk = event.get('sort_time_key')
            if stk is None:
                raise ValueError(
                    "sort_time_key obrigatório para evento da semana. "
                    "Calcule a partir de print_time_label (hour*60+minute) durante a ingestão."
                )
            
            # Obter print_row_index (do evento ou usar índice do loop como fallback)
            print_row_index = event.get('print_row_index', idx)
            if print_row_index is None:
                print_row_index = idx
            
            # Gerar event_uid determinístico
            normalized_name = normalize_event_name(event.get('title', event.get('event', '')))
            event_uid = generate_event_uid(
                source=event.get('source', 'EVENT_UPDATE_STRICT'),
                week_key=week_key or get_week_key("2026-01-25", "2026-01-31"),
                print_date_label=pdl,
                print_time_label=ptl,
                currency=event.get('currency'),
                print_row_index=int(print_row_index),
                normalized_name=normalized_name,
            )
            
            actual_source = event.get('actual_source')
            if event.get('actual') and not actual_source:
                actual_source = 'forex_factory'  # default quando actual vem de FF
            cursor.execute("""
                INSERT OR REPLACE INTO events 
                (id, date, time, datetime, title, currency, impact, forecast, previous, actual, actual_source, source, timezone, weekday_local, timezone_valid, narrative_sensitive, weekday, sort_time_key, print_row_index, week_key, event_uid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event['id'],
                pdl,
                ptl,
                f"{pdl} {ptl}".strip() if (pdl or ptl) else '',
                event.get('title', event.get('event', '')),
                event.get('currency'),
                event.get('impact'),
                event.get('forecast'),
                event.get('previous'),
                event.get('actual'),
                actual_source,
                event.get('source', 'EVENT_UPDATE_STRICT'),
                None,
                None,
                1,
                1 if event.get('narrative_sensitive', False) else 0,
                wd,
                int(stk),
                int(print_row_index),
                week_key or get_week_key("2026-01-25", "2026-01-31"),
                event_uid,
            ))
            count += 1
        conn.commit()
        conn.close()
        return count
    
    def get_week_events(self, week_start: str, week_end: str) -> List[Dict]:
        """Busca eventos de uma semana. Ordenação por sort_time_key (minutos desde 00:00)."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        if week_start == "2026-01-25" and week_end == "2026-01-31":
            ph = ",".join("?" * len(FIXED_WEEK_PRINT_DATE_LABELS))
            cursor.execute(
                f"SELECT * FROM events WHERE date IN ({ph}) ORDER BY COALESCE(sort_time_key, 0) ASC",
                FIXED_WEEK_PRINT_DATE_LABELS,
            )
        else:
            cursor.execute(
                "SELECT * FROM events WHERE date >= ? AND date <= ? ORDER BY COALESCE(sort_time_key, 0) ASC",
                (week_start, week_end),
            )
        rows = cursor.fetchall()
        conn.close()
        events = []
        for row in rows:
            event = {
                'id': row['id'],
                'date': row['date'],
                'time': row['time'],
                'print_date_label': row['date'],
                'print_time_label': row['time'],
                'title': row['title'],
                'currency': row['currency'],
                'impact': row['impact'],
                'forecast': row['forecast'],
                'previous': row['previous'],
                'actual': row['actual'],
                'source': row['source'],
            }
            if 'weekday' in row.keys() and row['weekday'] is not None:
                event['weekday'] = row['weekday']
            if 'narrative_sensitive' in row.keys():
                event['narrative_sensitive'] = bool(row['narrative_sensitive'])
            if 'sort_time_key' in row.keys() and row['sort_time_key'] is not None:
                event['sort_time_key'] = int(row['sort_time_key'])
            if 'print_row_index' in row.keys() and row['print_row_index'] is not None:
                event['print_row_index'] = int(row['print_row_index'])
            if 'week_key' in row.keys() and row['week_key'] is not None:
                event['week_key'] = str(row['week_key'])
            if 'event_uid' in row.keys() and row['event_uid'] is not None:
                event['event_uid'] = str(row['event_uid'])
            events.append(event)
        return events
    
    def save_panorama(self, week_start: str, week_end: str, panorama_type: str, 
                      narrative: str, market_impacts: Dict, regional_analysis: Dict,
                      regional_summaries: Dict, event_summary: Dict):
        """Salva panorama semanal (COM REGIONAL_SUMMARIES!)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO weekly_panoramas 
            (week_start, week_end, panorama_type, narrative, market_impacts, 
             regional_analysis, regional_summaries, event_summary, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            week_start,
            week_end,
            panorama_type,
            narrative,
            json.dumps(market_impacts, ensure_ascii=False),
            json.dumps(regional_analysis, ensure_ascii=False),
            json.dumps(regional_summaries, ensure_ascii=False),
            json.dumps(event_summary, ensure_ascii=False),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    def get_panorama(self, week_start: str, panorama_type: str = 'updated') -> Optional[Dict]:
        """Busca panorama de uma semana (prioriza 'updated', fallback 'initial')"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Tenta buscar o tipo solicitado primeiro
        cursor.execute("""
            SELECT * FROM weekly_panoramas 
            WHERE week_start = ? AND panorama_type = ?
            ORDER BY generated_at DESC
            LIMIT 1
        """, (week_start, panorama_type))
        
        row = cursor.fetchone()
        
        # Se não encontrou e pediu 'updated', tenta 'initial'
        if not row and panorama_type == 'updated':
            cursor.execute("""
                SELECT * FROM weekly_panoramas 
                WHERE week_start = ? AND panorama_type = 'initial'
                ORDER BY generated_at DESC
                LIMIT 1
            """, (week_start,))
            row = cursor.fetchone()
        
        conn.close()
        
        if not row:
            return None
        
        # Parse regional_summaries se existir
        regional_summaries = None
        if row['regional_summaries']:
            try:
                regional_summaries = json.loads(row['regional_summaries'])
            except:
                # Se falhar, gera sumários das análises regionais
                regional_analysis = json.loads(row['regional_analysis'])
                regional_summaries = self._generate_summaries_from_analysis(regional_analysis)
        else:
            # Se não existir, gera sumários das análises regionais
            regional_analysis = json.loads(row['regional_analysis'])
            regional_summaries = self._generate_summaries_from_analysis(regional_analysis)
        
        return {
            'week_start': row['week_start'],
            'week_end': row['week_end'],
            'panorama_type': row['panorama_type'],
            'narrative': row['narrative'],
            'market_impacts': json.loads(row['market_impacts']),
            'regional_analysis': json.loads(row['regional_analysis']),
            'regional_summaries': regional_summaries,
            'event_summary': json.loads(row['event_summary']),
            'generated_at': row['generated_at']
        }
    
    def _generate_summaries_from_analysis(self, regional_analysis: Dict) -> Dict:
        """Gera resumos das análises regionais (2-3 sentenças, ~150 chars)"""
        summaries = {}
        
        for region, text in regional_analysis.items():
            if not text:
                summaries[region] = ""
                continue
            
            # Pega primeiras 2-3 sentenças OU até 150 caracteres
            sentences = text.split('.')
            summary_parts = []
            char_count = 0
            
            for sentence in sentences[:3]:  # máximo 3 sentenças
                sentence = sentence.strip()
                if sentence and char_count < 150:
                    summary_parts.append(sentence)
                    char_count += len(sentence)
                else:
                    break
            
            summaries[region] = '. '.join(summary_parts) + '.' if summary_parts else text[:150] + '...'
        
        return summaries
    
    def get_event_by_id(self, event_id: str) -> Optional[Dict]:
        """Busca um evento pelo id."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return {
            'id': row['id'],
            'date': row['date'],
            'time': row['time'],
            'title': row['title'],
            'currency': row['currency'],
            'impact': row['impact'],
            'forecast': row['forecast'],
            'previous': row['previous'],
            'actual': row['actual'],
            'source': row['source'],
        }
    
    def get_event_by_uid(self, event_uid: str) -> Optional[Dict]:
        """Busca um evento pelo event_uid (ID canônico)."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM events WHERE event_uid = ?", (event_uid,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return {
            'id': row['id'],
            'date': row['date'],
            'time': row['time'],
            'title': row['title'],
            'currency': row['currency'],
            'impact': row['impact'],
            'forecast': row['forecast'],
            'previous': row['previous'],
            'actual': row['actual'],
            'source': row['source'],
        }

    def get_events_by_date(self, date: str) -> List[Dict]:
        """Busca eventos de uma data específica"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM events 
            WHERE date = ?
            ORDER BY time
        """, (date,))
        
        rows = cursor.fetchall()
        conn.close()
        
        events = []
        for row in rows:
            events.append({
                'id': row['id'],
                'date': row['date'],
                'time': row['time'],
                'datetime': row['datetime'],
                'title': row['title'],
                'currency': row['currency'],
                'impact': row['impact'],
                'forecast': row['forecast'],
                'previous': row['previous'],
                'actual': row['actual'],
                'source': row['source']
            })
        
        return events
    
    def save_news(self, news_items: List[Dict]) -> int:
        """Salva notícias no banco"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        count = 0
        for item in news_items:
            cursor.execute("""
                INSERT INTO news (title, link, published, summary, source, impact)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                item['title'],
                item.get('link'),
                item.get('published'),
                item.get('summary'),
                item.get('source'),
                item.get('impact', 'HIGH')
            ))
            count += 1
        
        conn.commit()
        conn.close()
        
        return count
    
    def get_recent_news(self, limit: int = 10) -> List[Dict]:
        """Busca notícias recentes"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM news 
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        news = []
        for row in rows:
            news.append({
                'id': row['id'],
                'title': row['title'],
                'link': row['link'],
                'published': row['published'],
                'summary': row['summary'],
                'source': row['source'],
                'impact': row['impact'],
                'created_at': row['created_at']
            })
        
        return news
    
    def save_event_analysis(self, analysis: dict):
        """Salva análise de evento"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO event_analysis 
            (event_id, summary, expected_impact, forex_pairs, us_indices, metals, ativo_beneficiado_evento, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            analysis['event_id'],
            analysis['summary'],
            analysis['expected_impact'],
            json.dumps(analysis['forex_pairs']),
            json.dumps(analysis['us_indices']),
            json.dumps(analysis['metals']),
            json.dumps(analysis.get('ativo_beneficiado_evento')) if analysis.get('ativo_beneficiado_evento') else None,
            analysis['generated_at']
        ))
        
        conn.commit()
        conn.close()
    
    def get_event_analysis(self, event_id: str) -> Optional[dict]:
        """Busca análise de um evento"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM event_analysis 
            WHERE event_id = ?
        """, (event_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        result = {
            'event_id': row['event_id'],
            'summary': row['summary'],
            'expected_impact': row['expected_impact'],
            'forex_pairs': json.loads(row['forex_pairs']) if row['forex_pairs'] else [],
            'us_indices': json.loads(row['us_indices']) if row['us_indices'] else [],
            'metals': json.loads(row['metals']) if row['metals'] else [],
            'generated_at': row['generated_at']
        }
        
        # Adicionar ativo_beneficiado_evento se existir
        if row.get('ativo_beneficiado_evento'):
            try:
                result['ativo_beneficiado_evento'] = json.loads(row['ativo_beneficiado_evento'])
            except (json.JSONDecodeError, TypeError):
                result['ativo_beneficiado_evento'] = None
        
        return result

    # ========== Subscriptions (NeonPay) ==========

    def get_subscription_by_user(self, user_id: str) -> Optional[Dict]:
        """Retorna a assinatura ativa mais recente do usuário."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM subscriptions
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
        """, (user_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return dict(row)

    def get_subscription_by_neonpay_id(self, neonpay_subscription_id: str) -> Optional[Dict]:
        """Busca assinatura por neonpay_subscription_id (para webhooks)."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM subscriptions WHERE neonpay_subscription_id = ?", (neonpay_subscription_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return dict(row)

    def save_subscription(
        self,
        user_id: str,
        plan: str,
        neonpay_subscription_id: Optional[str] = None,
        neonpay_customer_id: Optional[str] = None,
        status: str = "trial",
        current_period_start: Optional[str] = None,
        current_period_end: Optional[str] = None,
    ) -> int:
        """Insere ou atualiza assinatura. Retorna id."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        if neonpay_subscription_id:
            cursor.execute("""
                INSERT INTO subscriptions
                (user_id, plan, neonpay_customer_id, neonpay_subscription_id, status,
                 current_period_start, current_period_end, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, plan, neonpay_customer_id or "", neonpay_subscription_id, status,
                  current_period_start or "", current_period_end or "", now, now))
        else:
            cursor.execute("""
                INSERT INTO subscriptions
                (user_id, plan, neonpay_customer_id, neonpay_subscription_id, status,
                 current_period_start, current_period_end, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, plan, neonpay_customer_id or "", "", status,
                  current_period_start or "", current_period_end or "", now, now))
        conn.commit()
        rid = cursor.lastrowid
        conn.close()
        return rid

    def update_subscription_status(
        self,
        neonpay_subscription_id: str,
        status: str,
        current_period_start: Optional[str] = None,
        current_period_end: Optional[str] = None,
    ) -> bool:
        """Atualiza status e período de uma assinatura (via webhook)."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        if current_period_start is not None or current_period_end is not None:
            cursor.execute("""
                UPDATE subscriptions
                SET status = ?, current_period_start = COALESCE(?, current_period_start),
                    current_period_end = COALESCE(?, current_period_end), updated_at = ?
                WHERE neonpay_subscription_id = ?
            """, (status, current_period_start, current_period_end, now, neonpay_subscription_id))
        else:
            cursor.execute("""
                UPDATE subscriptions SET status = ?, updated_at = ? WHERE neonpay_subscription_id = ?
            """, (status, now, neonpay_subscription_id))
        n = cursor.rowcount
        conn.commit()
        conn.close()
        return n > 0


# Instância global
_db = None

def get_db(db_path_override: str = None) -> MRKTDatabase:
    global _db
    if _db is None:
        import os
        path = db_path_override or os.environ.get("MRKT_EDGE_DB_PATH", "mrkt_edge.db")
        _db = MRKTDatabase(path)
    return _db