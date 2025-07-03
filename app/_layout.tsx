import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ForceUpdatePopup from "@/components/ForceUpdatePopup";
import IOSOnlyWrapper from "@/components/iOSOnlyWrapper";
import Toast from "react-native-toast-message";
import { CustomToast } from "@/components/CustomToast";

export default function Layout() {
  return (
    <IOSOnlyWrapper>
      <SafeAreaProvider>
        <AuthProvider>
          {/* <ForceUpdatePopup /> */}
          {/* Stack with all screens */}
          <Stack
            screenOptions={{
              headerShown: false, // Hide default headers
              // header: () => <CustomHeader />,
            }}
          />
          {/* Status bar configuration */}
          <StatusBar style="dark" backgroundColor="#ffffff" />
          <Toast
            config={{
              success: (props) => <CustomToast {...props} type="success" />,
              error: (props) => <CustomToast {...props} type="error" />,
            }}
          />
        </AuthProvider>
      </SafeAreaProvider>
    </IOSOnlyWrapper>
  );
}
