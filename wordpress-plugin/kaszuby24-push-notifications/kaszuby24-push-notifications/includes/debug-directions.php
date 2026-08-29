<?php
// Quick backend test for directions
require_once('/home/dom/public_html/wp-load.php');

$from = $_GET['from'] ?? '54.5189,18.5305'; // Gdynia
$to = $_GET['to'] ?? '54.3475,18.6453'; // Gdańsk

echo "Testing Direction Logic for $from -> $to\n";

// Stub logic: If we were implementing server-side aggregation
// 1. Fetch SKM schedule
// 2. Fetch ZTM schedule
// 3. Use GraphHopper/OTP (if installed)
// For now, we confirm PHP environment is ready.

echo "Environment OK. Ready for Hybrid Engine implementation.\n";
