import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../utils/api";
import { getAuthValue } from "../../utils/storage";

interface ChannelStats {
  totalChannels: number;
  activeChannels: number;
  newChannelsToday: number;
  totalRevenue: number;
}

interface ActivityLocation {
  id: string;
  name: string;
  address?: string;
}

interface Brand {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
}

interface ChannelTransaction {
  UTR: string;
}

interface ChannelItem {
  id: string;
  name: string;
  description: string;
  status: string;
  PaymentStatus: string;
  createdDate: string;
  // lastActive: string;
  revenue: number;
  subscriberCount: number;
  eventDate: string;
  activityLocation?: ActivityLocation;
  brand?: Brand;
  project?: Project;
  activity?: Activity;
  ChannelTransaction?: ChannelTransaction[];
  activityPlannedDate: string;
  activityToDate: string;
  activityFromDate: string;
  activityType?: string;
  channelManagerName?: string;
  channelManagerPhone?: string;
  channelName?: string;
  channelDescription?: string;
}

interface ApiResponse {
  success: boolean;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  data: any[];
  meta: {
    upcoming: number;
    past: number;
    cancelled: number;
  };
}

interface RescheduleFormData {
  activityDate: Date;
  timeFrom: Date;
  timeTo: Date;
}

type ChannelType = "upcoming" | "past" | "cancelled";

