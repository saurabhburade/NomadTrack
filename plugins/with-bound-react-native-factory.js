const { withAppDelegate } = require("expo/config-plugins");

const factoryAssignment = "    reactNativeFactory = factory";
const factoryBinding = "    bindReactNativeFactory(factory)";

function withBoundReactNativeFactory(config) {
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== "swift") {
      return mod;
    }

    if (!mod.modResults.contents.includes(factoryBinding)) {
      mod.modResults.contents = mod.modResults.contents.replace(factoryAssignment, `${factoryAssignment}\n${factoryBinding}`);
    }

    return mod;
  });
}

module.exports = withBoundReactNativeFactory;
