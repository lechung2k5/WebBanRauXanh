@echo off
chcp 65001 >nul
echo ========================================================
echo   HoNa Fresh - Khoi chay Ngrok Webhook cho SePay (8080)
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-ngrok.ps1" -Port 8080

