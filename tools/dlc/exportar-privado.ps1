# Exporta "PixelSoft Privado" (presets "Windows Privado" / "Android Privado", feature tag "privado").
# El codigo de dueno NO esta en el repo: se copia desde fuera solo durante la exportacion y se borra al acabar.
# Firma Android: define antes GODOT_ANDROID_KEYSTORE_RELEASE_PATH / _USER / _PASSWORD (nunca en el repo).
# Uso: powershell -File tools\dlc\exportar-privado.ps1 -Codigo <ruta.txt> -Salida <carpeta> [-Godot <exe>]
param([Parameter(Mandatory)][string]$Codigo, [Parameter(Mandatory)][string]$Salida, [string]$Godot = "G:\Godot\Godot_v4.7.2-stable_win64_console.exe")
$ErrorActionPreference = "Stop"
$proj = Join-Path $PSScriptRoot "..\..\godot" | Resolve-Path
$c = (Get-Content -Raw $Codigo).Trim()
if (-not $c.StartsWith("PS1-")) { throw "El archivo no contiene un codigo PS1." }
$dir = Join-Path $proj "privado"; New-Item -ItemType Directory -Force $dir | Out-Null
$dst = Join-Path $dir "codigo_dueno.txt"; [IO.File]::WriteAllText($dst, $c)
New-Item -ItemType Directory -Force (Join-Path $proj "build\privado"), $Salida | Out-Null
try {
  & $Godot --headless --path $proj --export-release "Windows Privado" (Join-Path $proj "build\privado\PixelSoftPrivado.exe")
  & $Godot --headless --path $proj --export-release "Android Privado" (Join-Path $proj "build\privado\PixelSoftPrivado.apk")
} finally { Remove-Item -Force $dst }
Copy-Item (Join-Path $proj "build\privado\PixelSoftPrivado.exe"), (Join-Path $proj "build\privado\PixelSoftPrivado.apk") $Salida -Force
Get-ChildItem (Join-Path $proj "build\privado") -Filter *.dll | Copy-Item -Destination $Salida -Force
Get-ChildItem (Join-Path $proj "addons\godot_llama\bin") -Filter *.dll | ? { -not (Test-Path (Join-Path $Salida $_.Name)) } | Copy-Item -Destination $Salida
Write-Host "PixelSoft Privado exportado en $Salida"
