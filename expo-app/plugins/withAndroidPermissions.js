const {
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// Permissions and service declarations to inject into AndroidManifest
const PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.POST_NOTIFICATIONS',
];

const SERVICES = [
  {
    '$': {
      'android:name': '.TranscriptionService',
      'android:foregroundServiceType': 'microphone',
      'android:exported': 'false',
    },
  },
  {
    '$': {
      'android:name': '.OverlayService',
      'android:foregroundServiceType': 'specialUse',
      'android:exported': 'false',
    },
  },
];

function withPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const mainManifest = manifest.manifest;

    // Ensure uses-permission array exists
    if (!mainManifest['uses-permission']) {
      mainManifest['uses-permission'] = [];
    }

    for (const perm of PERMISSIONS) {
      const already = mainManifest['uses-permission'].some(
        (p) => p['$'] && p['$']['android:name'] === perm
      );
      if (!already) {
        mainManifest['uses-permission'].push({ '$': { 'android:name': perm } });
      }
    }

    // Add service declarations inside <application>
    const application = mainManifest.application[0];
    if (!application.service) application.service = [];

    for (const svc of SERVICES) {
      const name = svc['$']['android:name'];
      const already = application.service.some(
        (s) => s['$'] && s['$']['android:name'] === name
      );
      if (!already) {
        application.service.push(svc);
      }
    }

    return cfg;
  });
}

function withKotlinSources(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const srcDir = path.join(cfg.modRequest.projectRoot, 'android-native');
      const destDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'overlaylang',
        'app'
      );

      if (!fs.existsSync(srcDir)) return cfg;

      fs.mkdirSync(destDir, { recursive: true });

      const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.kt'));
      for (const file of files) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }

      return cfg;
    },
  ]);
}

module.exports = (config) => withKotlinSources(withPermissions(config));
