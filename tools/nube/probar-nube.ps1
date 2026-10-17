# Prueba la nube de PixelSoft (scripts/nube.gd) contra un servidor FALSO de Google
# en 127.0.0.1: sin credenciales, sin Internet y sin tocar tus partidas reales
# (APPDATA se redirige a una carpeta temporal mientras dura la prueba).
# Uso: powershell -File tools\nube\probar-nube.ps1 [-Godot <exe>]
param([string]$Godot = "G:\Godot\Godot_v4.7.2-stable_win64_console.exe", [int]$Puerto = 47831)
$ErrorActionPreference = "Stop"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$proj = Join-Path $raiz "godot"
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("pixelsoft-nube-prueba-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Force $tmp | Out-Null
$srv = Start-Process node -ArgumentList @((Join-Path $PSScriptRoot "servidor-falso.cjs"), $Puerto) -PassThru -WindowStyle Hidden
$antes = $env:APPDATA
try {
  $listo = $false
  for ($i = 0; $i -lt 50 -and -not $listo; $i++) {
    Start-Sleep -Milliseconds 200
    try { Invoke-WebRequest -UseBasicParsing -Method Post "http://127.0.0.1:$Puerto/_ctl/reset" | Out-Null; $listo = $true } catch {}
  }
  if (-not $listo) { throw "El servidor falso no arranca (node)." }
  $env:APPDATA = $tmp
  & $Godot --headless --path $proj -s res://tests/test_nube.gd -- "--falso=http://127.0.0.1:$Puerto"
  $codigo = $LASTEXITCODE
} finally {
  $env:APPDATA = $antes
  Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
if ($codigo -ne 0) { Write-Host "PRUEBAS DE LA NUBE: FALLAN" -ForegroundColor Red; exit 1 }
Write-Host "PRUEBAS DE LA NUBE: OK" -ForegroundColor Green
