"""
MRKT Edge Backend - SISTEMA COMPLETO
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import uvicorn

from forexfactory_week_scraper import get_ff_week_calendar, get_ff_week_cache_info
from database import get_db

app = FastAPI(title="MRKT Edge API", version="2.0.0")

# CORS - IMPORTANTE!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_TOKEN = "mrkt_edge_2024"

def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    token = authorization.replace("Bearer ", "")
    if token != VALID_TOKEN:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    return token

def get_current_week():
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    return monday.date(), friday.date()

@app.get("/")
def root():
    return {
        "message": "MRKT Edge API",
        "version": "2.0.0",
        "status": "online"
    }

@app.post("/api/auth/login")
def login(credentials: dict):
    email = credentials.get("email")
    password = credentials.get("password")
    
    # Aceita ambos os logins
    valid_credentials = [
        ("demo@forexfactory.com", "demo123"),
        ("admin@mrktedge.com", "mrkt2024")
    ]
    
    if (email, password) in valid_credentials:
        return {
            "success": True,
            "token": VALID_TOKEN,
            "user": {
                "email": email,
                "username": email.split("@")[0],
                "role": "admin"
            }
        }
    
    raise HTTPException(status_code=401, detail="Credenciais inválidas")

@app.get("/api/mrkt/dashboard")
def get_dashboard(authorization: str = Header(None)):
    verify_token(authorization)
    
    monday, friday = get_current_week()
    db = get_db()
    
    panorama = db.get_panorama(str(monday), 'updated')
    
    return {
        "status": "success",
        "timestamp": datetime.now().isoformat(),
        "week": {
            "start": str(monday),
            "end": str(friday)
        },
        "panorama_available": panorama is not None
    }

@app.get("/api/mrkt/realtime-events")
def get_realtime_events(authorization: str = Header(None)):
    verify_token(authorization)
    
    try:
        events = get_ff_week_calendar(force_refresh=False)
        high_medium = [e for e in events if e.get('impact') in ['HIGH', 'MEDIUM']]
        
        high_medium.sort(key=lambda x: (
            0 if x.get('impact') == 'HIGH' else 1,
            x.get('datetime', '')
        ))
        
        return {
            "success": True,
            "events": high_medium,
            "total": len(high_medium),
            "high_count": len([e for e in high_medium if e.get('impact') == 'HIGH']),
            "medium_count": len([e for e in high_medium if e.get('impact') == 'MEDIUM'])
        }
    except Exception as e:
        print(f"Erro ao buscar eventos: {e}")
        return {
            "success": True,
            "events": [],
            "total": 0,
            "high_count": 0,
            "medium_count": 0
        }

@app.get("/api/mrkt/weekly-panorama")
def get_weekly_panorama(authorization: str = Header(None)):
    verify_token(authorization)
    
    monday, friday = get_current_week()
    db = get_db()
    
    panorama = db.get_panorama(str(monday), 'updated')
    
    if not panorama:
        return {
            "success": False,
            "message": "Panorama não disponível",
            "week_start": str(monday),
            "week_end": str(friday)
        }
    
    events = db.get_week_events(str(monday), str(friday))
    
    return {
        "success": True,
        "week_start": panorama['week_start'],
        "week_end": panorama['week_end'],
        "panorama_type": panorama['panorama_type'],
        "narrative": panorama['narrative'],
        "market_impacts": panorama['market_impacts'],
        "regional_analysis": panorama['regional_analysis'],
        "event_summary": panorama['event_summary'],
        "generated_at": panorama['generated_at'],
        "events": events
    }

@app.get("/api/mrkt/news")
def get_news(authorization: str = Header(None), limit: int = 10):
    verify_token(authorization)
    
    try:
        db = get_db()
        news = db.get_recent_news(limit=limit)
        
        return {
            "success": True,
            "news": news,
            "total": len(news)
        }
    except Exception as e:
        print(f"Erro ao buscar notícias: {e}")
        return {
            "success": True,
            "news": [],
            "total": 0
        }

if __name__ == "__main__":
    print("🚀 MRKT Edge Backend")
    print("🌐 http://localhost:8000")
    print("🔐 Login: demo@forexfactory.com / demo123")
    print()
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")