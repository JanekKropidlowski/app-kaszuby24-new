require 'json'

Pod::Spec.new do |s|
  s.name           = 'K24ExtensionStorage'
  s.version        = '1.0.0'
  s.summary        = 'App Group storage dla widgetow Kaszuby24 (kopia ExtensionStorage z @bacons/apple-targets - autolinking pakietu zawodzil na EAS)'
  s.author         = 'Kaszuby24'
  s.homepage       = 'https://kaszuby24.pl'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
end
