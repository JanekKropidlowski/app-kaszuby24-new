#!/bin/bash

# Skrypt do wdrożenia naprawionego pluginu Kaszuby24 Transport V2
# Użycie: ./deploy-plugin.sh

echo "🚀 Wdrażanie naprawionego pluginu Kaszuby24 Transport V2..."

# Kolory
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ścieżki
LOCAL_PLUGIN_DIR="/Volumes/Untitled/Nowy folder (7)/app-kaszuby24/wordpress-plugin/kaszuby24-transport-v2"
REMOTE_HOST="kaszuby24.pl"
REMOTE_USER="kaszub24pl"
REMOTE_PATH="/home/kaszub24pl/domains/kaszuby24.pl/public_html/wp-content/plugins/kaszuby24-transport-v2"

echo ""
echo "📁 Lokalna ścieżka: $LOCAL_PLUGIN_DIR"
echo "🌐 Serwer: $REMOTE_HOST"
echo "📂 Zdalna ścieżka: $REMOTE_PATH"
echo ""

# Sprawdź czy katalog lokalny istnieje
if [ ! -d "$LOCAL_PLUGIN_DIR" ]; then
    echo -e "${RED}❌ Błąd: Katalog lokalny nie istnieje!${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  UWAGA: Ten skrypt wymaga dostępu SSH/SFTP do serwera.${NC}"
echo ""
read -p "Czy chcesz kontynuować? (t/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Tt]$ ]]; then
    echo "Anulowano."
    exit 0
fi

echo ""
echo "📤 Przesyłanie plików..."

# Metoda 1: Użyj rsync (jeśli dostępny)
if command -v rsync &> /dev/null; then
    echo "Używam rsync..."
    
    rsync -avz --progress \
        "$LOCAL_PLUGIN_DIR/includes/class-transport-v2.php" \
        "$LOCAL_PLUGIN_DIR/includes/class-polregio-handler.php" \
        "$LOCAL_PLUGIN_DIR/includes/class-gtfs-engine.php" \
        "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/includes/"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Pliki przesłane pomyślnie!${NC}"
    else
        echo -e "${RED}❌ Błąd podczas przesyłania plików!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  rsync nie jest dostępny. Użyj FTP/SFTP ręcznie.${NC}"
    echo ""
    echo "Prześlij następujące pliki:"
    echo "1. $LOCAL_PLUGIN_DIR/includes/class-transport-v2.php"
    echo "2. $LOCAL_PLUGIN_DIR/includes/class-polregio-handler.php"
    echo "3. $LOCAL_PLUGIN_DIR/includes/class-gtfs-engine.php"
    echo ""
    echo "Do katalogu: $REMOTE_PATH/includes/"
    exit 0
fi

echo ""
echo "🔄 Uruchamianie synchronizacji..."
sleep 2

# Uruchom synchronizację
SYNC_RESPONSE=$(curl -s "https://kaszuby24.pl/wp-json/kaszuby24/v2/sync?key=k24_secret_sync_key&force=1")

echo ""
echo "📊 Odpowiedź synchronizacji:"
echo "$SYNC_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SYNC_RESPONSE"

echo ""
echo "🧪 Sprawdzanie przystanków PolRegio..."
sleep 2

POLREGIO_STOPS=$(curl -s "https://kaszuby24.pl/wp-json/kaszuby24/v2/stops?agency=polregio")
STOP_COUNT=$(echo "$POLREGIO_STOPS" | grep -o '"type":"Feature"' | wc -l)

echo ""
if [ "$STOP_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ PolRegio działa! Znaleziono $STOP_COUNT przystanków.${NC}"
else
    echo -e "${RED}❌ PolRegio nie zwraca przystanków.${NC}"
    echo "Odpowiedź API:"
    echo "$POLREGIO_STOPS" | head -20
fi

echo ""
echo "🎉 Wdrożenie zakończone!"
echo ""
echo "📋 Kolejne kroki:"
echo "1. Sprawdź aplikację mobilną"
echo "2. Zweryfikuj czy przystanki PolRegio są widoczne"
echo "3. Przetestuj rozkłady jazdy"
echo ""
