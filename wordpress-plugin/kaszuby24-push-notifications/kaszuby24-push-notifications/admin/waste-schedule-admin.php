<?php
/**
 * Admin page template for Waste Schedule Manager
 */

if (!defined('ABSPATH')) {
    exit;
}

// Get available cities
$cities = array('reda', 'wejherowo', 'rumia');
$current_city = isset($_GET['city']) ? sanitize_text_field($_GET['city']) : 'reda';

?>
<div class="wrap waste-schedule-admin">
    <h1><span class="dashicons dashicons-calendar-alt"></span> Zarządzanie Harmonogramem Odpadów</h1>
    
    <div class="waste-admin-header">
        <div class="city-selector">
            <label for="city-select"><strong>Wybierz miasto:</strong></label>
            <select id="city-select" class="city-select">
                <?php foreach ($cities as $city): ?>
                    <option value="<?php echo esc_attr($city); ?>" <?php selected($current_city, $city); ?>>
                        <?php echo uc first($city); ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <button id="load-schedule" class="button button-primary">
                <span class="dashicons dashicons-update"></span> Załaduj harmonogram
            </button>
        </div>
    </div>

    <div class="waste-admin-content">
        <div class="waste-admin-grid">
            <!-- Left Panel: Add Custom Date -->
            <div class="waste-panel waste-add-panel">
                <h2><span class="dashicons dashicons-plus-alt"></span> Dodaj Niestandardową Datę</h2>
                <form id="add-custom-date-form" class="waste-form">
                    <div class="form-group">
                        <label for="custom-date">Data:</label>
                        <input type="date" id="custom-date" class="regular-text" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="custom-type">Typ odpadu:</label>
                        <select id="custom-type" class="regular-text" required>
                            <option value="">-- Wybierz typ --</option>
                            <option value="Zmieszane">Zmieszane</option>
                            <option value="Plastik i metale">Plastik i metale</option>
                            <option value="Makulatura">Makulatura</option>
                            <option value="Szkło">Szkło</option>
                            <option value="Bio">Bio</option>
                            <option value="Gabaryty">Gabaryty</option>
                            <option value="Choinki">Choinki</option>
                            <option value="Niebezpieczne">Niebezpieczne</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="custom-region">Region:</label>
                        <select id="custom-region" class="regular-text" required>
                            <option value="all">Wszystkie regiony</option>
                            <option value="wielorodzinna">Wielorodzinna</option>
                            <option value="jednorodzinna">Jednorodzinna</option>
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="button button-primary">
                            <span class="dashicons dashicons-yes"></span> Dodaj datę
                        </button>
                    </div>
                </form>
                
                <div id="add-result" class="notice" style="display:none;"></div>
            </div>

            <!-- Right Panel: Current Schedule -->
            <div class="waste-panel waste-schedule-panel">
                <h2><span class="dashicons dashicons-list-view"></span> Aktualny Harmonogram</h2>
                
                <div id="schedule-loading" class="loading" style="display:none;">
                    <span class="spinner is-active"></span> Ładowanie harmonogramu...
                </div>
                
                <div id="schedule-content">
                    <p class="description">Kliknij "Załaduj harmonogram", aby wyświetlić dane.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Manual Dates Section -->
    <div class="waste-panel waste-manual-panel"style="margin-top: 20px;">
        <h2><span class="dashicons dashicons-edit"></span> Niestandardowe Daty</h2>
        <div id="manual-dates-content">
            <p class="description">Tutaj pojawią się Twoje niestandardowe daty po załadowaniu harmonogramu.</p>
        </div>
    </div>
</div>

<style>
.waste-schedule-admin {
    margin: 20px;
}

.waste-schedule-admin h1 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 28px;
    margin-bottom: 20px;
}

.waste-admin-header {
    background: #fff;
    padding: 20px;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    margin-bottom: 20px;
}

.city-selector {
    display: flex;
    align-items: center;
    gap: 15px;
}

.city-selector label {
    margin: 0;
}

.city-select {
    min-width: 200px;
    padding: 8px 12px;
    font-size: 14px;
}

.waste-admin-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 20px;
    margin-bottom: 20px;
}

.waste-panel {
    background: #fff;
    padding: 20px;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
}

.waste-panel h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 0;
    padding-bottom: 15px;
    border-bottom: 2px solid #f0f0f1;
}

.waste-form .form-group {
    margin-bottom: 20px;
}

.waste-form label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
}

.waste-form input,
.waste-form select {
    width: 100%;
}

.form-actions {
    margin-top: 25px;
}

.loading {
    text-align: center;
    padding: 40px;
    color: #646970;
}

#schedule-content {
    max-height: 600px;
    overflow-y: auto;
}

.schedule-dates {
    margin-top: 15px;
}

.date-entry {
    background: #f6f7f7;
    padding: 12px 15px;
    margin-bottom: 10px;
    border-radius: 4px;
    border-left: 4px solid #2271b1;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.date-info strong {
    display: block;
    margin-bottom: 5px;
    color: #1d2327;
}

.waste-types {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 5px;
}

.waste-type-badge {
    display: inline-block;
    padding: 4px 10px;
    background: #2271b1;
    color: #fff;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
}

.waste-type-badge.manual {
    background: #d63638;
}

.delete-btn {
    background: #d63638;
    color: #fff;
    border: none;
    padding: 6px 12px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
}

.delete-btn:hover {
    background: #b32d2e;
}

.notice-success {
    border-left-color: #00a32a;
    background: #edfaef;
}

.notice-error {
    border-left-color: #d63638;
    background: #fcf0f1;
}

@media (max-width: 1200px) {
    .waste-admin-grid {
        grid-template-columns: 1fr;
    }
}
</style>
