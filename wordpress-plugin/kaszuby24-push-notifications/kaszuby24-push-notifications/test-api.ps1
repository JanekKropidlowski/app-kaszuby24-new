# Test API Kaszuby24 Events - PowerShell Script
# Uruchom: .\test-api.ps1

param(
    [string]$BaseUrl = "https://twoja-domena.pl"
)

Write-Host "🧪 Test API Kaszuby24 Events" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Endpoint,
        [string]$Description
    )
    
    Write-Host "🔍 Test: $Description" -ForegroundColor Yellow
    Write-Host "URL: $BaseUrl/wp-json/kaszuby24/v1$Endpoint" -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/wp-json/kaszuby24/v1$Endpoint" -Method GET -UseBasicParsing
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
    
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
}

# Test 1: Podstawowe połączenie
Test-Endpoint -Endpoint "/test" -Description "Test połączenia z API"

# Test 2: Stan bazy danych
Test-Endpoint -Endpoint "/debug/database-status" -Description "Stan bazy danych"

# Test 3: Test zapytań
Test-Endpoint -Endpoint "/debug/test-query?post_type=kalendarz" -Description "Test zapytań"

# Test 4: Aktywne kategorie
Test-Endpoint -Endpoint "/events/categories/active" -Description "Aktywne kategorie"

# Test 5: Aktywne obiekty
Test-Endpoint -Endpoint "/events/objects/active" -Description "Aktywne obiekty"

# Test 6: Aktywne filtry (NOWY)
Test-Endpoint -Endpoint "/events/filters/active" -Description "Aktywne filtry"

# Test 7: Wydarzenia
Test-Endpoint -Endpoint "/events" -Description "Wydarzenia"

Write-Host "🏁 Testowanie zakończone!" -ForegroundColor Green
