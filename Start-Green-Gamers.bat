@echo off
title Green Gamers Launcher

echo Starting Backend Server...
start "Green Gamers Backend" cmd /k "cd /d C:\GREEN_GAMERS\server && node server.js"

echo Starting Frontend Server...
start "Green Gamers Frontend" cmd /k "cd /d C:\GREEN_GAMERS\client && npm run dev"

echo Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo Opening Green Gamers...
start "" "http://localhost:5173"

exit