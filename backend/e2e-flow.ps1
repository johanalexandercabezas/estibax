$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$fallos = 0
function Check($name, $cond) {
  if ($cond) { Write-Output "PASS: $name" }
  else { Write-Output "FAIL: $name"; $script:fallos++ }
}

# 1. Health
$h = Invoke-RestMethod "$base/health"
Check "Backend responde" ($h.status -eq 'ok')

# 2. Login
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body '{"email":"admin@estibax.local","password":"Admin123!"}'
$tok = $login.access_token
Check "Login JWT emitido" ($tok -ne $null)
$headers = @{ Authorization = "Bearer $tok" }

# 3. Seed: activos y clientes
$activos = Invoke-RestMethod "$base/activos" -Headers $headers
Check "Activos seed presentes (>=10)" ($activos.Count -ge 10)

$clientes = Invoke-RestMethod "$base/clientes" -Headers $headers
$abc = $clientes | Where-Object { $_.nombre -eq 'Cliente ABC' } | Select-Object -First 1
$xyz = $clientes | Where-Object { $_.nombre -eq 'Cliente XYZ' } | Select-Object -First 1
Check "Clientes seed presentes" ($null -ne $abc -and $null -ne $xyz)

$a1 = $activos | Where-Object { $_.codigo -eq 'EST-100001' } | Select-Object -First 1
$a2 = $activos | Where-Object { $_.codigo -eq 'EST-100002' } | Select-Object -First 1

# 4. SALIDA valida a Cliente ABC
# Numeracion consecutiva: capturar el ultimo numero SAL confirmado antes de la operacion
$movsPrev = Invoke-RestMethod "$base/movimientos?tipo=SALIDA" -Headers $headers
$ultimoSal = 0
foreach ($m in $movsPrev) {
  if ($m.documento -like 'SAL-*') {
    $n = [int]($m.documento.Split('-')[1])
    if ($n -gt $ultimoSal) { $ultimoSal = $n }
  }
}
$esperadoSal = 'SAL-' + ($ultimoSal + 1).ToString('000000')

$salida = Invoke-RestMethod -Method Post -Uri "$base/movimientos" -Headers $headers -ContentType 'application/json' -Body (@{ tipo = 'SALIDA'; clienteId = $abc.id; lineas = @(@{ activoId = $a1.id; cantidad = 1 }) } | ConvertTo-Json -Depth 5)
Check "Borrador SALIDA creado" ($salida.estado -eq 'BORRADOR')

$conf = Invoke-RestMethod -Method Post -Uri "$base/movimientos/$($salida.id)/confirmar" -Headers $headers
Check "Documento consecutivo ($esperadoSal)" ($conf.documento -eq $esperadoSal)
Check "Movimiento CONFIRMADO" ($conf.estado -eq 'CONFIRMADO')

$a1r = Invoke-RestMethod "$base/activos/codigo/EST-100001" -Headers $headers
Check "Activo queda EN_CLIENTE" ($a1r.estadoLogistico -eq 'EN_CLIENTE')

# 5. Regla de despacho: Cliente XYZ no puede recibir PROPIA
$rechazado = $false
try {
  $bad = Invoke-RestMethod -Method Post -Uri "$base/movimientos" -Headers $headers -ContentType 'application/json' -Body (@{ tipo = 'SALIDA'; clienteId = $xyz.id; lineas = @(@{ activoId = $a2.id; cantidad = 1 }) } | ConvertTo-Json -Depth 5)
  Invoke-RestMethod -Method Post -Uri "$base/movimientos/$($bad.id)/confirmar" -Headers $headers | Out-Null
} catch {
  $rechazado = ($_.Exception.Response.StatusCode.value__ -eq 400)
}
Check "Regla: XYZ rechaza estiba PROPIA (HTTP 400)" $rechazado

# 6. DEVOLUCION desde Cliente ABC
$movsPrevDev = Invoke-RestMethod "$base/movimientos?tipo=DEVOLUCION" -Headers $headers
$ultimoDev = 0
foreach ($m in $movsPrevDev) {
  if ($m.documento -like 'DEV-*') {
    $n = [int]($m.documento.Split('-')[1])
    if ($n -gt $ultimoDev) { $ultimoDev = $n }
  }
}
$esperadoDev = 'DEV-' + ($ultimoDev + 1).ToString('000000')

$dev = Invoke-RestMethod -Method Post -Uri "$base/movimientos" -Headers $headers -ContentType 'application/json' -Body (@{ tipo = 'DEVOLUCION'; clienteId = $abc.id; lineas = @(@{ activoId = $a1.id; cantidad = 1 }) } | ConvertTo-Json -Depth 5)
$confDev = Invoke-RestMethod -Method Post -Uri "$base/movimientos/$($dev.id)/confirmar" -Headers $headers
Check "Documento consecutivo ($esperadoDev)" ($confDev.documento -eq $esperadoDev)

$a1d = Invoke-RestMethod "$base/activos/codigo/EST-100001" -Headers $headers
Check "Activo devuelto queda DISPONIBLE" ($a1d.estadoLogistico -eq 'DISPONIBLE')

# 7. REVERSION auditada de la salida
$rev = Invoke-RestMethod -Method Post -Uri "$base/movimientos/$($salida.id)/revertir" -Headers $headers -ContentType 'application/json' -Body '{"motivo":"Prueba E2E: error de digitacion"}'
Check "Reversion con documento REV-xxxxxx" ($rev.documento -like 'REV-*')

$salidaR = Invoke-RestMethod "$base/movimientos/$($salida.id)" -Headers $headers
Check "Salida original queda REVERTIDO" ($salidaR.estado -eq 'REVERTIDO')

# 8. Numeracion no se reutiliza: nueva SALIDA debe ser el consecutivo siguiente
# Se elige un activo DISPONIBLE dinamicamente (idempotencia del test)
$activosAhora = Invoke-RestMethod "$base/activos?estadoLogistico=DISPONIBLE&estadoOperativo=LIBRE" -Headers $headers
$a3 = $activosAhora | Where-Object { $_.propiedad -eq 'PROPIA' } | Select-Object -First 1
if (-not $a3) { $a3 = $activosAhora | Select-Object -First 1 }
Check "Hay activo disponible para la prueba" ($null -ne $a3)
$esperadoSal2 = 'SAL-' + ($ultimoSal + 2).ToString('000000')
$sal2 = Invoke-RestMethod -Method Post -Uri "$base/movimientos" -Headers $headers -ContentType 'application/json' -Body (@{ tipo = 'SALIDA'; clienteId = $abc.id; lineas = @(@{ activoId = $a3.id; cantidad = 1 }) } | ConvertTo-Json -Depth 5)
$conf2 = Invoke-RestMethod -Method Post -Uri "$base/movimientos/$($sal2.id)/confirmar" -Headers $headers
Check "Numeracion continua ($esperadoSal2, sin reutilizar)" ($conf2.documento -eq $esperadoSal2)

Write-Output "---------------------------------"
if ($fallos -eq 0) { Write-Output "RESULTADO: E2E COMPLETO - TODOS LOS CHECKS PASARON" }
else { Write-Output "RESULTADO: $fallos CHECKS FALLARON"; exit 1 }
