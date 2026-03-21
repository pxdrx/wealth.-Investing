@echo off
REM Script para rodar o scheduler do MRKT Edge em background
REM Executar este arquivo para iniciar o agendador

echo ========================================
echo MRKT Edge - Scheduler 24/7
echo ========================================
echo.
echo Iniciando agendador em background...
echo.

cd /d "%~dp0"

REM Cria log do scheduler
if not exist "logs" mkdir logs

REM Inicia Python em background (sem janela)
start /B python scheduler.py >> logs\scheduler.log 2>&1

echo Scheduler iniciado!
echo.
echo Logs salvos em: logs\scheduler.log
echo.
echo Para parar o scheduler:
echo   1. Abra Task Manager (Ctrl+Shift+Esc)
echo   2. Procure por "python.exe"
echo   3. Finalize o processo do scheduler
echo.
pause