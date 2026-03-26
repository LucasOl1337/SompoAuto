$ports = @(8000, 5173)
$found = $false

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) {
        continue
    }

    $found = $true
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "Stopped process on port $port (PID $processId)."
        }
        catch {
            Write-Warning "Failed to stop PID ${processId} on port ${port}: $($_.Exception.Message)"
        }
    }
}

if (-not $found) {
    Write-Host "No backend/frontend dev process found on ports 8000 or 5173."
}
