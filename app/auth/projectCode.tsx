import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/utils/api"; // Import API for project code verification
import { getAuthValue, storeAuthData, storeLocData } from "@/utils/storage";

const ProjectCodeScreen = () => {
  // const { phoneNumber } = useLocalSearchParams();
  const [projectCode, setProjectCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [token, setToken] = useState<string>("");
  const [promoterId, setPromoterId] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  const router = useRouter();

  // const phone = Array.isArray(phoneNumber) ? phoneNumber[0] : phoneNumber;

  // Get stored authentication values
  const getStoredAuthData = async () => {
    try {
      const storedToken = await getAuthValue("token");
      const storedPromoterId = await getAuthValue("promoterId");
      const storedPhone = await getAuthValue("promotorPhone");

      if (storedToken) setToken(storedToken);
      if (storedPromoterId) setPromoterId(storedPromoterId);
      if (storedPhone) setPhone(storedPhone);
    } catch (err) {
      console.log("Error fetching auth data: ", err);
      Alert.alert("Error", "Failed to retrieve authentication data.");
    }
  };

  useEffect(() => {
    getStoredAuthData();
  }, []);

  // Verify if user is authenticated and redirect if necessary
  //   useEffect(() => {
  //     if (!token || !promoterId) {
  //       router.replace("/");
  //     }
  //   }, [token, promoterId]);

  // Handle Project Code Verification
  const verifyProjectCode = () => {
    if (projectCode.length !== 6) {
      return Alert.alert(
        "Invalid Code",
        "Please enter a valid 6-digit project code."
      );
    }

    setIsLoading(true);

    api
      .verifyPromo({
        phone: phone,
        promoCode: projectCode,
        promoterId: promoterId,
      })
      .then(async (response) => {
        if (!response.success) {
          return Alert.alert(
            "Error",
            response.message || "Invalid Project Code"
          );
        }

        const authData = {
          token,
          promoterId,
          projectId: response.promoter.projectIds[0],
          brandId: response.promoter.brandIds[0],
          vendorId: response.promoter.vendorId,
          cityId: response.promoter.cityId,
        };

        const locData = {
          activityLocId: response.promoter.activityLocId,
          activityLocName: response.promoter.activityLocName,
          activityId: response.promoter.activityId,
          activityCode: projectCode,
        };

        const authStored = await storeAuthData(authData);
        const locStored = await storeLocData(locData);

        console.log("Auth data stored successfully:", authStored, authData);
        console.log("Loc data stored successfully:", locStored, locData);
        // Navigate to location
        router.replace("/LoginImage");
      })
      .catch((error) => {
        if (error.name === "AppUpdateRequiredError") {
          return;
        }
        Alert.alert(
          "Error",
          error.message || "Failed to verify project code. Please try again."
        );
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Content Section */}
        <View className="px-6 pt-14 flex-1 justify-center">
          <View className="rounded-b-[50px] justify-center items-center mb-6">
            <Image
              source={require("@/assets/images/appLogo.png")}
              style={{ width: 120, height: 40, resizeMode: "contain" }}
            />
          </View>

          <Text className="text-2xl font-bold text-center mb-2 text-gray-800">
            Enter Project Code
          </Text>
          <Text className="text-center text-gray-500 mb-8">
            Please enter the 6-digit project code provided to you
          </Text>

          {/* Project Code Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-600 mb-2 ml-1">
              Project Code
            </Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
              <TextInput
                className="flex-1 text-lg text-black tracking-widest text-center"
                keyboardType="numeric"
                maxLength={6}
                placeholder="Enter Project Code"
                placeholderTextColor="#A0A0A0"
                value={projectCode}
                onChangeText={(text) =>
                  setProjectCode(text.replace(/[^0-9]/g, ""))
                }
                autoFocus
              />
              {projectCode.length > 0 && (
                <TouchableOpacity onPress={() => setProjectCode("")}>
                  <Ionicons name="close-circle" size={22} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Verify Project Code Button */}
          <TouchableOpacity
            className={`rounded-xl py-4 shadow-md ${
              projectCode.length === 6
                ? "bg-primary active:bg-primary"
                : "bg-gray-300"
            }`}
            onPress={verifyProjectCode}
            disabled={projectCode.length !== 6 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white text-center text-lg font-semibold">
                Verify Project Code
              </Text>
            )}
          </TouchableOpacity>

          {/* Progress Indicator */}
          <View className="flex-row justify-center mt-10 mb-6">
            <View className="flex-row items-center space-x-2">
              <View className="h-2 w-8 rounded-full bg-primary" />
              <View className="h-2 w-8 rounded-full bg-primary" />
              <View className="h-2 w-8 rounded-full bg-primary" />
            </View>
          </View>
        </View>

        {/* Footer Section */}
        <View className="px-6 pb-8">
          {/* Terms & Policy */}
          <Text className="text-xs text-gray-500 text-center mb-6">
            By continuing, you agree to our{" "}
            <Text
              className="text-primary font-medium"
              onPress={() => router.push("/legals/TermsScreen")}
            >
              Terms of Services
            </Text>{" "}
            &{" "}
            <Text
              className="text-primary font-medium"
              onPress={() => router.push("/legals/PrivacyAndPolicyScreen")}
            >
              Privacy Policy
            </Text>
          </Text>

          {/* Support */}
          <TouchableOpacity
            className="flex-row justify-center items-center py-2"
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle-outline" size={18} color="#6b7280" />
            <Text className="text-sm text-gray-500 ml-1">
              Need help?{" "}
              <Text
                className="text-primary font-medium"
                onPress={() => router.push("/legals/ContactSupport")}
              >
                Contact Support
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ProjectCodeScreen;
