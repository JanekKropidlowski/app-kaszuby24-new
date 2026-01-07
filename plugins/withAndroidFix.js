const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidFix(config) {
    return withAppBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            config.modResults.contents = config.modResults.contents.replace(
                /enableBundleCompression\s*=\s*\(findProperty\('android\.enableBundleCompression'\)\s*\?:\s*false\)\.toBoolean\(\)/g,
                '// enableBundleCompression removed by withAndroidFix'
            );
        }
        return config;
    });
};
