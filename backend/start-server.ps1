$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:DATABASE_URL = 'postgresql://estibax@127.0.0.1:5433/estibax'
$env:JWT_SECRET = 'estibax-dev-secret'
$env:PORT = '3000'
$p = Start-Process node -ArgumentList 'dist/main.js' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
$p.Id | Out-File -Encoding ascii (Join-Path $PSScriptRoot 'server.pid')
Write-Output ("STARTED_PID=" + $p.Id)

# Esperar a que /health responda
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 700
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/health' -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch {}
}
if ($ready) { Write-Output 'SERVER_READY' } else { Write-Output 'SERVER_NOT_READY' }
