import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../utils/api"; // Import API methods
import CustomHeader from "@/components/CustomHeader";
import {
  clearAuthData,
  clearLocData,
  getAuthValue,
  getLocValue,
} from "@/utils/storage";
import { formDataToObject } from "@/helper";

const LogoutImage = () => {
  const [image, setImage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageReady, setIsImageReady] = useState<boolean>(false); // Track image readiness
  const [promoterId, setPromoterId] = useState("");
  const [activityCode, setActivityCode] = useState("");
  const [loginImageId, setLoginImageId] = useState("");

  const router = useRouter();

  const fetchAuthData = async () => {
    const storedPromoterId = await getAuthValue("promoterId");
    const storedLoginImageId = await getAuthValue("loginImageId");
    const storedActivityCode = await getLocValue("activityCode");
    setPromoterId(storedPromoterId);
    setLoginImageId(storedLoginImageId);
    setActivityCode(storedActivityCode);
  };

  useEffect(() => {
    fetchAuthData();
  }, []);

  // Handle taking a photo with front camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Error", "Camera permission is required to take photos.");
      return;
    }

    setIsImageReady(false); // Reset image readiness
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
      cameraType: ImagePicker.CameraType.front, // Force front camera
    });

    if (!result.canceled && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);

      // Add a small delay to ensure the image is ready
      setTimeout(() => {
        setIsImageReady(true);
      }, 500);
    }
  };

  // Validate image before upload
  const validateImage = async (uri: string): Promise<boolean> => {
    try {
      return new Promise((resolve) => {
        Image.getSize(
          uri,
          (width, height) => {
            // Image is valid if we can get its dimensions
            resolve(width > 0 && height > 0);
          },
          () => {
            // Image is invalid
            resolve(false);
          }
        );
      });
    } catch {
      return false;
    }
  };

  // Handle submit with proper error handling and retries
  const handleSubmit = async () => {
    if (!image) {
      Alert.alert("Error", "Please take a logout Image.");
      return;
    }

    if (!isImageReady) {
      Alert.alert(
        "Please Wait",
        "Image is still processing. Please wait a moment and try again."
      );
      return;
    }

    setIsLoading(true);

    try {
      // Validate image before upload
      const isValid = await validateImage(image);
      if (!isValid) {
        Alert.alert("Error", "Invalid image. Please take a new photo.");
        setIsLoading(false);
        return;
      }

      const formData = new FormData();

      // Check if we're on web or mobile
      const isWeb = typeof window !== "undefined" && window.HTMLInputElement;

      if (isWeb) {
        // For web uploads, we need to handle file input differently
        // If image is a blob URL or file object, convert it properly
        if (image.startsWith("blob:")) {
          // Convert blob URL to file
          const response = await fetch(image);
          const blob = await response.blob();
          const file = new File([blob], `logout_photo_${Date.now()}.jpg`, {
            type: blob.type || "image/jpeg",
          });
          formData.append("image", file);
        } else {
          // Handle other web cases - convert to blob if needed
          const response = await fetch(image);
          const blob = await response.blob();
          formData.append("image", blob, `logout_photo_${Date.now()}.jpg`);
        }
      } else {
        // For React Native mobile uploads
        const imageFile = {
          uri: image,
          name: `logout_photo_${Date.now()}.jpg`,
          type: "image/jpeg",
        };
        formData.append("image", imageFile as any);
      }

      formData.append("promoterId", promoterId);
      formData.append("id", loginImageId);
      formData.append("activityCode", activityCode);

      formDataToObject(formData, "logoutImage");

      // Upload with retry mechanism
      const uploadWithRetry = async (retries = 2): Promise<any> => {
        try {
          return await api.logoutImage(formData);
        } catch (error) {
          if (
            error instanceof Error &&
            error.name === "AppUpdateRequiredError"
          ) {
            return;
          }
          if (
            retries > 0 &&
            error instanceof Error &&
            error.message?.includes("Network request failed")
          ) {
            console.log(`Retrying upload... ${retries} attempts left`);
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
            return await uploadWithRetry(retries - 1);
          }
          throw error;
        }
      };

      const { success, message } = await uploadWithRetry();

      if (success) {
        Alert.alert("Success", "Logout Image uploaded successfully!");
        await clearLocData();
        await clearAuthData();
        router.replace("/");
      } else {
        Alert.alert("Error", message || "Failed to upload Logout Image.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Error",
        (error instanceof Error && error.message) ||
          "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setImage("");
    setIsImageReady(false);
  };

  // Handle image load success
  const onImageLoad = () => {
    setIsImageReady(true);
  };

  // Handle image load error
  const onImageError = () => {
    Alert.alert("Error", "Failed to load image. Please take a new photo.");
    setImage("");
    setIsImageReady(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <CustomHeader />

      {/* Main Card */}
      <View className="bg-white mx-4 my-4 rounded-3xl shadow-md p-6">
        <View className="mx-4 my-4 rounded-3xl p-6">
          {/* Header */}
          <Text className="text-2xl font-bold text-center text-primary mb-6">
            Logout Image
          </Text>

          {/* Image Preview Section */}
          <View className="items-center justify-center mb-6">
            {image ? (
              <View className="relative">
                <Image
                  source={{ uri: image }}
                  className="w-64 h-64 rounded-xl border border-gray-300"
                  onLoad={onImageLoad}
                  onError={onImageError}
                />
                {/* Loading indicator while image is processing */}
                {!isImageReady && (
                  <View className="absolute inset-0 bg-black bg-opacity-50 rounded-xl items-center justify-center">
                    <ActivityIndicator color="#fff" size="large" />
                    <Text className="text-white mt-2">Processing...</Text>
                  </View>
                )}
                {/* Cross icon to remove image */}
                <TouchableOpacity
                  onPress={removeImage}
                  className="absolute top-2 right-2 bg-white p-1 rounded-full"
                >
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="w-64 h-64 rounded-xl border-2 border-dashed border-gray-300 items-center justify-center bg-gray-50">
                <Ionicons name="person" size={64} color="#ccc" />
                <Text className="text-gray-400 mt-2">No Image selected</Text>
              </View>
            )}
          </View>

          {/* Take Photo Button */}
          <TouchableOpacity
            onPress={takePhoto}
            className="w-full py-4 rounded-xl bg-blue-500 items-center justify-center flex-row space-x-2 shadow-md mb-4"
          >
            <Ionicons name="camera" size={24} color="#fff" />
            <Text className="text-white text-lg font-semibold">
              {image ? "Retake Photo" : "Take Logout Photo"}
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading || !image || !isImageReady}
            className={`w-full py-4 rounded-xl ${
              image && isImageReady ? "bg-primary" : "bg-gray-300"
            } items-center shadow-md`}
          >
            {isLoading ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#fff" />
                <Text className="text-white text-lg font-semibold ml-2">
                  Uploading...
                </Text>
              </View>
            ) : (
              <Text className="text-white text-lg font-semibold">
                {!isImageReady && image ? "Processing Image..." : "Submit"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-full py-4 rounded-xl bg-white border border-gray-300 items-center mt-4 shadow-sm"
          >
            <Text className="text-gray-700 text-lg font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LogoutImage;
