@echo off
title EstibaX - Iniciar servicios
chcp 65001 >nul
cd /d "%~dp0"
node iniciar-todo.cjs
echo.
pause