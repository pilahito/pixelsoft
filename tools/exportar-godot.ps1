# Exporta PixelSoft (Godot) para Windows y Android y firma el APK con la
# MISMA clave que la 2.0.0, para que Android lo instale encima sin borrar la
# partida. No guarda contrasenas: se piden al ejecutar (o se leen de
# $env:PIXELSOFT_KS_PASS en esa sesion). No crea claves nuevas.
#
#   powershell -ExecutionPolicy Bypass -File tools\exportar-godot.ps1
#   powershell -File tools\exportar-godot.ps1 -Solo apk -Keystore D:\claves\pixelsoft.keystore
#
# Certificado esperado (SHA-256): 0bb98f3959434f283e821414f9c0e6cc33acef2e7a8fa00ab8d4e71b8b9ae7c5
param(
  [ValidateSet('todo', 'exe', 'apk')] [string]$Solo = 'todo',
  [string]$Godot = 'G:\Godot\Godot_v4.7.2-stable_win64_console.exe',
  [string]$Keystore = 'G:\pixelsoft\apk\debug.keystore',
  [string]$Alias = 'pixelsoft',
  [string]$BuildTools = ''
)
$ErrorActionPreference = 'Stop'
$CERT = '0bb98f3959434f283e821414f9c0e6cc33acef2e7a8fa00ab8d4e71b8b9ae7c5'
$proyecto = Join-Path $PSScriptRoot '..\godot' | Resolve-Path
$build = Join-Path $proyecto 'build'
New-Item -ItemType Directory -Force $build | Out-Null

if ($Solo -ne 'apk') {
  & $Godot --headless --path $proyecto --export-release 'Windows' (Join-Path $build 'PixelSoft.exe')
  if ($LASTEXITCODE) { throw 'Fallo al exportar el .exe' }
}
if ($Solo -eq 'exe') { exit 0 }

if (-not (Test-Path $Keystore)) { throw "No encuentro la clave $Keystore (no se crea una nueva: cambiaria la firma)." }
$pass = $env:PIXELSOFT_KS_PASS
if (-not $pass) {
  $s = Read-Host "Contrasena de $([IO.Path]::GetFileName($Keystore))" -AsSecureString
  $pass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}
# Godot lee la clave de release de estas variables (no van a export_presets.cfg).
$env:GODOT_ANDROID_KEYSTORE_RELEASE_PATH = $Keystore
$env:GODOT_ANDROID_KEYSTORE_RELEASE_USER = $Alias
$env:GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD = $pass
try {
  $apk = Join-Path $build 'PixelSoft.apk'
  & $Godot --headless --path $proyecto --export-release 'Android' $apk
  if ($LASTEXITCODE) { throw 'Fallo al exportar el APK' }
} finally {
  Remove-Item env:GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD -ErrorAction SilentlyContinue
  $pass = $null
}

# Comprobar que la firma es la de siempre
if (-not $BuildTools) {
  $sdk = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, 'G:\Dev\Android\Sdk') | Where-Object { $_ -and (Test-Path "$_\build-tools") } | Select-Object -First 1
  $BuildTools = Get-ChildItem "$sdk\build-tools" -Directory | Sort-Object Name | Select-Object -Last 1 -ExpandProperty FullName
}
$salida = & (Join-Path $BuildTools 'apksigner.bat') verify --print-certs $apk 2>&1 | Out-String
if ($salida -notmatch "SHA-256 digest: $CERT") { Write-Host $salida; throw 'El APK NO tiene la firma de la 2.0.0: no lo publiques.' }
Write-Host "APK firmado con la clave de siempre: $apk"
