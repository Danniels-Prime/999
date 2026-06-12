const { withMainApplication } = require('@expo/config-plugins');

const IMPORT_LINE = 'import com.overlaylang.app.TranscriptionPackage';

module.exports = (config) =>
  withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;

    if (src.includes('TranscriptionPackage')) return cfg; // already patched

    // 1. Inject import — after the package declaration line
    src = src.replace(
      /(^package com\.overlaylang\.app\s*\n)/m,
      `$1\n${IMPORT_LINE}\n`
    );

    // 2. Register the package — insert ONE line before 'return packages'
    //    Works regardless of indentation or surrounding whitespace.
    src = src.replace(
      /([ \t]+)(return packages)/,
      (_, indent, ret) => `${indent}packages.add(TranscriptionPackage())\n${indent}${ret}`
    );

    cfg.modResults.contents = src;
    return cfg;
  });
