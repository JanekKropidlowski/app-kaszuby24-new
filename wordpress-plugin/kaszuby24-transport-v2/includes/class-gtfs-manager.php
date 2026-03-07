<?php
if (!defined('ABSPATH')) exit;

class Kaszuby24_GTFS_Manager {
    private $namespace = 'kaszuby24/otp';
    private $gtfs_base_path;
    private $manifest_file;

    // Required files for a valid GTFS feed (OTP strictness)
    private $required_files = array('stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt');

    public function __construct() {
        $upload_dir = wp_upload_dir();
        $this->gtfs_base_path = $upload_dir['basedir'] . '/gtfs-feeds';
        $this->manifest_file = $this->gtfs_base_path . '/manifest.json';

        if (!file_exists($this->gtfs_base_path)) {
            wp_mkdir_p($this->gtfs_base_path);
        }

        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes() {
        register_rest_route($this->namespace, '/feeds-manifest.json', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_manifest_response'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route($this->namespace, '/download/(?P<agency>[a-zA-Z0-9_-]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'serve_gtfs_zip'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Serve the latest.zip via PHP to bypass direct access restrictions
     */
    public function serve_gtfs_zip($request) {
        $agency = $request['agency'];
        $file_path = $this->gtfs_base_path . '/' . $agency . '/latest.zip';

        if (!file_exists($file_path)) {
            return new WP_Error('not_found', 'Feed not found', array('status' => 404));
        }

        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $agency . '_latest.zip"');
        header('Content-Length: ' . filesize($file_path));
        header('Pragma: no-cache');
        header('Expires: 0');

        readfile($file_path);
        exit;
    }

    /**
     * Ingest a raw zip file for an agency
     */
    public function ingest_feed($agency_slug, $source_path, $source_url = '') {
        $agency_dir = $this->gtfs_base_path . '/' . $agency_slug;
        if (!file_exists($agency_dir)) {
            wp_mkdir_p($agency_dir);
        }

        // 1. Validation
        $validation = $this->validate_zip($source_path);
        
        // Log error irrespective of manifest update
        if (!$validation['valid']) {
             error_log("GTFS Validation failed for $agency_slug: " . $validation['error']);
             
             // Update Manifest with INVALID status and reason
             $this->update_manifest_entry($agency_slug, array(
                'feed_id' => $agency_slug,
                'last_updated' => current_time('c'),
                'valid' => false,
                'error_reason' => $validation['error'],
                'source_url' => $source_url
            ));
             
            return array('success' => false, 'error' => $validation['error']);
        }

        // 2. Versioning
        $timestamp = current_time('Y-m-d_His');
        $filename = "{$agency_slug}_{$timestamp}.zip";
        $dest_path = $agency_dir . '/' . $filename;

        if (!copy($source_path, $dest_path)) {
            return array('success' => false, 'error' => 'Failed to copy file to storage');
        }

        // 3. Symlink 'latest.zip'
        $latest_path = $agency_dir . '/latest.zip';
        if (file_exists($latest_path)) unlink($latest_path);
        copy($dest_path, $latest_path); // Copy is safer than symlink in some WP hosts

        // 4. Update Manifest with VALID status
        $sha256 = hash_file('sha256', $dest_path);
        $manifest_data = $this->update_manifest_entry($agency_slug, array(
            'feed_id' => $agency_slug,
            'url' => $this->get_url_for_file($agency_slug, 'latest.zip'),
            'sha256' => $sha256,
            'last_updated' => current_time('c'),
            'valid' => true,
            'error_reason' => null, // Clear previous errors
            'source_url' => $source_url,
            'version_file' => $filename
        ));

        return array('success' => true, 'path' => $dest_path, 'metadata' => $manifest_data);
    }

    /**
     * Basic Sanity Check
     */
    private function validate_zip($zip_path) {
        $zip = new ZipArchive();
        if ($zip->open($zip_path) !== TRUE) {
            return array('valid' => false, 'error' => 'Cannot open ZIP file');
        }

        $found_files = array();
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $found_files[] = $zip->getNameIndex($i);
        }
        $zip->close();

        // Check required
        foreach ($this->required_files as $req) {
            if (!in_array($req, $found_files)) {
                return array('valid' => false, 'error' => "Missing required file: $req");
            }
        }

        // (Optional) Could unzip stops.txt to check record count > 0 here
        return array('valid' => true);
    }

    private function update_manifest_entry($agency_id, $data) {
        $manifest = array();
        if (file_exists($this->manifest_file)) {
            $manifest = json_decode(file_get_contents($this->manifest_file), true);
        }
        if (!isset($manifest['feeds'])) $manifest['feeds'] = array();

        // Update or Add
        $found = false;
        foreach ($manifest['feeds'] as &$feed) {
            if ($feed['feed_id'] === $agency_id) {
                $feed = array_merge($feed, $data);
                $found = true;
                break;
            }
        }
        if (!$found) {
            $manifest['feeds'][] = $data;
        }

        file_put_contents($this->manifest_file, json_encode($manifest, JSON_PRETTY_PRINT));
        return $data;
    }

    private function get_url_for_file($agency, $filename) {
        // Use the REST API endpoint instead of direct file access to bypass security redirects
        return get_rest_url(null, "/{$this->namespace}/download/{$agency}");
    }

    public function get_manifest_response() {
        if (!file_exists($this->manifest_file)) {
            return array('feeds' => array());
        }
        return json_decode(file_get_contents($this->manifest_file), true);
    }
}
