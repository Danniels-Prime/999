const {
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs   = require('fs');

/* ─── All Android permissions the app needs ─── */
const PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  'android.permission.WAKE_LOCK',
  'android.permission.INTERNET',
];

/* ─── Service declarations ─── */
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
  {
    '$': {
      'android:name': '.AccessibilityReaderService',
      'android:exported': 'true',
      'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
      'android:label': '@string/accessibility_service_label',
      'android:description': '@string/accessibility_service_description',
    },
    'intent-filter': [{
      'action': [{ '$': { 'android:name': 'android.accessibilityservice.AccessibilityService' } }],
    }],
    'meta-data': [{
      '$': {
        'android:name': 'android.accessibilityservice',
        'android:resource': '@xml/accessibility_service_config',
      },
    }],
  },
];

/* ─── Boot receiver ─── */
const RECEIVERS = [
  {
    '$': {
      'android:name': '.BootReceiver',
      'android:exported': 'true',
      'android:enabled': 'true',
    },
    'intent-filter': [{
      'action': [
        { '$': { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
        { '$': { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
        { '$': { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
      ],
    }],
  },
];

/* ─── Step 1: patch AndroidManifest ─── */
function withPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const root = cfg.modResults.manifest;

    if (!root['uses-permission']) root['uses-permission'] = [];
    for (const perm of PERMISSIONS) {
      if (!root['uses-permission'].some((p) => p['$']?.['android:name'] === perm)) {
        root['uses-permission'].push({ '$': { 'android:name': perm } });
      }
    }

    const app = root.application[0];

    if (!app.service) app.service = [];
    for (const svc of SERVICES) {
      if (!app.service.some((s) => s['$']?.['android:name'] === svc['$']['android:name'])) {
        app.service.push(svc);
      }
    }

    if (!app.receiver) app.receiver = [];
    for (const rcv of RECEIVERS) {
      if (!app.receiver.some((r) => r['$']?.['android:name'] === rcv['$']['android:name'])) {
        app.receiver.push(rcv);
      }
    }

    return cfg;
  });
}

/* ─── Step 2: inject accessibility strings into strings.xml ─── */
function withAccessibilityStrings(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const valuesDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res', 'values'
      );
      fs.mkdirSync(valuesDir, { recursive: true });

      const stringsPath = path.join(valuesDir, 'strings.xml');
      let content = fs.existsSync(stringsPath)
        ? fs.readFileSync(stringsPath, 'utf8')
        : '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>';

      const insertions = [];
      if (!content.includes('accessibility_service_label')) {
        insertions.push('    <string name="accessibility_service_label">OverlayLang Accessibility</string>');
      }
      if (!content.includes('accessibility_service_description')) {
        insertions.push('    <string name="accessibility_service_description">Reads text from any app to power real-time translation and explanations</string>');
      }
      if (insertions.length > 0) {
        content = content.replace('</resources>', insertions.join('\n') + '\n</resources>');
        fs.writeFileSync(stringsPath, content);
      }

      return cfg;
    },
  ]);
}

/* ─── Step 3: copy Kotlin sources and XML configs ─── */
function withNativeSources(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const srcDir = path.join(cfg.modRequest.projectRoot, 'android-native');
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const javaDir = path.join(
        platformRoot, 'app', 'src', 'main', 'java', 'com', 'overlaylang', 'app'
      );
      const resXmlDir = path.join(
        platformRoot, 'app', 'src', 'main', 'res', 'xml'
      );

      if (!fs.existsSync(srcDir)) return cfg;

      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(resXmlDir, { recursive: true });

      for (const file of fs.readdirSync(srcDir)) {
        const src = path.join(srcDir, file);
        if (file.endsWith('.kt')) {
          fs.copyFileSync(src, path.join(javaDir, file));
        } else if (file.endsWith('.xml')) {
          fs.copyFileSync(src, path.join(resXmlDir, file));
        }
      }

      return cfg;
    },
  ]);
}

module.exports = (config) =>
  withNativeSources(withAccessibilityStrings(withPermissions(config)));
