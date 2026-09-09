@echo off
cd /d "c:\Users\Jcabezas\Downloads\Solucion EstibaX\EstibaX\backend"
node -e "fetch('http://localhost:3000/health').then(r=>r.json()).then(d=>console.log('HEALTH',JSON.stringify(d)))"
