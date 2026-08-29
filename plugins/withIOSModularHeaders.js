const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withIOSModularHeaders(config) {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

            try {
                let podfileContent = fs.readFileSync(podfilePath, 'utf8');

                // Check if the fix is already applied
                if (!podfileContent.includes('# RNFB New Architecture Fix')) {
                    // Add post_install hook to disable warnings for Firebase
                    const postInstallHook = `
  # RNFB New Architecture Fix
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      if target.name == 'RNFBApp' || target.name == 'RNFBAnalytics'
        target.build_configurations.each do |config|
          config.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES'
          config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
        end
      end
    end
  end
`;

                    // Add before the last 'end' in the file
                    const lastEndIndex = podfileContent.lastIndexOf('end');
                    podfileContent =
                        podfileContent.slice(0, lastEndIndex) +
                        postInstallHook +
                        podfileContent.slice(lastEndIndex);

                    fs.writeFileSync(podfilePath, podfileContent);
                }
            } catch (error) {
                console.warn('Could not modify Podfile:', error);
            }

            return config;
        },
    ]);
};
