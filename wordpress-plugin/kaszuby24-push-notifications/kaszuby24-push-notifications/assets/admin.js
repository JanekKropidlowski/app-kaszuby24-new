jQuery(document).ready(function($) {
    
    // Test notification form
    $('#test-notification-form').on('submit', function(e) {
        e.preventDefault();
        
        var token = $('#test-token').val();
        var title = $('#test-title').val();
        var body = $('#test-body').val();
        
        if (!token || !title || !body) {
            alert('Wypełnij wszystkie pola');
            return;
        }
        
        var $button = $(this).find('button[type="submit"]');
        var originalText = $button.text();
        
        $button.text('Wysyłanie...').prop('disabled', true);
        $('#test-result').hide();
        
        $.ajax({
            url: kaszuby24_push_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'send_test_notification',
                nonce: kaszuby24_push_ajax.nonce,
                token: token,
                title: title,
                body: body
            },
            success: function(response) {
                if (response.success) {
                    $('#test-result')
                        .removeClass('notice-error')
                        .addClass('notice notice-success')
                        .html('<p>✅ ' + response.data.message + '</p>')
                        .show();
                } else {
                    $('#test-result')
                        .removeClass('notice-success')
                        .addClass('notice notice-error')
                        .html('<p>❌ Błąd: ' + response.data + '</p>')
                        .show();
                }
            },
            error: function(xhr, status, error) {
                $('#test-result')
                    .removeClass('notice-success')
                    .addClass('notice notice-error')
                    .html('<p>❌ Błąd połączenia: ' + error + '</p>')
                    .show();
            },
            complete: function() {
                $button.text(originalText).prop('disabled', false);
            }
        });
    });
    
    // Manual notification form
    $('#manual-notification-form').on('submit', function(e) {
        e.preventDefault();
        
        var title = $('#manual-title').val();
        var body = $('#manual-body').val();
        var regions = $('#manual-regions').val() || [];
        var categories = $('#manual-categories').val() || [];
        
        if (!title || !body) {
            alert('Wypełnij tytuł i treść');
            return;
        }
        
        if (!confirm('Czy na pewno chcesz wysłać powiadomienie do wszystkich użytkowników?')) {
            return;
        }
        
        var $button = $(this).find('button[type="submit"]');
        var originalText = $button.text();
        
        $button.text('Wysyłanie...').prop('disabled', true);
        $('#manual-result').hide();
        
        $.ajax({
            url: kaszuby24_push_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'send_manual_notification',
                nonce: kaszuby24_push_ajax.nonce,
                title: title,
                body: body,
                regions: regions,
                categories: categories
            },
            success: function(response) {
                if (response.success) {
                    $('#manual-result')
                        .removeClass('notice-error')
                        .addClass('notice notice-success')
                        .html('<p>✅ ' + response.data.message + '</p>' +
                              '<p>Wysłane: ' + response.data.sent + ', Niepowodzenia: ' + response.data.failed + ', Łącznie tokenów: ' + response.data.total + '</p>')
                        .show();
                    
                    // Clear form
                    $('#manual-title').val('');
                    $('#manual-body').val('');
                    $('#manual-regions').val([]);
                    $('#manual-categories').val([]);
                } else {
                    $('#manual-result')
                        .removeClass('notice-success')
                        .addClass('notice notice-error')
                        .html('<p>❌ Błąd: ' + response.data + '</p>')
                        .show();
                }
            },
            error: function(xhr, status, error) {
                $('#manual-result')
                    .removeClass('notice-success')
                    .addClass('notice notice-error')
                    .html('<p>❌ Błąd połączenia: ' + error + '</p>')
                    .show();
            },
            complete: function() {
                $button.text(originalText).prop('disabled', false);
            }
        });
    });
    
    // Auto-refresh stats every 30 seconds on stats page
    if (window.location.href.indexOf('kaszuby24-push-stats') !== -1) {
        setInterval(function() {
            location.reload();
        }, 30000);
    }
    
    // Character counter for notification fields
    function updateCharacterCount($field, maxLength) {
        var $counter = $field.next('.char-counter');
        if ($counter.length === 0) {
            $counter = $('<span class="char-counter" style="font-size: 11px; color: #666;"></span>');
            $field.after($counter);
        }
        
        var currentLength = $field.val().length;
        var remaining = maxLength - currentLength;
        
        $counter.text(remaining + ' znaków pozostało');
        
        if (remaining < 0) {
            $counter.css('color', 'red');
        } else if (remaining < 20) {
            $counter.css('color', 'orange');
        } else {
            $counter.css('color', '#666');
        }
    }
    
    // Add character counters
    $('#test-title, #manual-title').on('input', function() {
        updateCharacterCount($(this), 50);
    });
    
    $('#test-body, #manual-body').on('input', function() {
        updateCharacterCount($(this), 100);
    });
    
    // Initialize character counters
    $('#test-title, #manual-title').each(function() {
        updateCharacterCount($(this), 50);
    });
    
    $('#test-body, #manual-body').each(function() {
        updateCharacterCount($(this), 100);
    });
    
    // Validate push token format
    $('#test-token').on('input', function() {
        var token = $(this).val();
        var $feedback = $(this).next('.token-feedback');
        
        if ($feedback.length === 0) {
            $feedback = $('<span class="token-feedback" style="font-size: 11px; margin-left: 10px;"></span>');
            $(this).after($feedback);
        }
        
        if (token.length === 0) {
            $feedback.text('').css('color', '#666');
        } else if (token.indexOf('ExponentPushToken[') === 0 || token.indexOf('ExpoPushToken[') === 0) {
            $feedback.text('✅ Poprawny format tokena').css('color', 'green');
        } else {
            $feedback.text('❌ Niepoprawny format tokena').css('color', 'red');
        }
    });
    
    // Add confirmation for dangerous actions
    $('input[name="push_resend"]').on('change', function() {
        if ($(this).is(':checked')) {
            if (!confirm('Czy na pewno chcesz wysłać powiadomienie ponownie?')) {
                $(this).prop('checked', false);
            }
        }
    });
    
    // Show/hide custom notification fields
    function toggleCustomFields() {
        var $customTitle = $('input[name="push_custom_title"]');
        var $customBody = $('textarea[name="push_custom_body"]');
        
        if ($customTitle.val() || $customBody.val()) {
            $customTitle.closest('p').show();
            $customBody.closest('p').show();
        }
    }
    
    // Initialize custom fields visibility
    toggleCustomFields();
    
    // Add tooltips for better UX
    if (typeof jQuery.fn.tooltip !== 'undefined') {
        $('[title]').tooltip();
    }
}); 