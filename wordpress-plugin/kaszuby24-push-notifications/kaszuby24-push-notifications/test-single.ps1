# Test pojedynczego endpointu API
# Użycie: .\test-single.ps1 -Endpoint "/test" -BaseUrl "https://twoja-domena.pl"

param(
    [Parameter(Mandatory=$true)]
    [string]$Endpoint,
    
    [string]$BaseUrl = "https://twoja-domena.pl"
)

$fullUrl = "$BaseUrl/wp-json/kaszuby24/v1$Endpoint"

Write-Host "🔍 Testowanie endpointu: $Endpoint" -ForegroundColor Yellow
Write-Host "URL: $fullUrl" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $fullUrl -Method GET -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Odpowiedź:" -ForegroundColor White
    $data | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "❌ Błąd: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
