# CVault Windows Build + Installer Script
# Run this on a Windows machine with Flutter and NSIS installed.
# Requirements:
#   - Flutter (run `flutter doctor` to verify Windows desktop is enabled)
#   - NSIS (https://nsis.sourceforge.io/Download) for creating the installer
#   - Git (to clone/update the repo)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "=== CVault Windows Build ===" -ForegroundColor Cyan

# ── 1. Check Flutter ─────────────────────────────────────────────────────────
Write-Host "`n[1/4] Checking Flutter..." -ForegroundColor Yellow
flutter doctor --no-version-check
if ($LASTEXITCODE -ne 0) { throw "Flutter check failed. Ensure Flutter is installed and in your PATH." }

# ── 2. Get dependencies ──────────────────────────────────────────────────────
Write-Host "`n[2/4] Getting Flutter dependencies..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) { throw "flutter pub get failed." }

# ── 3. Build release ─────────────────────────────────────────────────────────
Write-Host "`n[3/4] Building Windows release..." -ForegroundColor Yellow
flutter build windows --release
if ($LASTEXITCODE -ne 0) { throw "flutter build windows failed." }

$buildDir = "build\windows\x64\runner\Release"
Write-Host "Build output: $buildDir" -ForegroundColor Green

# ── 4. Package with NSIS ─────────────────────────────────────────────────────
Write-Host "`n[4/4] Creating installer with NSIS..." -ForegroundColor Yellow

$nsisExe = "C:\Program Files (x86)\NSIS\makensis.exe"
if (-Not (Test-Path $nsisExe)) {
    $nsisExe = "C:\Program Files\NSIS\makensis.exe"
}

if (Test-Path $nsisExe) {
    & $nsisExe "windows\installer.nsi"
    if ($LASTEXITCODE -ne 0) { throw "NSIS packaging failed." }
    Write-Host "`n✅ Installer created: build\CVaultSetup.exe" -ForegroundColor Green
} else {
    Write-Host "`n⚠  NSIS not found. Skipping installer creation." -ForegroundColor Yellow
    Write-Host "   Install NSIS from https://nsis.sourceforge.io/Download" -ForegroundColor Yellow
    Write-Host "   Then re-run this script, or manually zip the build output:" -ForegroundColor Yellow
    Write-Host "   $buildDir" -ForegroundColor White
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
