import ScreenWrapper from "@/components/ScreenWrapper";
import { formDataToObject } from "@/helper";
import { getAuthValue, getLocValue } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../utils/api"; // Import API methods

const UploadImages = () => {
  const [images, setImages] = useState<string[]>([]); // Store multiple images
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activityLocId, setActivityLocId] = useState("");
  const [activityCode, setActivityCode] = useState("");
  const [promoterId, setPromoterId] = useState("");
  const [channelActivityDetailId, setChannelActivityDetailId] = useState("");

  const router = useRouter();

  const fetchStoredData = async () => {
    const activityLocId = await getLocValue("activityLocId");
    const storedPromoterId = await getAuthValue("promoterId");
    const storedActivityCode = await getLocValue("activityCode");
    const storedChannelActivityDetailId = await getLocValue(
      "channelActivityDetailId"
    );
    setActivityLocId(activityLocId);
    setPromoterId(storedPromoterId);
    setActivityCode(storedActivityCode);
    setChannelActivityDetailId(storedChannelActivityDetailId);
  };

  useEffect(() => {
    fetchStoredData();
  }, []);

  // Handle selecting multiple images from the gallery
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access gallery is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map((asset) => asset.uri);
      setImages((prevImages) => [...prevImages, ...newImages]);
    }
  };

  // Handle taking multiple photos and appending them
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Camera permission is required to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImages((prevImages) => [...prevImages, result.assets[0].uri]);
    }
  };

  // Validate image URI
  const validateImageUri = (uri: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Image.getSize(
        uri,
        () => resolve(true),
        () => resolve(false)
      );
    });
  };

  // Handle submit (uploads images) - FIXED VERSION
  const handleSubmit = async () => {
    if (!images.length) {
      Alert.alert("Error", "Please upload at least one image.");
      return;
    }

    if (!activityLocId || !promoterId || !activityCode) {
      Alert.alert("Error", "Missing required data. Please try again.");
      return;
    }

    setIsLoading(true);

    try {
      // Validate all images first
      const imageValidations = await Promise.all(
        images.map((uri) => validateImageUri(uri))
      );

      const invalidImages = imageValidations.some((isValid) => !isValid);
      if (invalidImages) {
        Alert.alert("Error", "Some images are invalid. Please try again.");
        setIsLoading(false);
        return;
      }

      // Create FormData properly
      const formData = new FormData();

      // Append images one by one
      images.forEach((uri, index) => {
        formData.append("images", {
          uri,
          name: `photo_${Date.now()}_${index}.jpg`,
          type: "image/jpeg",
        } as any);
      });

      // Append other data
      formData.append("activityLocId", activityLocId);
      formData.append("promoterId", promoterId);
      formData.append("activityCode", activityCode);
      formData.append("channelActivityDetailId", channelActivityDetailId);

      // Add a small delay to ensure FormData is properly constructed
      await new Promise((resolve) => setTimeout(resolve, 100));

      formDataToObject(formData, "uploadImages");

      const { success, message } = await api.uploadImages(formData);

      if (success) {
        Alert.alert("Success", "Images uploaded successfully!");
        router.replace("/dashboard");
      } else {
        Alert.alert("Error", message || "Failed to upload images.");
      }
    } catch (error) {
      console.error("Upload Error:", error);
      if (error instanceof Error && error.name === "AppUpdateRequiredError") {
        return;
      }
      Alert.alert(
        "Error",
        (error instanceof Error && error.message) || "Something went wrong."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Alternative handleSubmit with retry mechanism
  const handleSubmitWithRetry = async (retryCount = 0) => {
    if (!images.length) {
      Alert.alert("Error", "Please upload at least one image.");
      return;
    }

    if (!activityLocId || !promoterId) {
      Alert.alert("Error", "Missing required data. Please try again.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();

      // Use a more robust way to create FormData
      for (let i = 0; i < images.length; i++) {
        const uri = images[i];

        // Validate image exists
        const isValid = await validateImageUri(uri);
        if (!isValid) {
          throw new Error(`Image ${i + 1} is not valid`);
        }

        formData.append("images", {
          uri,
          name: `photo_${Date.now()}_${i}.jpg`,
          type: "image/jpeg",
        } as any);
      }

      formData.append("activityLocId", activityLocId);
      formData.append("promoterId", promoterId);

      const { success, message } = await api.uploadImages(formData);

      if (success) {
        Alert.alert("Success", "Images uploaded successfully!");
        router.replace("/dashboard");
      } else {
        Alert.alert("Error", message || "Failed to upload images.");
      }
    } catch (error) {
      console.error("Upload Error:", error);
      if (error instanceof Error && error.name === "AppUpdateRequiredError") {
        return;
      }
      // Retry once if it's a network error and first attempt
      if (
        retryCount === 0 &&
        error instanceof Error &&
        error.message?.includes("Network request failed")
      ) {
        console.log("Retrying upload...");
        setTimeout(() => handleSubmitWithRetry(1), 1000);
        return;
      }

      Alert.alert(
        "Error",
        (error instanceof Error && error.message) || "Something went wrong."
      );
      setIsLoading(false);
    }
  };

  // Remove selected image
  const removeImage = (uri: string) => {
    setImages((prevImages) => prevImages.filter((image) => image !== uri));
  };

  return (
    <ScreenWrapper showScroll={false}>
      {/* Main Card */}
      <View className="bg-white mx-4 my-4 rounded-3xl shadow-md p-6">
        <View className="mx-4 my-4 rounded-3xl p-6">
          {/* Header */}
          <Text className="text-2xl font-bold text-center text-primary mb-6">
            Upload Event Images
          </Text>

          {/* Image Upload */}
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Select Photos
          </Text>
          <View className="flex-row gap-4 space-x-4 mb-4">
            {/* Select from Gallery */}
            <TouchableOpacity
              onPress={pickImages}
              className="flex-1 items-center justify-center bg-white border border-gray-300 rounded-xl p-4 shadow-sm"
            >
              <Ionicons name="image" size={24} color="#f89f22" />
              <Text className="text-sm text-gray-600 mt-2">Select Photos</Text>
            </TouchableOpacity>

            {/* Take a Photo */}
            <TouchableOpacity
              onPress={takePhoto}
              className="flex-1 items-center justify-center bg-white border border-gray-300 rounded-xl p-4 shadow-sm"
            >
              <Ionicons name="camera" size={24} color="#f89f22" />
              <Text className="text-sm text-gray-600 mt-2">Take Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Preview Images */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            {images.map((uri, index) => (
              <View key={index} className="relative mr-4">
                <Image
                  source={{ uri }}
                  className="w-32 h-32 rounded-xl border border-gray-300"
                />
                <TouchableOpacity
                  onPress={() => removeImage(uri)}
                  className="absolute top-0 right-0 bg-white p-1 rounded-full"
                >
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit} // Use handleSubmitWithRetry for retry mechanism
            disabled={isLoading}
            className={`w-full py-4 rounded-xl ${
              images.length > 0 ? "bg-primary" : "bg-gray-300"
            } items-center shadow-md`}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-lg font-semibold">Submit</Text>
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
    </ScreenWrapper>
  );
};

export default UploadImages;
