"""
Agendador automático com MÚLTIPLAS ATUALIZAÇÕES DIÁRIAS
Atualiza conforme eventos vão acontecendo ao longo do dia
"""

import schedule
import time
from datetime import datetime
import pytz
import os

# Timezone de Brasília
BRAZIL_TZ = pytz.timezone('America/Sao_Paulo')

def get_brazil_time():
    """Retorna hora atual em Brasília"""
    return datetime.now(BRAZIL_TZ)

def log(message):
    """Log com timestamp"""
    timestamp = get_brazil_time().strftime('%d/%m/%Y %H:%M:%S')
    log_message = f"[{timestamp}] {message}"
    print(log_message)
    
    # Salva em arquivo
    log_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, 'scheduler_realtime.log')
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(log_message + '\n')

def job(session_name=""):
    """Executa a atualização"""
    log("")
    log("=" * 70)
    log(f"⏰ ATUALIZAÇÃO AUTOMÁTICA - {session_name}")
    log("=" * 70)
    
    try:
        from update_daily_results import update_results
        update_results()
        
        log(f"✅ Atualização {session_name} concluída!")
        
    except Exception as e:
        log(f"❌ Erro na atualização {session_name}: {e}")
        import traceback
        log(traceback.format_exc())

def run_scheduler():
    """Inicia o agendador com múltiplos horários"""
    
    log("🤖 MRKT Edge - Agendador REALTIME 24/7")
    log("=" * 70)
    log("⏰ HORÁRIOS DE ATUALIZAÇÃO (Brasília):")
    log("")
    log("   06:00 - 🌅 Pré-Mercado (Ásia fechando, Europa abrindo)")
    log("   09:00 - 🇪🇺 Londres Aberta (GBP, EUR dados)")
    log("   11:00 - 🇺🇸 NY Abertura (USD dados principais)")
    log("   14:00 - 📊 Meio do Dia (Fed, dados secundários)")
    log("   17:00 - 🌆 Tarde (Europa fechando)")
    log("   21:00 - 🌙 Noite (Ásia abrindo, JPY, AUD)")
    log("")
    log("📋 A cada atualização:")
    log("   1. Busca novos resultados no ForexFactory")
    log("   2. Atualiza banco de dados")
    log("   3. Regenera panorama com dados mais recentes")
    log("")
    log("💡 Sistema rodando em modo REALTIME!")
    log("=" * 70)
    log("")
    
    # Agenda múltiplos horários
    schedule.every().day.at("06:00").do(lambda: job("Pré-Mercado (06:00)"))
    schedule.every().day.at("09:00").do(lambda: job("Londres Aberta (09:00)"))
    schedule.every().day.at("11:00").do(lambda: job("NY Abertura (11:00)"))
    schedule.every().day.at("14:00").do(lambda: job("Meio do Dia (14:00)"))
    schedule.every().day.at("17:00").do(lambda: job("Tarde (17:00)"))
    schedule.every().day.at("21:00").do(lambda: job("Ásia Abrindo (21:00)"))
    
    # Mostra próxima execução
    brazil_now = get_brazil_time()
    log(f"🕐 Hora atual (Brasília): {brazil_now.strftime('%d/%m/%Y %H:%M:%S')}")
    
    next_run = schedule.next_run()
    if next_run:
        next_run_brazil = next_run.astimezone(BRAZIL_TZ)
        log(f"📅 Próxima execução: {next_run_brazil.strftime('%d/%m/%Y %H:%M:%S')} (Brasília)")
    
    log("")
    log("🔄 Aguardando próximo horário...")
    log("   (Aperte Ctrl+C para parar)")
    log("")
    
    # Loop infinito
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Verifica a cada 1 minuto
    
    except KeyboardInterrupt:
        log("")
        log("⏹️  Agendador parado pelo usuário")
        log("")

if __name__ == "__main__":
    import sys
    
    # Se passar --now como argumento, executa imediatamente
    if len(sys.argv) > 1 and sys.argv[1] == '--now':
        log("🚀 Executando atualização IMEDIATAMENTE (modo --now)")
        job("Teste Manual")
    else:
        run_scheduler()