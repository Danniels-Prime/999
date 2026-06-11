const { withMainApplication } = require('@expo/config-plugins');

const IMPORT_LINE = 'import com.overlaylang.app.TranscriptionPackage';
const PACKAGE_LINE = '            packages.add(new TranscriptionPackage())';

// Matches the getPackages() override in the generated MainApplication.kt
const GET_PACKAGES_REGEX = /(override fun getPackages\(\)[\s\S]*?return packages\n\s*\})/;

module.exports = (config) =>
  withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;

    // Add import if missing
    if (!src.includes('TranscriptionPackage')) {
      // Insert import after the last existing import line
      src = src.replace(
        /(import [^\n]+\n)(?!import )/,
        `$1${IMPORT_LINE}\n`
      );

      // Add package registration inside getPackages()
      src = src.replace(
        GET_PACKAGES_REGEX,
        (match) => match.replace('return packages', `${PACKAGE_LINE}\n            return packages`)
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
