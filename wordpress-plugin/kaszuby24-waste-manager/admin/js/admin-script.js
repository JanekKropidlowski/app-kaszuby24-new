jQuery(document).ready(function ($) {
    let currentCitySlug = '';
    let cityData = { regions: [], schedule: {} };

    // TABS
    $('.tab-btn').on('click', function () {
        if ($(this).is(':disabled')) return;
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        const target = $(this).data('tab');
        $('.tab-content').removeClass('active');
        $('#' + target).addClass('active');
    });

    // ADD CITY
    $('#btn-add-city').on('click', function () {
        const name = $('#new-city-name').val();
        if (!name) return;

        $.post(k24Waste.ajax_url, {
            action: 'k24_save_city',
            nonce: k24Waste.nonce,
            name: name
        }, function (response) {
            if (response.success) {
                location.reload();
            }
        });
    });

    // DELETE CITY
    $(document).on('click', '.action-delete-city', function () {
        if (!confirm('Czy na pewno chcesz usunąć to miasto i całą jego strukturę?')) return;
        const row = $(this).closest('tr');
        const id = row.data('id');

        $.post(k24Waste.ajax_url, {
            action: 'k24_delete_city',
            nonce: k24Waste.nonce,
            id: id
        }, function (response) {
            if (response.success) {
                row.remove();
            }
        });
    });

    // MANAGE CITY (LOAD DATA)
    $(document).on('click', '.action-edit-city', function () {
        const row = $(this).closest('tr');
        currentCitySlug = row.data('slug');
        const cityName = row.find('strong').text();

        $('#current-city-title').text('Regiony i Ulice: ' + cityName);
        $('#btn-regions-tab, #btn-schedule-tab').prop('disabled', false);

        loadCityData(currentCitySlug);
        $('#btn-regions-tab').trigger('click');
    });

    function loadCityData(slug) {
        $.post(k24Waste.ajax_url, {
            action: 'k24_get_city_data',
            nonce: k24Waste.nonce,
            slug: slug
        }, function (response) {
            if (response.success) {
                cityData = response.data;
                renderRegions();
                updateRegionSelector();
            }
        });
    }

    // REGIONS MANAGEMENT
    function renderRegions() {
        const container = $('#regions-container');
        container.empty();

        if (cityData.regions) {
            cityData.regions.forEach((region, index) => {
                addRegionRow(region.id, region.name, region.streets);
            });
        }
    }

    function addRegionRow(id = '', name = '', streets = '') {
        if (!id) id = 'reg_' + Math.random().toString(36).substr(2, 9);
        const html = `
            <div class="region-item" data-id="${id}">
                <button class="button btn-danger btn-remove-region">X</button>
                <input type="text" class="reg-name" placeholder="Nazwa rejonu (np. Rejon 1)" value="${name}">
                <label>Ulice (oddzielone przecinkiem):</label>
                <textarea class="reg-streets" placeholder="ul. Polna, ul. Leśna...">${streets}</textarea>
            </div>
        `;
        $('#regions-container').append(html);
    }

    $('#btn-add-region').on('click', function () {
        addRegionRow();
    });

    $(document).on('click', '.btn-remove-region', function () {
        $(this).closest('.region-item').remove();
    });

    $('#btn-save-regions').on('click', function () {
        const regions = [];
        $('.region-item').each(function () {
            regions.push({
                id: $(this).data('id'),
                name: $(this).find('.reg-name').val(),
                streets: $(this).find('.reg-streets').val()
            });
        });

        $.post(k24Waste.ajax_url, {
            action: 'k24_save_regions',
            nonce: k24Waste.nonce,
            slug: currentCitySlug,
            regions: JSON.stringify(regions)
        }, function (response) {
            if (response.success) {
                alert('Zapisano regiony!');
                cityData.regions = regions;
                updateRegionSelector();
            }
        });
    });

    // SCHEDULE (QUICK EDIT)
    function updateRegionSelector() {
        const selector = $('#schedule-region-selector');
        selector.empty().append('<option value="">Wybierz rejon...</option>');
        cityData.regions.forEach(reg => {
            selector.append(`<option value="${reg.id}">${reg.name}</option>`);
        });
        $('#quick-edit-table-wrap').hide();
    }

    $('#schedule-region-selector').on('change', function () {
        const regionId = $(this).val();
        if (!regionId) {
            $('#quick-edit-table-wrap').hide();
            return;
        }

        renderScheduleTable(regionId);
        $('#quick-edit-table-wrap').show();
    });

    function renderScheduleTable(regionId) {
        const tbody = $('#table-dates tbody');
        tbody.empty();

        const schedule = cityData.schedule[regionId] || [];
        schedule.forEach(item => {
            addDateRow(item.date, item.types.join(', '));
        });
    }

    function addDateRow(date = '', selectedTypes = '') {
        const availableTypes = [
            'Zmieszane',
            'Odpady zielone',
            'Odpady bio z kuchni',
            'Makulatura',
            'Szkło',
            'Plastik',
            'Popioły',
            'Gabaryty',
            'Choinki',
            'Elektrośmieci'
        ];

        let selectedArray = [];
        if (typeof selectedTypes === 'string') {
            selectedArray = selectedTypes.split(',').map(t => t.trim()).filter(t => t !== '');
        } else if (Array.isArray(selectedTypes)) {
            selectedArray = selectedTypes;
        }

        // Separate fixed types and "custom" types that might have been loaded
        const fixedSelected = selectedArray.filter(t => availableTypes.includes(t));
        const customSelected = selectedArray.filter(t => !availableTypes.includes(t));

        let optionsHtml = '';
        availableTypes.forEach(type => {
            const isActive = fixedSelected.includes(type) ? 'active' : '';
            const isChecked = fixedSelected.includes(type) ? 'checked' : '';
            optionsHtml += `
                <div class="type-tag ${isActive}" data-type="${type}">
                    <input type="checkbox" class="type-checkbox" value="${type}" ${isChecked} style="display:none;">
                    <span>${type}</span>
                </div>
            `;
        });

        const html = `
            <tr class="schedule-row">
                <td><input type="date" class="row-date" value="${date}"></td>
                <td>
                    <div class="row-types-wrap">
                        <div class="tags-container">
                            ${optionsHtml}
                        </div>
                        <div class="custom-type-entry" style="margin-top:10px;">
                            <input type="text" class="row-custom-type" placeholder="Dodatkowy typ (np. Liście)" value="${customSelected.join(', ')}">
                        </div>
                    </div>
                </td>
                <td><button class="button btn-danger btn-remove-date-row">Usuń</button></td>
            </tr>
        `;
        $('#table-dates tbody').append(html);
    }

    // Toggle tag state
    $(document).on('click', '.type-tag', function () {
        $(this).toggleClass('active');
        const checkbox = $(this).find('input');
        checkbox.prop('checked', !checkbox.prop('checked'));
    });

    $('#btn-add-date-row').on('click', function () {
        addDateRow();
    });

    $(document).on('click', '.btn-remove-date-row', function () {
        $(this).closest('tr').remove();
    });

    $('#btn-save-schedule').on('click', function () {
        const regionId = $('#schedule-region-selector').val();
        const scheduleRows = [];

        $('#table-dates tbody tr').each(function () {
            const date = $(this).find('.row-date').val();

            let types = [];
            $(this).find('.type-checkbox:checked').each(function () {
                types.push($(this).val());
            });

            const customTypeStr = $(this).find('.row-custom-type').val().trim();
            if (customTypeStr) {
                const customs = customTypeStr.split(',').map(t => t.trim()).filter(t => t !== '');
                types = types.concat(customs);
            }

            if (date && types.length > 0) {
                scheduleRows.push({
                    date: date,
                    types: types
                });
            }
        });

        // Ensure schedule object exists
        if (!cityData.schedule) cityData.schedule = {};
        cityData.schedule[regionId] = scheduleRows;

        $.post(k24Waste.ajax_url, {
            action: 'k24_save_schedule',
            nonce: k24Waste.nonce,
            slug: currentCitySlug,
            schedule: JSON.stringify(cityData.schedule)
        }, function (response) {
            if (response.success) {
                alert('Harmonogram zapisany!');
            }
        });
    });

    // IMPORT LEGACY
    $('#btn-import-legacy').on('click', function () {
        if (!confirm('Czy chcesz zaimportować Redę, Wejherowo i Rumię ze starych plików? Istniejące dane o tych samych nazwach zostaną nadpisane.')) return;
        const btn = $(this);
        btn.prop('disabled', true).text('Importowanie...');

        $.post(k24Waste.ajax_url, {
            action: 'k24_import_legacy',
            nonce: k24Waste.nonce
        }, function (response) {
            if (response.success) {
                alert(response.data);
                location.reload();
            } else {
                alert('Błąd: ' + response.data);
                btn.prop('disabled', false).text('Importuj Redę, Wejherowo i Rumię');
            }
        });
    });

    // BULK GENERATOR
    $('#btn-run-generator').on('click', function () {
        const json = $('#json-generator-input').val();
        if (!json) return alert('Wklej JSON!');

        const btn = $(this);
        btn.prop('disabled', true).text('Generowanie...');

        $.post(k24Waste.ajax_url, {
            action: 'k24_bulk_generate',
            nonce: k24Waste.nonce,
            json: json
        }, function (response) {
            if (response.success) {
                alert(response.data);
                location.reload();
            } else {
                alert('Błąd: ' + response.data);
                btn.prop('disabled', false).text('Uruchom Generator (Zapisz)');
            }
        });
    });

    // INDIVIDUAL REGION JSON IMPORT
    $('#btn-import-region-json').on('click', function () {
        const jsonStr = $('#json-region-import-input').val();
        if (!jsonStr) return alert('Wklej JSON!');

        try {
            const data = JSON.parse(jsonStr);
            if (!Array.isArray(data)) {
                return alert('JSON musi być tablicą obiektów, np: [{"date": "...", "types": [...]}]');
            }

            data.forEach(item => {
                if (item.date && item.types) {
                    addDateRow(item.date, Array.isArray(item.types) ? item.types.join(', ') : item.types);
                }
            });

            $('#json-region-import-input').val(''); // Wyczyść po imporcie
            alert('Dodano dane do tabeli. Pamiętaj, aby kliknąć "Zapisz Harmonogram"!');

        } catch (e) {
            alert('Błąd formatu JSON: ' + e.message);
        }
    });
});
