import { AppUpdateRequiredError } from "@/utils/appUpdateError";
import { clearAuthData, clearLocData } from "@/utils/storage";
import { router } from "expo-router";
import { Alert, Linking } from "react-native";

async function logoutAndRedirect() {
  await clearAuthData();
  await clearLocData();
  router.replace("/"); // Redirect to login page
}

export async function handleResponse(response: Response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  const message = data?.message;

  // Handle token/session invalid cases
  if (message === "Unauthorized: Invalid token") {
    await logoutAndRedirect();
    return Promise.reject(new Error("You have logged in on another device"));
  }

  if (message === "Unauthorized: Invalid session") {
    await logoutAndRedirect();
    return Promise.reject(new Error("Your session has expired"));
  }

  // Handle app update required
  if (
    typeof message === "string" &&
    message.startsWith("Please update your app to version")
  ) {
    await logoutAndRedirect();

    // Extract version from message
    const versionMatch = message.match(/version\s+([^\s]+)\s+to continue/i);
    const latestVersion = versionMatch?.[1];

    setTimeout(() => {
      Alert.alert(
        "App Update Required",
        latestVersion
          ? `A newer version (${latestVersion}) of the app is available. Please update to continue.`
          : "A newer version of the app is available. Please update to continue.",
        [
          {
            text: "Update Now",
            onPress: () => {
              Linking.openURL(
                "https://play.google.com/store/apps/details?id=com.brandtouchindia.cynqorg"
              );
            },
          },
        ],
        { cancelable: false }
      );
    }, 100);

    return Promise.reject(new AppUpdateRequiredError(latestVersion));
  }

  // Handle other error cases
  if (!response.ok) {
    if (data?.success === false) return data;
    return Promise.reject(new Error(message || "Something went wrong"));
  }

  return data;
}
