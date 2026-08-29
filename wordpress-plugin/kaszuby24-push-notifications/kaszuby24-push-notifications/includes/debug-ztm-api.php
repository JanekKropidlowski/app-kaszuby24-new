<?php
header('Content-Type: text/plain');
$api_url = 'https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/4c4025f0-01bf-41f7-a39f-d156d201b82b/download/stops.json';

echo "Testing ZTM Gdańsk API\n";
echo "URL: $api_url\n\n";

$ch = curl_init($api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$response = curl_exec($ch);
$error = curl_error($ch);
$info = curl_getinfo($ch);
curl_close($ch);

if ($error) {
    echo "CURL ERROR: $error\n";
    die();
}

echo "HTTP Code: " . $info['http_code'] . "\n";
echo "Content Type: " . $info['content_type'] . "\n";
echo "Response size: " . strlen($response) . " bytes\n\n";

$data = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "JSON ERROR: " . json_last_error_msg() . "\n";
    echo "First 500 chars of response:\n" . substr($response, 0, 500) . "\n";
    die();
}

echo "JSON parsed OK\n";
echo "Keys in response: " . implode(', ', array_keys($data)) . "\n\n";

// Check structure
if (isset($data['stops']) && is_array($data['stops'])) {
    echo "Found 'stops' array with " . count($data['stops']) . " items\n";
    if (count($data['stops']) > 0) {
        echo "First stop structure:\n";
        print_r(array_slice($data['stops'], 0, 1));
    }
} else {
    echo "NO 'stops' key found!\n";
    echo "Top-level structure:\n";
    if (is_array($data) && count($data) > 0) {
        $first = reset($data);
        print_r(array_slice([$first], 0, 1));
    }
}

die("\nEND\n");
