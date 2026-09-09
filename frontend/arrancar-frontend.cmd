@echo off
cd /d %~dp0
node servir-frontend.cjs > servidor.log 2>&1
