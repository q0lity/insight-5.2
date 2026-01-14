const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = withNativeWind(getDefaultConfig(projectRoot), { input: "./global.css" });

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = false;
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "expo-router": path.resolve(workspaceRoot, "node_modules/expo-router"),
};

module.exports = config;
