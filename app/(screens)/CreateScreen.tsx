import LocationPermissionModal from "@/components/LocationPermissionButton";
import ScreenWrapper from "@/components/ScreenWrapper";
import { formDataToObject } from "@/helper";
import { getAuthValue, getLocValue } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ViewShot from "react-native-view-shot";
import { api } from "../../utils/api"; // Import API methods

const { width } = Dimensions.get("window");
const PREVIEW_SIZE = width / 2 - 32; // Smaller for preview

const CreateScreen = () => {
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [entryType, setEntryType] = useState<string>(""); // Changed to string instead of array
  const [images, setImages] = useState<string[]>([]); // Original images
  const [imageDetails, setImageDetails] = useState<
    Array<{ width: number; height: number }>
  >([]);
  const [processedImages, setProcessedImages] = useState<string[]>([]); // Images with watermark
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
    street?: string;
    district?: string;
    region?: string;
    subregion?: string;
    country?: string;
    area?: string;
    city?: string;
    postalCode?: string;
    formattedAddress?: string;
  } | null>(null);
  const [timestamp, setTimestamp] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [locationPermissionGranted, setLocationPermissionGranted] =
    useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [deviceIdentifier, setDeviceIdentifier] = useState<string>("");

  // Add new state to track image processing
  const [imagesReady, setImagesReady] = useState<boolean>(true);

  const viewShotRefs = useRef<Array<ViewShot | null>>([]);

  const [storageData, setStorageData] = useState<{
    activityId: string;
    activityLocId: string;
    activityCode: string;
    promoterId: string;
    vendorId: string;
    projectId: string;
    brandId: string;
  }>({
    activityId: "",
    activityLocId: "",
    activityCode: "",
    promoterId: "",
    vendorId: "",
    projectId: "",
    brandId: "",
  });

  const router = useRouter();

  // Set entry type - modified to handle string value
  const toggleEntryType = (type: string) => {
    setEntryType((prevType) => {
      if (type === "order" && prevType === "signup") {
        return "both";
      } else if (type === "signup" && prevType === "order") {
        return "both";
      } else if (type === "order" && prevType === "both") {
        return "signup";
      } else if (type === "signup" && prevType === "both") {
        return "order";
      } else if (type === prevType) {
        return ""; // Unselect if clicking the same one
      } else {
        return type;
      }
    });
  };

  // Check if a specific entry type is selected
  const isEntryTypeSelected = (type: string): boolean => {
    if (type === "order") {
      return entryType === "order" || entryType === "both";
    } else if (type === "signup") {
      return entryType === "signup" || entryType === "both";
    }
    return false;
  };

  useEffect(() => {
    console.log("entryType--", entryType);
  }, [entryType]);

  // Get a device identifier based on platform
  const getDeviceIdentifier = async () => {
    try {
      let identifier = "";

      if (Platform.OS === "android") {
        // Use Android ID as a fallback (not the IMEI, but a stable device ID)
        identifier = (await Application.getAndroidId()) || "";
      } else if (Platform.OS === "ios") {
        // Use identifierForVendor on iOS (this is not IMEI)
        identifier = (await Application.getIosIdForVendorAsync()) || "";
      }

      if (identifier) {
        console.log("Device identifier obtained:", identifier);
        setDeviceIdentifier(identifier);
        return identifier;
      } else {
        console.log("Could not get device identifier");
        return "";
      }
    } catch (error) {
      console.error("Error getting device identifier:", error);
      return "";
    }
  };

  // Get current location with OpenStreetMap Nominatim API for reverse geocoding
  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // Alert.alert("Permission to access location was denied");
        return;
      }

      setLocationPermissionGranted(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Use OpenStreetMap Nominatim API for reverse geocoding
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${locationData.latitude}&lon=${locationData.longitude}&format=json`;

        // Add a User-Agent header as required by Nominatim usage policy
        const response = await fetch(url, {
          headers: {
            "User-Agent": "YourAppName/1.0", // Replace with your actual app name
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const osmData = await response.json();
        console.log("OSM data:", osmData); // For debugging

        // Extract address information from OSM data
        const addressInfo = osmData.address || {};

        setLocation({
          ...locationData,
          // Store detailed address components from OSM
          name: osmData.name || "",
          street: addressInfo.road || "",
          district: addressInfo.suburb || addressInfo.city_district || "",
          subregion: addressInfo.county || "",
          city:
            addressInfo.city || addressInfo.town || addressInfo.village || "",
          region: addressInfo.state || "",
          country: addressInfo.country || "",
          postalCode: addressInfo.postcode || "",
          formattedAddress: osmData.display_name || "",
          // For convenience, keep area as a summary field
          area:
            addressInfo.suburb ||
            addressInfo.city_district ||
            addressInfo.neighbourhood ||
            addressInfo.county ||
            "",
        });
      } catch (geoError) {
        console.error("Error in reverse geocoding:", geoError);
        setLocation(locationData); // Fall back to just coordinates
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get location data");
    }
  };

  const updateTimestamp = () => {
    const now = new Date();
    setTimestamp(now.toLocaleString());
  };

  useEffect(() => {
    fetchAuthData();
    getLocation();
    updateTimestamp();
    getDeviceIdentifier();
  }, []);

  const fetchAuthData = async () => {
    const activityId = await getLocValue("activityId");
    const activityLocId = await getLocValue("activityLocId");
    const activityCode = await getLocValue("activityCode");
    const projectId = await getAuthValue("projectId");
    const vendorId = await getAuthValue("vendorId");
    const promoterId = await getAuthValue("promoterId");
    const brandId = await getAuthValue("brandId");

    setStorageData({
      activityId: activityId,
      activityLocId: activityLocId,
      activityCode: activityCode,
      promoterId: promoterId,
      vendorId: vendorId,
      projectId: projectId,
      brandId: brandId,
    });
  };

  // IMPROVED: Compress images to reduce upload size and time
  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipResult = await manipulateAsync(
        uri,
        [
          // Resize image if it's too large
          { resize: { width: 1200 } }, // Max width 1200px
        ],
        {
          compress: 0.8, // 80% quality - good balance between size and quality
          format: SaveFormat.JPEG,
        }
      );
      return manipResult.uri;
    } catch (error) {
      console.warn("Image compression failed, using original:", error);
      return uri;
    }
  };

  // Get image dimensions for proper rendering
  const getImageDimensions = async (
    uri: string
  ): Promise<{ width: number; height: number }> => {
    return new Promise<{ width: number; height: number }>((resolve) => {
      Image.getSize(
        uri,
        (width, height) => {
          resolve({ width, height });
        },
        (error) => {
          console.warn("Failed to get image dimensions:", error);
          // Default fallback dimensions if image size can't be determined
          resolve({ width: 1000, height: 1000 });
        }
      );
    });
  };

  // Format location information with detailed address components from OSM
  const getLocationString = () => {
    if (!location) return "Getting location...";

    // Use the formatted display_name from OSM if available
    if (location.formattedAddress) {
      return location.formattedAddress;
    }

    // Create array of address components from most specific to most general
    const addressComponents = [];

    // Add specific address components if available
    if (location.name) addressComponents.push(location.name);
    if (location.street) addressComponents.push(location.street);
    if (location.district) addressComponents.push(location.district);
    if (location.city) addressComponents.push(location.city);
    if (location.region && location.region !== location.city)
      addressComponents.push(location.region);
    if (location.country) addressComponents.push(location.country);

    const formattedAddress =
      addressComponents.length > 0
        ? addressComponents.join(", ")
        : "Unknown location";

    return formattedAddress;
  };

  // Alternative processing function that adds watermarks directly
  const processImage = async (imageUri: string) => {
    // Simply return the original image without processing
    return imageUri;
  };

  // Process all images sequentially
  const processAllImages = async () => {
    // Simply return the original images
    return images;
  };

  // IMPROVED: Modified image processing with compression
  const processImages = async (newImages: string[]) => {
    setImagesReady(false);
    setIsProcessing(true);

    try {
      // Compress images first
      const compressedImages = await Promise.all(
        newImages.map(async (uri) => {
          try {
            return await compressImage(uri);
          } catch (error) {
            console.warn("Failed to compress image:", uri, error);
            return uri; // fallback to original
          }
        })
      );

      // Get dimensions for each compressed image
      const details = await Promise.all(
        compressedImages.map(async (uri) => {
          try {
            return await getImageDimensions(uri);
          } catch (error) {
            console.warn("Error getting dimensions for image:", uri, error);
            return { width: 1000, height: 1000 }; // fallback
          }
        })
      );

      // Update state with compressed images
      setImages((prev) => {
        const currentImages = [...prev];
        // Replace the last added images with compressed versions
        const startIndex = currentImages.length - newImages.length;
        compressedImages.forEach((compressedUri, index) => {
          if (startIndex + index >= 0) {
            currentImages[startIndex + index] = compressedUri;
          }
        });
        return currentImages;
      });

      // Update state in a single batch
      setImageDetails((prev) => [...prev, ...details]);

      // Update viewShotRefs array size
      viewShotRefs.current = Array(images.length + newImages.length).fill(null);

      // Refresh location data and timestamp
      await getLocation();
      updateTimestamp();
    } catch (error) {
      console.error("Error processing images:", error);
      Alert.alert("Error", "Failed to process images. Please try again.");
    } finally {
      setIsProcessing(false);
      setImagesReady(true);
    }
  };

  // Handle Image Selection from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access gallery is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.8, // Reduced quality for smaller file size
      allowsMultipleSelection: true,
      selectionLimit: 3,
      base64: false, // Don't use base64 encoding which can reduce quality
      exif: false, // Don't need EXIF data
    });

    if (!result.canceled && result.assets.length > 0) {
      // Check if adding these images would exceed our limit
      const totalImages = images.length + result.assets.length;
      if (totalImages > 3) {
        Alert.alert(
          "Too many images",
          "You can only have a maximum of 3 images."
        );
        // Add as many as we can within the limit
        const remainingSlots = 3 - images.length;
        if (remainingSlots > 0) {
          const newImages = result.assets
            .slice(0, remainingSlots)
            .map((asset) => asset.uri);

          // Update images state first
          setImages((prev) => [...prev, ...newImages]);

          // Process images asynchronously
          await processImages(newImages);
        }
      } else {
        // Add all selected images
        const newImages = result.assets.map((asset) => asset.uri);

        // Update images state first
        setImages((prev) => [...prev, ...newImages]);

        // Process images asynchronously
        await processImages(newImages);
      }
    }
  };

  // Handle Taking a Picture with camera
  const takePhoto = async () => {
    if (images.length >= 3) {
      Alert.alert("Maximum Images", "You can only upload up to 3 images.");
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Camera permission is required to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8, // Reduced quality for smaller file size
      base64: false, // Don't use base64 encoding
      exif: false, // Don't need EXIF data
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImageUri = result.assets[0].uri;

      // Update images state first
      setImages((prev) => [...prev, newImageUri]);

      // Process the single image
      await processImages([newImageUri]);
    }
  };

  // Remove image from collection
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageDetails((prev) => prev.filter((_, i) => i !== index));
    setProcessedImages((prev) => prev.filter((_, i) => i !== index));
    // Update viewShotRefs array size
    viewShotRefs.current = viewShotRefs.current.filter((_, i) => i !== index);
  };

  // Add validation function
  const validateSubmission = () => {
    if (images.length === 0) {
      Alert.alert("Error", "Please upload at least one image.");
      return false;
    }

    if (entryType === "") {
      Alert.alert("Error", "Please select at least one entry type.");
      return false;
    }

    if (!imagesReady) {
      Alert.alert(
        "Please wait",
        "Images are still being processed. Please wait a moment and try again."
      );
      return false;
    }

    // Check if all required storage data is available
    const requiredFields = [
      "promoterId",
      "projectId",
      "activityLocId",
      "activityCode",
      "vendorId",
      "activityId",
      "brandId",
    ] as const;
    const missingFields = requiredFields.filter(
      (field) => !storageData[field as keyof typeof storageData]
    );

    if (missingFields.length > 0) {
      Alert.alert(
        "Error",
        `Missing required data: ${missingFields.join(", ")}. Please try again.`
      );
      return false;
    }

    return true;
  };

  // IMPROVED: Create timeout wrapper for API calls
  const createTimeoutPromise = (timeoutMs: number) => {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
    );
  };

  // IMPROVED: Retry mechanism for failed requests
  const retryApiCall = async (
    apiCall: () => Promise<any>,
    maxRetries: number = 2,
    delay: number = 1000
  ): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        console.log(`API call attempt ${attempt} failed:`, error);

        if (attempt === maxRetries + 1) {
          throw error; // Last attempt failed, throw the error
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  };

  // IMPROVED: Handle Submit with better timeout handling and retry logic
  const handleSubmit = async () => {
    if (!validateSubmission()) {
      return;
    }

    setIsLoading(true);

    try {
      // Add a small delay to ensure all state updates are complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Use original images instead of watermarked ones
      const imagesToUpload = images;

      const formData = new FormData();

      // IMPROVED: Add images with better error handling and compression info
      for (let index = 0; index < imagesToUpload.length; index++) {
        const uri = imagesToUpload[index];
        if (uri && typeof uri === "string") {
          try {
            // Get file info for better naming
            const fileInfo = await fetch(uri);
            const blob = await fileInfo.blob();

            formData.append("images", {
              uri,
              name: `photo_${Date.now()}_${index}.jpg`,
              type: "image/jpeg",
              size: blob.size, // Include file size info
            } as any);
          } catch (imageError) {
            console.warn(`Error processing image ${index}:`, imageError);
            // Fallback to original method
            formData.append("images", {
              uri,
              name: `photo_${Date.now()}_${index}.jpg`,
              type: "image/jpeg",
            } as any);
          }
        }
      }

      // Add the rest of the form data with validation
      const formDataEntries = {
        promoterId: storageData.promoterId,
        projectId: storageData.projectId,
        activityLocId: storageData.activityLocId,
        activityCode: storageData.activityCode,
        vendorId: storageData.vendorId,
        activityId: storageData.activityId,
        brandId: storageData.brandId,
      };

      Object.entries(formDataEntries).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value);
        }
      });

      name && formData.append("name", name);
      phone && formData.append("phone", phone);

      // Add entry type data to formData
      formData.append("entryType", entryType);

      // Add location data to formData
      if (location) {
        formData.append("latitude", location.latitude.toString());
        formData.append("longitude", location.longitude.toString());

        const formattedAddress = getLocationString();
        formData.append("location", formattedAddress);
      }

      if (Device.manufacturer && Device.modelName) {
        const deviceInfo = `${Device.manufacturer}, ${Device.modelName} (${deviceIdentifier})`;
        formData.append("deviceInfo", deviceInfo);
      }

      formDataToObject(formData, "createScreen");

      // IMPROVED: Use retry mechanism with longer timeout
      console.log("Submitting form data...");

      const submitWithTimeout = async () => {
        return Promise.race([
          api.createOrderEntry(formData),
          createTimeoutPromise(60000), // Increased to 60 seconds
        ]);
      };

      const response = await retryApiCall(submitWithTimeout, 2, 2000);

      if (response.success) {
        Alert.alert("Success", "Images uploaded successfully!");
        router.replace("/dashboard");
      } else {
        Alert.alert("Error", response.message || "Failed to upload images.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AppUpdateRequiredError") {
        return;
      }
      console.error("Upload Error:", error);

      let errorMessage = "Failed to upload images.";

      if (error instanceof Error) {
        if (error.message.includes("Network request failed")) {
          errorMessage =
            "Network error. Please check your internet connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "Upload is taking longer than expected. This might be due to slow internet or large images. Please try again with a better connection.";
        } else if (
          error.message.includes("413") ||
          error.message.includes("Payload too large")
        ) {
          errorMessage =
            "Images are too large. Please try with smaller images.";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this to handle location data when permission is granted
  const handleLocationGranted = (locationData: any) => {
    setLocationPermissionGranted(true);
    updateTimestamp();
  };

  // Check if submit should be disabled
  const isSubmitDisabled = () => {
    return (
      isLoading ||
      images.length === 0 ||
      isProcessing ||
      entryType === "" ||
      !imagesReady
    );
  };

  return (
    <ScreenWrapper showScroll={false}>
      {!locationPermissionGranted ? (
        <>
          <LocationPermissionModal
            visible={locationModalVisible}
            onRequestClose={() => setLocationModalVisible(false)}
            onLocationGranted={handleLocationGranted}
          />
        </>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white mx-4 my-4 rounded-3xl shadow-md p-6">
            <View className="mx-4 my-4 rounded-3xl p-6">
              <Text className="text-2xl font-bold text-center text-primary mb-6">
                Create New Entry
              </Text>

              {/* Name Input */}
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Name
              </Text>
              <TextInput
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 text-lg text-black"
                placeholder="Enter name"
                value={name}
                onChangeText={setName}
              />

              {/* Phone Input */}
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Phone
              </Text>
              <TextInput
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 text-lg text-black"
                placeholder="Enter phone number"
                maxLength={10}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
              />

              {/* Entry Type Checkboxes */}
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Entry Type <Text className="text-primary">*</Text>
              </Text>
              <View className="flex-row mb-6 items-center">
                {/* Order Checkbox */}
                <TouchableOpacity
                  onPress={() => toggleEntryType("order")}
                  className="flex-row items-center mr-8"
                >
                  <View
                    className={`w-5 h-5 border rounded ${
                      isEntryTypeSelected("order")
                        ? "bg-primary border-primary"
                        : "border-gray-400"
                    } mr-2 justify-center items-center`}
                  >
                    {isEntryTypeSelected("order") && (
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    )}
                  </View>
                  <Text className="text-gray-800">Order</Text>
                </TouchableOpacity>

                {/* Signup Checkbox */}
                <TouchableOpacity
                  onPress={() => toggleEntryType("signup")}
                  className="flex-row items-center"
                >
                  <View
                    className={`w-5 h-5 border rounded ${
                      isEntryTypeSelected("signup")
                        ? "bg-primary border-primary"
                        : "border-gray-400"
                    } mr-2 justify-center items-center`}
                  >
                    {isEntryTypeSelected("signup") && (
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    )}
                  </View>
                  <Text className="text-gray-800">Signup</Text>
                </TouchableOpacity>
              </View>

              {/* Image Upload */}
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Images <Text className="text-primary">*</Text>
                <Text className="text-xs text-gray-500"> (Max 3)</Text>
              </Text>
              <View className="flex-row gap-4 space-x-4 mb-4">
                {/* Select from Gallery */}
                <TouchableOpacity
                  onPress={pickImage}
                  className="flex-1 items-center justify-center bg-white border border-gray-300 rounded-xl p-4 shadow-sm"
                  disabled={images.length >= 3 || isProcessing}
                >
                  <Ionicons
                    name="image"
                    size={24}
                    color={
                      images.length >= 3 || isProcessing ? "#ccc" : "#f89f22"
                    }
                  />
                  <Text
                    className={`text-sm ${
                      images.length >= 3 || isProcessing
                        ? "text-gray-400"
                        : "text-gray-600"
                    } mt-2`}
                  >
                    {isProcessing ? "Processing..." : "Select Photos"}
                  </Text>
                </TouchableOpacity>

                {/* Take a Photo */}
                <TouchableOpacity
                  onPress={takePhoto}
                  className="flex-1 items-center justify-center bg-white border border-gray-300 rounded-xl p-4 shadow-sm"
                  disabled={images.length >= 3 || isProcessing}
                >
                  <Ionicons
                    name="camera"
                    size={24}
                    color={
                      images.length >= 3 || isProcessing ? "#ccc" : "#f89f22"
                    }
                  />
                  <Text
                    className={`text-sm ${
                      images.length >= 3 || isProcessing
                        ? "text-gray-400"
                        : "text-gray-600"
                    } mt-2`}
                  >
                    {isProcessing ? "Processing..." : "Take Photo"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Images Preview */}
              {images.length > 0 && (
                <View className="mb-8">
                  <Text className="text-base font-semibold text-gray-800 mb-4">
                    Preview
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    className="mb-4"
                  >
                    {images.map((image, index) => {
                      const imgDetails = imageDetails[index] || {
                        width: 1,
                        height: 1,
                      };
                      const aspectRatio = imgDetails.width / imgDetails.height;
                      const previewHeight = PREVIEW_SIZE / aspectRatio;

                      return (
                        <View
                          key={index}
                          className="relative mr-4"
                          style={{ width: PREVIEW_SIZE }}
                        >
                          <View
                            style={[
                              styles.imageContainer,
                              {
                                borderRadius: 16,
                                overflow: "hidden",
                                shadowColor: "#000",
                                shadowOpacity: 0.1,
                                shadowRadius: 6,
                                shadowOffset: { width: 0, height: 3 },
                                elevation: 4,
                              },
                            ]}
                          >
                            {/* Image */}
                            <Image
                              source={{ uri: image }}
                              style={{
                                width: PREVIEW_SIZE,
                                height: previewHeight,
                              }}
                              resizeMode="cover"
                            />
                          </View>

                          {/* Remove Button (floating) */}
                          <TouchableOpacity
                            onPress={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-white rounded-full p-1"
                            style={{
                              shadowColor: "#000",
                              shadowOpacity: 0.2,
                              shadowRadius: 4,
                              elevation: 3,
                            }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={22}
                              color="#FF4040"
                            />
                          </TouchableOpacity>

                          {/* Image Number Badge */}
                          <View className="absolute bottom-2 left-2 bg-[#f89f22] px-2 py-1 rounded-full">
                            <Text className="text-xs text-white font-bold">
                              {index + 1}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>

                  {/* Pagination Dots */}
                  {images.length > 1 && (
                    <View className="flex-row justify-center items-center">
                      {images.map((_, index) => (
                        <View
                          key={index}
                          className="h-2 w-2 rounded-full mx-1"
                          style={{
                            backgroundColor: "#f89f22",
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitDisabled()}
                className={`w-full py-4 rounded-xl ${
                  !isSubmitDisabled() ? "bg-primary" : "bg-gray-300"
                } items-center shadow-md`}
              >
                {isLoading || isProcessing ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#fff" />
                    <Text className="text-white text-lg font-semibold ml-2">
                      {isProcessing ? "Processing Images..." : "Submitting..."}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white text-lg font-semibold">
                    Submit
                  </Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-full py-4 rounded-xl bg-white border border-gray-300 items-center mt-4 shadow-sm"
              >
                <Text className="text-gray-700 text-lg font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  viewShotContainer: {
    overflow: "hidden",
    width: PREVIEW_SIZE,
  },
  imageWrapper: {
    width: "100%",
    overflow: "hidden",
  },
  watermarkFooter: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  watermarkText: {
    color: "white",
    fontSize: 5,
    fontWeight: "bold",
    marginLeft: 6, // adds space between icon and text
  },
  watermarkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(239, 68, 68, 1)",
    borderRadius: 12,
    padding: 4,
    zIndex: 10,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageNumberBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#f89f22",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  imageNumberText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default CreateScreen;
