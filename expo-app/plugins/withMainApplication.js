const { withMainApplication } = require('@expo/config-plugins');

const IMPORT_LINE = 'import com.overlaylang.app.TranscriptionPackage';

module.exports = (config) =>
  withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;

    if (src.includes('TranscriptionPackage')) {
      cfg.modResults.contents = src;
      return cfg;
    }

    // Insert import after the last existing import line
    const lastImportIdx = src.lastIndexOf('\nimport ');
    if (lastImportIdx !== -1) {
      const endOfLine = src.indexOf('\n', lastImportIdx + 1);
      src = src.slice(0, endOfLine + 1) + IMPORT_LINE + '\n' + src.slice(endOfLine + 1);
    }

    // New-arch template (RN 0.73+): PackageList(this).packages.apply { ... }
    if (src.includes('PackageList(this).packages.apply {')) {
      src = src.replace(
        'PackageList(this).packages.apply {',
        'PackageList(this).packages.apply {\n            add(TranscriptionPackage())'
      );
    } else {
      // Old-arch fallback: has `return packages` inside getPackages()
      src = src.replace(
        /(\n(\s+))return packages/,
        (_, nl, indent) => `${nl}${indent}packages.add(TranscriptionPackage())${nl}${indent}return packages`
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
