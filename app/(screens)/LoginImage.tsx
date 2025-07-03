import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../utils/api"; // Import API methods
import CustomHeader from "@/components/CustomHeader";
import {
  getAuthData,
  getAuthValue,
  getLocValue,
  storeAuthData,
} from "@/utils/storage";
import { formDataToObject } from "@/helper";
import * as Device from "expo-device";
import * as Application from "expo-application";

const LoginImage = () => {
  const [image, setImage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [promoterId, setPromoterId] = useState("");
  const [activityCode, setActivityCode] = useState("");
  const [imageReady, setImageReady] = useState<boolean>(false); // Track if image is ready
  const [deviceIdentifier, setDeviceIdentifier] = useState("");

  const router = useRouter();

  // Get device identifier
  const getDeviceIdentifier = async () => {
    try {
      let identifier = "";
      if (Platform.OS === "android") {
        identifier = (await Application.getAndroidId()) || "";
      } else if (Platform.OS === "ios") {
        identifier = (await Application.getIosIdForVendorAsync()) || "";
      }
      if (identifier) {
        setDeviceIdentifier(identifier);
        return identifier;
      }
      return "";
    } catch (error) {
      console.error("Error getting device identifier:", error);
      return "";
    }
  };

  const fetchStoredData = async () => {
    const storedPromoterId = await getAuthValue("promoterId");
    const storedActivityCode = await getLocValue("activityCode");
    setPromoterId(storedPromoterId);
    setActivityCode(storedActivityCode);
  };

  useEffect(() => {
    fetchStoredData();
  }, []);

  // Handle taking a photo with front camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Error", "Camera permission is required to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
      cameraType: ImagePicker.CameraType.front, // Force front camera
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageReady(false); // Reset image ready state
      setImage(result.assets[0].uri);

      // Add a small delay to ensure image is properly loaded
      setTimeout(() => {
        setImageReady(true);
      }, 500);
    }
  };

  // Validate image URI before upload
  const validateImageUri = async (uri: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Image.getSize(
        uri,
        () => resolve(true),
        () => resolve(false)
      );
      setTimeout(() => resolve(true), 1000);
    });
  };

  // Handle submit (uploads image)
  const handleSubmit = async () => {
    if (!image) {
      Alert.alert("Error", "Please take a login Image.");
      return;
    }

    if (!imageReady) {
      Alert.alert(
        "Please wait",
        "Image is still being processed. Please wait a moment and try again."
      );
      return;
    }

    setIsLoading(true);

    try {
      // Validate image URI before proceeding
      const isValidImage = await validateImageUri(image);
      if (!isValidImage) {
        Alert.alert("Error", "Invalid image. Please take a new photo.");
        setIsLoading(false);
        return;
      }

      const formData = new FormData();

      // Create a more robust file object
      const imageFile = {
        uri: image,
        name: `login_photo_${Date.now()}.jpg`,
        type: "image/jpeg",
      };

      formData.append("image", imageFile as any);
      formData.append("promoterId", promoterId);
      formData.append("activityCode", activityCode);
      if (Device.manufacturer && Device.modelName) {
        const deviceInfo = `${Device.manufacturer}, ${Device.modelName} (${deviceIdentifier})`;
        formData.append("deviceInfo", deviceInfo);
      }

      formDataToObject(formData, "loginImage");

      const response = await api.loginImage(formData);

      console.log("Login Image Response:", {
        success: response.success,
        message: response.message,
        data: response.newImage.id,
      });

      if (response.success) {
        // Get existing auth data
        const existingAuthData = await getAuthData();

        // Store new auth data with sessionId while preserving existing data
        const updatedAuthData = {
          ...existingAuthData,
          loginImageId: response.newImage.id,
        };

        console.log("updatedAuthData---", updatedAuthData);

        await storeAuthData(updatedAuthData);

        Alert.alert("Success", "Login Image uploaded successfully!");
        router.replace("/dashboard");
      } else {
        Alert.alert(
          "Error",
          response.message || "Failed to upload login Image."
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AppUpdateRequiredError") {
        return;
      }
      console.error("Login Image Error:", error);

      // More specific error handling
      if (
        error instanceof Error &&
        error.message?.includes("Network request failed")
      ) {
        Alert.alert(
          "Network Error",
          "Please check your internet connection and try again. If the image was just taken, please wait a moment before submitting."
        );
      } else {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Something went wrong."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setImage("");
    setImageReady(false);
  };

  // Handle image load success
  const handleImageLoad = () => {
    setImageReady(true);
  };

  // Handle image load error
  const handleImageError = () => {
    console.log("Image failed to load");
    setImageReady(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* <CustomHeader
        showOnlyLogout={true}
        showHome={false}
        className="border-b border-gray-200"
      /> */}
      {/* Main Card */}
      <View className="bg-white mx-4 my-4 rounded-3xl shadow-md p-6">
        <View className="mx-4 my-4 rounded-3xl p-6">
          {/* Header */}
          <Text className="text-2xl font-bold text-center text-primary mb-6">
            Login Image
          </Text>

          {/* Image Preview Section */}
          <View className="items-center justify-center mb-6">
            {image ? (
              <View className="relative">
                <Image
                  source={{ uri: image }}
                  className="w-64 h-64 rounded-xl border border-gray-300"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
                {/* Loading indicator while image is processing */}
                {!imageReady && (
                  <View className="absolute inset-0 bg-black bg-opacity-30 rounded-xl items-center justify-center">
                    <ActivityIndicator color="#fff" size="small" />
                    <Text className="text-white text-sm mt-2">
                      Processing...
                    </Text>
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
            disabled={isLoading}
          >
            <Ionicons name="camera" size={24} color="#fff" />
            <Text className="text-white text-lg font-semibold">
              {image ? "Retake Photo" : "Take Login Photo"}
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading || !image || !imageReady}
            className={`w-full py-4 rounded-xl ${
              image && imageReady ? "bg-primary" : "bg-gray-300"
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
                {!imageReady && image ? "Processing Image..." : "Submit"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Help text */}
          {image && !imageReady && (
            <Text className="text-center text-gray-500 text-sm mt-2">
              Please wait for the image to finish processing before submitting
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginImage;
