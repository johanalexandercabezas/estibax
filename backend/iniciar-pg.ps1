$ErrorActionPreference = 'Stop'
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$pgData = 'c:\Users\Jcabezas\Downloads\SOLUCI~1\EstibaX\backend\.pgdata'

& "$pgBin\pg_isready.exe" -h 127.0.0.1 -p 5433
$ready = $LASTEXITCODE -eq 0

if (-not $ready) {
  Write-Host 'Iniciando PostgreSQL (postgres.exe directo)...'
  Start-Process -FilePath "$pgBin\postgres.exe" -ArgumentList '-D', $pgData, '-p', '5433' -WindowStyle Hidden
  Start-Sleep -Seconds 3
}

for ($i = 0; $i -lt 10; $i++) {
  & "$pgBin\pg_isready.exe" -h 127.0.0.1 -p 5433 | Out-Host
  if ($LASTEXITCODE -eq 0) { Write-Host 'PG_READY'; exit 0 }
  Start-Sleep -Seconds 2
}
Write-Host 'PG_NO_RESPONDE'
exit 1