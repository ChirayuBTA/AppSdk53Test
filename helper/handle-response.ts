import { AppUpdateRequiredError } from "@/utils/appUpdateError";
import { clearAuthData, clearLocData } from "@/utils/storage";
import { router } from "expo-router";
import { Alert, Linking } from "react-native";

export async function handleResponse(response: Response) {
  return response.text().then(async (text) => {
    const data = text && JSON.parse(text);

    if (data?.message === "Unauthorized: Invalid token") {
      await clearAuthData();
      await clearLocData();
      router.replace("/"); // Redirect to login page
      // Alert.alert("Error", "You have been logged out.");
      return Promise.reject(new Error("You have logged in on another device"));
    }

    if (data?.message === "Unauthorized: Invalid session") {
      await clearAuthData();
      await clearLocData();
      router.replace("/"); // Redirect to login page
      // Alert.alert("Error", "You have been logged out.");
      return Promise.reject(new Error("Your sessions has expired"));
    }

    if (data?.message === "Please update your app to continue") {
      await clearAuthData();
      await clearLocData();

      setTimeout(() => {
        Alert.alert(
          "App Update Required",
          "A newer version of the app is available. Please update the app to continue.",
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
      router.replace("/"); // Redirect to login page
      // Throw specific error instead of generic
      return Promise.reject(new AppUpdateRequiredError());
    }

    if (!response.ok && data?.success === false) {
      return data;
    }

    if (!response.ok) {
      return Promise.reject(new Error(data?.message || "Something went wrong"));
    }

    return data;
  });
}
