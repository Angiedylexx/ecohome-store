# Prepara las carpetas de plataforma (android/ios/web) y permite HTTP en claro
# hacia el backend local. Ejecutar UNA vez, dentro de esta carpeta:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
param([switch]$SkipCreate)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not $SkipCreate) {
    if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
        throw 'No se encontró "flutter" en el PATH. Instala el SDK: https://docs.flutter.dev/get-started/install/windows/mobile'
    }
    # Genera android/, ios/ y web/ sin tocar lib/ ni pubspec.yaml existentes.
    flutter create --platforms=android,ios,web --project-name ecohome_flutter .
    flutter pub get
}

$manifest = Join-Path $PSScriptRoot 'android\app\src\main\AndroidManifest.xml'
if (-not (Test-Path $manifest)) { throw "No existe $manifest (¿falló flutter create?)" }

$xml = Get-Content $manifest -Raw -Encoding UTF8
$changed = $false

# Android 9+ bloquea http:// por defecto; el backend de desarrollo no usa TLS.
if ($xml -notmatch 'usesCleartextTraffic') {
    $xml = $xml -replace '<application', '<application android:usesCleartextTraffic="true"'
    $changed = $true
}
# El manifest de release no trae INTERNET por defecto (solo el de debug).
if ($xml -notmatch 'android.permission.INTERNET') {
    $xml = $xml -replace '(<manifest[^>]*>)', "`$1`n    <uses-permission android:name=""android.permission.INTERNET""/>"
    $changed = $true
}

if ($changed) {
    # UTF-8 sin BOM (Set-Content -Encoding UTF8 en PS 5.1 lo añadiría).
    [System.IO.File]::WriteAllText($manifest, $xml, (New-Object System.Text.UTF8Encoding $false))
    Write-Host 'AndroidManifest.xml actualizado (INTERNET + cleartext).'
} else {
    Write-Host 'AndroidManifest.xml ya estaba configurado.'
}
