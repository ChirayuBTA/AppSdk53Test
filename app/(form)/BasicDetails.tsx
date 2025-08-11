import LocationSelector from "@/components/Address";
import DynamicDropdown from "@/components/DynamicDropdown";
import ScreenWrapper from "@/components/ScreenWrapper";
import { formDataToObject } from "@/helper";
import { api } from "@/utils/api";
import { GST_REGEX, PAN_REGEX, PHONE_REGEX } from "@/utils/regex";
import { getAuthData, getLocData } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  areaName: string;
}

interface ValidationErrors {
  channelName?: string;
  channelAddress?: string;
  areaId?: string;
  areaName?: string;
  registrationNo?: string;
  pan?: string;
  gstin?: string;
  managerName?: string;
  managerContact?: string;
  locationLink?: string;
  kyc?: string;
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
    locationLink: "",
  });
  const [areaSuggestions, setAreaSuggestions] = useState<any[]>([]);
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Add location data state
  const [locationData, setLocationData] = useState<LocationData>({
    address: "",
    cityId: "",
    cityName: "",
    pincode: "",
    state: "",
    areaName: "", // Add this line
  });

  // Add validation errors state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [locationImages, setLocationImages] = useState<string[]>([]);
  const [showFileOptions, setShowFileOptions] = useState({
    registrationNo: false,
    pan: false,
    gstin: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storedLocData, setStoredLocData] = useState<any>();
  const [storedAuthData, setStoredAuthData] = useState<any>();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  const getStoredData = async () => {
    try {
      const locData = await getLocData();
      const authData = await getAuthData();
      console.log("locData---", locData);
      console.log("authData---", authData);

      if (locData) setStoredLocData(locData);
      if (authData) setStoredAuthData(authData);
    } catch (err) {
      console.log("Error: ", err);
    }
  };

  useEffect(() => {
    getStoredData();
  }, []);

  // Validation functions
  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case "channelName":
        return value.trim() === "" ? "Channel name is required" : null;

      case "managerName":
        return value.trim() === "" ? "Manager name is required" : null;

      case "managerContact":
        if (value.trim() === "") return "Manager contact is required";
        if (!PHONE_REGEX.test(value.trim()))
          return "Invalid phone number format (10 digits required)";
        return null;

      case "locationLink":
        if (value.trim() !== "") {
          const urlRegex =
            /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
          if (!urlRegex.test(value.trim())) {
            return "Please enter a valid URL";
          }
        }
        return null;

      case "pan":
        if (value.trim() !== "" && !PAN_REGEX.test(value.trim())) {
          return "Invalid PAN Number";
        }
        return null;

      case "gstin":
        if (value.trim() !== "" && !GST_REGEX.test(value.trim())) {
          return "Invalid GSTIN format";
        }
        return null;

      default:
        return null;
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // Real-time validation for specific fields
    const error = validateField(field, value);
    if (error) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    }
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

  // Handle selecting images from gallery for location
  const pickLocationImagesFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map((asset) => asset.uri);
      setLocationImages((prevImages) => [...prevImages, ...newImages]);
    }
  };

  // Handle taking photo for location
  const takeLocationPhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setLocationImages((prevImages) => [...prevImages, result.assets[0].uri]);
    }
  };

  // Remove location image
  const removeLocationImage = (uri: string) => {
    setLocationImages((prevImages) =>
      prevImages.filter((image) => image !== uri)
    );
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
      allowsEditing: false,
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
      allowsEditing: false,
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

  // Comprehensive form validation
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Required field validations
    if (!formData.channelTypeId)
      errors.channelName = "Channel type is required";
    if (!formData.channelName.trim())
      errors.channelName = "Channel name is required";
    if (!locationData.address.trim())
      errors.channelAddress = "Channel address is required";
    // if (!formData.areaId) errors.areaId = "Area selection is required";
    if (!locationData.areaName) errors.areaName = "Area is required";
    if (!formData.managerName.trim())
      errors.managerName = "Manager name is required";
    if (!formData.managerContact.trim())
      errors.managerContact = "Manager contact is required";

    // Regex validations
    if (
      formData.managerContact.trim() &&
      !PHONE_REGEX.test(formData.managerContact.trim())
    ) {
      errors.managerContact =
        "Invalid phone number format (10 digits required)";
    }

    if (formData.pan.trim() && !PAN_REGEX.test(formData.pan.trim())) {
      errors.pan = "Invalid PAN format (e.g., ABCDE1234F)";
    }

    if (formData.gstin.trim() && !GST_REGEX.test(formData.gstin.trim())) {
      errors.gstin = "Invalid GSTIN format";
    }

    // Location link validation
    if (formData.locationLink.trim()) {
      const urlRegex =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlRegex.test(formData.locationLink.trim())) {
        errors.locationLink = "Please enter a valid URL";
      }
    }

    // KYC validation
    if (!validateKYC()) {
      errors.kyc =
        "At least one KYC document (Registration No, PAN, or GSTIN) is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Render validation error
  const renderValidationError = (fieldName: keyof ValidationErrors) => {
    if (validationErrors[fieldName]) {
      return (
        <Text className="text-red-500 text-xs mt-1">
          {validationErrors[fieldName]}
        </Text>
      );
    }
    return null;
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

  // Render location photo upload section
  const renderLocationPhotoUpload = () => {
    return (
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Location Photos (Optional)
        </Text>
        <Text className="text-xs text-gray-600 mb-3">
          Upload photos of the location to help identify the place
        </Text>

        {/* Photo Upload Buttons */}
        <View className="flex-row gap-4 mb-4">
          <TouchableOpacity
            onPress={pickLocationImagesFromGallery}
            className="flex-1 items-center justify-center bg-white border border-gray-300 rounded-xl p-4 shadow-sm"
          >
            <Ionicons name="image" size={24} color="#f89f22" />
            <Text className="text-sm text-gray-600 mt-2">Select Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={takeLocationPhoto}
            className="flex-1 items-center justify-center bg-white border border-gray-300 rounded-xl p-4 shadow-sm"
          >
            <Ionicons name="camera" size={24} color="#f89f22" />
            <Text className="text-sm text-gray-600 mt-2">Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Preview Images */}
        {locationImages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            {locationImages.map((uri, index) => (
              <View key={index} className="relative mr-4">
                <Image
                  source={{ uri }}
                  className="w-20 h-20 rounded-lg border border-gray-300"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => removeLocationImage(uri)}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {locationImages.length > 0 && (
          <Text className="text-xs text-gray-600 mb-2">
            {locationImages.length} photo(s) selected
          </Text>
        )}
      </View>
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Validation Error",
        "Please fix the errors before submitting."
      );
      return;
    }

    setIsSubmitting(true);

    const formDataToSend = new FormData();

    // Append form fields
    formDataToSend.append("channelType", formData.channelTypeId);
    formDataToSend.append("channelName", formData.channelName);
    formDataToSend.append("channelAddress", locationData.address);
    formDataToSend.append("areaName", locationData.areaName);
    formDataToSend.append("registrationNo", formData.registrationNo);
    formDataToSend.append("pan", formData.pan);
    formDataToSend.append("gstin", formData.gstin);
    formDataToSend.append("managerName", formData.managerName);
    formDataToSend.append("managerContact", formData.managerContact);
    formDataToSend.append("locationLink", formData.locationLink);

    // Append User ID
    formDataToSend.append("userId", storedAuthData.userId);

    // Append location data
    formDataToSend.append("cityName", locationData.cityName);
    formDataToSend.append("pincode", locationData.pincode);
    formDataToSend.append("state", locationData.state);

    // Append uploaded KYC files
    uploadedFiles.forEach((file) => {
      const fileObj = {
        uri: file.uri,
        type: file.type === "image" ? "image/jpeg" : "application/pdf",
        name: file.name,
      } as any;

      formDataToSend.append(`files_${file.kycType}`, fileObj);
    });

    // Append location photos
    locationImages.forEach((uri, index) => {
      const fileObj = {
        uri,
        type: "image/jpeg",
        name: `location_photo_${Date.now()}_${index}.jpg`,
      } as any;

      formDataToSend.append("location_photos", fileObj);
    });

    try {
      const response = await api.createChannel(formDataToSend);

      if (response?.success) {
        formDataToObject(formDataToSend, "BasicDetails");

        Alert.alert(
          "Channel Registered",
          `Channel registered successfully! ${uploadedFiles.length} KYC file(s) and ${locationImages.length} location photo(s) uploaded.\n\nDo you want to add an activity now?`,
          [
            {
              text: "Later",
              onPress: () => router.replace("/(screens)/MainScreen"),
              style: "cancel",
            },
            {
              text: "Add Activity",
              onPress: () =>
                router.replace({
                  pathname: "/(form)/ActivityDetails",
                  params: {
                    managerName: formData.managerName,
                    managerPhone: formData.managerContact,
                    channelId: response.data.id,
                    channelName: formData.channelName,
                  },
                }),
            },
          ]
        );
      } else {
        Alert.alert("Error", response?.message || "Channel creation failed.");
      }
    } catch (error: any) {
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
    <ScreenWrapper headerProps={{ showOnlyLogout: true }} showScroll={true}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          setShowAreaSuggestions(false);
        }}
      >
        {/* <ScrollView className="flex-1 bg-white"> */}
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
            onDropdownToggle={setIsDropdownOpen}
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
              placeholderTextColor="grey"
              className={`border rounded-lg p-3 bg-white ${
                validationErrors.channelName
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {renderValidationError("channelName")}
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
              forceUpdate={!isDropdownOpen} // Add this line
            />
            {renderValidationError("channelAddress")}
          </View>

          {/* Location Link Field */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Location Link (Optional)
            </Text>
            <Text className="text-xs text-gray-600 mb-2">
              Google Maps link, website URL, or any other location reference
            </Text>
            <TextInput
              value={formData.locationLink}
              onChangeText={(value) => updateField("locationLink", value)}
              placeholder="https://maps.google.com/... or any location URL"
              placeholderTextColor="grey"
              className={`border rounded-lg p-3 bg-white ${
                validationErrors.locationLink
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {renderValidationError("locationLink")}
          </View>

          {/* Location Photo Upload Section */}
          {renderLocationPhotoUpload()}

          {/* KYC Section */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Channel KYC{" "}
              <Text className="text-red-500">
                * (At least one field mandatory)
              </Text>
            </Text>
            {renderValidationError("kyc")}

            {/* Registration Number */}
            <View className="mb-3">
              <Text className="text-sm text-gray-600 mb-2">
                Channel Registration No.
              </Text>
              <TextInput
                value={formData.registrationNo}
                onChangeText={(value) => updateField("registrationNo", value)}
                placeholder="Enter legal entity registration number"
                placeholderTextColor="grey"
                className={`border rounded-lg p-3 bg-white ${
                  validationErrors.registrationNo
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {renderValidationError("registrationNo")}
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
                placeholder="Enter PAN number (e.g., ABCDE1234F)"
                placeholderTextColor="grey"
                maxLength={10}
                className={`border rounded-lg p-3 bg-white ${
                  validationErrors.pan ? "border-red-500" : "border-gray-300"
                }`}
              />
              {renderValidationError("pan")}
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
                placeholder="Enter GSTIN number (15 characters)"
                placeholderTextColor="grey"
                maxLength={15}
                className={`border rounded-lg p-3 bg-white ${
                  validationErrors.gstin ? "border-red-500" : "border-gray-300"
                }`}
              />
              {renderValidationError("gstin")}
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
              placeholderTextColor="grey"
              className={`border rounded-lg p-3 bg-white ${
                validationErrors.managerName
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {renderValidationError("managerName")}
          </View>

          {/* Manager Contact */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Channel Manager Contact No <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.managerContact}
              onChangeText={(value) => updateField("managerContact", value)}
              placeholder="Enter 10-digit contact number"
              placeholderTextColor="grey"
              keyboardType="phone-pad"
              maxLength={10}
              className={`border rounded-lg p-3 bg-white ${
                validationErrors.managerContact
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {renderValidationError("managerContact")}
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
      </TouchableOpacity>
      {/* </ScrollView> */}
    </ScreenWrapper>
  );
};

export default BasicDetails;
