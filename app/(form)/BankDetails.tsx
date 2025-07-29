import CustomHeader from "@/components/CustomHeader";
import ScreenWrapper from "@/components/ScreenWrapper";
import { formDataToObject } from "@/helper";
import { api } from "@/utils/api";
import { getAuthData } from "@/utils/storage";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
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
}

const BankDetails = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  // Extract parameters
  const paramChannelId = params.channelId as string;
  const paramChannelName = params.channelName as string;
  const paramActivityId = params.activityId as string;
  const paramActivityFee = params.activityFee as string;
  const paramManagerName = params.managerName as string;
  const paramManagerPhone = params.managerPhone as string;

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
  const [storedAuthData, setStoredAuthData] = useState<any>(null);

  // Manager Modal State
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerData, setManagerData] = useState({
    managerName: "",
    managerPhone: "",
  });
  const [isDeclarationChecked, setIsDeclarationChecked] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [enteredOTP, setEnteredOTP] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isResendingOTP, setIsResendingOTP] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    setManagerData({
      managerName: paramManagerName,
      managerPhone: paramManagerPhone,
    });
  }, [paramManagerName, paramManagerPhone]);

  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  const getStoredData = async () => {
    try {
      // const LocData = await getLocData();
      const authData = await getAuthData();

      // if (LocData) setChannelId(LocData.channelId);
      if (authData) setStoredAuthData(authData);
    } catch (err) {
      // setError("Failed to fetch data from storage.");
      console.log("Error: ", err);
    }
  };

  useEffect(() => {
    getStoredData(); // Get stored values on mount
  }, []);

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
          setManagerData({
            managerName: data.channelManagerName || "",
            managerPhone: data.channelManagerPhone || "",
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

  const updateManagerField = (field: string, value: string) => {
    setManagerData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  const validateManagerData = () => {
    const { managerName, managerPhone } = managerData;

    if (!managerName.trim()) {
      Alert.alert("Validation Error", "Please enter manager name");
      return false;
    }

    if (!managerPhone.trim()) {
      Alert.alert("Validation Error", "Please enter manager phone number");
      return false;
    }

    // Basic phone number validation (10 digits)
    if (managerPhone.length !== 10 || !/^\d+$/.test(managerPhone)) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid 10-digit phone number"
      );
      return false;
    }

    if (!isDeclarationChecked) {
      Alert.alert("Validation Error", "Please accept the signoff declaration");
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
      allowsEditing: false,
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
      allowsEditing: false,
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

  const handleSaveClick = () => {
    if (!validateForm()) {
      return;
    }
    // Show manager modal
    setShowManagerModal(true);
  };

  const handleManagerSubmit = (type: "link" | "otp") => {
    if (!validateManagerData()) {
      return;
    }

    setIsSubmitting(true);

    // Create FormData object
    const formDataToSend = new FormData();

    console.log("storedAuthData====**", storedAuthData);

    // Append form fields
    formDataToSend.append("channelId", paramChannelId);
    formDataToSend.append("activityId", paramActivityId);
    formDataToSend.append("activityFee", paramActivityFee);
    formDataToSend.append("bankName", formData.bankName);
    formDataToSend.append("accountName", formData.accountName);
    formDataToSend.append("accountNumber", formData.accountNumber);
    formDataToSend.append("ifscCode", formData.ifscCode);
    formDataToSend.append("channelManagerName", managerData.managerName);
    formDataToSend.append("channelManagerPhone", managerData.managerPhone);
    formDataToSend.append("userId", storedAuthData?.userId);
    formDataToSend.append("type", type);

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

    // API call
    api
      .addBankDetails(formDataToSend)
      .then((response) => {
        if (response && response.success) {
          if (type === "otp") {
            setOtpMode(true);
            return;
          } else {
            Alert.alert(
              "Success",
              hasExistingData
                ? "Bank details updated successfully!"
                : `Channel registered successfully! ${uploadedFiles.length} file(s) uploaded.`
            );

            // Close modal and reset
            setShowManagerModal(false);
            setIsDeclarationChecked(false);
            setOtpMode(false);
            setEnteredOTP("");
            router.replace("/(screens)/MainScreen");

            // Refresh and exit edit mode
            fetchBankDetails().then(() => {
              setIsEditing(false);
            });
          }
        } else {
          Alert.alert(
            "Error",
            response?.message ||
              "Failed to save bank details. Please try again."
          );
        }
      })
      .catch((error) => {
        console.error("Error submitting form:", error);
        Alert.alert(
          "Error",
          "Failed to save bank details. Please check your connection and try again."
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleResendOTP = async () => {
    try {
      setIsResendingOTP(true);
      const response = await api.sendManagerOTP({
        id: paramActivityId,
        phone: managerData.managerPhone,
      });

      if (response && response.success) {
        Alert.alert("OTP Sent", "OTP has been sent to manager's phone number");
        setResendTimer(60); // 60 seconds timer
      } else {
        Alert.alert("Error", response?.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    } finally {
      setIsResendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!enteredOTP.trim()) {
      Alert.alert("Validation Error", "Please enter OTP");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.verifyManagerOTP({
        id: paramActivityId,
        otp: enteredOTP,
        phone: managerData.managerPhone,
      });

      if (response && response.success) {
        Alert.alert("OTP Verified", "OTP verified successfully");
        router.replace("/(screens)/MainScreen");
      } else {
        Alert.alert("Error", response?.message || "Invalid OTP");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      Alert.alert("Error", "Failed to verify OTP. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowManagerModal(false);
    setIsDeclarationChecked(false);
    setOtpMode(false);
    setEnteredOTP("");
    setResendTimer(0);
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
    <ScreenWrapper headerProps={{ showOnlyLogout: true }} showScroll={true}>
      <View className="p-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-primary">Bank Details</Text>
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
            Cancelled Cheque Copy
            {/* <Text className="text-red-500">*</Text> */}
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
            onPress={handleSaveClick}
            className={`${
              hasExistingData && !isReadOnly ? "flex-1" : "flex-1"
            } bg-primary rounded-lg p-4 items-center`}
            disabled={isSubmitting}
          >
            <Text className="text-white font-semibold text-lg">
              {hasExistingData && isReadOnly
                ? "Save Bank Details"
                : hasExistingData
                  ? "Update Bank Details"
                  : "Save Bank Details"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Manager Details Modal */}
      <Modal
        visible={showManagerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-lg p-6 mx-4 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
              Manager Details
            </Text>

            <Text className="text-sm text-gray-600 mb-6 text-center">
              Please provide manager contact information
            </Text>

            {/* Manager Name */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Manager Name <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={managerData.managerName}
                onChangeText={(value) =>
                  updateManagerField("managerName", value)
                }
                placeholder="Enter manager name"
                className="border border-gray-300 rounded-lg p-3 bg-white"
              />
            </View>

            {/* Manager Phone */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Manager Phone Number <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={managerData.managerPhone}
                onChangeText={(value) =>
                  updateManagerField("managerPhone", value)
                }
                placeholder="Enter 10-digit phone number"
                keyboardType="numeric"
                maxLength={10}
                className="border border-gray-300 rounded-lg p-3 bg-white"
              />
            </View>

            {/* Signoff Declaration */}
            <View className="mb-6">
              <TouchableOpacity
                onPress={() => setIsDeclarationChecked(!isDeclarationChecked)}
                className="flex-row items-start"
              >
                <View
                  className={`w-5 h-5 border-2 rounded mr-3 mt-1 items-center justify-center ${
                    isDeclarationChecked
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isDeclarationChecked && (
                    <Text className="text-white text-xs font-bold">✓</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-700 leading-5">
                    I hereby declare that the activity and bank details provided
                    above have been verified and are factually correct.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Modal Action Buttons */}
            {/* OTP Input Section - Show when in OTP mode */}
            {otpMode && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Enter OTP <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={enteredOTP}
                  onChangeText={setEnteredOTP}
                  placeholder="Enter 6-digit OTP"
                  // keyboardType="numeric"
                  maxLength={6}
                  className="border border-gray-300 rounded-lg p-3 bg-white"
                />

                {/* Resend OTP Button */}
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={resendTimer > 0 || isResendingOTP}
                  className={`mt-2 p-2 rounded ${
                    resendTimer > 0 || isResendingOTP
                      ? "bg-gray-300"
                      : "bg-blue-500"
                  }`}
                >
                  {isResendingOTP ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      className={`text-center font-medium ${
                        resendTimer > 0 ? "text-gray-500" : "text-white"
                      }`}
                    >
                      {resendTimer > 0
                        ? `Resend OTP in ${resendTimer}s`
                        : "Resend OTP"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Modal Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCloseModal}
                className="flex-1 bg-gray-500 rounded-lg p-3 items-center"
                disabled={isSubmitting}
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>

              {otpMode ? (
                <TouchableOpacity
                  onPress={handleVerifyOTP}
                  className="flex-1 bg-primary rounded-lg p-3 items-center"
                  disabled={isSubmitting || !enteredOTP.trim()}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-semibold">Submit</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => handleManagerSubmit("link")}
                    className={`flex-1 rounded-lg p-3 items-center ${
                      isDeclarationChecked ? "bg-green-500" : "bg-gray-300"
                    }`}
                    disabled={isSubmitting || !isDeclarationChecked}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text
                        className={`font-semibold ${
                          isDeclarationChecked ? "text-white" : "text-gray-500"
                        }`}
                      >
                        Send Link
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleManagerSubmit("otp")}
                    className={`flex-1 rounded-lg p-3 items-center ${
                      isDeclarationChecked ? "bg-primary" : "bg-gray-300"
                    }`}
                    disabled={isSubmitting || !isDeclarationChecked}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text
                        className={`font-semibold ${
                          isDeclarationChecked ? "text-white" : "text-gray-500"
                        }`}
                      >
                        Send OTP
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

export default BankDetails;
