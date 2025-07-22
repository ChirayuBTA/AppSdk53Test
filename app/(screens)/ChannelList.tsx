import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { getAuthValue } from "../../utils/storage";
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
}

interface Channel {
  id: string;
  name: string;
  slug: string;
  address: string;
  channelManagerName: string;
  channelManagerPhone: string;
  ChannelActivityDetails?: ChannelActivityDetail[];
}

interface ApiResponse {
  success: boolean;
  total: number;
  page: number;
  pageSize: number;
  data: Channel[];
}

const ChannelList = () => {
  // List State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // User Data State
  const [userId, setUserId] = useState<string | null>(null);

  const router = useRouter();

  // Get status bar height
  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  // Get stored user data
  const getStoredData = async () => {
    try {
      const storedUserId = await getAuthValue("userId");
      setUserId(storedUserId || "dummy-user-123");
    } catch (err) {
      console.log("Error getting stored data: ", err);
      setUserId("dummy-user-123");
    }
  };

  useEffect(() => {
    getStoredData();
  }, []);

  // Fetch channels with pagination and search
  const fetchChannels = async (
    page = 1,
    isLoadMore = false,
    searchTerm = ""
  ) => {
    if (!userId) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params: any = {
        page,
        limit,
      };

      // Add search query if provided
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response: ApiResponse = await api.getAllChannels(params);

      if (response.success) {
        setTotalCount(response.total);
        setHasMoreData(page * limit < response.total);

        if (isLoadMore) {
          setChannels((prevChannels) => [...prevChannels, ...response.data]);
        } else {
          setChannels(response.data);
        }
      } else {
        throw new Error("Failed to fetch channels");
      }

      setError(null);
    } catch (error) {
      console.log("Error fetching channels:", error);
      setError("Failed to fetch channels");
      Alert.alert("Error", "Failed to fetch channels");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      fetchChannels(1, false, searchQuery);
    }
  }, [userId]);

  // Handle search with debounce
  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      setCurrentPage(1);
      setChannels([]);
      setHasMoreData(true);

      // Debounce search
      const timeoutId = setTimeout(() => {
        fetchChannels(1, false, text);
      }, 500);

      return () => clearTimeout(timeoutId);
    },
    [userId]
  );

  // Handle load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMoreData && channels.length > 0) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchChannels(nextPage, true, searchQuery);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    setChannels([]);
    setHasMoreData(true);
    fetchChannels(1, false, searchQuery);
  };

  // Handle channel selection and navigation
  const handleChannelPress = (channel: Channel) => {
    console.log("Selected channel:", channel.id);

    // Check if ChannelActivityDetails exists and is an array
    if (
      channel.ChannelActivityDetails &&
      Array.isArray(channel.ChannelActivityDetails) &&
      channel.ChannelActivityDetails.length > 0
    ) {
      // Check if any ChannelActivityDetails has isBankDetails as false
      const hasIncompleteBankDetails = channel.ChannelActivityDetails.some(
        (detail) => detail.isBankDetails === false
      );

      console.log("hasIncompleteBankDetails-----", hasIncompleteBankDetails);

      if (hasIncompleteBankDetails) {
        // Redirect to missing bank details if any detail has isBankDetails as false
        router.push({
          pathname: "/(screens)/MissingBankDetails",
          params: {
            channelId: channel.id,
            channelName: channel.name,
            managerName: channel.channelManagerName,
            managerPhone: channel.channelManagerPhone,
          },
        });
        return;
      }
    }

    // If ChannelActivityDetails is empty/not present OR all isBankDetails are true,
    // navigate to ActivityDetails screen
    router.push({
      pathname: "/(form)/ActivityDetails",
      params: {
        managerName: channel.channelManagerName,
        managerPhone: channel.channelManagerPhone,
        channelId: channel.id,
        channelName: channel.name,
      },
    });
  };

  // Render channel item
  const renderChannelItem = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      className="bg-white p-5 rounded-2xl shadow-md mb-4 border border-gray-100"
      onPress={() => handleChannelPress(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800 mb-2">
            {item.name}
          </Text>
          {/* <Text className="text-gray-600 mb-1">Slug: {item.slug}</Text> */}
          <View className="flex-row items-center">
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text className="text-gray-600 ml-2 flex-1">{item.address}</Text>
          </View>
        </View>
        <View className="ml-4">
          <Ionicons name="chevron-forward-outline" size={20} color="#6B7280" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render footer with loading indicator
  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text className="text-gray-500 mt-2">Loading more...</Text>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View className="items-center justify-center py-12">
      <Ionicons name="tv-outline" size={64} color="#D1D5DB" />
      <Text className="text-gray-500 text-lg mt-4">
        {searchQuery ? "No channels found" : "No channels available"}
      </Text>
      {searchQuery && (
        <Text className="text-gray-400 text-sm mt-2">
          Try adjusting your search terms
        </Text>
      )}
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
          <Text className="text-2xl font-bold text-gray-800 mb-2">
            All Channels
          </Text>
          <Text className="text-gray-600">
            Browse and manage all available channels
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View className="mx-4 mb-4">
        <View className="bg-white rounded-2xl shadow-md p-4">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
            <Ionicons name="search-outline" size={20} color="#6B7280" />
            <TextInput
              className="flex-1 ml-3 text-gray-800"
              placeholder="Search channels..."
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
              Showing {channels.length} of {totalCount} channels
            </Text>
            {searchQuery && (
              <Text className="text-blue-600 text-sm">
                Searching for "{searchQuery}"
              </Text>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={channels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
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

      {/* Loading overlay */}
      {loading && (
        <View className="absolute inset-0 bg-black/20 items-center justify-center">
          <View className="bg-white p-6 rounded-2xl shadow-lg">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-3">Loading channels...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ChannelList;
