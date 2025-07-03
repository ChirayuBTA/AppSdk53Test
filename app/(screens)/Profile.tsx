// app/auth/profile.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getAuthValue } from "@/utils/storage";
import Constants from "expo-constants";
import CustomHeader from "@/components/CustomHeader";

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  address: string;
  panNumber: string;
  aadharNumber: string;
  panCardImage: string | null;
  aadharCardImage: string | null;
  createdAt: string;
}

// Mock API implementation with dummy data
const mockApi = {
  getUserProfile: async (token: string | null) => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Return dummy data
    return {
      success: true,
      user: {
        id: "usr_12345",
        name: "Rahul Sharma",
        phone: "9876543210",
        address: "123, Green Park Colony, Sector 18, New Delhi - 110001",
        panNumber: "ABCPD1234F",
        aadharNumber: "1234 5678 9012",
        panCardImage: null, // Set to null for testing no image scenario
        aadharCardImage: null, // Set to null for testing no image scenario
        createdAt: "2023-11-15T10:30:00Z",
      },
    };
  },
};

export default function ProfileScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const animatedHeight = new Animated.Value(0);

  // Get status bar height
  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  useEffect(() => {
    const fetchAuthData = async () => {
      try {
        const storedToken = await getAuthValue("token");
        setToken(storedToken);
      } catch (err) {
        console.log("Error fetching auth data:", err);
      }
    };

    fetchAuthData();
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      // For testing: If no token, still fetch profile after a short delay
      const timer = setTimeout(() => {
        fetchUserProfile();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [token]);

  // Animation for expanding/collapsing documents section
  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: documentsExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [documentsExpanded]);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      // Use the mock API instead of the real one
      const userData = await mockApi.getUserProfile(token);
      if (userData.success && userData.user) {
        setProfile(userData.user);
      } else {
        Alert.alert("Error", "Failed to load profile data");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AppUpdateRequiredError") {
        return;
      }
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDocumentsSection = () => {
    setDocumentsExpanded(!documentsExpanded);
  };

  const handleContinue = () => {
    // Use the navigation API correctly
    console.log("Clicked Continue");
    // router.replace("/(tabs)/location");
  };

  const navigateToLogin = () => {
    router.replace("/auth/login");
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0f766e" />
        <Text className="mt-4 text-gray-600 font-medium">
          Loading your profile...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-6">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text className="text-xl font-bold mt-4 text-center">
          Profile Not Found
        </Text>
        <Text className="text-gray-600 text-center mt-2">
          We couldn't load your profile information.
        </Text>
        <TouchableOpacity
          className="mt-6 bg-primary py-3 px-6 rounded-xl"
          onPress={navigateToLogin}
        >
          <Text className="text-white font-semibold">Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      style={{ paddingTop: statusBarHeight }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <CustomHeader />

      <View className="bg-white mb-4 shadow-sm">
        <View className="items-center mb-4">
          <View className="bg-white p-1 rounded-full shadow-md">
            <View className="bg-primary w-24 h-24 rounded-full justify-center items-center">
              <Text className="text-3xl font-bold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text className="text-2xl font-bold mt-3">{profile.name}</Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="call-outline" size={14} color="#666" />
            <Text className="text-gray-600 ml-1">+91 {profile.phone}</Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text className="text-xs text-gray-500 ml-1">
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Personal Information Card */}
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm mb-6">
          <View className="bg-primary/10 px-4 py-3 border-l-4 border-primary">
            <Text className="text-primary font-bold text-lg">
              Personal Information
            </Text>
          </View>

          <View className="p-4">
            <View className="mb-5">
              <View className="flex-row items-center mb-1">
                <MaterialCommunityIcons
                  name="home-outline"
                  size={18}
                  color="#666"
                />
                <Text className="text-gray-500 ml-2 font-medium">Address</Text>
              </View>
              <Text className="text-gray-800 ml-6">{profile.address}</Text>
            </View>

            <View className="mb-5">
              <View className="flex-row items-center mb-1">
                <MaterialCommunityIcons
                  name="card-account-details-outline"
                  size={18}
                  color="#666"
                />
                <Text className="text-gray-500 ml-2 font-medium">
                  PAN Number
                </Text>
              </View>
              <Text className="text-gray-800 ml-6">{profile.panNumber}</Text>
            </View>

            <View>
              <View className="flex-row items-center mb-1">
                <MaterialCommunityIcons
                  name="card-bulleted-outline"
                  size={18}
                  color="#666"
                />
                <Text className="text-gray-500 ml-2 font-medium">
                  Aadhar Number
                </Text>
              </View>
              <Text className="text-gray-800 ml-6">
                XXXX XXXX {profile.aadharNumber.slice(-4)}
              </Text>
            </View>
          </View>
        </View>

        {/* Documents Card - Collapsible */}
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm mb-6">
          {/* Header with toggle button */}
          <TouchableOpacity
            onPress={toggleDocumentsSection}
            className="bg-primary/10 px-4 py-3 border-l-4 border-primary flex-row justify-between items-center"
          >
            <Text className="text-primary font-bold text-lg">
              Your Documents
            </Text>
            <Ionicons
              name={documentsExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color="#0f766e"
            />
          </TouchableOpacity>

          {/* Animated collapsible content */}
          <Animated.View
            style={{
              height: animatedHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500], // Adjust based on your content height
              }),
              overflow: "hidden",
            }}
          >
            <View className="p-4">
              {/* PAN Card */}
              <Text className="text-base font-medium mb-2 text-gray-700">
                PAN Card
              </Text>
              <View className="bg-gray-100 rounded-xl overflow-hidden mb-5 border border-gray-200">
                {profile.panCardImage ? (
                  <Image
                    source={{ uri: profile.panCardImage }}
                    className="w-full h-48"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-48 justify-center items-center">
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={48}
                      color="#9ca3af"
                    />
                    <Text className="text-gray-500 mt-2">
                      No image available
                    </Text>
                    <TouchableOpacity className="mt-3 bg-primary/20 px-4 py-2 rounded-full">
                      <Text className="text-primary font-medium">
                        Upload Document
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Aadhar Card */}
              <Text className="text-base font-medium mb-2 text-gray-700">
                Aadhar Card
              </Text>
              <View className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                {profile.aadharCardImage ? (
                  <Image
                    source={{ uri: profile.aadharCardImage }}
                    className="w-full h-48"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-48 justify-center items-center">
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={48}
                      color="#9ca3af"
                    />
                    <Text className="text-gray-500 mt-2">
                      No image available
                    </Text>
                    <TouchableOpacity className="mt-3 bg-primary/20 px-4 py-2 rounded-full">
                      <Text className="text-primary font-medium">
                        Upload Document
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
