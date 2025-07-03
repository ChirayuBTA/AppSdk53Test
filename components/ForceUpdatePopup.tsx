import React, { useEffect, useState } from "react";
import { Modal, Text, View, Pressable, Linking } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";

const CURRENT_VERSION = Application.nativeApplicationVersion || "1.0.0";

const compareVersions = (v1: string, v2: string): number => {
  const a = v1.split(".").map(Number);
  const b = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const ForceUpdatePopup = () => {
  const [showModal, setShowModal] = useState(false);
  const [updateUrl, setUpdateUrl] = useState("");

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch("https://yourdomain.com/app-version.json");
        const data = await response.json();
        if (compareVersions(CURRENT_VERSION, data.minimum_version) < 0) {
          setUpdateUrl(data.update_url);
          setShowModal(true);
        }
      } catch (e) {
        console.error("Version check failed:", e);
      }
    };

    checkVersion();
  }, []);

  if (!showModal) return null;

  return (
    <Modal transparent animationType="fade" visible={showModal}>
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-md">
          <Text className="text-lg font-bold mb-4 text-center">
            Update Required
          </Text>
          <Text className="text-base text-gray-600 mb-6 text-center">
            A new version of the app is required to continue using it.
          </Text>
          <Pressable
            className="bg-blue-600 px-4 py-3 rounded-xl"
            onPress={() => Linking.openURL(updateUrl)}
          >
            <Text className="text-white text-center font-semibold">
              Update Now
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default ForceUpdatePopup;
