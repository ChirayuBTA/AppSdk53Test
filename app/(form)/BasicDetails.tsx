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
import { useRouter } from "expo-router";
import { api } from "@/utils/api";
import { getLocData, storeAuthData, storeLocData } from "@/utils/storage";
import { formDataToObject } from "@/helper";
import LocationSelector from "@/components/Address";

interface UploadedFile {
  id: string;
  name: string;
  uri: string;
  type: string;
  size?: number;
  kycType?: string;
}

interface ChannelType {
  id: string;
  name: string;
  status: string;
}

interface Area {
  id: string;
  name: string;
  slug: string;
  cityId: string;
  pincode: string | null;
  latitude: string | null;
  longitude: string | null;
  status: string;
  areaType: string | null;
  createdAt: string;
  updatedAt: string;
  city: {
    id: string;
    name: string;
    slug: string;
    state: string;
    status: string;
    pincode: string | null;
    latitude: string | null;
    longitude: string | null;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface DropdownItem {
  id: string;
  name: string;
  [key: string]: any;
}

interface LocationData {
  address: string;
  cityId: string;
  cityName: string;
  pincode: string;
  state: string;
}

const BasicDetails = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    channelTypeId: "",
    channelTypeName: "",
    channelName: "",
    channelAddress: "",
    areaId: "",
    areaName: "",
    registrationNo: "",
    pan: "",
    gstin: "",
    managerName: "",
    managerContact: "",
  });

  // Add location data state
  const [locationData, setLocationData] = useState<LocationData>({
    address: "",
    cityId: "",
    cityName: "",
    pincode: "",
    state: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileOptions, setShowFileOptions] = useState({
    registrationNo: false,
    pan: false,
    gstin: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storedlocData, setStoredLocData] = useState<any>();

  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  const getStoredData = async () => {
    try {
      const locData = await getLocData();
      console.log("locData---", locData);

      if (locData) setStoredLocData(locData);
    } catch (err) {
      console.log("Error: ", err);
    }
  };

  useEffect(() => {
    getStoredData();
  }, []);

  const updateField = (field: any, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle location data changes
  const handleLocationChange = (data: LocationData) => {
    setLocationData(data);
    // Update form data with address for backward compatibility
    updateField("channelAddress", data.address);
  };

  // Channel Type Selection Handler
  const handleChannelTypeSelect = (item: DropdownItem) => {
    updateField("channelTypeId", item.id);
    updateField("channelTypeName", item.name);
  };

  // Area Selection Handler
  const handleAreaSelect = (item: DropdownItem) => {
    const area = item as Area;
    updateField("areaId", item.id);
    updateField(
      "areaName",
      `${item.name}, ${area.city.name}, ${area.city.state}`
    );
  };

  // Format area display text for dropdown
  const formatAreaDisplayText = (item: DropdownItem) => {
    const area = item as Area;
    return `${item.name}\n${area.city.name}, ${area.city.state}`;
  };

  // Handle Add Area button press
  const handleAddArea = () => {
    router.push("/(form)/AddArea");
  };

  const validateKYC = () => {
    const { registrationNo, pan, gstin } = formData;
    return (
      registrationNo.trim() !== "" || pan.trim() !== "" || gstin.trim() !== ""
    );
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

  // Toggle file options for specific KYC field
  const toggleFileOptions = (kycType: string) => {
    setShowFileOptions((prev) => ({
      ...prev,
      [kycType]: !prev[kycType as keyof typeof prev],
    }));
  };

  // Handle image upload from camera for specific KYC field
  const handleImageFromCamera = async (kycType: string) => {
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
        name: `${kycType}_Camera_${Date.now()}.jpg`,
        uri: asset.uri,
        type: "image",
        size: asset.fileSize,
        kycType: kycType,
      };
      setUploadedFiles((prev) => [...prev, newFile]);
      setShowFileOptions((prev) => ({ ...prev, [kycType]: false }));
    }
  };

  // Handle image upload from gallery for specific KYC field
  const handleImageFromGallery = async (kycType: string) => {
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
        name: asset.fileName || `${kycType}_Image_${Date.now()}.jpg`,
        uri: asset.uri,
        type: "image",
        size: asset.fileSize,
        kycType: kycType,
      };
      setUploadedFiles((prev) => [...prev, newFile]);
      setShowFileOptions((prev) => ({ ...prev, [kycType]: false }));
    }
  };

  // Handle PDF upload for specific KYC field
  const handlePDFUpload = async (kycType: string) => {
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
          kycType: kycType,
        };
        setUploadedFiles((prev) => [...prev, newFile]);
        setShowFileOptions((prev) => ({ ...prev, [kycType]: false }));
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

  // Get files for specific KYC type
  const getFilesForKYC = (kycType: string) => {
    return uploadedFiles.filter((file) => file.kycType === kycType);
  };

  // Render file upload section for KYC field
  const renderKYCFileUpload = (
    kycType: string,
    fieldValue: string,
    label: string
  ) => {
    const shouldShow = fieldValue.trim() !== "";
    const files = getFilesForKYC(kycType);

    if (!shouldShow) return null;

    return (
      <View className="mt-3 mb-3">
        <Text className="text-xs text-gray-600 mb-2">
          Upload {label} Document
        </Text>

        <TouchableOpacity
          onPress={() => toggleFileOptions(kycType)}
          className="border border-dashed border-gray-300 rounded-lg p-3 items-center mb-2"
        >
          <Text className="text-gray-600 text-center text-sm">
            📎 Upload {label} Document
          </Text>
        </TouchableOpacity>

        {showFileOptions[kycType as keyof typeof showFileOptions] && (
          <View className="border border-gray-300 rounded-lg bg-white mb-2">
            <TouchableOpacity
              onPress={() => handleImageFromCamera(kycType)}
              className="p-3 border-b border-gray-200"
            >
              <Text className="text-gray-900 text-sm">📷 Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleImageFromGallery(kycType)}
              className="p-3 border-b border-gray-200"
            >
              <Text className="text-gray-900 text-sm">
                🖼️ Choose from Gallery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handlePDFUpload(kycType)}
              className="p-3"
            >
              <Text className="text-gray-900 text-sm">📄 Upload PDF</Text>
            </TouchableOpacity>
          </View>
        )}

        {files.length > 0 && (
          <View className="mb-2">
            <Text className="text-xs font-medium text-gray-700 mb-1">
              {label} Files ({files.length})
            </Text>
            {files.map((file) => (
              <View
                key={file.id}
                className="flex-row items-center bg-gray-50 p-2 rounded-lg mb-1"
              >
                {file.type === "image" ? (
                  <Image
                    source={{ uri: file.uri }}
                    className="w-8 h-8 rounded mr-2"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-8 h-8 bg-red-100 rounded mr-2 items-center justify-center">
                    <Text className="text-red-600 text-xs font-bold">PDF</Text>
                  </View>
                )}

                <View className="flex-1">
                  <Text
                    className="text-gray-900 text-xs font-medium"
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
                  className="p-1"
                >
                  <Text className="text-red-500 text-sm">×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Create FormData object
      const formDataToSend = new FormData();

      // Append form fields
      formDataToSend.append("channelType", formData.channelTypeId);
      formDataToSend.append("channelName", formData.channelName);
      formDataToSend.append("channelAddress", locationData.address);
      formDataToSend.append("areaId", formData.areaId);
      formDataToSend.append("registrationNo", formData.registrationNo);
      formDataToSend.append("pan", formData.pan);
      formDataToSend.append("gstin", formData.gstin);
      formDataToSend.append("managerName", formData.managerName);
      formDataToSend.append("managerContact", formData.managerContact);

      // Append location data
      formDataToSend.append("cityId", locationData.cityId);
      formDataToSend.append("pincode", locationData.pincode);
      formDataToSend.append("state", locationData.state);

      // Append uploaded files
      uploadedFiles.forEach((file, index) => {
        const fileObj = {
          uri: file.uri,
          type: file.type === "image" ? "image/jpeg" : "application/pdf",
          name: file.name,
        } as any;

        formDataToSend.append(`files_${file.kycType}`, fileObj);
      });

      // Call the API
      const response = await api.createChannel(formDataToSend);

      formDataToObject(formDataToSend, "BasicDetails");

      if (response && response.success) {
        Alert.alert(
          "Channel Registered",
          `Channel registered successfully! ${uploadedFiles.length} file(s) uploaded.\n\nDo you want to add an activity now?`,
          [
            {
              text: "Later",
              onPress: () => {
                router.push("/(screens)/MainDashboard");
              },
              style: "cancel",
            },
            {
              text: "Add Activity",
              onPress: () => {
                router.push({
                  pathname: "/(form)/ActivityDetails",
                  params: {
                    channelId: response.data.id,
                    channelName: formData.channelName,
                  },
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          response?.message || "Failed to register channel. Please try again."
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      Alert.alert(
        "Error",
        "Failed to register channel. Please check your connection and try again."
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
            Channel Registration
          </Text>

          {/* Channel Type Dropdown */}
          <DynamicDropdown
            label="Channel Type"
            placeholder="Select Channel Type"
            isRequired={true}
            selectedValue={formData.channelTypeId}
            selectedLabel={formData.channelTypeName}
            onSelect={handleChannelTypeSelect}
            apiCall={api.getAllChannelTypes}
            searchable={true}
            pageSize={10}
            noDataMessage="No channel types available"
            errorMessage="Failed to load channel types. Please try again."
            maxHeight={320}
          />

          {/* Channel Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Channel Name (Legal Name) <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.channelName}
              onChangeText={(value) => updateField("channelName", value)}
              placeholder="Enter legal name"
              className="border border-gray-300 rounded-lg p-3 bg-white"
            />
          </View>

          {/* Location Selector Component */}
          <View className="mb-4">
            <Text className="text-lg font-medium text-gray-800 mb-3">
              Location Details
            </Text>
            <LocationSelector
              value={locationData}
              onChange={handleLocationChange}
              isRequired={true}
              addressLabel="Channel Address"
              addressPlaceholder="Enter address where activity will be conducted"
              showLabels={true}
            />
          </View>

          {/* Area Selection Dropdown with Add Area Button */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-700">
                Area <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                onPress={handleAddArea}
                className="bg-primary px-3 py-1 rounded-md"
              >
                <Text className="text-white text-xs font-medium">
                  + Add Area
                </Text>
              </TouchableOpacity>
            </View>

            <DynamicDropdown
              placeholder="Select Area"
              selectedValue={formData.areaId}
              selectedLabel={formData.areaName}
              onSelect={handleAreaSelect}
              apiCall={api.getAllAreas}
              searchable={true}
              pageSize={10}
              formatDisplayText={formatAreaDisplayText}
              searchPlaceholder="Search areas..."
              noDataMessage="No areas found"
              errorMessage="Failed to load areas. Please try again."
              maxHeight={320}
            />
          </View>

          {/* KYC Section */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Channel KYC{" "}
              <Text className="text-red-500">
                * (At least one field mandatory)
              </Text>
            </Text>

            {/* Registration Number */}
            <View className="mb-3">
              <Text className="text-sm text-gray-600 mb-2">
                Channel Registration No.
              </Text>
              <TextInput
                value={formData.registrationNo}
                onChangeText={(value) => updateField("registrationNo", value)}
                placeholder="Enter legal entity registration number"
                className="border border-gray-300 rounded-lg p-3 bg-white"
              />
              {renderKYCFileUpload(
                "registrationNo",
                formData.registrationNo,
                "Registration"
              )}
            </View>

            {/* PAN */}
            <View className="mb-3">
              <Text className="text-sm text-gray-600 mb-2">Channel PAN</Text>
              <TextInput
                value={formData.pan}
                onChangeText={(value) =>
                  updateField("pan", value.toUpperCase())
                }
                placeholder="Enter PAN number"
                maxLength={10}
                className="border border-gray-300 rounded-lg p-3 bg-white"
              />
              {renderKYCFileUpload("pan", formData.pan, "PAN")}
            </View>

            {/* GSTIN */}
            <View className="mb-3">
              <Text className="text-sm text-gray-600 mb-2">Channel GSTIN</Text>
              <TextInput
                value={formData.gstin}
                onChangeText={(value) =>
                  updateField("gstin", value.toUpperCase())
                }
                placeholder="Enter GSTIN number"
                maxLength={15}
                className="border border-gray-300 rounded-lg p-3 bg-white"
              />
              {renderKYCFileUpload("gstin", formData.gstin, "GSTIN")}
            </View>
          </View>

          {/* Manager Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Channel Manager Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.managerName}
              onChangeText={(value) => updateField("managerName", value)}
              placeholder="Person in charge of decision"
              className="border border-gray-300 rounded-lg p-3 bg-white"
            />
          </View>

          {/* Manager Contact */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Channel Manager Contact No <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.managerContact}
              onChangeText={(value) => updateField("managerContact", value)}
              placeholder="Enter manager contact number"
              keyboardType="phone-pad"
              maxLength={15}
              className="border border-gray-300 rounded-lg p-3 bg-white"
            />
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
                Register Channel
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BasicDetails;
