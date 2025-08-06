import DynamicDropdown from "@/components/DynamicDropdown";
import ScreenWrapper from "@/components/ScreenWrapper";
import { formDataToObject } from "@/helper";
import { api } from "@/utils/api";
import { getAuthData } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
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

interface DropdownItem {
  id: string;
  name: string;
  [key: string]: any;
}

interface UploadedFile {
  id: string;
  name: string;
  uri: string;
  type: string;
  size?: number;
  category: "payment_supporting" | "invoice_receipt" | "bta_voucher";
}

const ExpenseForm = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const paramExpenseId = params.expenseId as string;

  // 1. Define getMinDate first
  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate());
    return date;
  };

  const [formData, setFormData] = useState({
    name: "",
    brandId: "",
    brandName: "",
    // activityTypeId: "",
    activityDate: getMinDate(), // should be a Date object
    // activityTypeName: "",
    channelId: "",
    channelName: "",
    projectId: "",
    projectName: "",
    paidTo: "",
    expenseCategory: "PROJECT_EXPENSE",
    expenseTypeId: "",
    expenseTypeName: "",
    amount: "",
    paymentType: "CASH", // "cash" or "upi_netbanking"
    description: "", // Changed from notes to description
  });

  useEffect(() => {
    console.log(formData);
  }, [formData]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storedAuthData, setStoredAuthData] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFileOptions, setShowFileOptions] = useState<{
    payment_supporting: boolean;
    invoice_receipt: boolean;
    bta_voucher: boolean;
  }>({
    payment_supporting: false,
    invoice_receipt: false,
    bta_voucher: false,
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Add state for travel description fields
  const [travelFields, setTravelFields] = useState({
    from: "",
    to: "",
    mode: "",
    purpose: "",
  });

  const fetchAndPrefillData = async () => {
    if (!paramExpenseId) return;

    setIsLoading(true);
    try {
      const response = await api.getExpensesById(paramExpenseId, {});

      if (response && response.success && response.data) {
        const data = response.data;

        // Parse travel description if it's a travel expense
        if (
          TRAVEL_EXPENSE_IDS.includes(data.natureOfExpenseId || "") &&
          data.description
        ) {
          const desc = data.description;

          // Parse the travel description using regex
          const fromMatch = desc.match(/I travelled from (.+?) to/);
          const toMatch = desc.match(/to (.+?) by/);
          const modeMatch = desc.match(/by (.+?) for/);
          const purposeMatch = desc.match(/for (.+?)\./);

          setTravelFields({
            from: fromMatch ? fromMatch[1].trim() : "",
            to: toMatch ? toMatch[1].trim() : "",
            mode: modeMatch ? modeMatch[1].trim() : "",
            purpose: purposeMatch ? purposeMatch[1].trim() : "",
          });
        }

        // Map API response to form data
        setFormData({
          name: data.name || "",
          brandId: data.brandId || "",
          brandName: data.brand?.name || "",
          activityDate: data.activityDate
            ? new Date(data.activityDate)
            : getMinDate(),
          channelId: data.channelId || "",
          channelName: data.channel?.name || "",
          projectId: data.projectId || "",
          projectName: data.project?.name || "",
          paidTo: data.paidTo || "",
          expenseCategory: data.expenseType || "PROJECT_EXPENSE",
          expenseTypeId: data.natureOfExpenseId || "",
          expenseTypeName: data.natureOfExpense?.expenseName || "",
          amount: data.amount || "",
          paymentType: data.paymentMode || "CASH",
          description: data.description || "",
        });

        // Handle existing files - convert URLs to UploadedFile objects
        const existingFiles: UploadedFile[] = [];

        if (data.paymentSupporting) {
          existingFiles.push({
            id: `existing_payment_${Date.now()}`,
            name: "Payment Supporting Document",
            uri: data.paymentSupporting,
            type: "image",
            category: "payment_supporting",
          });
        }

        if (data.invoiceOrReceipt) {
          existingFiles.push({
            id: `existing_invoice_${Date.now()}`,
            name: "Invoice/Receipt",
            uri: data.invoiceOrReceipt,
            type: "image",
            category: "invoice_receipt",
          });
        }

        if (data.btaVoucher) {
          existingFiles.push({
            id: `existing_bta_${Date.now()}`,
            name: "BTA Voucher",
            uri: data.btaVoucher,
            type: "image",
            category: "bta_voucher",
          });
        }

        setUploadedFiles(existingFiles);
        setIsEditMode(true);
      } else {
        Alert.alert("Error", "Failed to fetch expense data");
      }
    } catch (error) {
      console.error("Error fetching expense data:", error);
      Alert.alert("Error", "Failed to fetch expense data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (paramExpenseId) {
      fetchAndPrefillData();
    }
  }, [paramExpenseId]);

  // IDs for special expense types
  const TRAVEL_EXPENSE_IDS = [
    "550ec6b2-3c81-45be-84b9-8cef28fc140e",
    "9897120a-d06c-4bdf-9230-f1dd0de23c7c",
  ];

  // Helper function to get today's date
  const getTodaysDate = (): Date => {
    return new Date();
  };

  // Update travel fields and description
  const handleTravelFieldChange = (field: string, value: string) => {
    setTravelFields((prev) => ({ ...prev, [field]: value }));
    // Construct the sentence
    const desc = `I travelled from ${
      field === "from" ? value : travelFields.from
    } to ${field === "to" ? value : travelFields.to} by ${
      field === "mode" ? value : travelFields.mode
    } for ${field === "purpose" ? value : travelFields.purpose}.`;
    updateField("description", desc);
  };

  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  const getStoredData = async () => {
    try {
      const authData = await getAuthData();
      if (authData) setStoredAuthData(authData);
    } catch (err) {
      console.log("Error: ", err);
    }
  };

  useEffect(() => {
    getStoredData();
  }, []);

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
  const handleImageFromCamera = async (
    category: "payment_supporting" | "invoice_receipt" | "bta_voucher"
  ) => {
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
        name: `${category}_Camera_${Date.now()}.jpg`,
        uri: asset.uri,
        type: "image",
        size: asset.fileSize,
        category,
      };
      setUploadedFiles((prev) => [...prev, newFile]);
      setShowFileOptions((prev) => ({ ...prev, [category]: false }));
    }
  };

  // Handle image upload from gallery
  const handleImageFromGallery = async (
    category: "payment_supporting" | "invoice_receipt" | "bta_voucher"
  ) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newFiles: UploadedFile[] = result.assets.map((asset, index) => ({
        id: `${Date.now()}_${index}`,
        name:
          asset.fileName || `${category}_Gallery_${Date.now()}_${index}.jpg`,
        uri: asset.uri,
        type: "image",
        size: asset.fileSize,
        category,
      }));
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      setShowFileOptions((prev) => ({ ...prev, [category]: false }));
    }
  };

  // Handle PDF upload
  const handlePDFUpload = async (
    category: "payment_supporting" | "invoice_receipt" | "bta_voucher"
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newFiles: UploadedFile[] = result.assets.map((asset, index) => ({
          id: `${Date.now()}_${index}`,
          name: asset.name,
          uri: asset.uri,
          type: "pdf",
          size: asset.size,
          category,
        }));
        setUploadedFiles((prev) => [...prev, ...newFiles]);
        setShowFileOptions((prev) => ({ ...prev, [category]: false }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  // Remove uploaded file
  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  // 3. handleDateChange function
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData((prev) => ({
        ...prev,
        activityDate: selectedDate,
      }));
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  // Get files by category
  const getFilesByCategory = (
    category: "payment_supporting" | "invoice_receipt" | "bta_voucher"
  ) => {
    return uploadedFiles.filter((file) => file.category === category);
  };

  const updateField = (field: any, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Selection Handlers
  const handleBrandSelect = (item: DropdownItem) => {
    updateField("brandId", item.id);
    updateField("brandName", item.name);
  };

  const handleActivityTypeSelect = (item: DropdownItem) => {
    updateField("activityTypeId", item.id);
    updateField("activityTypeName", item.name);
  };

  const handleChannelSelect = (item: DropdownItem) => {
    updateField("channelId", item.id);
    updateField("channelName", item.name);
  };

  const handleProjectSelect = (item: DropdownItem) => {
    updateField("projectId", item.id);
    updateField("projectName", item.name);
  };

  const handleExpenseTypeSelect = (item: DropdownItem) => {
    updateField("expenseTypeId", item.id);
    updateField("expenseTypeName", item.expenseName || item.name);
  };

  // Amount validation
  const handleAmountChange = (value: string) => {
    const numericValue = parseFloat(value) || 0;
    if (numericValue > 19999) {
      Alert.alert("Error", "Amount cannot exceed ₹19,999");
      return;
    }
    updateField("amount", value);
  };

  // Radio button components
  const RadioButton = ({ selected, onPress, label }: any) => (
    <TouchableOpacity onPress={onPress} className="flex-row items-center mb-3">
      <View
        className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
          selected ? "border-primary" : "border-gray-300"
        }`}
      >
        {selected && <View className="w-3 h-3 rounded-full bg-primary" />}
      </View>
      <Text className="text-gray-700 text-sm">{label}</Text>
    </TouchableOpacity>
  );

  // Render file upload section for specific category
  const renderFileUploadSection = (
    category: "payment_supporting" | "invoice_receipt" | "bta_voucher",
    title: string,
    description: string,
    isRequired: boolean = false
  ) => {
    const categoryFiles = getFilesByCategory(category);

    return (
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">
          {title} {isRequired && <Text className="text-red-500">*</Text>}
        </Text>
        <Text className="text-xs text-gray-600 mb-3">{description}</Text>

        <TouchableOpacity
          onPress={() =>
            setShowFileOptions((prev) => ({
              ...prev,
              [category]: !prev[category],
            }))
          }
          className="border border-dashed border-gray-300 rounded-lg p-4 items-center mb-3"
        >
          <Ionicons name="cloud-upload" size={24} color="#f89f22" />
          <Text className="text-gray-600 text-center text-sm mt-2">
            📎 Upload {title}
          </Text>
        </TouchableOpacity>

        {showFileOptions[category] && (
          <View className="border border-gray-300 rounded-lg bg-white mb-3">
            <TouchableOpacity
              onPress={() => handleImageFromCamera(category)}
              className="p-3 border-b border-gray-200 flex-row items-center"
            >
              <Ionicons name="camera" size={20} color="#f89f22" />
              <Text className="text-gray-900 text-sm ml-3">Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleImageFromGallery(category)}
              className="p-3 border-b border-gray-200 flex-row items-center"
            >
              <Ionicons name="image" size={20} color="#f89f22" />
              <Text className="text-gray-900 text-sm ml-3">
                Choose from Gallery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handlePDFUpload(category)}
              className="p-3 flex-row items-center"
            >
              <Ionicons name="document" size={20} color="#f89f22" />
              <Text className="text-gray-900 text-sm ml-3">Upload PDF</Text>
            </TouchableOpacity>
          </View>
        )}

        {categoryFiles.length > 0 && (
          <View className="mb-3">
            <Text className="text-xs font-medium text-gray-700 mb-2">
              Uploaded Files ({categoryFiles.length})
            </Text>
            {categoryFiles.map((file) => (
              <View
                key={file.id}
                className="flex-row items-center bg-gray-50 p-3 rounded-lg mb-2"
              >
                {file.type === "image" ? (
                  <Image
                    source={{ uri: file.uri }}
                    className="w-12 h-12 rounded-lg mr-3"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-12 h-12 bg-red-100 rounded-lg mr-3 items-center justify-center">
                    <Ionicons name="document" size={20} color="#dc2626" />
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
                  <Ionicons name="close-circle" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Date and Time handling
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Validation
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter name");
      setIsSubmitting(false);
      return;
    }

    if (!formData.brandId) {
      Alert.alert("Error", "Please select a brand");
      setIsSubmitting(false);
      return;
    }

    // Travel fields validation for travel expense types
    if (TRAVEL_EXPENSE_IDS.includes(formData.expenseTypeId)) {
      if (!travelFields.from.trim()) {
        Alert.alert("Error", "Please enter 'From' location for travel expense");
        setIsSubmitting(false);
        return;
      }

      if (!travelFields.to.trim()) {
        Alert.alert("Error", "Please enter 'To' location for travel expense");
        setIsSubmitting(false);
        return;
      }

      if (!travelFields.mode.trim()) {
        Alert.alert(
          "Error",
          "Please enter mode of transport for travel expense"
        );
        setIsSubmitting(false);
        return;
      }

      if (!travelFields.purpose.trim()) {
        Alert.alert(
          "Error",
          "Please enter purpose of travel for travel expense"
        );
        setIsSubmitting(false);
        return;
      }
    }

    // if (!formData.activityTypeId) {
    //   Alert.alert("Error", "Please select an activity type");
    //   setIsSubmitting(false);
    //   return;
    // }

    if (!formData.channelId) {
      Alert.alert("Error", "Please select a channel");
      setIsSubmitting(false);
      return;
    }

    if (!formData.projectId) {
      Alert.alert("Error", "Please select a project");
      setIsSubmitting(false);
      return;
    }

    if (!formData.paidTo.trim()) {
      Alert.alert("Error", "Please enter paid to");
      setIsSubmitting(false);
      return;
    }

    if (!formData.expenseTypeId) {
      Alert.alert("Error", "Please select nature of expense");
      setIsSubmitting(false);
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      setIsSubmitting(false);
      return;
    }

    if (parseFloat(formData.amount) > 19999) {
      Alert.alert("Error", "Amount cannot exceed ₹19,999");
      setIsSubmitting(false);
      return;
    }

    // File upload validations
    if (
      formData.paymentType === "UPI_NETBANKING" &&
      getFilesByCategory("payment_supporting").length === 0
    ) {
      Alert.alert(
        "Error",
        "Payment supporting document is required for UPI/Net Banking payments"
      );
      setIsSubmitting(false);
      return;
    }

    // Check if at least one of Invoice/Receipt or BTA Voucher is uploaded
    const invoiceFiles = getFilesByCategory("invoice_receipt");
    const btaFiles = getFilesByCategory("bta_voucher");

    // Only require file uploads for non-travel expenses
    if (!TRAVEL_EXPENSE_IDS.includes(formData.expenseTypeId)) {
      if (invoiceFiles.length === 0 && btaFiles.length === 0) {
        Alert.alert(
          "Error",
          "Please upload either Invoice/Receipt or BTA Voucher"
        );
        setIsSubmitting(false);
        return;
      }
    }

    // Create FormData for submission with files
    const formDataToSend = new FormData();

    // Add the expense ID for update
    if (isEditMode && paramExpenseId) {
      formDataToSend.append("expenseId", paramExpenseId);
    }

    // Append form fields
    formDataToSend.append("name", formData.name);
    formDataToSend.append("brandId", formData.brandId);
    // formDataToSend.append("activityTypeId", formData.activityTypeId);
    formDataToSend.append("activityDate", formData.activityDate.toISOString());
    formDataToSend.append("channelId", formData.channelId);
    formDataToSend.append("projectId", formData.projectId);
    formDataToSend.append("paidTo", formData.paidTo);
    formDataToSend.append("expenseCategory", formData.expenseCategory);
    formDataToSend.append("expenseTypeId", formData.expenseTypeId);
    formDataToSend.append("amount", formData.amount);
    formDataToSend.append("paymentType", formData.paymentType);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("userId", storedAuthData?.userId);

    // Append uploaded files by category
    uploadedFiles.forEach((file, index) => {
      const fileObj = {
        uri: file.uri,
        type: file.type === "image" ? "image/jpeg" : "application/pdf",
        name: file.name,
      } as any;

      formDataToSend.append(`${file.category}_files`, fileObj);
    });

    try {
      console.log("Submitting expense data with files:", formDataToSend);
      formDataToObject(formDataToSend, "Update Expense--");

      // Use update API instead of add API
      const response = isEditMode
        ? await api.updateCorrectedExpenseForm(formDataToSend)
        : await api.addExpense(formDataToSend);

      if (response && response.success) {
        Alert.alert(
          "Success",
          `Expense details ${isEditMode ? "updated" : "saved"} successfully! ${
            uploadedFiles.length
          } file(s) uploaded.`
        );
        router.replace(`/(screens)/MainScreen`);
      } else {
        Alert.alert(
          "Error",
          response?.message ||
            `Failed to ${
              isEditMode ? "update" : "save"
            } expense details. Please try again.`
        );
      }
    } catch (error) {
      console.error("Error submitting expense details:", error);
      Alert.alert(
        "Error",
        `Failed to ${
          isEditMode ? "update" : "save"
        } expense details. Please check your connection and try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper
      headerProps={{ showOnlyLogout: true }}
      showScroll={!isDropdownOpen}
    >
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f89f22" />
          <Text className="mt-4 text-gray-600">Loading expense data...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 bg-white">
          <View className="p-6">
            <Text className="text-2xl font-bold text-primary mb-6">
              Expense Details
            </Text>

            {/* Name Field */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Name <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={formData.name}
                onChangeText={(value) => updateField("name", value)}
                placeholder="Enter your name"
                className="border border-gray-300 rounded-lg p-3 bg-white"
              />
            </View>

            {/* Brand Select */}
            <DynamicDropdown
              label="Brand"
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
              onDropdownToggle={setIsDropdownOpen}
            />

            {/* Activity Planned Date */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Activity Date <Text className="text-red-500">*</Text>
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
                  // minimumDate={getMinDate()} // T+2 minimum date
                />
              )}
            </View>

            {/* Activity Type Select */}
            {/* <DynamicDropdown
            label="Activity"
            placeholder="Select Activity"
            isRequired={true}
            selectedValue={formData.activityTypeId}
            selectedLabel={formData.activityTypeName}
            onSelect={handleActivityTypeSelect}
            apiCall={api.getAllActivityTypes}
            searchable={true}
            pageSize={10}
            noDataMessage="No activity types available"
            errorMessage="Failed to load activity types. Please try again."
              onDropdownToggle={setIsDropdownOpen}
          /> */}

            {/* Channel Select */}
            <DynamicDropdown
              label="Channel"
              placeholder="Select Channel"
              isRequired={true}
              selectedValue={formData.channelId}
              selectedLabel={formData.channelName}
              onSelect={handleChannelSelect}
              apiCall={api.getAllChannels}
              searchable={true}
              pageSize={10}
              noDataMessage="No channels available"
              errorMessage="Failed to load channels. Please try again."
              onDropdownToggle={setIsDropdownOpen}
            />

            {/* Project Select */}
            <DynamicDropdown
              label="Project"
              placeholder="Select Project"
              isRequired={true}
              selectedValue={formData.projectId}
              selectedLabel={formData.projectName}
              onSelect={handleProjectSelect}
              apiCall={api.getAllProjects}
              searchable={true}
              pageSize={10}
              noDataMessage="No projects available"
              errorMessage="Failed to load projects. Please try again."
              onDropdownToggle={setIsDropdownOpen}
            />

            {/* Paid To Field */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Paid To <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={formData.paidTo}
                onChangeText={(value) => updateField("paidTo", value)}
                placeholder="Enter paid to"
                className="border border-gray-300 rounded-lg p-3 bg-white"
              />
            </View>

            {/* Expense Category Radio Buttons */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-3">
                Expense Category <Text className="text-red-500">*</Text>
              </Text>
              <RadioButton
                selected={formData.expenseCategory === "PROJECT_EXPENSE"}
                onPress={() =>
                  updateField("expenseCategory", "PROJECT_EXPENSE")
                }
                label="Project Expense"
              />
              <RadioButton
                selected={formData.expenseCategory === "GENERAL_EXPENSE"}
                onPress={() =>
                  updateField("expenseCategory", "GENERAL_EXPENSE")
                }
                label="General Expense"
              />
            </View>

            {/* Nature of Expense Select */}
            <DynamicDropdown
              label="Nature of Expense"
              placeholder="Select Expense Type"
              isRequired={true}
              selectedValue={formData.expenseTypeId}
              selectedLabel={formData.expenseTypeName}
              onSelect={handleExpenseTypeSelect}
              apiCall={(params) =>
                api.getAllNatureOfExpense({
                  ...(params || {}),
                  expenseType:
                    formData.expenseCategory === "PROJECT_EXPENSE"
                      ? "PROJECT_EXPENSE"
                      : "GENERAL_EXPENSE",
                })
              }
              searchable={true}
              pageSize={10}
              noDataMessage="No expense types available"
              errorMessage="Failed to load expense types. Please try again."
              formatDisplayText={(item) => item.expenseName}
              formatSelectedText={(item) => item.expenseName}
              onDropdownToggle={setIsDropdownOpen}
            />

            {/* Amount Field */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Amount <Text className="text-red-500">*</Text>
              </Text>
              <Text className="text-xs text-gray-500 mb-2">
                Maximum amount: ₹19,999
              </Text>
              <TextInput
                value={formData.amount}
                onChangeText={handleAmountChange}
                placeholder="Enter amount"
                keyboardType="numeric"
                className="border border-gray-300 rounded-lg p-3 bg-white"
              />
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <Text className="text-sm text-gray-600 mt-1">
                  Amount: ₹{parseFloat(formData.amount).toFixed(2)}
                </Text>
              )}
            </View>

            {/* Expense Description Field */}
            {TRAVEL_EXPENSE_IDS.includes(formData.expenseTypeId) ? (
              <View className="mb-6">
                {/* Label */}
                <Text className="text-base font-semibold text-gray-800 mb-2">
                  Expense Description <Text className="text-red-500">*</Text>
                </Text>
                <Text className="text-sm text-gray-500 mb-3">
                  Please fill in the travel details below:
                </Text>

                {/* Description Box */}
                <View className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <View className="flex-row flex-wrap items-center">
                    <Text className="text-gray-700 text-sm">
                      I travelled from
                    </Text>

                    <TextInput
                      value={travelFields.from}
                      onChangeText={(v) => handleTravelFieldChange("from", v)}
                      placeholder="From"
                      className="border-b border-gray-400 text-sm text-gray-800 mx-2 px-1 pb-0.5 min-w-[90px]"
                    />

                    <Text className="text-gray-700 text-sm">to</Text>

                    <TextInput
                      value={travelFields.to}
                      onChangeText={(v) => handleTravelFieldChange("to", v)}
                      placeholder="To"
                      className="border-b border-gray-400 text-sm text-gray-800 mx-2 px-1 pb-0.5 min-w-[90px]"
                    />

                    <Text className="text-gray-700 text-sm">by</Text>

                    <TextInput
                      value={travelFields.mode}
                      onChangeText={(v) => handleTravelFieldChange("mode", v)}
                      placeholder="Mode"
                      className="border-b border-gray-400 text-sm text-gray-800 mx-2 px-1 pb-0.5 min-w-[100px]"
                    />

                    <Text className="text-gray-700 text-sm">for</Text>

                    <TextInput
                      value={travelFields.purpose}
                      onChangeText={(v) =>
                        handleTravelFieldChange("purpose", v)
                      }
                      placeholder="Purpose"
                      className="border-b border-gray-400 text-sm text-gray-800 mx-2 px-1 pb-0.5 min-w-[100px]"
                    />

                    <Text className="text-gray-700 text-sm">.</Text>
                  </View>
                </View>

                {/* Read-only preview (Optional) */}
                <Text className="text-xs text-gray-500 mt-3">
                  Description Preview:{" "}
                  <Text className="italic">{formData.description}</Text>
                </Text>
              </View>
            ) : (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Expense Description <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(value) => updateField("description", value)}
                  placeholder="Describe the expense in detail (purpose, items purchased, etc.)"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="border border-gray-300 rounded-lg p-3 bg-white min-h-[100px]"
                />
              </View>
            )}

            {/* Payment Type Radio Buttons */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-3">
                Payment Type <Text className="text-red-500">*</Text>
              </Text>
              <RadioButton
                selected={formData.paymentType === "CASH"}
                onPress={() => updateField("paymentType", "CASH")}
                label="Cash"
              />
              <RadioButton
                selected={formData.paymentType === "UPI_NETBANKING"}
                onPress={() => updateField("paymentType", "UPI_NETBANKING")}
                label="UPI/Net Banking"
              />
            </View>

            {/* Payment Supporting Upload - Only show when UPI/Net Banking is selected */}
            {formData.paymentType === "UPI_NETBANKING" &&
              renderFileUploadSection(
                "payment_supporting",
                "Payment Supporting Document",
                "Upload screenshot of payment transaction, bank statement, or payment receipt",
                true
              )}

            {/* Note about required uploads */}
            <View className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Text className="text-xs text-yellow-700">
                <Text className="font-medium">Note:</Text>
                {TRAVEL_EXPENSE_IDS.includes(formData.expenseTypeId)
                  ? "For travel expenses, Invoice/Receipt and BTA Voucher uploads are optional."
                  : "At least one of Invoice/Receipt or BTA Voucher must be uploaded."}
                {formData.paymentType === "UPI_NETBANKING" &&
                  " Payment supporting document is required for UPI/Net Banking payments."}
              </Text>
            </View>

            {/* Invoice/Receipt Upload */}
            {renderFileUploadSection(
              "invoice_receipt",
              "Invoice/Receipt",
              "Upload invoice, bill, or receipt for the expense"
            )}

            {/* BTA Voucher Upload */}
            {renderFileUploadSection(
              "bta_voucher",
              "BTA Voucher",
              "Upload BTA voucher or related document"
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              className="bg-primary rounded-lg p-4 items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-semibold text-lg ml-2">
                    Saving...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-lg">
                  {isEditMode
                    ? "Update Expense Details"
                    : "Save Expense Details"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
};

export default ExpenseForm;
