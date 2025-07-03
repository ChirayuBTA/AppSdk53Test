import CustomHeader from "@/components/CustomHeader";
import React, { useEffect, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { formDataToObject } from "@/helper";
import { api } from "@/utils/api";
import { getLocData } from "@/utils/storage";

interface UploadedFile {
  id: string;
  name: string;
  uri: string;
  type: string;
  size?: number;
}

const BankDetails = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  // Extract parameters
  const paramChannelId = params.channelId as string;
  const paramChannelName = params.channelName as string;
  const paramActivityId = params.activityId as string;

  const [formData, setFormData] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileOptions, setShowFileOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  // Fetch existing bank details
  const fetchBankDetails = async () => {
    try {
      setIsLoading(true);
      const response = await api.getChannelBankDetailsById(paramChannelId);

      if (response && response.success && response.data) {
        const data = response.data;

        // Check if bank details exist
        if (
          data.bankName &&
          data.bankAccountNumber &&
          data.bankAccountName &&
          data.bankIFSCCode
        ) {
          setHasExistingData(true);
          setIsReadOnly(true);
          setFormData({
            bankName: data.bankName || "",
            accountName: data.bankAccountName || "",
            accountNumber: data.bankAccountNumber || "",
            confirmAccountNumber: data.bankAccountNumber || "",
            ifscCode: data.bankIFSCCode || "",
          });

          // Handle cancelled check file if exists
          if (data.cancelledCheck) {
            // This would need to be handled based on how the file URL is structured
            // For now, we'll just note that there's an existing file
            // You might need to modify this based on your file storage structure
          }
        } else {
          // No bank details exist, show empty form in edit mode
          setHasExistingData(false);
          setIsReadOnly(false);
          setIsEditing(true);
        }
      }
    } catch (error) {
      console.error("Error fetching bank details:", error);
      Alert.alert("Error", "Failed to fetch bank details. Please try again.");
      // Default to empty form in edit mode on error
      setHasExistingData(false);
      setIsReadOnly(false);
      setIsEditing(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (paramChannelId) {
      fetchBankDetails();
    }
  }, [paramChannelId]);

  const updateField = (field: any, value: any) => {
    if (!isReadOnly) {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleEdit = () => {
    setIsReadOnly(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (hasExistingData) {
      setIsReadOnly(true);
      setIsEditing(false);
      // Reset form to original data
      fetchBankDetails();
    }
  };

  const validateForm = () => {
    const {
      bankName,
      accountName,
      accountNumber,
      confirmAccountNumber,
      ifscCode,
    } = formData;

    // Check if all required fields are filled
    if (
      !bankName.trim() ||
      !accountName.trim() ||
      !accountNumber.trim() ||
      !ifscCode.trim()
    ) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return false;
    }

    // Check if account numbers match (only if confirmAccountNumber is being used)
    if (
      !isReadOnly &&
      confirmAccountNumber &&
      accountNumber !== confirmAccountNumber
    ) {
      Alert.alert("Validation Error", "Account numbers do not match");
      return false;
    }

    // Basic IFSC validation (should be 11 characters)
    if (ifscCode.length !== 11) {
      Alert.alert("Validation Error", "IFSC code should be 11 characters");
      return false;
    }

    return true;
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
    if (isReadOnly) return;

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
        name: `Cheque_${Date.now()}.jpg`,
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
    if (isReadOnly) return;

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
        name: asset.fileName || `Cheque_${Date.now()}.jpg`,
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
    if (isReadOnly) return;

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
    if (!isReadOnly) {
      setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
    }
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

      if (!validateForm()) {
        return;
      }

      // Here you can process the form data and uploaded files
      console.log("Bank Details:", formData);
      console.log("Uploaded files:", uploadedFiles);

      // Create FormData object
      const formDataToSend = new FormData();

      // Append form fields - Send the channelTypeId to the API
      formDataToSend.append("channelId", paramChannelId);
      formDataToSend.append("activityId", paramActivityId);
      formDataToSend.append("bankName", formData.bankName);
      formDataToSend.append("accountName", formData.accountName);
      formDataToSend.append("accountNumber", formData.accountNumber);
      formDataToSend.append("ifscCode", formData.ifscCode);

      // Append uploaded files
      uploadedFiles.forEach((file, index) => {
        const fileObj = {
          uri: file.uri,
          type: file.type === "image" ? "image/jpeg" : "application/pdf",
          name: file.name,
        } as any;

        formDataToSend.append(`files`, fileObj);
      });

      formDataToObject(formDataToSend, "Bank Details");

      // Call the API
      const response = await api.addBankDetails(formDataToSend);

      if (response && response.success) {
        Alert.alert(
          "Success",
          hasExistingData
            ? "Bank details updated successfully!"
            : `Channel registered successfully! ${uploadedFiles.length} file(s) uploaded.`
        );

        // Refresh the data and switch back to read-only mode
        await fetchBankDetails();
        setIsEditing(false);
      } else {
        Alert.alert(
          "Error",
          response?.message || "Failed to save bank details. Please try again."
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      Alert.alert(
        "Error",
        "Failed to save bank details. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-gray-100"
        style={{ paddingTop: statusBarHeight }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <CustomHeader showOnlyLogout={true} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0066CC" />
          <Text className="mt-4 text-gray-600">Loading bank details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-100"
      style={{ paddingTop: statusBarHeight }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <CustomHeader showOnlyLogout={true} />
      <ScrollView className="flex-1 bg-white">
        <View className="p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-primary">
              Bank Details
            </Text>
            {hasExistingData && isReadOnly && (
              <TouchableOpacity
                onPress={handleEdit}
                className="bg-blue-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {hasExistingData && isReadOnly && (
            <View className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <Text className="text-green-800 font-medium">
                ✓ Bank details are already configured for this channel
              </Text>
            </View>
          )}

          {/* Bank Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Bank Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.bankName}
              onChangeText={(value) => updateField("bankName", value)}
              placeholder="Enter bank name"
              editable={!isReadOnly}
              className={`border rounded-lg p-3 ${
                isReadOnly
                  ? "border-gray-200 bg-gray-100 text-gray-600"
                  : "border-gray-300 bg-white"
              }`}
            />
          </View>

          {/* Bank Account Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Bank Account Name <Text className="text-red-500">*</Text>
            </Text>
            <Text className="text-xs text-gray-500 mb-2">
              Should be of the channel
            </Text>
            <TextInput
              value={formData.accountName}
              onChangeText={(value) => updateField("accountName", value)}
              placeholder="Enter account holder name"
              editable={!isReadOnly}
              className={`border rounded-lg p-3 ${
                isReadOnly
                  ? "border-gray-200 bg-gray-100 text-gray-600"
                  : "border-gray-300 bg-white"
              }`}
            />
          </View>

          {/* Bank Account Number */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Bank Account Number <Text className="text-red-500">*</Text>
            </Text>
            <Text className="text-xs text-gray-500 mb-2">
              Should be of the channel
            </Text>
            <TextInput
              value={formData.accountNumber}
              onChangeText={(value) => updateField("accountNumber", value)}
              placeholder="Enter account number"
              keyboardType="numeric"
              editable={!isReadOnly}
              className={`border rounded-lg p-3 ${
                isReadOnly
                  ? "border-gray-200 bg-gray-100 text-gray-600"
                  : "border-gray-300 bg-white"
              }`}
            />
          </View>

          {/* Confirm Bank Account Number - Only show in edit mode */}
          {!isReadOnly && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Confirm Bank Account Number{" "}
                <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={formData.confirmAccountNumber}
                onChangeText={(value) =>
                  updateField("confirmAccountNumber", value)
                }
                placeholder="Re-enter account number"
                keyboardType="numeric"
                className="border border-gray-300 rounded-lg p-3 bg-white"
              />
              {formData.confirmAccountNumber &&
                formData.accountNumber !== formData.confirmAccountNumber && (
                  <Text className="text-red-500 text-xs mt-1">
                    Account numbers do not match
                  </Text>
                )}
            </View>
          )}

          {/* Bank IFSC */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Bank IFSC Code <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={formData.ifscCode}
              onChangeText={(value) =>
                updateField("ifscCode", value.toUpperCase())
              }
              placeholder="Enter IFSC code"
              maxLength={11}
              editable={!isReadOnly}
              className={`border rounded-lg p-3 ${
                isReadOnly
                  ? "border-gray-200 bg-gray-100 text-gray-600"
                  : "border-gray-300 bg-white"
              }`}
            />
            {!isReadOnly &&
              formData.ifscCode &&
              formData.ifscCode.length !== 11 && (
                <Text className="text-red-500 text-xs mt-1">
                  IFSC code should be 11 characters
                </Text>
              )}
          </View>

          {/* Cancelled Cheque Upload Section */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Cancelled Cheque Copy <Text className="text-red-500">*</Text>
            </Text>
            <Text className="text-xs text-gray-500 mb-3">
              Upload a clear image of cancelled cheque or PDF document
            </Text>

            {/* Upload Button - Only show in edit mode */}
            {!isReadOnly && (
              <TouchableOpacity
                onPress={() => setShowFileOptions(!showFileOptions)}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 items-center mb-4"
              >
                <Text className="text-gray-600 text-center">
                  🏦 Upload Cancelled Cheque
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Tap to select file
                </Text>
              </TouchableOpacity>
            )}

            {/* File Options Modal */}
            {showFileOptions && !isReadOnly && (
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

                    {!isReadOnly && (
                      <TouchableOpacity
                        onPress={() => removeFile(file.id)}
                        className="p-2"
                      >
                        <Text className="text-red-500 text-lg">×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Show existing file info in read-only mode */}
            {isReadOnly && hasExistingData && (
              <View className="bg-gray-50 p-3 rounded-lg">
                <Text className="text-gray-600 text-sm">
                  📄 Cancelled cheque document is already uploaded
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons - Show save button in both read-only and edit modes */}
          <View className="flex-row gap-3">
            {/* Cancel button - only show when editing existing data */}
            {hasExistingData && !isReadOnly && (
              <TouchableOpacity
                onPress={handleCancel}
                className="flex-1 bg-gray-500 rounded-lg p-4 items-center"
                disabled={isSubmitting}
              >
                <Text className="text-white font-semibold text-lg">Cancel</Text>
              </TouchableOpacity>
            )}

            {/* Save button - always show, with appropriate styling */}
            <TouchableOpacity
              onPress={handleSubmit}
              className={`${
                hasExistingData && !isReadOnly ? "flex-1" : "flex-1"
              } bg-primary rounded-lg p-4 items-center`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-lg">
                  {hasExistingData && isReadOnly
                    ? "Save Bank Details"
                    : hasExistingData
                    ? "Update Bank Details"
                    : "Save Bank Details"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BankDetails;
