jQuery(document).ready(function ($) {
    let currentCity = 'reda';
    let currentSchedule = null;
    let manualData = {};

    // Load schedule when city changes or button clicked
    $('#load-schedule, #city-select').on('click change', function () {
        loadSchedule();
    });

    // Add custom date form submission
    $('#add-custom-date-form').on('submit', function (e) {
        e.preventDefault();
        addCustomDate();
    });

    /**
     * Load schedule for selected city
     */
    function loadSchedule() {
        currentCity = $('#city-select').val();

        $('#schedule-loading').show();
        $('#schedule-content').html('');
        $('#manual-dates-content').html('<p class="description">Ładowanie...</p>');

        $.ajax({
            url: wasteAdmin.ajax_url,
            type: 'POST',
            data: {
                action: 'waste_get_schedule',
                nonce: wasteAdmin.nonce,
                city: currentCity
            },
            success: function (response) {
                $('#schedule-loading').hide();

                if (response.success) {
                    currentSchedule = response.data;
                    renderSchedule(response.data);
                    loadManualDates();
                } else {
                    $('#schedule-content').html('<div class="notice notice-error"><p>' + response.data + '</p></div>');
                }
            },
            error: function () {
                $('#schedule-loading').hide();
                $('#schedule-content').html('<div class="notice notice-error"><p>Błąd ładowania harmonogramu</p></div>');
            }
        });
    }

    /**
     * Render schedule in UI with EDIT buttons
     */
    function renderSchedule(data) {
        if (!data || !data.regions || data.regions.length === 0) {
            $('#schedule-content').html('<p>Brak danych harmonogramu</p>');
            return;
        }

        let html = '<div class="schedule-regions">';

        data.regions.forEach(function (region) {
            html += '<div class="region-section">';
            html += '<h3>' + capitalizeFirst(region.id) + '</h3>';

            if (region.dates && region.dates.length > 0) {
                html += '<div class="schedule-dates">';

                // Show only first 30 dates
                region.dates.slice(0, 30).forEach(function (dateEntry) {
                    const isManual = isDateManual(region.id, dateEntry.date);
                    html += '<div class="date-entry">';
                    html += '<div class="date-info">';
                    html += '<strong>' + formatDate(dateEntry.date) + '</strong>';
                    html += '<div class="waste-types">';

                    dateEntry.types.forEach(function (type) {
                        const badgeClass = isManual && isTypeManual(region.id, dateEntry.date, type) ? 'manual' : '';
                        html += '<span class="waste-type-badge ' + badgeClass + '">' + type;

                        // Add delete button for each type
                        html += ' <button class="delete-type-btn" data-region="' + region.id + '" data-date="' + dateEntry.date + '" data-type="' + type + '">×</button>';

                        html += '</span>';
                    });

                    html += '</div></div>';

                    // Edit button
                    html += '<div class="date-actions">';
                    html += '<button class="edit-date-btn button button-small" data-region="' + region.id + '" data-date="' + dateEntry.date + '">✏ Edytuj</button>';
                    html += '</div>';

                    html += '</div>';
                });

                if (region.dates.length > 30) {
                    html += '<p class="description">... i ' + (region.dates.length - 30) + ' kolejnych dat</p>';
                }

                html += '</div>';
            } else {
                html += '<p class="description">Brak dat dla tego regionu</p>';
            }

            html += '</div>';
        });

        html += '</div>';
        $('#schedule-content').html(html);

        // Attach event handlers
        $('.edit-date-btn').on('click', function () {
            openEditModal($(this).data('region'), $(this).data('date'));
        });

        $('.delete-type-btn').on('click', function () {
            deleteTypeFromDate($(this).data('region'), $(this).data('date'), $(this).data('type'));
        });
    }

    /**
     * Open edit modal for a date
     */
    function openEditModal(region, date) {
        const regionData = currentSchedule.regions.find(r => r.id === region);
        if (!regionData) return;

        const dateEntry = regionData.dates.find(d => d.date === date);
        if (!dateEntry) return;

        const newType = prompt('Dodaj nowy typ odpadu dla ' + formatDate(date) + ':\n\nDostępne typy:\n- Zmieszane\n- Plastik i metale\n- Makulatura\n- Szkło\n- Bio\n- Gabaryty\n- Choinki\n- Niebezpieczne', '');

        if (newType && newType.trim()) {
            updateDate(region, date, newType.trim(), 'add');
        }
    }

    /**
     * Update date (add or remove type)
     */
    function updateDate(region, date, type, actionType) {
        $.ajax({
            url: wasteAdmin.ajax_url,
            type: 'POST',
            data: {
                action: 'waste_update_date',
                nonce: wasteAdmin.nonce,
                city: currentCity,
                region: region,
                date: date,
                type: type,
                action_type: actionType
            },
            success: function (response) {
                if (response.success) {
                    showNotice('success', response.data.message);
                    loadSchedule(); // Reload
                } else {
                    showNotice('error', response.data);
                }
            },
            error: function () {
                showNotice('error', 'Błąd podczas aktualizacji daty');
            }
        });
    }

    /**
     * Delete specific type from a date
     */
    function deleteTypeFromDate(region, date, type) {
        if (!confirm('Czy na pewno chcesz usunąć "' + type + '" z tej daty?')) {
            return;
        }

        updateDate(region, date, type, 'remove');
    }

    /**
     * Load manual dates
     */
    function loadManualDates() {
        // Get manual data from uploads folder
        $.ajax({
            url: '/wp-content/uploads/waste-schedules/manual-waste-data-' + currentCity + '.json',
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                manualData = data || {};
                renderManualDates();
            },
            error: function () {
                manualData = {};
                renderManualDates();
            }
        });
    }

    /**
     * Render manual dates section
     */
    function renderManualDates() {
        if (!manualData || Object.keys(manualData).length === 0) {
            $('#manual-dates-content').html('<p class="description">Brak niestandardowych dat.</p>');
            return;
        }

        let html = '';

        Object.keys(manualData).forEach(function (region) {
            if (manualData[region] && manualData[region].length > 0) {
                html += '<h4>' + capitalizeFirst(region) + '</h4>';
                html += '<div class="schedule-dates">';

                manualData[region].forEach(function (entry) {
                    html += '<div class="date-entry">';
                    html += '<div class="date-info">';
                    html += '<strong>' + formatDate(entry.date) + '</strong>';
                    html += '<div class="waste-types">';

                    entry.types.forEach(function (type) {
                        html += '<span class="waste-type-badge manual">' + type + '</span>';
                        html += ' <button class="delete-btn" data-region="' + region + '" data-date="' + entry.date + '" data-type="' + type + '">Usuń</button>';
                    });

                    html += '</div></div></div>';
                });

                html += '</div>';
            }
        });

        if (html) {
            $('#manual-dates-content').html(html);

            // Attach delete handlers
            $('.delete-btn').on('click', function () {
                deleteCustomDate($(this).data('region'), $(this).data('date'), $(this).data('type'));
            });
        } else {
            $('#manual-dates-content').html('<p class="description">Brak niestandardowych dat.</p>');
        }
    }

    /**
     * Add custom date
     */
    function addCustomDate() {
        const date = $('#custom-date').val();
        const type = $('#custom-type').val();
        const region = $('#custom-region').val();

        if (!date || !type || !region) {
            showNotice('error', 'Wypełnij wszystkie pola!');
            return;
        }

        $.ajax({
            url: wasteAdmin.ajax_url,
            type: 'POST',
            data: {
                action: 'waste_add_custom_date',
                nonce: wasteAdmin.nonce,
                city: currentCity,
                date: date,
                type: type,
                region: region
            },
            success: function (response) {
                if (response.success) {
                    showNotice('success', response.data.message);
                    $('#add-custom-date-form')[0].reset();
                    loadSchedule(); // Reload
                } else {
                    showNotice('error', response.data);
                }
            },
            error: function () {
                showNotice('error', 'Błąd podczas dodawania daty');
            }
        });
    }

    /**
     * Delete custom date
     */
    function deleteCustomDate(region, date, type) {
        if (!confirm('Czy na pewno chcesz usunąć tę datę?')) {
            return;
        }

        $.ajax({
            url: wasteAdmin.ajax_url,
            type: 'POST',
            data: {
                action: 'waste_delete_custom_date',
                nonce: wasteAdmin.nonce,
                city: currentCity,
                region: region,
                date: date,
                type: type
            },
            success: function (response) {
                if (response.success) {
                    showNotice('success', response.data.message);
                    loadSchedule(); // Reload
                } else {
                    showNotice('error', response.data);
                }
            },
            error: function () {
                showNotice('error', 'Błąd podczas usuwania daty');
            }
        });
    }

    /**
     * Helpers
     */
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function isDateManual(region, date) {
        return manualData[region] && manualData[region].some(e => e.date === date);
    }

    function isTypeManual(region, date, type) {
        if (!manualData[region]) return false;
        const entry = manualData[region].find(e => e.date === date);
        return entry && entry.types.includes(type);
    }

    function showNotice(type, message) {
        const noticeClass = type === 'success' ? 'notice-success' : 'notice-error';
        $('#add-result')
            .removeClass('notice-success notice-error')
            .addClass('notice ' + noticeClass)
            .html('<p>' + message + '</p>')
            .show()
            .delay(5000)
            .fadeOut();
    }
});
