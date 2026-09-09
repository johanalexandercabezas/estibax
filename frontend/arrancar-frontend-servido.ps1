Start-Process node -ArgumentList 'servir-frontend.cjs' -WindowStyle Hidden -WorkingDirectory 'c:\Users\Jcabezas\Downloads\SOLUCI~1\EstibaX\frontend'
Start-Sleep -Seconds 3
netstat -ano | Select-String ':5173'