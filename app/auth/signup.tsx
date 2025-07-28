// app/auth/signup.tsx
import ScreenWrapper from "@/components/ScreenWrapper";
import { api } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const SignupScreen = () => {
  const { phoneNumber } = useLocalSearchParams();
  const router = useRouter();
  const phone = Array.isArray(phoneNumber) ? phoneNumber[0] : phoneNumber;

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: phone || "",
    altPhone: "",
    email: "",
    // promoCode: "",
  });

  const updateFormData = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // This function checks form validity without displaying alerts
  const isFormValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!formData.name.trim()) return false;
    if (!formData.phone.trim() || !phoneRegex.test(formData.phone))
      return false;
    if (formData.email.trim() && !emailRegex.test(formData.email)) return false;
    // if (!formData.promoCode.trim()) return false;

    return true;
  };

  // This function validates and shows alerts
  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return false;
    }

    if (!formData.phone.trim() || !phoneRegex.test(formData.phone)) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return false;
    }

    // Email is optional
    if (formData.email.trim() && !emailRegex.test(formData.email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    // if (!formData.promoCode.trim()) {
    //   Alert.alert("Error", "Please enter a promo code");
    //   return false;
    // }

    // if (/\s/.test(formData.promoCode)) {
    //   Alert.alert("Error", "Promo code cannot contain spaces");
    //   return false;
    // }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("phone", formData.phone);
      formDataToSend.append("altPhone", formData.altPhone);
      formDataToSend.append("email", formData.email);
      // formDataToSend.append("promoCode", formData.promoCode);

      const response = await api.registerUser(formDataToSend);

      if (response.success) {
        // Redirect to OTP screen
        router.replace({
          pathname: "/auth/otp",
          params: { phoneNumber: formData.phone },
        });
      } else {
        Alert.alert("Error", response.message || "Registration failed");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AppUpdateRequiredError") {
        return;
      }
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonActive = isFormValid();

  return (
    <ScreenWrapper headerProps={null} showScroll={true}>
      {/* Content Section */}
      <View className="px-6 pt-14 flex-1 justify-center">
        <View className="items-center mb-6">
          <Image
            source={require("@/assets/images/appLogo.png")}
            style={{ width: 120, height: 40, resizeMode: "contain" }}
          />
        </View>

        <Text className="text-2xl font-bold text-center mb-2 text-gray-800">
          Create Your Account
        </Text>
        <Text className="text-center text-gray-500 mb-8">
          Please provide your details to continue
        </Text>

        <View className="space-y-4 mb-6">
          {/* Name Input */}
          <View>
            <Text className="text-sm font-medium text-gray-600 mt-3 mb-1 ml-1">
              Full Name <Text className="text-red-600">*</Text>
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-black"
              placeholder="Enter your full name"
              placeholderTextColor="#A0A0A0"
              value={formData.name}
              onChangeText={(text) => updateFormData("name", text)}
            />
          </View>

          {/* Phone Input */}
          <View>
            <Text className="text-sm font-medium text-gray-600 mt-3 mb-1 ml-1">
              Phone Number <Text className="text-red-600">*</Text>
            </Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
              <View className="pr-3 border-r border-gray-300">
                <Text className="text-lg text-gray-700 font-medium">+91</Text>
              </View>
              <TextInput
                className="flex-1 text-lg text-black ml-3"
                placeholder="10-digit number"
                placeholderTextColor="#A0A0A0"
                value={formData.phone}
                onChangeText={(text) =>
                  updateFormData("phone", text.replace(/[^0-9]/g, ""))
                }
                keyboardType="numeric"
                maxLength={10}
              />
              {formData.phone.length > 0 && (
                <TouchableOpacity onPress={() => updateFormData("phone", "")}>
                  <Ionicons name="close-circle" size={22} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Alternate Phone Input */}
          <View>
            <Text className="text-sm font-medium text-gray-600 mt-3 mb-1 ml-1">
              Alternate Phone Number
            </Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
              <View className="pr-3 border-r border-gray-300">
                <Text className="text-lg text-gray-700 font-medium">+91</Text>
              </View>
              <TextInput
                className="flex-1 text-lg text-black ml-3"
                placeholder="10-digit number"
                placeholderTextColor="#A0A0A0"
                value={formData.altPhone}
                onChangeText={(text) =>
                  updateFormData("altPhone", text.replace(/[^0-9]/g, ""))
                }
                keyboardType="numeric"
                maxLength={10}
              />
              {formData.altPhone.length > 0 && (
                <TouchableOpacity
                  onPress={() => updateFormData("altPhone", "")}
                >
                  <Ionicons name="close-circle" size={22} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Email Input */}
          <View>
            <Text className="text-sm font-medium text-gray-600 mt-3 mb-1 ml-1">
              Email Address
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-black"
              placeholder="Enter your email address"
              placeholderTextColor="#A0A0A0"
              value={formData.email}
              onChangeText={(text) => updateFormData("email", text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Promo Code Input */}
          {/* <View>
              <Text className="text-sm font-medium text-gray-600 mt-3 mb-1 ml-1">
                Promo Code <Text className="text-red-600">*</Text>
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-black"
                placeholder="Enter your promo code"
                placeholderTextColor="#A0A0A0"
                value={formData.promoCode}
                onChangeText={(text) =>
                  updateFormData("promoCode", text.replace(/\s/g, ""))
                }
              />
            </View> */}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`rounded-xl py-4 shadow-md ${
            isButtonActive ? "bg-primary" : "bg-gray-300"
          }`}
          onPress={handleSubmit}
          disabled={!isButtonActive || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-center text-lg font-semibold">
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity
          className="mt-2 py-4  bg-white"
          onPress={() => router.replace("/auth/login")}
        >
          <Text className="text-primary text-center text-lg font-semibold">
            Already Have an account? Login
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

export default SignupScreen;
