import CustomHeader from "@/components/CustomHeader";
import DynamicDropdown from "@/components/DynamicDropdown";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/utils/api";
import { getLocData, storeLocData } from "@/utils/storage";
import { formDataToObject } from "@/helper";

interface UploadedFile {
  id: string;
  name: string;
  uri: string;
  type: string;
  size?: number;
}

interface DropdownItem {
  id: string;
  name: string;
  [key: string]: any;
}

// Helper function to create a date with specific time
const createDateWithTime = (hours: number, minutes: number = 0): Date => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0); // Set hours, minutes, seconds, milliseconds
  return date;
};

// Helper function to get T+2 date (2 days from today)
const getTPlus2Date = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return date;
};

const ActivityDetails = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  // Extract parameters
  const paramChannelId = params.channelId as string;
  const paramChannelName = params.channelName as string;

  const [formData, setFormData] = useState({
    brandId: "",
    brandName: "",
    projectId: "",
    projectName: "",
    activityTypeId: "",
    activityTypeName: "",
    pocName: "",
    pocContact: "",
    activityDate: getTPlus2Date(), // Set default to T+2
    timeFrom: createDateWithTime(11), // 11:00 AM
    timeTo: createDateWithTime(18), // 6:00 PM (18:00 in 24-hour format)
    channelFees: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileOptions, setShowFileOptions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState({
    from: false,
    to: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [channelId, setChannelId] = useState<string | null>(null);

  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  // const getStoredData = async () => {
  //   try {
  //     const LocData = await getLocData();

  //     if (LocData) setChannelId(LocData.channelId);
  //   } catch (err) {
  //     // setError("Failed to fetch data from storage.");
  //     console.log("Error: ", err);
  //   }
  // };

  // useEffect(() => {
  //   getStoredData(); // Get stored values on mount
  // }, []);

  const updateField = (field: any, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Brand Selection Handler
  const handleBrandSelect = (item: DropdownItem) => {
    updateField("brandId", item.id);
    updateField("brandName", item.name);

    // Reset project selection when brand changes
    updateField("projectId", "");
    updateField("projectName", "");
  };

  // Project Selection Handler
  const handleProjectSelect = (item: DropdownItem) => {
    updateField("projectId", item.id);
    updateField("projectName", item.name);
  };

  // Activity Type Selection Handler
  const handleActivityTypeSelect = (item: DropdownItem) => {
    updateField("activityTypeId", item.id);
    updateField("activityTypeName", item.name);
  };

  // API call function for projects with brandId filter
  const getProjectsForBrand = async (params: any) => {
    if (!formData.brandId) {
      return { success: false, data: [], message: "Brand not selected" };
    }

    const queryParams = {
      ...params,
      brandId: formData.brandId, // Add brandId to query parameters
    };

    return api.getAllProjects(queryParams);
  };

  // Date and Time handling
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Updated minimum date function - T+2 (2 days from today)
  const getMinDate = () => {
    return getTPlus2Date();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      updateField("activityDate", selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    const currentMode = showTimePicker.from ? "from" : "to";
    setShowTimePicker((prev) => ({
      ...prev,
      [currentMode]: Platform.OS === "ios",
    }));

    if (selectedTime) {
      if (currentMode === "from") {
        updateField("timeFrom", selectedTime);
      } else {
        updateField("timeTo", selectedTime);
      }
    }
  };

  // Request permissions for camera and media library
  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || mediaStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Please grant camera and photo library permissions to upload files."
      );
      return false;
    }
    return true;
  };

  // Handle image upload from camera
  const handleImageFromCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: `Camera_${Date.now()}.jpg`,
        uri: asset.uri,
        type: "image",
        size: asset.fileSize,
      };
      setUploadedFiles((prev) => [...prev, newFile]);
      setShowFileOptions(false);
    }
  };

  // Handle image upload from gallery
  const handleImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: asset.fileName || `Image_${Date.now()}.jpg`,
        uri: asset.uri,
        type: "image",
        size: asset.fileSize,
      };
      setUploadedFiles((prev) => [...prev, newFile]);
      setShowFileOptions(false);
    }
  };

  // Handle PDF upload
  const handlePDFUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newFile: UploadedFile = {
          id: Date.now().toString(),
          name: asset.name,
          uri: asset.uri,
          type: "pdf",
          size: asset.size,
        };
        setUploadedFiles((prev) => [...prev, newFile]);
        setShowFileOptions(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  // Remove uploaded file
  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validation
      if (
        !formData.brandId ||
        !formData.projectId ||
        !formData.activityTypeId
      ) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
      }

      if (!formData.channelFees) {
        Alert.alert("Error", "Please enter channel fees");
        return;
      }

      // Create FormData object
      const formDataToSend = new FormData();

      // Append form fields
      if (paramChannelId) {
        formDataToSend.append("channelId", paramChannelId);
      }
      formDataToSend.append("brandId", formData.brandId);
      formDataToSend.append("projectId", formData.projectId);
      formDataToSend.append("activityTypeId", formData.activityTypeId);
      formDataToSend.append(
        "activityDate",
        formData.activityDate.toISOString()
      );
      formDataToSend.append("pocName", formData.pocName);
      formDataToSend.append("pocContact", formData.pocContact);
      formDataToSend.append("timeFrom", formData.timeFrom.toISOString());
      formDataToSend.append("timeTo", formData.timeTo.toISOString());
      formDataToSend.append("channelFees", formData.channelFees);

      // Append uploaded files
      uploadedFiles.forEach((file, index) => {
        const fileObj = {
          uri: file.uri,
          type: file.type === "image" ? "image/jpeg" : "application/pdf",
          name: file.name,
        } as any;

        formDataToSend.append(`files`, fileObj);
      });

      formDataToObject(formDataToSend, "ActivityDetails");
      // Call the API
      const response = await api.createChannelActivity(formDataToSend);

      formDataToObject(formDataToSend, "ActivityDetails");

      if (response && response.success) {
        // const locData = {
        //   channelId: paramChannelId,
        //   activityId: response.data.id,
        //   // channelName: storedlocData.channelName,
        //   // activityCode: storedlocData.activityCode,
        // };

        // const locStored = await storeLocData(locData);

        // console.log("Loc data stored successfully:", locStored, locData);
        Alert.alert(
          "Success",
          `Activity details saved successfully! ${uploadedFiles.length} file(s) uploaded.`
        );
        router.push({
          pathname: "/(form)/BankDetails",
          params: {
            channelId: paramChannelId,
            channelName: paramChannelName,
            activityId: response.data.id,
          },
        });
      } else {
        Alert.alert(
          "Error",
          response?.message ||
            "Failed to add activity details. Please try again."
        );
      }
    } catch (error) {
      console.error("Error submitting activity details:", error);
      Alert.alert(
        "Error",
        "Failed to save activity details. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-100"
      style={{ paddingTop: statusBarHeight }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <CustomHeader showOnlyLogout={true} />
      <ScrollView className="flex-1 bg-white">
        <View className="p-6">
          <Text className="text-2xl font-bold text-primary mb-6">
            Activity Details
          </Text>

          {/* Brand Name Dropdown */}
          <DynamicDropdown
            label="Brand Name"
            placeholder="Select Brand"
            isRequired={true}
            selectedValue={formData.brandId}
            selectedLabel={formData.brandName}
            onSelect={handleBrandSelect}
            apiCall={api.getAllBrands}
            searchable={true}
            pageSize={10}
            noDataMessage="No brands available"
            errorMessage="Failed to load brands. Please try again."
          />

          {/* Project Name Dropdown */}
          <DynamicDropdown
            key={`project-${formData.brandId}`} // Force re-render when brand changes
            label="Project Name"
            placeholder={
              formData.brandId ? "Select Project" : "Select Brand first"
            }
            isRequired={true}
            selectedValue={formData.projectId}
            selectedLabel={formData.projectName}
            onSelect={handleProjectSelect}
            apiCall={getProjectsForBrand}
            searchable={true}
            pageSize={10}
            disabled={!formData.brandId}
            noDataMessage="No projects available for selected brand"
            errorMessage="Failed to load projects. Please try again."
          />

          {/* Activity Type Dropdown */}
          <DynamicDropdown
            label="Activity Type"
            placeholder="Select Activity Type"
            isRequired={true}
            selectedValue={formData.activityTypeId}
            selectedLabel={formData.activityTypeName}
            onSelect={handleActivityTypeSelect}
            apiCall={api.getAllActivityTypes}
            searchable={true}
            pageSize={10}
            noDataMessage="No activity types available"
            errorMessage="Failed to load activity types. Please try again."
          />

          {/* POC Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Channel POC Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.pocName}
              onChangeText={(value) => updateField("pocName", value)}
              placeholder="For activity coordination"
              className="border border-gray-300 rounded-lg p-3 bg-white"
            />
          </View>

          {/* POC Contact */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Channel POC Contact No <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.pocContact}
              onChangeText={(value) => updateField("pocContact", value)}
              placeholder="Enter contact number"
              keyboardType="phone-pad"
              maxLength={15}
              className="border border-gray-300 rounded-lg p-3 bg-white"
            />
          </View>

          {/* Activity Planned Date */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Activity Planned Date <Text className="text-red-500">*</Text>
            </Text>
            <Text className="text-xs text-gray-500 mb-2">
              Minimum 2 days advance booking required
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="border border-gray-300 rounded-lg p-3 bg-white"
            >
              <Text className="text-gray-900">
                {formatDate(formData.activityDate)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={formData.activityDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                minimumDate={getMinDate()} // T+2 minimum date
              />
            )}
          </View>

          {/* Activity Time */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Activity Time <Text className="text-red-500">*</Text>
            </Text>

            <View className="flex-row space-x-3">
              {/* From Time */}
              <View className="flex-1">
                <Text className="text-xs text-gray-600 mb-1">From</Text>
                <TouchableOpacity
                  onPress={() =>
                    setShowTimePicker((prev) => ({ ...prev, from: true }))
                  }
                  className="border border-gray-300 rounded-lg p-3 bg-white"
                >
                  <Text className="text-gray-900">
                    {formatTime(formData.timeFrom)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* To Time */}
              <View className="flex-1">
                <Text className="text-xs text-gray-600 mb-1">To</Text>
                <TouchableOpacity
                  onPress={() =>
                    setShowTimePicker((prev) => ({ ...prev, to: true }))
                  }
                  className="border border-gray-300 rounded-lg p-3 bg-white"
                >
                  <Text className="text-gray-900">
                    {formatTime(formData.timeTo)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Time Pickers */}
            {showTimePicker.from && (
              <DateTimePicker
                value={formData.timeFrom}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
              />
            )}

            {showTimePicker.to && (
              <DateTimePicker
                value={formData.timeTo}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
              />
            )}
          </View>

          {/* Channel Fees */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Channel Fees for Activity <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.channelFees}
              onChangeText={(value) => updateField("channelFees", value)}
              placeholder="Enter amount"
              keyboardType="numeric"
              className="border border-gray-300 rounded-lg p-3 bg-white"
            />
          </View>

          {/* File Upload Section */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Channel Bill / Receipt
            </Text>

            {/* Upload Button */}
            <TouchableOpacity
              onPress={() => setShowFileOptions(!showFileOptions)}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 items-center mb-4"
            >
              <Text className="text-gray-600 text-center">
                📎 Upload Bill or Receipt
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                Tap to select files
              </Text>
            </TouchableOpacity>

            {/* File Options Modal */}
            {showFileOptions && (
              <View className="border border-gray-300 rounded-lg bg-white mb-4">
                <TouchableOpacity
                  onPress={handleImageFromCamera}
                  className="p-4 border-b border-gray-200"
                >
                  <Text className="text-gray-900">📷 Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleImageFromGallery}
                  className="p-4 border-b border-gray-200"
                >
                  <Text className="text-gray-900">🖼️ Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePDFUpload} className="p-4">
                  <Text className="text-gray-900">📄 Upload PDF</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Uploaded Files ({uploadedFiles.length})
                </Text>
                {uploadedFiles.map((file) => (
                  <View
                    key={file.id}
                    className="flex-row items-center bg-gray-50 p-3 rounded-lg mb-2"
                  >
                    {file.type === "image" ? (
                      <Image
                        source={{ uri: file.uri }}
                        className="w-10 h-10 rounded mr-3"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-10 h-10 bg-red-100 rounded mr-3 items-center justify-center">
                        <Text className="text-red-600 text-xs font-bold">
                          PDF
                        </Text>
                      </View>
                    )}

                    <View className="flex-1">
                      <Text
                        className="text-gray-900 text-sm font-medium"
                        numberOfLines={1}
                      >
                        {file.name}
                      </Text>
                      {file.size && (
                        <Text className="text-gray-500 text-xs">
                          {formatFileSize(file.size)}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() => removeFile(file.id)}
                      className="p-2"
                    >
                      <Text className="text-red-500 text-lg">×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-primary rounded-lg p-4 items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-lg">
                Save Activity Details
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ActivityDetails;
