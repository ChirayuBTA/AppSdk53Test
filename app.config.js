const constants = require("./constants/constants.js");

export default {
  expo: {
    name: constants.APP_NAME,
    slug: constants.APP_SLUG,
    owner: constants.APP_OWNER,
    version: constants.APP_VERSION,
    orientation: "portrait",
    icon: "./assets/images/appIconLight.png",
    scheme: constants.APP_SCHEME,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          "This app requires access to your photo library.",
        NSCameraUsageDescription: "This app requires access to your camera.",
        ITSAppUsesNonExemptEncryption: false,
      },
      supportsTablet: true,
    },
    android: {
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: constants.APP_PACKAGE,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/appLogo.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/appLogo.png",
          imageWidth: 200,
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow CYNQ to use your location to add watermarks to images.",
        },
      ],
      "expo-image-picker",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "f4689342-2c59-480c-bbae-9f86ae427ace",
      },
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/f4689342-2c59-480c-bbae-9f86ae427ace",
    },
  },
};
