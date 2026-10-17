# Exporta PixelSoft con el guardado en la nube de Google activado.
# Los client id de Google NO estan en el repo: viven en un JSON tuyo FUERA del repo
# (plantilla: tools\nube\google_oauth.ejemplo.json). Este script lo copia a
# godot\config_local\google_oauth.json SOLO mientras dura la exportacion y lo borra al acabar.
#
# Uso:
#   # versiones publicas (Windows + Android) a godot\build:
#   powershell -File tools\nube\exportar-con-google.ps1 -Config D:\claves\google_oauth.json
#   # envolviendo otro script de exportacion (firma del APK, PixelSoft Privado...):
#   powershell -File tools\nube\exportar-con-google.ps1 -Config D:\claves\google_oauth.json -Script tools\exportar-godot.ps1
#   powershell -File tools\nube\exportar-con-google.ps1 -Config D:\claves\google_oauth.json -Script tools\dlc\exportar-privado.ps1 -ScriptArgs '-Codigo','D:\claves\codigo.txt','-Salida','G:\PixelSoft-Privado'
param(
  [Parameter(Mandatory)][string]$Config,
  [string]$Script = "",
  [string[]]$ScriptArgs = @(),
  [ValidateSet("ambas", "windows", "android")][string]$Solo = "ambas",
  [string]$Godot = "G:\Godot\Godot_v4.7.2-stable_win64_console.exe"
)
$ErrorActionPreference = "Stop"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$proj = Join-Path $raiz "godot"
$cfg = Resolve-Path $Config
if ($cfg.Path.StartsWith($raiz.Path, [StringComparison]::OrdinalIgnoreCase)) { throw "El JSON de Google tiene que estar FUERA del repositorio." }
$j = Get-Content -Raw $cfg | ConvertFrom-Json
$hay = $false
foreach ($t in "escritorio", "dispositivo") {
  $c = $j.$t
  if ($c -and $c.client_id -and -not $c.client_id.StartsWith("TU_")) {
    if (-not $c.client_id.EndsWith(".apps.googleusercontent.com")) { throw "$t.client_id no parece un client id de Google." }
    $hay = $true; Write-Host "Cliente '$t' OK"
  }
}
if (-not $hay) { throw "El JSON no tiene ningun client id (escritorio o dispositivo)." }
$dir = Join-Path $proj "config_local"; New-Item -ItemType Directory -Force $dir | Out-Null
$dst = Join-Path $dir "google_oauth.json"
Copy-Item $cfg $dst -Force
try {
  if ($Script) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $raiz $Script) @ScriptArgs
    if ($LASTEXITCODE -ne 0) { throw "El script $Script ha fallado." }
  } else {
    New-Item -ItemType Directory -Force (Join-Path $proj "build") | Out-Null
    # El APK de release necesita la firma (GODOT_ANDROID_KEYSTORE_RELEASE_*); para firmar con tu clave usa -Script tools\exportar-godot.ps1
    if ($Solo -ne "android") { & $Godot --headless --path $proj --export-release "Windows" (Join-Path $proj "build\PixelSoft.exe") }
    if ($Solo -ne "windows") { & $Godot --headless --path $proj --export-release "Android" (Join-Path $proj "build\PixelSoft.apk") }
  }
} finally {
  Remove-Item -Force $dst -ErrorAction SilentlyContinue
  Write-Host "config_local\google_oauth.json borrado del proyecto."
}
