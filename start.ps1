# DeerFlow - Unified System Launcher for Windows (PowerShell)
# Usage:
#   .\start.ps1               # Start full stack and open web browser
#   .\start.ps1 -NoBrowser    # Start full stack without auto-opening browser
#   .\start.ps1 -Prod         # Start in optimized production mode

[CmdletBinding()]
param (
    [switch]$NoBrowser,
    [switch]$Prod,
    [int]$FrontendPort = 3000,
    [int]$GatewayPort = 8001
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
Set-Location $RepoRoot

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       DeerFlow - Unified Super-Agent Platform          " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# -- 1. Locate uv and Node.js ------------------------------------------------
$uvCmd = Get-Command uv -ErrorAction SilentlyContinue
if (-not $uvCmd) {
    $uvCandidates = @(
        "$env:USERPROFILE\.cargo\bin\uv.exe",
        "$env:APPDATA\uv\uv.exe",
        "$env:LOCALAPPDATA\Programs\uv\uv.exe"
    )
    foreach ($c in $uvCandidates) {
        if (Test-Path $c) {
            $dir = Split-Path $c
            $env:PATH = "$dir;" + $env:PATH
            $uvCmd = Get-Command uv -ErrorAction SilentlyContinue
            break
        }
    }
}
if (-not $uvCmd) {
    Write-Host "[!] 'uv' not found. Installing Astral uv package manager..." -ForegroundColor Yellow
    try {
        powershell -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex"
        $env:PATH = "$env:USERPROFILE\.cargo\bin;" + $env:PATH
        $uvCmd = Get-Command uv -ErrorAction SilentlyContinue
    } catch {
        Write-Error "Failed to install uv automatically. Please install it from https://astral.sh/uv"
        exit 1
    }
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Error "Node.js (v22+) is required. Please install from https://nodejs.org/"
    exit 1
}

# -- 2. Ensure Configurations and Secrets ------------------------------------
# .env
if (-not (Test-Path "$RepoRoot\.env")) {
    Write-Host "Creating .env configuration..." -ForegroundColor Gray
    $secret = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
    if (Test-Path "$RepoRoot\.env.example") {
        Copy-Item "$RepoRoot\.env.example" "$RepoRoot\.env"
    } else {
        New-Item -ItemType File -Path "$RepoRoot\.env" -Force | Out-Null
    }
    Add-Content -Path "$RepoRoot\.env" -Value "`nBETTER_AUTH_SECRET=$secret`nDEER_FLOW_AUTH_DISABLED=1`n"
}


# config.yaml
if (-not (Test-Path "$RepoRoot\config.yaml")) {
    Write-Host "Creating config.yaml from template..." -ForegroundColor Gray
    Copy-Item "$RepoRoot\config.example.yaml" "$RepoRoot\config.yaml"
}

# extensions_config.json
if (-not (Test-Path "$RepoRoot\extensions_config.json")) {
    Write-Host "Creating extensions_config.json..." -ForegroundColor Gray
    if (Test-Path "$RepoRoot\extensions_config.example.json") {
        Copy-Item "$RepoRoot\extensions_config.example.json" "$RepoRoot\extensions_config.json"
    } else {
        Set-Content -Path "$RepoRoot\extensions_config.json" -Value "{}`n"
    }
}

# Ensure logs directory exists
if (-not (Test-Path "$RepoRoot\logs")) {
    New-Item -ItemType Directory -Path "$RepoRoot\logs" -Force | Out-Null
}

# -- 3. Clean any existing processes on ports --------------------------------
Write-Host "Checking ports $GatewayPort and $FrontendPort..." -ForegroundColor Gray
foreach ($port in @($GatewayPort, $FrontendPort)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            $pidToKill = $c.OwningProcess
            if ($pidToKill -and $pidToKill -ne 0) {
                Write-Host "  -> Reclaiming port $port (closing previous PID $pidToKill)..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# -- 4. Set Environment for Single-User Direct Chat --------------------------
$env:DEER_FLOW_AUTH_DISABLED = "1"
$env:DEER_FLOW_INTERNAL_GATEWAY_BASE_URL = "http://127.0.0.1:$GatewayPort"
$env:PORT = "$FrontendPort"
$env:PYTHONPATH = "."

# -- 5. Start Backend Gateway ------------------------------------------------
Write-Host "`n[1/2] Starting Gateway API on port $GatewayPort..." -ForegroundColor Yellow

$gatewayPsi = New-Object System.Diagnostics.ProcessStartInfo
$gatewayPsi.FileName = "uv"
$gatewayPsi.Arguments = "run uvicorn app.gateway.app:app --host 127.0.0.1 --port $GatewayPort"
$gatewayPsi.WorkingDirectory = "$RepoRoot\backend"
$gatewayPsi.UseShellExecute = $false
$gatewayPsi.CreateNoWindow = $true

$gatewayProcess = [System.Diagnostics.Process]::Start($gatewayPsi)

# -- 6. Start Frontend Chat UI -----------------------------------------------
Write-Host "[2/2] Starting Next.js Web Interface on port $FrontendPort..." -ForegroundColor Yellow

$frontendPsi = New-Object System.Diagnostics.ProcessStartInfo
$frontendPsi.FileName = "node"
if ($Prod) {
    if (-not (Test-Path "$RepoRoot\frontend\.next\BUILD_ID")) {
        Write-Host "Production build not found. Building frontend..." -ForegroundColor Yellow
        Push-Location "$RepoRoot\frontend"
        try {
            & node node_modules/next/dist/bin/next build
        } finally {
            Pop-Location
        }
    }
    $frontendPsi.Arguments = "node_modules/next/dist/bin/next start -p $FrontendPort"
} else {
    $frontendPsi.Arguments = "scripts/dev.mjs"
}
$frontendPsi.WorkingDirectory = "$RepoRoot\frontend"
$frontendPsi.UseShellExecute = $false
$frontendPsi.CreateNoWindow = $true

$frontendProcess = [System.Diagnostics.Process]::Start($frontendPsi)

# -- Helper for Graceful Shutdown --------------------------------------------
function Cleanup-Stack {
    Write-Host "`nShutting down DeerFlow services gracefully..." -ForegroundColor Yellow
    if ($gatewayProcess -and -not $gatewayProcess.HasExited) {
        Write-Host "  -> Stopping Gateway API (PID: $($gatewayProcess.Id))..." -ForegroundColor Gray
        Stop-Process -Id $gatewayProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Write-Host "  -> Stopping Frontend UI (PID: $($frontendProcess.Id))..." -ForegroundColor Gray
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    # Clean any child uvicorn or next processes on target ports
    Get-NetTCPConnection -LocalPort $GatewayPort -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Get-NetTCPConnection -LocalPort $FrontendPort -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] All DeerFlow services stopped cleanly.`n" -ForegroundColor Green
}

# -- 7. Wait for Services to be Ready ----------------------------------------
Write-Host "`nWaiting for services to become healthy..." -ForegroundColor Yellow

$maxAttempts = 45
$gatewayReady = $false
$frontendReady = $false

for ($i = 1; $i -le $maxAttempts; $i++) {
    Start-Sleep -Seconds 1

    # Check gateway health
    if (-not $gatewayReady) {
        try {
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$GatewayPort/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                $gatewayReady = $true
                Write-Host "  [OK] Gateway API is healthy on port $GatewayPort." -ForegroundColor Green
            }
        } catch {}
    }

    # Check frontend health
    if (-not $frontendReady) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $FrontendPort)
            if ($tcp.Connected) {
                $tcp.Close()
                $frontendReady = $true
                Write-Host "  [OK] Frontend Web UI is listening on port $FrontendPort." -ForegroundColor Green
            }
        } catch {}
    }

    if ($gatewayReady -and $frontendReady) {
        break
    }

    # If a process died early, abort
    if ($gatewayProcess.HasExited) {
        Write-Host "`n[ERROR] Gateway API exited unexpectedly with code $($gatewayProcess.ExitCode)." -ForegroundColor Red
        Cleanup-Stack
        exit 1
    }
    if ($frontendProcess.HasExited) {
        Write-Host "`n[ERROR] Frontend UI exited unexpectedly with code $($frontendProcess.ExitCode)." -ForegroundColor Red
        Cleanup-Stack
        exit 1
    }
}

if (-not $gatewayReady -or -not $frontendReady) {
    Write-Host "`n[WARN] Startup timed out waiting for ports $GatewayPort/$FrontendPort." -ForegroundColor Yellow
}

# -- 8. Open Web Browser -----------------------------------------------------
$appUrl = "http://localhost:$FrontendPort"

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "   DeerFlow is LIVE and running as ONE unified system!   " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Web Application:  " -NoNewline
Write-Host "$appUrl" -ForegroundColor Cyan
Write-Host "  Gateway API:      " -NoNewline
Write-Host "http://127.0.0.1:$GatewayPort" -ForegroundColor Cyan
Write-Host "  Gateway Health:   " -NoNewline
Write-Host "http://127.0.0.1:$GatewayPort/health" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Press [Ctrl+C] to stop all services cleanly.`n" -ForegroundColor Yellow

if (-not $NoBrowser) {
    Write-Host "Opening DeerFlow in your default web browser..." -ForegroundColor Cyan
    Start-Process $appUrl
}

# -- 9. Keep Running and Monitor ---------------------------------------------
try {
    while (-not $gatewayProcess.HasExited -and -not $frontendProcess.HasExited) {
        Start-Sleep -Seconds 2
    }
} finally {
    Cleanup-Stack
}
