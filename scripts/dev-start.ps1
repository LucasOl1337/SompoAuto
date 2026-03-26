$ports = @(8000, 5173)

function Stop-PortProcess {
    param([int]$Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) {
        return
    }

    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "Stopped process on port $Port (PID $processId)."
        }
        catch {
            Write-Warning "Failed to stop PID ${processId} on port ${Port}: $($_.Exception.Message)"
        }
    }
}

foreach ($port in $ports) {
    Stop-PortProcess -Port $port
}

Start-Process -FilePath "cmd.exe" -ArgumentList '/k', 'call C:\Users\user\Desktop\SOMPO\run-backend-local.cmd' -WorkingDirectory 'C:\Users\user\Desktop\SOMPO' -WindowStyle Normal
Start-Process -FilePath "cmd.exe" -ArgumentList '/k', 'call C:\Users\user\Desktop\SOMPO\run-frontend-local.cmd' -WorkingDirectory 'C:\Users\user\Desktop\SOMPO' -WindowStyle Normal

Write-Host "Started backend on http://localhost:8000 and frontend on http://localhost:5173"
