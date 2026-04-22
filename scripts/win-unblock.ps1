# win-unblock.ps1 — BoxLang Starter Desktop (Windows)
#
# This script unblocks the app from Windows SmartScreen and launches it.
# See UNSIGNED-BUILD.md in this folder for why this is needed.

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$exeName   = "BoxLang Starter Desktop Setup.exe"
$exePath   = Join-Path $scriptDir $exeName

if (-Not (Test-Path $exePath)) {
    Write-Error "Could not find '$exeName' next to this script."
    Write-Error "Make sure win-unblock.ps1 is in the same folder as the installer."
    exit 1
}

Write-Host "⚡ BoxLang Starter Desktop — unblocking installer..."
Unblock-File -Path $exePath

Write-Host "✅  Done. Launching installer..."
Start-Process $exePath
