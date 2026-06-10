const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Required for Expo Router + Supabase + other ESM-only packages
config.resolver.unstable_enablePackageExports = true;

// Redirect all node:* built-in imports to an empty shim
// (React Native does not have Node.js built-ins)
const emptyShim = path.resolve(__dirname, 'shims/empty.js');
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('node:')) {
    return { filePath: emptyShim, type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
