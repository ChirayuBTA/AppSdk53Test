import CustomHeader from "@/components/CustomHeader";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform, SafeAreaView, StatusBar, View } from "react-native";
import { WebView } from "react-native-webview";

const TermsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const role = params.role as string;

  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  return (
    <SafeAreaView
      className="flex-1 bg-gray-100"
      style={{ paddingTop: statusBarHeight }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <CustomHeader isLegalScreen={true} />
      <View style={{ flex: 1 }}>
        {role === "ALLIANCE_MANAGER" ? (
          <WebView
            source={{ uri: "https://cynq.in/co/terms-and-conditions" }}
          />
        ) : (
          <WebView source={{ uri: "https://cynq.in/terms-and-conditions" }} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default TermsScreen;