const MainDashboard = () => {
  // Channel Stats State
  const [channelStats, setChannelStats] = useState<ChannelStats>({
    totalChannels: 0,
    activeChannels: 0,
    newChannelsToday: 0,
    totalRevenue: 0,
  });

  // Tab State
  const [activeTab, setActiveTab] = useState<ChannelType>("upcoming");
  const [tabCounts, setTabCounts] = useState({
    upcoming: 0,
    past: 0,
    cancelled: 0,
  });

  // List State
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<ChannelItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Data State
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  // FAB State
  const [fabExpanded, setFabExpanded] = useState(false);
  const [fabAnimation] = useState(new Animated.Value(0));

  // Search debounce state
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Cancel Modal state
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Reschedule Modal State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ChannelItem | null>(
    null
  );
  const [rescheduleFormData, setRescheduleFormData] =
    useState<RescheduleFormData>({
      activityDate: new Date(),
      timeFrom: new Date(),
      timeTo: new Date(),
    });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState({
    from: false,
    to: false,
  });
  const [rescheduling, setRescheduling] = useState(false);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [itemsPerPage] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);

  const router = useRouter();
  const currentDate = format(new Date(), "EEEE, MMMM d, yyyy");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Get status bar height
  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  // Tab configuration
  const tabs = [
    {
      key: "upcoming" as ChannelType,
      label: "Upcoming",
      icon: "calendar-outline",
    },
    {
      key: "past" as ChannelType,
      label: "Past",
      icon: "checkmark-done-outline",
    },
    {
      key: "cancelled" as ChannelType,
      label: "Cancelled",
      icon: "close-circle-outline",
    },
  ];

  // Get stored user data
  const getStoredData = async () => {
    try {
      const storedUserId = await getAuthValue("userId");

      setUserId(storedUserId);
    } catch (err) {
      console.log("Error getting stored data: ", err);
    }
  };

  useEffect(() => {
    getStoredData();
  }, []);

  // Transform API data to match component interface
  const transformApiData = (apiData: any[]): ChannelItem[] => {
    return apiData.map((item) => ({
      id:
        item.id ||
        item.channelActivityId?.toString() ||
        Math.random().toString(),
      name:
        item.channelName ||
        item.name ||
        item.activityType ||
        "Unnamed Activity",
      description:
        item.channelDescription ||
        item.description ||
        item.activityType ||
        "No description available",
      category: item.category || item.activityType || "General",
      status: item.status,
      PaymentStatus: item.PaymentStatus,
      createdDate:
        item.createdAt || item.createdDate || new Date().toISOString(),
      // lastActive: item.updatedAt || item.lastActive || new Date().toISOString(),
      revenue: item.revenue || 0,
      subscriberCount: item.subscriberCount || 0,
      eventDate:
        item.activityPlannedDate || item.eventDate || new Date().toISOString(),
      activityPlannedDate: item.activityPlannedDate,
      activityToDate: item.activityToDate,
      activityFromDate: item.activityFromDate,
      activityType: item.activityType,
      channelName: item.channelName,
      channelManagerName: item.channelManagerName,
      channelManagerPhone: item.channelManagerPhone,
      channelDescription: item.channelDescription,
      activityLocation: item.activityLocation,
      brand: item.brand,
      project: item.project,
      activity: item.activity,
      ChannelTransaction: Array.isArray(item.ChannelTransaction)
        ? item.ChannelTransaction
        : [],
    }));
  };

  // Fetch channel statistics (you might want to create a separate API for this)
  const fetchChannelStats = async () => {
    try {
      // For now, calculate stats from the tab counts
      const totalChannels =
        tabCounts.upcoming + tabCounts.past + tabCounts.cancelled;
      const activeChannels = tabCounts.upcoming + tabCounts.past;

      setChannelStats({
        totalChannels,
        activeChannels,
        newChannelsToday: 0, // You'll need to implement this in your API
        totalRevenue: 0, // You'll need to implement this in your API
      });
    } catch (error) {
      console.log("Error calculating channel stats:", error);
    }
  };

  // Fetch channels from API with search parameter
  const fetchChannels = async (
    channelType = activeTab,
    searchTerm = searchQuery,
    page = currentPage,
    append = false // New parameter to handle load more
  ) => {
    if (!userId) return;

    // Set appropriate loading state
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      // Prepare API parameters
      const apiParams: any = {
        userId: userId,
        tab: channelType,
        page: page.toString(),
        limit: itemsPerPage.toString(),
      };

      // Add search parameter if search term exists
      if (searchTerm && searchTerm.trim()) {
        apiParams.search = searchTerm.trim();
      }

      const response: ApiResponse =
        await api.getDashboardActivityDetails(apiParams);

      if (response.success) {
        const transformedData = transformApiData(response.data);

        // If append is true (for load more), append to existing data
        if (append && page > 1) {
          setChannels((prev) => [...prev, ...transformedData]);
          setFilteredChannels((prev) => [...prev, ...transformedData]);
        } else {
          // Replace data (for initial load or tab change)
          setChannels(transformedData);
          setFilteredChannels(transformedData);
        }

        // Update pagination state
        setCurrentPage(response.currentPage || page);
        setTotalPages(response.totalPages || 1);
        setTotalRecords(response.totalRecords || 0);
        setHasNextPage(response.currentPage < response.totalPages || false);
        setHasPreviousPage(response.currentPage > 1 || false);

        // Update tab counts
        setTabCounts(response.meta);

        setError(null);
      } else {
        throw new Error("Failed to fetch channels");
      }
    } catch (error) {
      console.log("Error fetching channels:", error);
      setError("Failed to fetch channels");
      Alert.alert("Error", "Failed to fetch channels. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tabKey: ChannelType) => {
    if (tabKey !== activeTab) {
      setActiveTab(tabKey);
      setSearchQuery(""); // Reset search when changing tabs
      setCurrentPage(1); // Reset pagination
      fetchChannels(tabKey, "", 1, false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      setCurrentPage(1); // Ensure we start from page 1
      fetchChannels(activeTab, "", 1, false);
    }
  }, [userId]);

  // Update stats when tab counts change
  useEffect(() => {
    fetchChannelStats();
  }, [tabCounts]);

  // Handle search with debouncing and API call
  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      setCurrentPage(1); // Reset to first page when searching

      // Clear existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Set new timeout for debounced search
      const newTimeout = setTimeout(() => {
        fetchChannels(activeTab, text, 1, false);
      }, 500); // 500ms debounce delay

      setSearchTimeout(newTimeout);
    },
    [activeTab, searchTimeout]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Handle Load more
  const handleLoadMore = () => {
    if (hasNextPage && !loading && !loadingMore) {
      const nextPage = currentPage + 1;
      fetchChannels(activeTab, searchQuery, nextPage, true);
    }
  };

  // Function to handle scroll end reached
  const onEndReached = () => {
    handleLoadMore();
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setSearchQuery("");
    setCurrentPage(1); // Reset pagination
    setLoadingMore(false); // Reset loading more state
    fetchChannels(activeTab, "", 1, false);
  };

  // Add this handler to receive analytics data changes
  const handleAnalyticsDataChange = (metric: string, period: string) => {
    console.log("Analytics data changed:", metric, period);
  };

  // FAB Animation Functions
  const toggleFAB = () => {
    const toValue = fabExpanded ? 0 : 1;

    Animated.spring(fabAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 5,
      tension: 80,
    }).start();

    setFabExpanded(!fabExpanded);
  };

  const closeFAB = () => {
    if (fabExpanded) {
      Animated.spring(fabAnimation, {
        toValue: 0,
        useNativeDriver: true,
        friction: 5,
        tension: 80,
      }).start(() => setFabExpanded(false));
    }
  };

  // Handle FAB option selections
  const handleAddNewChannel = () => {
    closeFAB();
    router.push("/(form)/BasicDetails" as any);
  };

  const handleEditExistingChannel = () => {
    closeFAB();
    router.push("/(screens)/ChannelList" as any);
  };

  // Reschedule Modal Functions
  const openRescheduleModal = (item: ChannelItem) => {
    setSelectedActivity(item);

    // Initialize form data with current activity date/time
    const currentDate = new Date(item.activityPlannedDate);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2); // T+2 minimum

    setRescheduleFormData({
      activityDate: currentDate < minDate ? minDate : currentDate,
      timeFrom: new Date(item.activityFromDate),
      timeTo: new Date(item.activityToDate),
    });

    setShowRescheduleModal(true);
  };

  const closeRescheduleModal = () => {
    setShowRescheduleModal(false);
    setSelectedActivity(null);
    setShowDatePicker(false);
    setShowTimePicker({ from: false, to: false });
  };

  const handleCancelActivity = (item: ChannelItem) => {
    Alert.alert(
      "Cancel Activity",
      "Are you sure you want to cancel this Activity?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            const payload = {
              id: item.id,
              status: item.status,
              cancelledReason: cancelReason,
            };
            try {
              await api.cancelActivity(payload);
              Alert.alert("Success", "Activity cancelled successfully");
              handleCloseCancelModal();
              fetchChannels(); // Refresh the list
            } catch (error) {
              console.log("Error cancelling activity:", error);
              Alert.alert(
                "Error",
                "Failed to cancel activity. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedActivity) return;

    setRescheduling(true);
    try {
      const payload = {
        id: selectedActivity.id,
        activityDate: rescheduleFormData.activityDate.toISOString(),
        timeFrom: rescheduleFormData.timeFrom.toISOString(),
        timeTo: rescheduleFormData.timeTo.toISOString(),
      };

      await api.rescheduleActivity(payload);
      Alert.alert("Success", "Activity rescheduled successfully");
      closeRescheduleModal();
      fetchChannels(); // Refresh the list
    } catch (error) {
      console.log("Error rescheduling activity:", error);
      Alert.alert("Error", "Failed to reschedule activity. Please try again.");
    } finally {
      setRescheduling(false);
    }
  };

  // Date/Time formatting functions
  const formatDate = (date: Date) => {
    return format(date, "MMM d, yyyy");
  };

  const formatTime = (date: Date) => {
    return format(date, "h:mm a");
  };

  // Get minimum date (T+2, or T+1 if PAYMENT_COMPLETED)
  const getMinimumDate = () => {
    const today = new Date();
    const day = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

    // If selected activity has PAYMENT_COMPLETED status, allow T+1
    if (selectedActivity?.status === "PAYMENT_COMPLETED") {
      today.setDate(today.getDate() + 1); // T+1
      return today;
    }

    // For past tab activities that are not completed, allow T+1
    if (activeTab === "past" && selectedActivity?.status !== "COMPLETED") {
      today.setDate(today.getDate() + 1); // T+1
      return today;
    }

    // Weekend handling for non-PAYMENT_COMPLETED activities
    if (day === 5) {
      // Friday
      today.setDate(today.getDate() + 4); // T+4
      return today;
    }

    if (day === 6) {
      // Saturday
      today.setDate(today.getDate() + 3); // T+3
      return today;
    }

    // Default: T+2 for regular activities
    today.setDate(today.getDate() + 2);
    return today;
  };

  // Date picker handlers
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setRescheduleFormData((prev) => ({
        ...prev,
        activityDate: selectedDate,
      }));
    }
  };

  const handleTimeChange = (
    event: any,
    selectedTime?: Date,
    type?: "from" | "to"
  ) => {
    if (type === "from") {
      setShowTimePicker((prev) => ({ ...prev, from: false }));
      if (selectedTime) {
        setRescheduleFormData((prev) => ({
          ...prev,
          timeFrom: selectedTime,
        }));
      }
    } else if (type === "to") {
      setShowTimePicker((prev) => ({ ...prev, to: false }));
      if (selectedTime) {
        setRescheduleFormData((prev) => ({
          ...prev,
          timeTo: selectedTime,
        }));
      }
    }
  };

  const handleSignOff = (item: ChannelItem) => {
    setSelectedActivity(item);
    setManagerData({
      managerName: item.channelManagerName ?? "",
      managerPhone: item.channelManagerPhone ?? "",
    });
    setShowManagerModal(true);
  };

  const handleManagerSubmit = async (type: "link" | "otp") => {
    console.log("type---", type);
    setIsSubmitting(true);
    if (type === "link") {
      api
        .resendSignoffLink({
          activityId: selectedActivity?.id ?? "",
          phone: managerData.managerPhone,
        })
        .then((response) => {
          if (response && response.success) {
            Alert.alert(
              "Link Sent to manager phone number",
              "Link has been sent to manager's phone number"
            );
          } else {
            Alert.alert("Error", response?.message || "Failed to send Lnk");
          }
          handleCloseModal();
        })
        .catch((error) => {
          console.error("Error sending Link:", error);
          Alert.alert("Error", "Failed to send Link. Please try again.");
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
    if (type === "otp") {
      api
        .sendManagerOTP({
          id: selectedActivity?.id ?? "",
          phone: managerData.managerPhone,
        })
        .then((response) => {
          if (response && response.success) {
            Alert.alert(
              "OTP Sent",
              "OTP has been sent to manager's phone number"
            );
            setOtpMode(true);
            setResendTimer(60); // 60 seconds timer
          } else {
            Alert.alert("Error", response?.message || "Failed to send OTP");
          }
        })
        .catch((error) => {
          console.error("Error sending OTP:", error);
          Alert.alert("Error", "Failed to send OTP. Please try again.");
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  const handleResendOTP = () => {
    setIsResendingOTP(true);

    api
      .sendManagerOTP({
        id: selectedActivity?.id ?? "",
        phone: managerData.managerPhone,
      })
      .then((response) => {
        if (response && response.success) {
          Alert.alert(
            "OTP Sent",
            "OTP has been sent to manager's phone number"
          );
          setResendTimer(60); // 60 seconds timer
        } else {
          Alert.alert("Error", response?.message || "Failed to send OTP");
        }
      })
      .catch((error) => {
        console.error("Error sending OTP:", error);
        Alert.alert("Error", "Failed to send OTP. Please try again.");
      })
      .finally(() => {
        setIsResendingOTP(false);
      });
  };

  const handleVerifyOTP = async () => {
    if (!enteredOTP.trim()) {
      Alert.alert("Validation Error", "Please enter OTP");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.verifyManagerOTP({
        id: selectedActivity?.id ?? "",
        otp: enteredOTP,
        phone: managerData.managerPhone,
      });

      if (response && response.success) {
        Alert.alert("OTP Verified", "OTP verified successfully");
        router.replace("/(screens)/MainDashboard");
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

  const openCancelReasonModal = (item: ChannelItem) => {
    setSelectedActivity(item);
    setShowCancelReasonModal(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancelReasonModal(false);
  };

  const updateManagerField = (field: string, value: string) => {
    setManagerData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Render tab bar with counts
  const renderTabBar = () => (
    <View className="mx-4 mb-4">
      <View className="bg-white rounded-2xl shadow-md p-2">
        <View className="flex-row">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabChange(tab.key)}
              className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl ${
                activeTab === tab.key ? "bg-primary" : "bg-transparent"
              }`}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.key ? "white" : "#6B7280"}
              />
              <Text
                className={`ml-2 font-medium ${
                  activeTab === tab.key ? "text-white" : "text-gray-600"
                }`}
              >
                {tab.label}
              </Text>
              {/* Show count badge */}
              <View
                className={`ml-2 px-2 py-1 rounded-full ${
                  activeTab === tab.key ? "bg-white/20" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    activeTab === tab.key ? "text-white" : "text-gray-600"
                  }`}
                >
                  {tabCounts[tab.key]}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderLoadMoreFooter = () => {
    if (loadingMore) {
      return (
        <View className="py-4 items-center">
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text className="text-gray-500 ml-2">Loading more...</Text>
          </View>
        </View>
      );
    }

    if (!hasNextPage && filteredChannels.length > 0) {
      return (
        <View className="py-4 items-center">
          <Text className="text-gray-500 text-sm">No more items to load</Text>
        </View>
      );
    }

    return null;
  };

  // Render channel stats cards
  const renderStatsCards = () => (
    <View className="mx-4 my-4">
      {/* Welcome Card */}
      {/* <View className="bg-white rounded-3xl shadow-md p-6 mb-4">
        <View className="items-center mb-4">
          <Text className="text-3xl font-semibold text-gray-800">Welcome!</Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="calendar-outline" size={20} color="gray" />
            <Text className="text-gray-500 ml-2">{currentDate}</Text>
          </View>
        </View>
      </View> */}

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        userId={userId}
        onDataChange={handleAnalyticsDataChange}
      />
    </View>
  );

  // Render channel item
  const renderChannelItem = ({ item }: { item: ChannelItem }) => (
    <View className="bg-white p-5 rounded-2xl shadow-lg mb-5 border border-gray-200">
      {/* Header with Name and Status */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-semibold text-gray-900 flex-1 pr-2">
          {item.activity?.name || "Unnamed Activity"}
        </Text>

        {/* Status badge */}
        <View
          className={`px-3 py-1 rounded-full ${
            activeTab === "upcoming"
              ? "bg-blue-100"
              : activeTab === "past"
                ? "bg-green-100"
                : "bg-red-100"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              activeTab === "upcoming"
                ? "text-blue-700"
                : activeTab === "past"
                  ? "text-green-700"
                  : "text-red-700"
            }`}
          >
            {activeTab === "cancelled"
              ? item.PaymentStatus
              : activeTab === "past" && item.status === "PAYMENT_COMPLETED"
                ? "Audit Pending"
                : item.status}
          </Text>
        </View>
      </View>

      {/* Channel Details */}
      <View className="bg-gray-50 px-4 py-3 rounded-xl space-y-3 gap-0.5">
        {/* Event Date */}
        <View className="flex-row items-center">
          <Ionicons name="calendar" size={16} color="#6B7280" />
          <Text className="text-gray-700 ml-2">
            Event Date:{" "}
            {format(new Date(item.activityPlannedDate), "MMM d, yyyy")}
          </Text>
        </View>

        {/* Time */}
        {/* <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text className="text-gray-700 ml-2">
            Time: {format(new Date(item.activityFromDate), "hh:mm a")} -{" "}
            {format(new Date(item.activityToDate), "hh:mm a")}
          </Text>
        </View> */}

        {/* Location */}
        {item.activityLocation?.name && (
          <View className="flex-row items-center">
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text className="text-gray-700 ml-2">
              {item.activityLocation.name}
            </Text>
          </View>
        )}

        {/* Brand */}
        {item.brand?.name && (
          <View className="flex-row items-center">
            <Ionicons name="business-outline" size={16} color="#6B7280" />
            <Text className="text-gray-700 ml-2">Brand: {item.brand.name}</Text>
          </View>
        )}

        {/* Project */}
        {/* {item.project?.name && (
          <View className="flex-row items-center">
            <Ionicons name="folder-outline" size={16} color="#6B7280" />
            <Text className="text-gray-700 ml-2">
              Project: {item.project.name}
            </Text>
          </View>
        )} */}

        {/* UTR */}
        {item.ChannelTransaction?.[0]?.UTR && (
          <View className="flex-row items-center">
            <Ionicons name="receipt-outline" size={16} color="#6B7280" />
            <Text className="text-gray-700 ml-2">
              UTR: {item?.ChannelTransaction?.[0]?.UTR}
            </Text>
          </View>
        )}

        {/* Created Date */}
        {/* <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text className="text-gray-700 ml-2">
            Created: {format(new Date(item.createdDate), "MMM d, yyyy")}
          </Text>
        </View> */}

        {/* Revenue */}
        {item.revenue > 0 && (
          <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={16} color="#6B7280" />
            <Text className="text-gray-700 ml-2">
              Revenue: ₹{item.revenue.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {activeTab === "upcoming" && (
        <View
          className={`flex-row space-x-4 ${
            item.status === "SIGNOFF_PENDING" ? "gap-3" : "gap-2"
          } mt-5`}
        >
          {/* Left Section: Reschedule and Sign Off */}
          <View
            className={`flex-row ${
              item.status === "SIGNOFF_PENDING" ? "w-5/6 gap-2" : "w-5/6"
            }`}
          >
            {/* Reschedule Button */}
            <TouchableOpacity
              onPress={() => openRescheduleModal(item)}
              className={`${
                item.status === "SIGNOFF_PENDING" ? "w-1/2" : "flex-1"
              } bg-blue-600 rounded-xl py-3 flex-row items-center justify-center shadow`}
            >
              <Ionicons name="calendar-outline" size={18} color="white" />
              <Text className="text-white font-semibold ml-2">Reschedule</Text>
            </TouchableOpacity>

            {/* Sign Off Button */}
            {item.status === "SIGNOFF_PENDING" && (
              <TouchableOpacity
                onPress={() => handleSignOff(item)}
                className="w-1/2 bg-green-600 rounded-xl py-3 flex-row items-center justify-center shadow"
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={18}
                  color="white"
                />
                <Text className="text-white font-semibold ml-2">
                  Request Sign Off
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Right Section: Cancel Button */}
          <View className="w-1/6">
            <TouchableOpacity
              onPress={() => openCancelReasonModal(item)}
              disabled={item.status === "PAYMENT_PENDING"}
              className={`flex-1 rounded-xl py-3 flex-row items-center justify-center shadow ${
                item.status === "PAYMENT_PENDING" ? "bg-gray-400" : "bg-red-600"
              }`}
            >
              <Ionicons name="close-circle-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Actions for past tab - only show reschedule if status is not completed */}
      {activeTab === "past" && item.status !== "COMPLETED" && (
        <View className="flex-row mt-5">
          <TouchableOpacity
            onPress={() => openRescheduleModal(item)}
            className="flex-1 bg-blue-600 rounded-xl py-3 flex-row items-center justify-center shadow"
          >
            <Ionicons name="calendar-outline" size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Reschedule</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View className="items-center justify-center py-12">
      <Ionicons name="tv-outline" size={64} color="#D1D5DB" />
      <Text className="text-gray-500 text-lg mt-4">
        {searchQuery
          ? `No ${activeTab} channels found`
          : `No ${activeTab} channels available`}
      </Text>
      {searchQuery && (
        <Text className="text-gray-400 text-sm mt-2">
          Try adjusting your search terms
        </Text>
      )}
    </View>
  );

  // Render Reschedule Modal
  const renderRescheduleModal = () => (
    <Modal
      visible={showRescheduleModal}
      transparent={true}
      animationType="slide"
      onRequestClose={closeRescheduleModal}
    >
      <View className="flex-1 bg-black/80 justify-center items-center p-4">
        <View className="bg-white rounded-2xl p-6 w-full max-w-md">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-800">
              Reschedule Activity
            </Text>
            <TouchableOpacity onPress={closeRescheduleModal}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {selectedActivity && (
            <View className="mb-4">
              <Text className="text-gray-600 mb-2">
                Activity: {selectedActivity.activity?.name}
              </Text>
            </View>
          )}

          {/* Activity Planned Date */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Activity Planned Date *
            </Text>
            <Text className="text-sm text-gray-500 mb-2">
              Minimum 2 days advance booking required
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="border border-gray-300 rounded-lg p-3 bg-white"
            >
              <Text className="text-gray-800">
                {formatDate(rescheduleFormData.activityDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Activity Time */}
          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">
              Activity Time *
            </Text>

            <View className="flex-row space-x-3">
              {/* From Time */}
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-1">From</Text>
                <TouchableOpacity
                  onPress={() =>
                    setShowTimePicker((prev) => ({ ...prev, from: true }))
                  }
                  className="border border-gray-300 rounded-lg p-3 bg-white"
                >
                  <Text className="text-gray-800">
                    {formatTime(rescheduleFormData.timeFrom)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* To Time */}
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-1">To</Text>
                <TouchableOpacity
                  onPress={() =>
                    setShowTimePicker((prev) => ({ ...prev, to: true }))
                  }
                  className="border border-gray-300 rounded-lg p-3 bg-white"
                >
                  <Text className="text-gray-800">
                    {formatTime(rescheduleFormData.timeTo)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-3 gap-2">
            <TouchableOpacity
              onPress={closeRescheduleModal}
              className="flex-1 bg-gray-200 rounded-lg py-3 items-center"
              disabled={rescheduling}
            >
              <Text className="text-gray-700 font-medium">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRescheduleSubmit}
              className="flex-1 bg-blue-500 rounded-lg py-3 items-center flex-row justify-center"
              disabled={rescheduling}
            >
              {rescheduling ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="calendar" size={18} color="white" />
                  <Text className="text-white font-medium ml-2">
                    Reschedule
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={rescheduleFormData.activityDate}
          mode="date"
          display="default"
          minimumDate={getMinimumDate()}
          onChange={handleDateChange}
        />
      )}

      {/* Time Pickers */}
      {showTimePicker.from && (
        <DateTimePicker
          value={rescheduleFormData.timeFrom}
          mode="time"
          display="default"
          onChange={(event, time) => handleTimeChange(event, time, "from")}
        />
      )}

      {showTimePicker.to && (
        <DateTimePicker
          value={rescheduleFormData.timeTo}
          mode="time"
          display="default"
          onChange={(event, time) => handleTimeChange(event, time, "to")}
        />
      )}
    </Modal>
  );

  const renderManagerSignoffModal = () => {
    return (
      <Modal
        visible={showManagerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
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
                editable={!otpMode}
                className={`border rounded-lg p-3 ${
                  otpMode
                    ? "bg-gray-100 border-gray-200 text-gray-500"
                    : "bg-white border-gray-300 text-black"
                }`}
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
                editable={!otpMode}
                className={`border rounded-lg p-3 ${
                  otpMode
                    ? "bg-gray-100 border-gray-200 text-gray-500"
                    : "bg-white border-gray-300 text-black"
                }`}
              />
            </View>

            {!otpMode && (
              //  Signoff Declaration
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
                      I hereby declare that the activity and bank details
                      provided above have been verified and are factually
                      correct.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

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
    );
  };

  const renderCancelReasonModal = () => {
    return (
      <Modal
        visible={showCancelReasonModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseCancelModal}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-white rounded-lg p-6 mx-4 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
              Cancel Reason
            </Text>

            <Text className="text-sm text-gray-600 mb-6 text-center">
              Please provide a reason for cancellation (max 100 characters)
            </Text>

            <TextInput
              value={cancelReason}
              onChangeText={(value) => setCancelReason(value)}
              placeholder="Enter reason"
              maxLength={100}
              multiline
              className="border border-gray-300 rounded-lg p-3 bg-white text-black mb-6 h-24"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCloseCancelModal}
                className="flex-1 bg-gray-500 rounded-lg p-3 items-center"
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  selectedActivity && handleCancelActivity(selectedActivity)
                }
                className={`flex-1 rounded-lg p-3 items-center ${
                  cancelReason.trim() ? "bg-red-500" : "bg-gray-300"
                }`}
                disabled={!cancelReason.trim()}
              >
                <Text
                  className={`font-semibold ${
                    cancelReason.trim() ? "text-white" : "text-gray-500"
                  }`}
                >
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFloatingActionButton = () => {
    const rotation = fabAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "45deg"],
    });

    const translateY1 = fabAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -70],
    });

    const translateY2 = fabAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -140],
    });

    const opacity = fabAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const scale = fabAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    return (
      <View className="absolute bottom-8 right-6 items-end">
        {/* Background overlay */}
        {fabExpanded && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeFAB}
            className="absolute -inset-96"
            style={{ zIndex: 1 }}
          />
        )}

        {/* Option 1 - Edit Channel */}
        <Animated.View
          style={{
            transform: [{ translateY: translateY2 }, { scale }],
            opacity,
            zIndex: 2,
          }}
          className="absolute items-end"
        >
          <View className="flex-row items-center space-x-2 gap-2">
            <Animated.View
              style={{ opacity }}
              className="bg-gray-800 px-3 py-1 rounded-lg"
            >
              <Text className="text-white text-sm font-medium">
                Edit Existing Channel
              </Text>
            </Animated.View>
            <TouchableOpacity
              onPress={handleEditExistingChannel}
              className="bg-white rounded-full h-12 w-12 items-center justify-center shadow-md"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
              }}
            >
              <Ionicons name="create-outline" size={24} color="#ff9500" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Option 2 - Add Channel */}
        <Animated.View
          style={{
            transform: [{ translateY: translateY1 }, { scale }],
            opacity,
            zIndex: 2,
          }}
          className="absolute items-end"
        >
          <View className="flex-row items-center space-x-2 gap-2">
            <Animated.View
              style={{ opacity }}
              className="bg-gray-800 px-3 py-1 rounded-lg"
            >
              <Text className="text-white text-sm font-medium">
                Add New Channel
              </Text>
            </Animated.View>
            <TouchableOpacity
              onPress={handleAddNewChannel}
              className="bg-white rounded-full h-12 w-12 items-center justify-center shadow-md"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
              }}
            >
              <Ionicons name="add-outline" size={24} color="#ff9500" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Main FAB */}
        <TouchableOpacity
          onPress={toggleFAB}
          className="bg-primary rounded-full h-16 w-16 items-center justify-center shadow-xl"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 6,
            zIndex: 3,
          }}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={32} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-100"
      // style={{ paddingTop: statusBarHeight }}
    >
      {/* <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" /> */}

      {/* <CustomHeader showOnlyLogout={true} /> */}

      <FlatList
        data={filteredChannels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {renderStatsCards()}
            {renderTabBar()}

            {/* Search Bar */}
            <View className="mx-4 mb-4">
              <View className="bg-white rounded-2xl shadow-md p-4">
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                  <Ionicons name="search-outline" size={20} color="#6B7280" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-800"
                    placeholder={`Search ${activeTab} channels...`}
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    returnKeyType="search"
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => handleSearch("")}>
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {/* Results count */}
                <View className="flex-row justify-between items-center mt-3">
                  <Text className="text-gray-600">
                    Showing {filteredChannels.length} of {totalRecords}{" "}
                    {activeTab} channels
                    {totalPages > 1 &&
                      ` (Page ${currentPage} of ${totalPages})`}
                  </Text>
                  {searchQuery && (
                    <Text className="text-blue-600 text-sm">
                      Searching for "{searchQuery}"
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        ListFooterComponent={renderLoadMoreFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#3B82F6"]}
          />
        }
        contentContainerStyle={{
          paddingBottom: 100,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        // Infinite scroll properties
        onEndReached={onEndReached}
        onEndReachedThreshold={0.1} // Trigger when 10% from bottom
        removeClippedSubviews={true} // Optimize performance
        maxToRenderPerBatch={10} // Render 10 items per batch
        windowSize={10} // Keep 10 screens worth of items in memory
        initialNumToRender={10} // Render 10 items initially
      />

      {/* Loading overlay */}
      {loading && (
        <View className="absolute inset-0 bg-black/20 items-center justify-center">
          <View className="bg-white p-6 rounded-2xl shadow-lg">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-3">Loading...</Text>
          </View>
        </View>
      )}
      {renderRescheduleModal()}
      {renderManagerSignoffModal()}
      {renderCancelReasonModal()}
      {/* Floating Action Button */}
      {renderFloatingActionButton()}
    </SafeAreaView>
  );
};

export default MainDashboard;
