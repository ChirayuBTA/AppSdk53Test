import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  Platform,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { getAuthValue, getLocValue } from "../../utils/storage";
import { api } from "../../utils/api";
import { format } from "date-fns";
import CustomHeader from "@/components/CustomHeader";
import ImageViewer from "react-native-image-zoom-viewer";
import { X } from "lucide-react-native";

interface EntryItem {
  id: string;
  orderId?: string;
  cashbackAmount?: number;
  orderImage?: string;
  customerName?: string;
  customerPhone?: string;
  orderAddress?: string;
  isFlagged?: boolean;
}

const DashboardScreen = () => {
  const [activeTab, setActiveTab] = useState("today");
  const [todayEntries, setTodayEntries] = useState<EntryItem[]>([]);
  const [totalEntries, setTotalEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [promoterId, setPromoterId] = useState(null);
  const [activityLocId, setActivityLocId] = useState(null);
  const [activityLocName, setActivityLocName] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  // Pagination State
  const [todaysPage, setTodaysPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [todaysLimit] = useState(10);
  const [totalLimit] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [todaysTotalCount, setTodaysTotalCount] = useState(0);
  const [totalTotalCount, setTotalTotalCount] = useState(0);
  const [cityId, setCityId] = useState(null);

  // Flag Modal State
  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [isFlagging, setIsFlagging] = useState(false);

  const router = useRouter();
  const currentDate = format(new Date(), "EEEE, MMMM d, yyyy");

  // Get status bar height
  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  // Get stored values from authStorage
  const getStoredData = async () => {
    try {
      const storedPromoterId = await getAuthValue("promoterId");
      const storedActivityLocId = await getLocValue("activityLocId");
      const storedActivityLocName = await getLocValue("activityLocName");
      const storedCityId = await getAuthValue("cityId");
      const storedLoginImageId = await getAuthValue("loginImageId");
      console.log("storedLoginImageId---", storedLoginImageId);

      if (storedPromoterId) setPromoterId(storedPromoterId);
      if (storedActivityLocName) setActivityLocName(storedActivityLocName);
      if (storedActivityLocId) setActivityLocId(storedActivityLocId);
      if (storedCityId) setCityId(storedCityId);
    } catch (err) {
      console.log("Error: ", err);
    }
  };

  useEffect(() => {
    getStoredData(); // Get stored values on mount
  }, []);

  useEffect(() => {
    console.log("cityId", cityId);
  }, [cityId]);

  // Fetch dashboard data with query parameters
  const fetchData = (isLoadMore = false) => {
    if (!activityLocId || !promoterId) return;

    (isLoadMore ? setIsLoadingMore : setLoading)(true);

    api
      .getDashboardData({
        activityLocId,
        promoterId,
        todaysPage,
        totalPage,
        todaysLimit,
        totalLimit,
      })
      .then(({ data }) => {
        setTodaysTotalCount(data.todaysPagination?.totalCount || 0);
        setTotalTotalCount(data.totalPagination?.totalCount || 0);

        const mergeEntries = (prev: any, newEntries: any) =>
          isLoadMore
            ? [
                ...prev,
                ...newEntries.filter(
                  ({ id }: any) => !prev.some((item: any) => item.id === id)
                ),
              ]
            : newEntries;

        setTodayEntries((prev) => mergeEntries(prev, data.todaysEntries));
        setTotalEntries((prev) => mergeEntries(prev, data.totalEntries));

        setError(null);
      })
      .catch((error) => {
        if (error.name === "AppUpdateRequiredError") {
          return;
        }
        console.log("dashboard error--", error);
        Alert.alert("Error", error.message);
      })
      .finally(() => {
        setLoading(false);
        setIsLoadingMore(false);
      });
  };

  useEffect(() => {
    fetchData(); // Initial data fetch
  }, [activityLocId, promoterId]);

  const loadMoreToday = () => {
    setTodaysPage((prev) => prev + 1);
  };

  const loadMoreTotal = () => {
    setTotalPage((prev) => prev + 1);
  };

  useEffect(() => {
    if (todaysPage > 1) {
      fetchData(true);
    }
  }, [todaysPage]);

  useEffect(() => {
    if (totalPage > 1) {
      fetchData(true);
    }
  }, [totalPage]);

  // Handle Flag Entry
  const handleFlagEntry = (entryId: EntryItem) => {
    if (entryId.isFlagged) {
      return;
    }
    console.log("entryId---", entryId.id);
    setSelectedEntryId(entryId.id);
    setFlagModalVisible(true);
  };

  // Submit Flag to API
  const submitFlagToApi = () => {
    if (!selectedEntryId) return;

    setIsFlagging(true);

    // Call your API endpoint to flag the entry
    api
      .flagEntry({
        id: selectedEntryId,
        isFlagged: true,
      })
      .then(() => {
        // Update the entry in state to show as flagged
        const updateEntries = (entries: EntryItem[]) =>
          entries.map((entry) =>
            entry.id === selectedEntryId ? { ...entry, isFlagged: true } : entry
          );

        setTodayEntries(updateEntries);
        setTotalEntries(updateEntries);

        Alert.alert("Success", "Entry has been flagged successfully");
      })
      .catch((error) => {
        if (error.name === "AppUpdateRequiredError") {
          return;
        }
        console.log("flag error--", error);
        Alert.alert("Error", error);
      })
      .finally(() => {
        setIsFlagging(false);
        setFlagModalVisible(false);
        setSelectedEntryId("");
      });
  };

  // Render Entry Item
  const renderEntryItem = ({ item }: any) => (
    <View className="bg-white p-5 rounded-2xl shadow-md mb-4 border border-gray-100">
      {/* Header with Order ID, Cashback, and Flag */}
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center">
            <Text className="text-xl font-bold text-gray-800">
              {item.orderId
                ? item.orderId.startsWith("#")
                  ? item.orderId
                  : `#${item.orderId}`
                : "Order ID Not Available"}
            </Text>
            {activeTab === "today" && (
              <TouchableOpacity
                onPress={() => handleFlagEntry(item)}
                className="ml-2"
              >
                <Ionicons
                  name="flag"
                  size={20}
                  color={item.isFlagged ? "#EF4444" : "#9CA3AF"}
                />
              </TouchableOpacity>
            )}
          </View>
          {item.cashbackAmount ? (
            <View className="bg-green-100 px-3 py-1 rounded-full mt-2 self-start">
              <Text className="text-green-700 font-semibold">
                ₹{item.cashbackAmount} Cashback
              </Text>
            </View>
          ) : (
            <View className="bg-gray-100 px-3 py-1 rounded-full mt-2 self-start">
              <Text className="text-gray-500">No Cashback</Text>
            </View>
          )}
        </View>

        {/* Images Container */}
        <View className="flex-row gap-2">
          {/* Profile Image */}
          {item.profileImage ? (
            <TouchableOpacity
              onPress={() => {
                setSelectedImage(item.profileImage);
                setModalVisible(true);
              }}
              className="relative"
            >
              <Image
                source={{ uri: item.profileImage }}
                className="w-16 h-16 rounded-lg border border-gray-200"
                resizeMode="cover"
              />
              <View className="absolute bottom-0 right-0 left-0 bg-black/50 py-1 items-center rounded-b-lg">
                <Text className="text-white text-xs font-medium">Profile</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Order Image */}
          {item.orderImage ? (
            <TouchableOpacity
              onPress={() => {
                setSelectedImage(item.orderImage);
                setModalVisible(true);
              }}
              className="relative"
            >
              <Image
                source={{ uri: item.orderImage }}
                className="w-16 h-16 rounded-lg border border-gray-200"
                resizeMode="cover"
              />
              <View className="absolute bottom-0 right-0 left-0 bg-black/50 py-1 items-center rounded-b-lg">
                <Text className="text-white text-xs font-medium">Order</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Placeholder when no images are available */}
          {!item.profileImage && !item.orderImage && (
            <View className="w-16 h-16 rounded-lg bg-gray-200 items-center justify-center">
              <Ionicons name="images-outline" size={24} color="#9CA3AF" />
              <Text className="text-xs text-gray-500 mt-1">No Images</Text>
            </View>
          )}
        </View>
      </View>

      {/* Customer Information */}
      <View className="bg-gray-50 p-3 rounded-xl space-y-3 flex-col gap-2 mt-2">
        {/* Customer Name and Phone */}
        <View className="flex-row items-center">
          <Ionicons name="person-outline" size={18} color="#6B7280" />
          <View className="ml-2 flex-1">
            <Text className="text-gray-600 font-medium">
              {item.customerName || "No Name Available"}
            </Text>
            <Text className="text-gray-500">
              {item.customerPhone || "No Phone Available"}
            </Text>
          </View>
        </View>

        {/* Address */}
        <View className="flex-row items-start">
          <Ionicons
            name="location-outline"
            size={18}
            color="#6B7280"
            className="mt-1"
          />
          <View className="ml-2 flex-1">
            <Text className="text-gray-500 text-sm">
              {item.orderAddress || "No Address Available"}
            </Text>
          </View>
        </View>
      </View>

      {/* Tap to View label */}
      {(item.profileImage || item.orderImage) && (
        <Text className="text-gray-400 text-xs text-right mt-2 italic">
          Tap images to view fullscreen
        </Text>
      )}
    </View>
  );

  // Render footer with Load More button
  const renderFooter = () => {
    const showTodayLoadMore =
      activeTab === "today" && todaysTotalCount > todayEntries.length;
    const showTotalLoadMore =
      activeTab === "total" && totalTotalCount > totalEntries.length;

    if (!showTodayLoadMore && !showTotalLoadMore) return null;

    return (
      <View className="mx-4 my-2">
        {showTodayLoadMore && (
          <TouchableOpacity
            onPress={loadMoreToday}
            disabled={isLoadingMore}
            className={`py-4 rounded-lg items-center shadow-md ${
              isLoadingMore ? "bg-gray-400" : "bg-primary"
            }`}
          >
            {isLoadingMore ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-lg font-semibold">
                Load More
              </Text>
            )}
          </TouchableOpacity>
        )}

        {showTotalLoadMore && (
          <TouchableOpacity
            onPress={loadMoreTotal}
            disabled={isLoadingMore}
            className={`py-4 rounded-lg items-center mt-3 shadow-md ${
              isLoadingMore ? "bg-gray-400" : "bg-primary"
            }`}
          >
            {isLoadingMore ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-lg font-semibold">
                Load More
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-100"
      style={{ paddingTop: statusBarHeight }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <CustomHeader />

      {/* Main Card */}
      <View className="bg-white mx-4 my-4 rounded-3xl shadow-md p-6">
        <View className="items-center mb-4">
          <Text className="text-3xl font-semibold text-gray-800">
            {activityLocName}
          </Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="calendar-outline" size={20} color="gray" />
            <Text className="text-gray-500 ml-2">{currentDate}</Text>
          </View>
        </View>

        {/* Today's Activity Records */}
        <View className="flex-row justify-between items-center mt-4">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={24} color="gray" />
            <View className="ml-2">
              <Text className="text-gray-500">Today's Activity</Text>
              <Text className="text-xl font-semibold text-gray-800">
                Records
              </Text>
            </View>
          </View>
          <View className="bg-primary h-16 w-16 rounded-lg items-center justify-center">
            <Text className="text-white text-3xl font-bold">
              {todaysTotalCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs Section */}
      <View className="flex-row justify-between mx-4">
        <TouchableOpacity
          className={`flex-1 py-4 ${
            activeTab === "today" ? "border-b-2 border-primary" : ""
          }`}
          onPress={() => setActiveTab("today")}
        >
          <Text
            className={`text-center text-lg ${
              activeTab === "today" ? "text-black font-medium" : "text-gray-500"
            }`}
          >
            Today's Entries ({todaysTotalCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-4 ${
            activeTab === "total" ? "border-b-2 border-primary" : ""
          }`}
          onPress={() => setActiveTab("total")}
        >
          <Text
            className={`text-center text-lg ${
              activeTab === "total" ? "text-black font-medium" : "text-gray-500"
            }`}
          >
            All Entries ({totalTotalCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Entries List */}
      <View className="flex-1 mx-4 mt-4">
        {loading ? (
          <Text className="text-center text-gray-500 mt-4">Loading...</Text>
        ) : error ? (
          <Text className="text-center text-red-500 mt-4">{error}</Text>
        ) : todayEntries.length === 0 && totalEntries.length === 0 ? (
          <Text className="text-center text-gray-500 text-lg mt-4">
            No data available.
          </Text>
        ) : (
          <FlatList
            data={activeTab === "today" ? todayEntries : totalEntries}
            renderItem={renderEntryItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={() => (
              <Text className="text-center text-gray-500 mt-4">
                No entries available
              </Text>
            )}
            ListFooterComponent={renderFooter}
            contentContainerStyle={{ paddingBottom: 80 }} // Add padding to ensure the footer is visible
          />
        )}
      </View>

      {/* Full-Screen Image Modal */}
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
                <X color="white" size={30} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Flag Confirmation Modal */}
      <Modal
        visible={flagModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFlagModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-xl w-4/5 p-5">
            <View className="items-center mb-4">
              <Ionicons name="flag" size={40} color="#EF4444" />
              <Text className="text-xl font-semibold mt-2 text-center">
                Flag this entry?
              </Text>
              <Text className="text-gray-600 text-center mt-2">
                Are you sure you want to flag this entry for review?
              </Text>
            </View>

            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                onPress={() => setFlagModalVisible(false)}
                className="flex-1 py-3 bg-gray-200 rounded-lg mr-2"
                disabled={isFlagging}
              >
                <Text className="text-gray-800 text-center font-medium">
                  No, Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitFlagToApi}
                className="flex-1 py-3 bg-red-500 rounded-lg ml-2"
                disabled={isFlagging}
              >
                {isFlagging ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-center font-medium">
                    Yes, Flag
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push("/CreateScreen")}
        className="absolute bottom-8 right-8 bg-primary rounded-full h-16 w-16 items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default DashboardScreen;
