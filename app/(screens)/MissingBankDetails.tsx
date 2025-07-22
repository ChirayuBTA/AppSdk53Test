import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { api } from "../../utils/api";
import CustomHeader from "@/components/CustomHeader";

interface ChannelActivityDetail {
  id: string;
  brandId: string;
  projectId: string;
  activityLocationId: string;
  activityId: string;
  activityPlannedDate: string;
  activityToDate: string;
  activityFromDate: string;
  channelActivityFee: string;
  channelActivityBill: string | null;
  signoffDeclaration: boolean;
  channelManagerName: string | null;
  channelManagerPhone: string | null;
  channelPOCName: string | null;
  channelPOCNumber: string | null;
  otp: string | null;
  otpExpiresAt: string | null;
  isBankDetails: boolean;
  createdAt: string;
  updatedAt: string;
  // Nested objects from API response
  activity: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdBy: string;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
  };
  brand: {
    id: string;
    name: string;
    slug: string;
    description: string;
    logoUrl: string | null;
    website: string;
    contactEmail: string;
    contactPhone: string;
    ocrPrompt: string;
    status: string;
    createdBy: string;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
    description: string;
    brandId: string;
    startDate: string;
    endDate: string;
    status: string;
    budget: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

interface ApiResponse {
  success: boolean;
  total: number;
  page: number;
  pageSize: number;
  data: ChannelActivityDetail[];
}

const MissingBankDetails = () => {
  // State
  const [activities, setActivities] = useState<ChannelActivityDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const params = useLocalSearchParams();
  const { channelId, channelName } = params;
  const paramManagerName = params.managerName as string;
  const paramManagerPhone = params.managerPhone as string;

  // Get status bar height
  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  // Fetch activities with missing bank details
  const fetchMissingBankDetails = async () => {
    if (!channelId) return;

    setLoading(true);
    setError(null);

    try {
      const query = {
        channelId: channelId,
        isBankDetails: false, // Only fetch activities with missing bank details
      };

      const response: ApiResponse = await api.getChannelActivityDetailsbyStatus(
        query
      );
      console.log("Missing bank details response:", response);

      if (response.success) {
        setActivities(response.data);
      } else {
        throw new Error("Failed to fetch activities");
      }
    } catch (error) {
      console.log("Error fetching missing bank details:", error);
      setError("Failed to fetch activities");
      Alert.alert(
        "Error",
        "Failed to fetch activities with missing bank details"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchMissingBankDetails();
  }, [channelId]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchMissingBankDetails();
  };

  // Handle activity selection
  const handleActivityPress = (channelActivity: ChannelActivityDetail) => {
    console.log("Selected activity:", channelActivity.id);

    // Navigate to BankDetails screen with activity information
    router.push({
      pathname: "/(form)/BankDetails",
      params: {
        activityId: channelActivity.id,
        channelId: channelId,
        activityFee: channelActivity.channelActivityFee,
        managerName: paramManagerName,
        managerPhone: paramManagerPhone,
        // channelName: channelName,
        // activityName: channelActivity.activity?.name || "Activity",
        // brandName: channelActivity.brand?.name || "",
        // projectName: channelActivity.project?.name || "",
      },
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  // Render activity item
  const renderActivityItem = ({ item }: { item: ChannelActivityDetail }) => (
    <TouchableOpacity
      className="bg-white p-5 rounded-2xl shadow-md mb-4 border border-red-100"
      onPress={() => handleActivityPress(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          {/* Activity Name */}
          <Text className="text-lg font-bold text-gray-800 mb-2">
            {item.activity?.name || "Activity"}
          </Text>

          {/* Brand and Project */}
          {(item.brand?.name || item.project?.name) && (
            <View className="flex-row items-center mb-2">
              <Ionicons name="business-outline" size={16} color="#6B7280" />
              <Text className="text-gray-600 ml-2">
                {[item.brand?.name, item.project?.name]
                  .filter(Boolean)
                  .join(" • ")}
              </Text>
            </View>
          )}

          {/* Planned Date */}
          <View className="flex-row items-center mb-2">
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 ml-2">
              {formatDate(item.activityPlannedDate)}
            </Text>
          </View>

          {/* Time Range */}
          <View className="flex-row items-center mb-2">
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 ml-2">
              {formatTime(item.activityFromDate)} -{" "}
              {formatTime(item.activityToDate)}
            </Text>
          </View>

          {/* Fee */}
          <View className="flex-row items-center mb-2">
            <Ionicons name="cash-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 ml-2">
              ₹{item.channelActivityFee}
            </Text>
          </View>

          {/* Missing Bank Details Warning */}
          <View className="flex-row items-center bg-red-50 p-2 rounded-lg mt-2">
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text className="text-red-600 ml-2 text-sm font-medium">
              Bank details required
            </Text>
          </View>
        </View>

        <View className="ml-4">
          <Ionicons name="chevron-forward-outline" size={20} color="#6B7280" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View className="items-center justify-center py-12">
      <Ionicons name="checkmark-circle-outline" size={64} color="#10B981" />
      <Text className="text-green-600 text-lg font-semibold mt-4">
        All Set!
      </Text>
      <Text className="text-gray-500 text-center mt-2">
        All activities have their bank details completed
      </Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View className="items-center justify-center py-12">
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text className="text-red-600 text-lg font-semibold mt-4">
        Error Loading Activities
      </Text>
      <Text className="text-gray-500 text-center mt-2 mx-4">{error}</Text>
      <TouchableOpacity
        className="bg-blue-500 px-6 py-3 rounded-xl mt-4"
        onPress={fetchMissingBankDetails}
      >
        <Text className="text-white font-semibold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-gray-100"
      style={{ paddingTop: statusBarHeight }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <CustomHeader showOnlyLogout={true} />

      {/* Header */}
      <View className="mx-4 my-4">
        <View className="bg-white rounded-3xl shadow-md p-6">
          <View className="flex-row items-center mb-2">
            {/* <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back-outline" size={24} color="#374151" />
            </TouchableOpacity> */}
            <Text className="text-2xl font-bold text-gray-800 flex-1">
              Missing Bank Details
            </Text>
          </View>
          <Text className="text-gray-600">
            {channelName} • {activities.length} activities need bank details
          </Text>
        </View>
      </View>

      {/* Content */}
      {error ? (
        renderErrorState()
      ) : (
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#3B82F6"]}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <View className="absolute inset-0 bg-black/20 items-center justify-center">
          <View className="bg-white p-6 rounded-2xl shadow-lg">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-3">Loading activities...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default MissingBankDetails;
