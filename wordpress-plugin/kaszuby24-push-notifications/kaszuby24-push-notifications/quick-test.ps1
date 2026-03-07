Write-Host "Test API" -ForegroundColor Green

$url = "https://httpbin.org/json"
Write-Host "Test URL: $url" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "OK"
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
