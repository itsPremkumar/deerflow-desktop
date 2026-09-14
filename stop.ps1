# DeerFlow - Stop all running services
# Usage: .\stop.ps1

$ErrorActionPreference = "SilentlyContinue"

Write-Host "`nStopping DeerFlow services..." -ForegroundColor Yellow

$targetPorts = @(8001, 3000, 8201, 2026)
$killedCount = 0

# 1. Kill by listening ports
foreach ($port in $targetPorts) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            $procId = $c.OwningProcess
            if ($procId -and $procId -ne 0) {
                try {
                    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Host "  -> Terminating process '$($proc.ProcessName)' (PID: $procId) listening on port $port" -ForegroundColor Gray
                        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                        $killedCount++
                    }
                } catch {}
            }
        }
    }
}

# 2. Cleanup stray uvicorn or Next.js spawned for deer-flow
$strayProcs = Get-Process | Where-Object { $_.ProcessName -match "uvicorn" }
foreach ($p in $strayProcs) {
    try {
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        $killedCount++
    } catch {}
}

if ($killedCount -gt 0) {
    Write-Host "[OK] All DeerFlow services stopped ($killedCount process(es) terminated).`n" -ForegroundColor Green
} else {
    Write-Host "[OK] No active DeerFlow services were running.`n" -ForegroundColor Green
}
