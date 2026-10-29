# Starts both the API and the UI in separate windows.
#   powershell -ExecutionPolicy Bypass -File start.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "server\node_modules")) {
    Write-Host "Installing server dependencies..." -ForegroundColor Cyan
    Push-Location server; npm install; Pop-Location
}
if (-not (Test-Path "client\node_modules")) {
    Write-Host "Installing client dependencies..." -ForegroundColor Cyan
    Push-Location client; npm install; Pop-Location
}
if (-not (Test-Path "server\.env")) {
    Copy-Item "server\.env.example" "server\.env"
    Write-Host "Created server\.env -- paste your OpenAI key into it, then re-run." -ForegroundColor Yellow
    exit
}

Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$PSScriptRoot\server'; npm run dev"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$PSScriptRoot\client'; npm run dev"
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
Write-Host "`nPaper Studio starting -> http://localhost:5173" -ForegroundColor Green
