const { withPlugins, withPodfile, AndroidConfig } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

module.exports = function withFirebaseIOSFix(config) {
    // Exclude RNFBAnalytics from iOS build
    return withPodfile(config, async (config) => {
        const contents = config.modResults.contents;

        // Add exclusion for RNFBAnalytics after use_native_modules!
        const exclusionCode = `
  # Exclude Firebase Analytics for iOS - using Measurement Protocol fallback
  # This fixes compatibility issues with New Architecture
  def exclude_rnfb_analytics(installer)
    installer.pods_project.targets.each do |target|
      if target.name == 'RNFBAnalytics'
        target.remove_from_project
      end
    end
  end

  post_install do |installer|
    exclude_rnfb_analytics(installer)

    # React Native post_install hook
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
  end
`;

        // Only add if not already present
        if (!contents.includes('exclude_rnfb_analytics')) {
            // Remove existing post_install if present and add our custom one
            let newContents = contents.replace(
                /post_install do \|installer\|[\s\S]*?^  end\n/m,
                ''
            );

            // Add our custom post_install at the end, before final 'end'
            const lines = newContents.split('\n');
            const lastEndIndex = lines.length - 1;
            lines.splice(lastEndIndex, 0, exclusionCode);
            config.modResults.contents = lines.join('\n');
        }

        return config;
    });
};
