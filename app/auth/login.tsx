import ScreenWrapper from "@/components/ScreenWrapper";
import { api } from "@/utils/api";
import { getAuthValue, getLocValue } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const LoginScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  //Storage Data state
  const [token, setToken] = useState<string | null>(null);
  const [promoterId, setPromoterId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [activityLocId, setActivityLocId] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [loginImageId, setLoginImageId] = useState<string | undefined>();

  const router = useRouter();

  const { height: screenHeight } = Dimensions.get("window");

  // Get stored values from authStorage
  const getStoredData = async () => {
    try {
      const storedToken = await getAuthValue("token");
      const storedPromoterId = await getAuthValue("promoterId");
      const storedRole = await getAuthValue("role");
      const storedCityId = await getAuthValue("cityId");
      const storedLoginImageId = await getAuthValue("loginImageId");
      const storedActivityLocId = await getLocValue("activityLocId");

      if (storedToken) setToken(storedToken);
      if (storedPromoterId) setPromoterId(storedPromoterId);
      if (storedRole) setRole(storedRole);
      if (storedActivityLocId) setActivityLocId(storedActivityLocId);
      if (storedLoginImageId) setLoginImageId(storedLoginImageId);
      if (storedCityId) setCityId(storedCityId);
    } catch (err) {
      // setError("Failed to fetch data from storage.");
      console.log("Error: ", err);
    }
  };
  console.log("loginImageId---", loginImageId);

  useEffect(() => {
    getStoredData(); // Get stored values on mount
  }, []);

  useEffect(() => {
    console.log("role (login)--", role);
    if (role === "PROMOTER") {
      if (token && promoterId && !activityLocId) {
        router.replace("/auth/projectCode");
      } else if (
        token &&
        promoterId &&
        activityLocId &&
        loginImageId === undefined
      ) {
        router.replace("/LoginImage");
      } else if (token && promoterId && activityLocId && loginImageId) {
        router.replace("/dashboard");
      }
    } else if (role === "ALLIANCE_MANAGER") {
      router.replace("/(screens)/MainScreen");
    }
  }, [token, promoterId, activityLocId, loginImageId]);

  // console.log("token", token);
  // console.log("promoterId", promoterId);
  // console.log("activityLocId", activityLocId);
  // console.log("cityId", cityId);

  // Handle sending OTP
  const sendOTP = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert(
        "Invalid Number",
        "Please enter a valid 10-digit mobile number."
      );

      // Toast.show({
      //   type: "error",
      //   text1: "Invalid Number",
      //   text2: "Please enter a valid 10-digit mobile number.",
      // });
      return;
    }

    setIsLoading(true);

    api
      .sendOTP({ phone: phoneNumber })
      .then((response) => {
        console.log("verifyOTP response---", response);
        if (response.success) {
          router.replace({
            pathname: "/auth/otp",
            params: { phoneNumber },
          });
        } else {
          Alert.alert("Error", response.message || "Failed to send OTP.");
        }
      })
      .catch((error) => {
        if (error.name === "AppUpdateRequiredError") {
          return;
        }
        // Check if the error message indicates user not found
        if (error.message.includes("User not found with this phone number")) {
          Alert.alert(
            "Register",
            "User not found with this phone number. Please register first."
          );
          // Toast.show({
          //   type: "error",
          //   text1: "Register",
          //   text2:
          //     "User not found with this phone number. Please register first.",
          // });
          // Redirect to signup page if user not found
          router.push({
            pathname: "/auth/signup",
            params: { phoneNumber },
          });
        } else {
          Alert.alert("Error", error.message || "Error sending OTP");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <ScreenWrapper headerProps={null} showScroll={true}>
      {/* Content Section */}
      <View className="px-6 pt-14 flex-1 justify-center">
        <View className="rounded-b-[50px] justify-center items-center mb-6">
          {/* <View className="flex-row">
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
          Welcome!
        </Text>
        <Text className="text-center text-gray-500 mb-8">
          Log in with your registered mobile number
        </Text>

        {/* Phone Number Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-600 mb-2 ml-1">
            Mobile Number
          </Text>
          <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
            <View className="pr-3 border-r border-gray-300">
              <Text className="text-lg text-gray-700 font-medium">+91</Text>
            </View>
            <TextInput
              className="flex-1 text-lg text-black ml-3"
              keyboardType="numeric"
              placeholder="10-digit number"
              placeholderTextColor="#A0A0A0"
              maxLength={10}
              value={phoneNumber}
              onChangeText={
                (text) => setPhoneNumber(text.replace(/[^0-9]/g, "")) // Ensure only numbers
              }
            />
            {phoneNumber.length > 0 && (
              <TouchableOpacity onPress={() => setPhoneNumber("")}>
                <Ionicons name="close-circle" size={22} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Send OTP Button */}
        <TouchableOpacity
          className={`rounded-xl py-4 shadow-md ${
            phoneNumber.length === 10
              ? "bg-primary active:bg-primary"
              : "bg-gray-300"
          }`}
          onPress={sendOTP}
          disabled={phoneNumber.length !== 10 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-center text-lg font-semibold">
              Send OTP
            </Text>
          )}
        </TouchableOpacity>

        {/* Sign Up Button */}
        <TouchableOpacity
          className="mt-2 py-4 bg-white"
          onPress={() =>
            router.push({
              pathname: "/auth/signup",
              params: { phoneNumber },
            })
          }
        >
          <Text className="text-primary text-center text-lg font-semibold">
            Not registered? Sign up now
          </Text>
        </TouchableOpacity>

        {/* Progress Indicator */}
        <View className="flex-row justify-center mt-10 mb-6">
          <View className="flex-row items-center space-x-2">
            <View className="h-2 w-8 rounded-full bg-primary" />
            <View className="h-2 w-8 rounded-full bg-gray-300" />
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
    </ScreenWrapper>
  );
};

export default LoginScreen;
