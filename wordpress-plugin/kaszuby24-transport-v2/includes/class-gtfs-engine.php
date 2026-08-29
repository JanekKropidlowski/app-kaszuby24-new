<?php
if (!defined('ABSPATH'))
    exit;

class Kaszuby24_GTFS_Engine
{

    public static function parse_csv($file)
    {
        if (!file_exists($file))
            return array();
        $rows = array();
        foreach (self::stream_csv($file) as $row) {
            $rows[] = $row;
        }
        return $rows;
    }

    public static function stream_csv($file)
    {
        if (!file_exists($file))
            return;
        $h = fopen($file, 'r');
        $headers = fgetcsv($h);

        // Remove BOM if present in first header
        if ($headers && isset($headers[0])) {
            $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);
        }

        if (!$headers) {
            fclose($h);
            return;
        }

        while (($data = fgetcsv($h)) !== false) {
            if (count($headers) !== count($data))
                continue;
            yield array_combine($headers, $data);
        }
        fclose($h);
    }

    public static function download_and_unzip($url, $extract_to)
    {
        require_once(ABSPATH . 'wp-admin/includes/file.php');

        // Use a browser-like User-Agent to avoid being blocked
        $args = array(
            'timeout' => 300,
            'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );

        $response = wp_remote_get($url, $args);
        if (is_wp_error($response))
            return $response;

        $code = wp_remote_retrieve_response_code($response);
        if ($code !== 200)
            return new WP_Error('download_failed', 'Serwer zwrócił kod: ' . $code);

        $body = wp_remote_retrieve_body($response);
        $tmp_file = wp_tempnam($url);
        file_put_contents($tmp_file, $body);

        if (!file_exists($extract_to))
            wp_mkdir_p($extract_to);

        $unzipped = unzip_file($tmp_file, $extract_to);
        @unlink($tmp_file);

        if (is_wp_error($unzipped))
            return $unzipped;
        return true;
    }
}
