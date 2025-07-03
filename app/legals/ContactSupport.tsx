import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StatusBar,
  SafeAreaView,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CustomHeader from "@/components/CustomHeader";
import Constants from "expo-constants";

const ContactSupportScreen = () => {
  const router = useRouter();

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
        {/* <View className="flex-row items-center px-4 py-3 bg-white shadow">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="ml-4 text-lg font-semibold">Contact Support</Text>
        </View> */}
        <WebView source={{ uri: "https://cynq.in/support" }} />
      </View>
    </SafeAreaView>
  );
};

export default ContactSupportScreen;
