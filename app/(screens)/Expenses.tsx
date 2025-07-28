import ScreenWrapper from "@/components/ScreenWrapper";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { api } from "../../utils/api";
import { getAuthValue, getLocValue } from "../../utils/storage";

interface ExpenseItem {
  id: string;
  amount: number;
  name: string; // Changed from description to match backend
  paidTo: string;
  description: string;
  activityDate: string;
  paymentMode: string;
  createdAt: string; // Changed from date to match backend
  paymentSupporting: string;
  invoiceOrReceipt: string;
  btaVoucher: string;
  status: string;
  brand?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  natureOfExpense?: {
    id: string;
    expenseName: string;
  };
  lastApprovalComment?: {
    comment: string;
    status: string;
    role: string;
    stage: string;
    approver: {
      id: string;
      name: string;
      email: string;
    };
    createdAt: string;
  };
}

// Map backend status to frontend tabs
type ExpenseTabs =
  | "EXPENSE_SUBMITTED"
  | "EXPENSE_APPROVED"
  | "EXPENSE_QUERY"
  | "EXPENSE_DISAPPROVED";

const { width } = Dimensions.get("window");

const ExpensesScreen = () => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseItem[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [promoterId, setPromoterId] = useState<string | null>(null);
  const [activityLocId, setActivityLocId] = useState(null);
  const [activityLocName, setActivityLocName] = useState("");
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(
    null
  );
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: string]: number;
  }>({});

  // Modal state for image viewing
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Search debounce state
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<ExpenseTabs>("EXPENSE_SUBMITTED");
  const [tabCounts, setTabCounts] = useState({
    EXPENSE_SUBMITTED: 0,
    EXPENSE_APPROVED: 0,
    EXPENSE_QUERY: 0,
    EXPENSE_DISAPPROVED: 0,
  });

  const router = useRouter();

  const isExpoGo = Constants.appOwnership === "expo";

  // Get stored values from authStorage
  const getStoredData = async () => {
    try {
      const storedPromoterId = await getAuthValue("userId");
      const storedActivityLocId = await getLocValue("activityLocId");
      const storedActivityLocName = await getLocValue("activityLocName");

      if (storedPromoterId) setPromoterId(storedPromoterId);
      if (storedActivityLocName) setActivityLocName(storedActivityLocName);
      if (storedActivityLocId) setActivityLocId(storedActivityLocId);
    } catch (err) {
      console.log("Error: ", err);
    }
  };

  useEffect(() => {
    getStoredData();
  }, []);

  // Tab configuration with backend status mapping
  const tabs = [
    {
      key: "EXPENSE_SUBMITTED" as ExpenseTabs,
      label: "Submitted",
      icon: "time-outline",
      color: "#3B82F6",
      bgColor: "#FEF3C7",
    },
    {
      key: "EXPENSE_APPROVED" as ExpenseTabs,
      label: "Approved",
      icon: "checkmark-circle-outline",
      color: "#10B981",
      bgColor: "#D1FAE5",
    },
    {
      key: "EXPENSE_QUERY" as ExpenseTabs,
      label: "Query",
      icon: "help-circle-outline",
      color: "#F59E0B",
      bgColor: "#FEF3C7",
    },
    {
      key: "EXPENSE_DISAPPROVED" as ExpenseTabs,
      label: "Rejected",
      icon: "close-circle-outline",
      color: "#EF4444",
      bgColor: "#FEE2E2",
    },
  ];

  // Handle search with debouncing
  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);

      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      const newTimeout = setTimeout(() => {
        setCurrentPage(1); // Reset to first page when searching
        fetchExpenses(activeTab, text, 1, true);
      }, 500); // Increased debounce time for API calls

      setSearchTimeout(newTimeout);
    },
    [activeTab, searchTimeout]
  );

  const requestStoragePermission = async () => {
    if (Platform.OS === "android" && !isExpoGo) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Storage Permission",
            message: "App needs access to storage to download files",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Fetch expenses from API
  const fetchExpenses = async (
    expenseTab = activeTab,
    searchTerm = searchQuery,
    page = currentPage,
    resetData = false
  ) => {
    if (!promoterId) return;

    if (resetData || page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setError(null);

    try {
      const params = {
        tab: expenseTab,
        userId: promoterId,
        page: page.toString(),
        limit: "10",
        sortBy: "createdAt",
        sortOrder: "desc",
        ...(searchTerm && { search: searchTerm }),
        // Add optional filters if needed
        // brandId: selectedBrandId,
        // projectId: selectedProjectId,
        // channelId: selectedChannelId,
        // from: fromDate,
        // to: toDate,
      };

      const response = await api.getExpensesByTab(params);

      if (response.success) {
        const { data, meta } = response;

        if (resetData || page === 1) {
          setExpenses(data);
          setFilteredExpenses(data);
        } else {
          // Append new data for pagination
          setExpenses((prev) => [...prev, ...data]);
          setFilteredExpenses((prev) => [...prev, ...data]);
        }

        // Update pagination state
        setCurrentPage(meta.page);
        setTotalPages(meta.pageCount);
        setHasNextPage(meta.page < meta.pageCount);

        // Update tab counts
        setTabCounts({
          EXPENSE_SUBMITTED: meta.tabCounts.EXPENSE_SUBMITTED,
          EXPENSE_APPROVED: meta.tabCounts.EXPENSE_APPROVED,
          EXPENSE_QUERY: meta.tabCounts.EXPENSE_QUERY,
          EXPENSE_DISAPPROVED: meta.tabCounts.EXPENSE_DISAPPROVED,
        });

        // Calculate total for current filtered results
        setTotalExpenses(
          data.reduce(
            (sum: number, expense: ExpenseItem) => sum + expense.amount,
            0
          )
        );
      } else {
        throw new Error(response.message || "Failed to fetch expenses");
      }
    } catch (error: any) {
      setError(error.message || "Failed to load expenses. Please try again.");
      console.error("Expenses API error:", error);

      // Show user-friendly error
      Alert.alert(
        "Error",
        "Unable to load expenses. Please check your connection and try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (promoterId) {
      fetchExpenses(activeTab, searchQuery, 1, true);
    }
  }, [promoterId, activeTab]);

  // Load more expenses (pagination)
  const loadMoreExpenses = () => {
    if (!loadingMore && hasNextPage && !loading) {
      fetchExpenses(activeTab, searchQuery, currentPage + 1, false);
    }
  };

  // Get expense icon based on nature of expense or fallback
  const getExpenseIcon = (expense: ExpenseItem) => {
    const expenseType =
      expense.natureOfExpense?.expenseName?.toLowerCase() || "";

    if (expenseType.includes("fuel") || expenseType.includes("petrol")) {
      return "car-outline";
    } else if (expenseType.includes("food") || expenseType.includes("meal")) {
      return "restaurant-outline";
    } else if (
      expenseType.includes("transport") ||
      expenseType.includes("travel")
    ) {
      return "bus-outline";
    } else {
      return "receipt-outline";
    }
  };

  const getExpenseColor = (expense: ExpenseItem) => {
    const expenseType =
      expense.natureOfExpense?.expenseName?.toLowerCase() || "";

    if (expenseType.includes("fuel") || expenseType.includes("petrol")) {
      return "#EF4444";
    } else if (expenseType.includes("food") || expenseType.includes("meal")) {
      return "#10B981";
    } else if (
      expenseType.includes("transport") ||
      expenseType.includes("travel")
    ) {
      return "#3B82F6";
    } else {
      return "#8B5CF6";
    }
  };

  const getStatusBadge = (status: string) => {
    const tab = tabs.find((t) => t.key === status);
    console.log("getStatusBadge tab", tab);
    if (!tab) return { color: "#6B7280", bgColor: "#F3F4F6", label: "Unknown" };

    return {
      color: tab.color,
      bgColor: tab.bgColor,
      label: tab.label,
    };
  };

  // Helper function to check if URL is an image
  const isImageUrl = (url: string) => {
    if (!url) return false;
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    return imageExtensions.some((ext) => url.toLowerCase().includes(ext));
  };

  // Helper function to check if URL is a PDF
  const isPdfUrl = (url: string) => {
    if (!url) return false;
    return url.toLowerCase().includes(".pdf");
  };

  // Helper function to get file name from URL
  const getFileName = (url: string) => {
    if (!url) return "";
    const parts = url.split("/");
    const fileName = parts[parts.length - 1];
    // Clean up the file name by removing UUID parts
    return fileName.replace(/^\d+-[a-f0-9-]+-/, "");
  };

  // Helper function to download file
  const handleDownload = async (url: string, fileName: string) => {
    // First ask user for confirmation
    const downloadMessage = isExpoGo
      ? `Do you want to download ${fileName}?\n\nNote: In Expo Go, the file will be shared so you can save it to your preferred location.`
      : `Do you want to download ${fileName}?\n\nThe file will be saved to your Downloads folder.`;

    Alert.alert("Download File", downloadMessage, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Download",
        onPress: async () => {
          try {
            // Show download started message
            if (isExpoGo) {
              Alert.alert(
                "Download Started",
                `Downloading ${fileName}...\n\nNote: In Expo Go, files will be shared instead of saved directly to Downloads.`
              );
            } else {
              Alert.alert("Download Started", `Downloading ${fileName}...`);
            }

            // Create unique key for progress tracking
            const downloadKey = `${Date.now()}_${fileName}`;
            setDownloadProgress((prev) => ({ ...prev, [downloadKey]: 0 }));

            // Configure download to app's document directory
            const fileUri = FileSystem.documentDirectory + fileName;

            const downloadResumable = FileSystem.createDownloadResumable(
              url,
              fileUri,
              {},
              (downloadProgress) => {
                const progress =
                  downloadProgress.totalBytesWritten /
                  downloadProgress.totalBytesExpectedToWrite;
                setDownloadProgress((prev) => ({
                  ...prev,
                  [downloadKey]: Math.round(progress * 100),
                }));
              }
            );

            // Start download
            const result = await downloadResumable.downloadAsync();

            if (result) {
              // Remove progress tracking
              setDownloadProgress((prev) => {
                const newProgress = { ...prev };
                delete newProgress[downloadKey];
                return newProgress;
              });

              if (isExpoGo || Platform.OS === "ios") {
                // For Expo Go or iOS: Use sharing
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(result.uri, {
                    mimeType: "application/pdf",
                    dialogTitle: "Save PDF Document",
                  });
                } else {
                  Alert.alert(
                    "Download Complete",
                    `File saved to app documents. File location: ${result.uri}`,
                    [
                      { text: "OK" },
                      {
                        text: "Open File",
                        onPress: () => openDownloadedFile(result.uri, fileName),
                      },
                    ]
                  );
                }
              } else {
                // For production Android build: Try to save to public directory
                await saveToPublicDirectory(result.uri, fileName);
              }
            }
          } catch (error) {
            console.error("Download error:", error);
            Alert.alert(
              "Download Failed",
              "Failed to download the file. Please try again.",
              [{ text: "OK" }]
            );

            // Clean up progress tracking on error
            setDownloadProgress((prev) => {
              const newProgress = { ...prev };
              Object.keys(newProgress).forEach((key) => {
                if (key.includes(fileName)) {
                  delete newProgress[key];
                }
              });
              return newProgress;
            });
          }
        },
      },
    ]);
  };

  const saveToPublicDirectory = async (fileUri: string, fileName: string) => {
    try {
      // Request permissions first
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        // Fallback to sharing if no permission
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: "Save PDF Document",
        });
        return;
      }

      // For Android production builds, copy to Downloads
      const downloadsDir = FileSystem.documentDirectory + "Downloads/";

      // Ensure Downloads directory exists
      const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadsDir, {
          intermediates: true,
        });
      }

      const finalUri = downloadsDir + fileName;
      await FileSystem.copyAsync({
        from: fileUri,
        to: finalUri,
      });

      Alert.alert(
        "Download Complete",
        `${fileName} has been saved to Downloads folder`,
        [
          { text: "OK" },
          {
            text: "Open File",
            onPress: () => openDownloadedFile(finalUri, fileName),
          },
        ]
      );
    } catch (error) {
      console.error("Save to public directory error:", error);
      // Fallback to sharing
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        dialogTitle: "Save PDF Document",
      });
    }
  };

  const openDownloadedFile = async (fileUri: string, fileName: string) => {
    try {
      if (Platform.OS === "android") {
        // Use IntentLauncher to open PDF with default app
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: fileUri,
          type: "application/pdf",
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        });
      } else {
        // For iOS, use sharing which allows opening in other apps
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
        });
      }
    } catch (error) {
      console.error("Error opening file:", error);
      Alert.alert(
        "Cannot Open File",
        "Please install a PDF reader app to view this file.",
        [{ text: "OK" }]
      );
    }
  };

  // Handle media item press
  const handleMediaPress = (url: string, fileName: string) => {
    if (isImageUrl(url)) {
      setSelectedImage(url);
      setModalVisible(true);
    } else {
      handleDownload(url, fileName);
    }
  };

  // Render small media preview component
  const renderMediaPreview = (url: string, label: string) => {
    if (!url) return null;

    const fileName = getFileName(url);
    const isImage = isImageUrl(url);
    const isPdf = isPdfUrl(url);

    // Check if this file is being downloaded
    const downloadKey = Object.keys(downloadProgress).find((key) =>
      key.includes(fileName)
    );
    const progress = downloadKey ? downloadProgress[downloadKey] : null;

    return (
      <TouchableOpacity
        key={url}
        onPress={() => handleMediaPress(url, fileName)}
        className="mr-3"
        disabled={progress !== null} // Disable during download
      >
        <View className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          {isImage ? (
            <>
              <Image
                source={{ uri: url }}
                className="w-full h-full"
                resizeMode="cover"
                onError={() => {
                  console.log("Failed to load image:", url);
                }}
              />
              <View className="absolute bottom-1 right-1 bg-black bg-opacity-60 rounded-full p-1">
                <Ionicons name="expand-outline" size={8} color="white" />
              </View>
            </>
          ) : (
            <View className="w-full h-full items-center justify-center">
              {progress !== null ? (
                // Show download progress
                <View className="items-center justify-center">
                  <Text className="text-xs font-bold text-blue-600">
                    {progress}%
                  </Text>
                  <View className="w-8 h-1 bg-gray-200 rounded mt-1">
                    <View
                      className="h-1 bg-blue-600 rounded"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                </View>
              ) : (
                <>
                  <Ionicons
                    name={isPdf ? "document-text-outline" : "document-outline"}
                    size={24}
                    color={isPdf ? "#EF4444" : "#6B7280"}
                  />
                  <View className="absolute bottom-1 right-1 bg-black bg-opacity-60 rounded-full p-1">
                    <Ionicons
                      name={isExpoGo ? "share-outline" : "download-outline"}
                      size={8}
                      color="white"
                    />
                  </View>
                </>
              )}
            </View>
          )}
        </View>
        <Text
          className="text-xs text-gray-500 mt-1 text-center w-16"
          numberOfLines={1}
        >
          {progress !== null ? "Downloading..." : label}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleExpenseClick = (item: any) => {
    setSelectedExpense(item);
    setApprovalModalVisible(true);
  };

  // Enhanced renderExpenseItem function with inline media previews
  const renderExpenseItem = ({ item }: { item: ExpenseItem }) => {
    const statusBadge = item.status;

    const mediaFiles = [
      { url: item.paymentSupporting, label: "Payment" },
      { url: item.invoiceOrReceipt, label: "Invoice" },
      { url: item.btaVoucher, label: "Voucher" },
    ].filter((file) => file.url);

    return (
      <TouchableOpacity
        className="bg-white mx-4 mb-5 rounded-2xl shadow-md border border-gray-100"
        activeOpacity={0.7}
        onPress={() => {
          if (["EXPENSE_QUERY", "EXPENSE_DISAPPROVED"].includes(activeTab)) {
            handleExpenseClick(item);
          }
        }}
      >
        <View className="p-5">
          {/* Header Section */}
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-1">
                {item.name}
              </Text>
              <Text className="text-gray-500 text-sm">
                Paid to: {item.paidTo}
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-xl font-bold text-gray-800 mb-1">
                ₹{item.amount.toLocaleString()}
              </Text>
              <View className="px-3 py-1 rounded-full bg-gray-100">
                <Text className="text-xs font-semibold text-gray-700">
                  {statusBadge}
                </Text>
              </View>
            </View>
          </View>

          {/* Grid Info Section */}
          <View className="space-y-3 mb-4">
            <View className="flex-row justify-between">
              {item.brand && (
                <View className="flex-1 mr-2">
                  <Text className="text-gray-400 text-xs font-medium mb-0.5">
                    BRAND
                  </Text>
                  <Text className="text-gray-800 text-sm font-semibold">
                    {item.brand.name}
                  </Text>
                </View>
              )}
              {item.channel && (
                <View className="flex-1 ml-2">
                  <Text className="text-gray-400 text-xs font-medium mb-0.5">
                    CHANNEL
                  </Text>
                  <Text className="text-gray-800 text-sm font-semibold">
                    {item.channel.name}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row justify-between">
              <View className="flex-1 mr-2">
                <Text className="text-gray-400 text-xs font-medium mb-0.5">
                  ACTIVITY DATE
                </Text>
                <Text className="text-gray-800 text-sm font-semibold">
                  {format(new Date(item.activityDate), "MMM d, yyyy")}
                </Text>
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-gray-400 text-xs font-medium mb-0.5">
                  PAYMENT MODE
                </Text>
                <Text className="text-gray-800 text-sm font-semibold">
                  {item.paymentMode}
                </Text>
              </View>
            </View>

            {item.natureOfExpense && (
              <View>
                <Text className="text-gray-400 text-xs font-medium mb-0.5">
                  NATURE OF EXPENSE
                </Text>
                <Text className="text-gray-800 text-sm font-semibold">
                  {item.natureOfExpense.expenseName}
                </Text>
              </View>
            )}
          </View>

          {/* Documents Section */}
          {mediaFiles.length > 0 && (
            <View className="border-t border-gray-100 pt-4">
              <Text className="text-gray-700 font-medium mb-3">
                Documents ({mediaFiles.length})
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {mediaFiles.map((file) =>
                  renderMediaPreview(file.url, file.label)
                )}
              </View>
            </View>
          )}

          {/* Footer */}
          <View className="flex-row justify-between items-center mt-5 pt-4 border-t border-gray-100">
            <Text className="text-gray-400 text-xs">
              Created:{" "}
              {format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => {
                Alert.alert(
                  "Expense Description",
                  item.description || "No description"
                );
              }}
            >
              <Text className="text-blue-600 text-xs font-medium mr-1">
                View Description
              </Text>
              <Ionicons
                name="chevron-forward-outline"
                size={14}
                color="#3B82F6"
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Handle tab change
  const handleTabChange = (tabKey: ExpenseTabs) => {
    if (tabKey !== activeTab) {
      setActiveTab(tabKey);
      setSearchQuery("");
      setCurrentPage(1);
      fetchExpenses(tabKey, "", 1, true);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setSearchQuery("");
    setCurrentPage(1);
    fetchExpenses(activeTab, "", 1, true);
  };

  // Render improved tab bar
  const renderTabBar = () => (
    <View className="mx-4 my-6 ">
      <View className="bg-white rounded-3xl shadow-sm p-2">
        <View className="flex-row">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTabChange(tab.key)}
                className={`flex-1 items-center py-4 px-2 rounded-2xl ${
                  isActive ? "bg-blue-50" : ""
                }`}
                style={isActive ? { backgroundColor: `${tab.color}10` } : {}}
              >
                <View className="relative">
                  <Ionicons
                    name={tab.icon as any}
                    size={24}
                    color={isActive ? tab.color : "#9CA3AF"}
                  />
                  {tabCounts[tab.key] > 0 && (
                    <View
                      className="absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full items-center justify-center"
                      style={{ backgroundColor: tab.color }}
                    >
                      <Text className="text-white text-xs font-bold">
                        {tabCounts[tab.key]}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  className={`text-xs font-semibold mt-2 ${
                    isActive ? "opacity-100" : "text-gray-500"
                  }`}
                  style={isActive ? { color: tab.color } : {}}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  // Render search bar
  const renderSearchBar = () => (
    <View className="mx-4 mb-6">
      <View className="bg-white rounded-2xl shadow-sm">
        <View className="p-4">
          <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-3 text-gray-800 text-base"
              placeholder={`Search ${activeTab} expenses...`}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Results summary */}
          <View className="flex-row justify-between items-center mt-4">
            <Text className="text-gray-600 text-sm">
              {filteredExpenses.length} of {tabCounts[activeTab]} expenses
            </Text>
            {searchQuery && (
              <Text className="text-blue-600 text-sm font-medium">
                "{searchQuery}"
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => {
    const currentTab = tabs.find((t) => t.key === activeTab);

    return (
      <View className="items-center justify-center py-16 mx-4">
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: `${currentTab?.color}10` }}
        >
          <Ionicons
            name={currentTab?.icon as any}
            size={48}
            color={currentTab?.color}
          />
        </View>
        <Text className="text-gray-900 text-xl font-bold mb-2">
          No {activeTab.toLowerCase().replace("expense_", "")} expenses
        </Text>
        <Text className="text-gray-500 text-center leading-6">
          {searchQuery
            ? `No expenses match "${searchQuery}". Try adjusting your search.`
            : `You don't have any ${activeTab
                .toLowerCase()
                .replace("expense_", "")} expenses yet.`}
        </Text>
      </View>
    );
  };

  // Render footer for pagination
  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text className="text-gray-500 mt-2 text-sm">Loading more...</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-4 text-base">
          Loading expenses...
        </Text>
      </View>
    );
  }

  return (
    <ScreenWrapper headerProps={null} showScroll={false}>
      <View className="flex-1 bg-gray-50">
        <FlatList
          data={filteredExpenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {renderTabBar()}
              {renderSearchBar()}
              {/* {filteredExpenses.length > 0 && renderSummaryHeader()} */}
            </>
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#3B82F6"]}
              tintColor="#3B82F6"
            />
          }
          onEndReached={loadMoreExpenses}
          onEndReachedThreshold={0.1}
          contentContainerStyle={{
            paddingBottom: 120,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        />

        {/* Enhanced Floating Action Button */}
        <TouchableOpacity
          onPress={() => {
            router.push("/(form)/AddExpense" as any);
          }}
          className="absolute bottom-8 right-6 bg-primary rounded-full w-16 h-16 items-center justify-center shadow-lg"
          style={{
            shadowColor: "#3B82F6",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>

        {/* Image Viewer Modal */}
        <Modal
          visible={modalVisible && !!selectedImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={{ flex: 1 }}>
            {selectedImage && (
              <>
                <ImageViewer
                  imageUrls={[{ url: selectedImage }]}
                  enableSwipeDown
                  onSwipeDown={() => setModalVisible(false)}
                  backgroundColor="rgba(0, 0, 0, 0.9)"
                  renderIndicator={() => <View />}
                />
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    position: "absolute",
                    top: 60,
                    right: 20,
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    padding: 10,
                    borderRadius: 20,
                  }}
                >
                  <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </Modal>

        {/* Approval Comment Modal */}
        <Modal
          visible={approvalModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setApprovalModalVisible(false)}
        >
          <View className="flex-1 bg-black/80 justify-center items-center p-4">
            <View className="bg-white mx-4 rounded-2xl p-6 w-11/12 max-w-md">
              {selectedExpense?.lastApprovalComment && (
                <>
                  {/* Header */}
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-bold text-gray-900">
                      {selectedExpense?.lastApprovalComment.status ===
                      "QUERY_RAISED"
                        ? "Query Details"
                        : "Rejected Details"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setApprovalModalVisible(false)}
                    >
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Approval Details */}
                  <View className="space-y-4 mb-6">
                    {/* Approver Info */}
                    <View>
                      <Text className="text-gray-500 text-xs font-medium mb-1">
                        FROM
                      </Text>
                      <Text className="text-gray-900 text-sm font-semibold">
                        {selectedExpense.lastApprovalComment.approver.name} (
                        {selectedExpense.lastApprovalComment.role})
                      </Text>
                    </View>

                    {/* Comment */}
                    <View>
                      <Text className="text-gray-500 text-xs font-medium mb-1">
                        COMMENT
                      </Text>
                      <View className="bg-gray-50 rounded-lg p-3">
                        <Text className="text-gray-900 text-sm leading-5">
                          {selectedExpense.lastApprovalComment.comment}
                        </Text>
                      </View>
                    </View>

                    {/* Date */}
                    <View>
                      <Text className="text-gray-500 text-xs font-medium mb-1">
                        DATE
                      </Text>
                      <Text className="text-gray-900 text-sm font-semibold">
                        {format(
                          new Date(
                            selectedExpense.lastApprovalComment.createdAt
                          ),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  {selectedExpense?.lastApprovalComment.status ===
                    "QUERY_RAISED" && (
                    <View className="flex-row space-x-3 gap-2">
                      <TouchableOpacity
                        onPress={() => setApprovalModalVisible(false)}
                        className="flex-1 bg-gray-100 py-3 px-4 rounded-xl"
                      >
                        <Text className="text-gray-700 font-semibold text-center">
                          Close
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setApprovalModalVisible(false);
                          router.push({
                            pathname: "/(form)/AddExpense",
                            params: {
                              expenseId: selectedExpense.id,
                            },
                          });
                        }}
                        className="flex-1 bg-blue-600 py-3 px-4 rounded-xl"
                      >
                        <Text className="text-white font-semibold text-center">
                          Edit Expense
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
};

export default ExpensesScreen;
