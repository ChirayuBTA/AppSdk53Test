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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/utils/api"; // Import API for OTP verification
import {
  getAuthValue,
  getLocValue,
  storeAuthData,
  storeLocData,
} from "@/utils/storage";

const OtpScreen = () => {
  const { phoneNumber } = useLocalSearchParams();
  const [otp, setOtp] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(120);
  //Storage Data state
  const [token, setToken] = useState<string | null>(null);
  const [promoterId, setPromoterId] = useState<string | null>(null);
  const [activityLocId, setActivityLocId] = useState<string | null>(null);
  const router = useRouter();
  // Get stored values from authStorage
  const getStoredData = async () => {
    try {
      const storedToken = await getAuthValue("token");
      const storedPromoterId = await getAuthValue("promoterId");
      const storedActivityLocId = await getLocValue("activityLocId");

      if (storedToken) setToken(storedToken);
      if (storedPromoterId) setPromoterId(storedPromoterId);
      if (storedActivityLocId) setActivityLocId(storedActivityLocId);
    } catch (err) {
      // setError("Failed to fetch data from storage.");
      console.log("Error: ", err);
    }
  };

  useEffect(() => {
    getStoredData(); // Get stored values on mount
  }, []);

  useEffect(() => {
    if (token && promoterId && !activityLocId) {
      router.replace("/auth/projectCode");
    } else if (token && promoterId && activityLocId) {
      router.replace("/dashboard");
    }
  }, [token, promoterId, activityLocId]);

  const phone = Array.isArray(phoneNumber) ? phoneNumber[0] : phoneNumber;

  // Countdown Timer for Resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Handle OTP verification
  const verifyOTP = () => {
    if (otp.length !== 6) {
      return Alert.alert("Invalid OTP", "Please enter a valid 6-digit OTP.");
    }

    setIsLoading(true);

    api
      .verifyOTP({ phone, otp })
      .then(async (response) => {
        console.log("verifyOTP response---", response);
        if (!response.success) {
          return Alert.alert("Error", response.message || "Invalid OTP");
        }
        console.log("response---", response.user.logoutImageExists);

        if (response.user.logoutImageExists == false) {
          Alert.alert(
            "Notice",
            "You missed uploading the logout image for your last activity. Please contact your supervisor."
          );
        }

        const authData = {
          // projectId: response.user.projectIds[0],
          // brandId: response.user.brandIds[0],
          userId: response.user.id,
          promoterId: response?.user?.promoterId,
          promotorPhone: phone,
          // vendorId: response.user.vendorId,
          token: response.token,
          role: response.user.role,
          // cityId: response.user.cityId,
        };

        const authStored = await storeAuthData(authData);

        console.log("Auth data stored successfully:", authStored, authData);
        // router.replace("/location");
        response.user.role === "PROMOTER"
          ? router.replace({
              pathname: "/auth/projectCode",
              params: { phoneNumber },
            })
          : router.replace({ pathname: "/(screens)/MainDashboard" });
      })
      .catch((error) => {
        if (error.name === "AppUpdateRequiredError") {
          return;
        }
        Alert.alert(
          "Error",
          error.message || "Failed to verify OTP. Please try again."
        );
      })
      .finally(() => setIsLoading(false));
  };

  const resendOTP = () => {
    if (resendTimer !== 0) return;
    if (phone.length !== 10) {
      return Alert.alert(
        "Invalid Number",
        "Please enter a valid 10-digit mobile number."
      );
    }

    setResendTimer(120);
    setIsLoading(true);

    api
      .sendOTP({ phone })
      .then((response) => {
        Alert.alert(
          response.success ? "OTP Sent" : "Error",
          response.message || "Failed to resend OTP."
        );
      })
      .catch((error) => {
        if (error.name === "AppUpdateRequiredError") {
          return;
        }
        // console.error("Error resending OTP:", error);
        Alert.alert(
          "Error",
          error.message || "Something went wrong. Please try again."
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
            {/* <View className="flex-row ">
              <Text
                className="text-[38px] font-[900] tracking-tighter"
                // style={{ fontSize: 40, fontWeight: "bold" }}
              >
                DIRECT
              </Text>
              <Text
                className="text-[38px] text-red-600 font-[900] tracking-tighter"
                // style={{ fontSize: 40, fontWeight: "bold", color: "red" }}
              >
                X
              </Text>
            </View> */}
            <Image
              source={require("@/assets/images/appLogo.png")}
              style={{ width: 120, height: 40, resizeMode: "contain" }}
            />
          </View>

          <Text className="text-2xl font-bold text-center mb-2 text-gray-800">
            Enter OTP
          </Text>
          <Text className="text-center text-gray-500 mb-8">
            We've sent a 6-digit OTP to{" "}
            <Text className="text-black font-medium">+91 {phoneNumber}</Text>
          </Text>

          {/* OTP Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-600 mb-2 ml-1">
              OTP Code
            </Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
              <TextInput
                className="flex-1 text-lg text-black tracking-widest text-center"
                keyboardType="numeric"
                maxLength={6}
                placeholder="Enter OTP"
                placeholderTextColor="#A0A0A0"
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ""))}
                autoFocus
              />
              {otp.length > 0 && (
                <TouchableOpacity onPress={() => setOtp("")}>
                  <Ionicons name="close-circle" size={22} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Verify OTP Button */}
          <TouchableOpacity
            className={`rounded-xl py-4 shadow-md ${
              otp.length === 6 ? "bg-primary active:bg-primary" : "bg-gray-300"
            }`}
            onPress={verifyOTP}
            disabled={otp.length !== 6 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white text-center text-lg font-semibold">
                Verify OTP
              </Text>
            )}
          </TouchableOpacity>

          {/* Resend OTP Button */}
          <View className="flex-row justify-center mt-6">
            {resendTimer === 0 ? (
              <TouchableOpacity onPress={resendOTP}>
                <Text className="text-primary font-medium text-sm">
                  Resend OTP
                </Text>
              </TouchableOpacity>
            ) : (
              <Text className="text-gray-500 text-sm">
                Resend OTP in{" "}
                <Text className="text-black font-medium">
                  {resendTimer >= 60
                    ? `${Math.floor(resendTimer / 60)}:${String(
                        resendTimer % 60
                      ).padStart(2, "0")} m`
                    : `${resendTimer} s`}
                </Text>
              </Text>
            )}
          </View>

          {/* Progress Indicator */}
          <View className="flex-row justify-center mt-10 mb-6">
            <View className="flex-row items-center space-x-2">
              <View className="h-2 w-8 rounded-full bg-primary" />
              <View className="h-2 w-8 rounded-full bg-primary" />
              <View className="h-2 w-8 rounded-full bg-gray-300" />
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
              onPress={() => router.push("/legals/TermsScreen")} // Route to Terms page
            >
              Terms of Services
            </Text>{" "}
            &{" "}
            <Text
              className="text-primary font-medium"
              onPress={() => router.push("/legals/PrivacyAndPolicyScreen")} // You can create a similar Privacy screen
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

export default OtpScreen;
