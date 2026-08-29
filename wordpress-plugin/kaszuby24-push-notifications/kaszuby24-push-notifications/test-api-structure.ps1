Write-Host "🔍 Test struktury API Kaszuby24" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Sprawdź czy pliki istnieją
$files = @(
    "class-api.php",
    "EVENTS_API_README.md",
    "API_TESTING_GUIDE.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file - istnieje" -ForegroundColor Green
    } else {
        Write-Host "❌ $file - brak" -ForegroundColor Red
    }
}

Write-Host ""

# Sprawdź zawartość class-api.php
Write-Host "📋 Analiza class-api.php:" -ForegroundColor Yellow

if (Test-Path "class-api.php") {
    $content = Get-Content "class-api.php" -Raw
    
    # Sprawdź klasy
    if ($content -match "class Kaszuby24_Push_API") {
        Write-Host "✅ Klasa Kaszuby24_Push_API znaleziona" -ForegroundColor Green
    } else {
        Write-Host "❌ Klasa Kaszuby24_Push_API nie znaleziona" -ForegroundColor Red
    }
    
    # Sprawdź endpointy
    $endpoints = @(
        "/events/categories/active",
        "/events/objects/active", 
        "/events/filters/active",
        "/debug/database-status",
        "/debug/test-query"
    )
    
    Write-Host "🔗 Sprawdzanie endpointów:" -ForegroundColor Cyan
    foreach ($endpoint in $endpoints) {
        if ($content -match [regex]::Escape($endpoint)) {
            Write-Host "  ✅ $endpoint" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $endpoint" -ForegroundColor Red
        }
    }
    
    # Sprawdź metody
    $methods = @(
        "get_active_event_categories",
        "get_active_event_objects",
        "get_active_filters_for_mobile",
        "get_database_status",
        "test_specific_query"
    )
    
    Write-Host "⚙️ Sprawdzanie metod:" -ForegroundColor Cyan
    foreach ($method in $methods) {
        if ($content -match "function $method") {
            Write-Host "  ✅ $method" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $method" -ForegroundColor Red
        }
    }
    
} else {
    Write-Host "❌ Plik class-api.php nie istnieje" -ForegroundColor Red
}

Write-Host ""
Write-Host "🏁 Analiza zakończona!" -ForegroundColor Green
