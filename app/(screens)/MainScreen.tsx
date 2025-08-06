import ScreenWrapper from "@/components/ScreenWrapper";
import { getAuthData } from "@/utils/storage";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ExpensesScreen from "./Expenses";
import MainDashboard from "./MainDashboard";

const MainScreen = () => {
  const [activeTab, setActiveTab] = useState("activities");
  const [storedAuthData, setStoredAuthData] = useState<any>(null);

  const getStoredData = async () => {
    try {
      const authData = await getAuthData();
      authData?.role !== "ALLIANCE_MANAGER" && setActiveTab("expenses");
      if (authData) setStoredAuthData(authData);
    } catch (err) {
      console.log("Error: ", err);
    }
  };

  useEffect(() => {
    getStoredData();
  }, []);

  // Get status bar height
  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  const renderContent = () => {
    switch (activeTab) {
      case "activities":
        return <MainDashboard />;
      case "expenses":
        return <ExpensesScreen />;
      default:
        return <MainDashboard />;
    }
  };

  return (
    <ScreenWrapper headerProps={{ showOnlyLogout: true }} showScroll={false}>
      {storedAuthData?.role === "ALLIANCE_MANAGER" ? (
        // Show both tabs if role is ALLIANCE_MANAGER
        <View className="bg-white shadow-sm">
          <View className="flex-row mx-4">
            <TouchableOpacity
              className={`flex-1 py-4 ${
                activeTab === "activities" ? "border-b-2 border-primary" : ""
              }`}
              onPress={() => setActiveTab("activities")}
            >
              <Text
                className={`text-center text-lg font-medium ${
                  activeTab === "activities" ? "text-primary" : "text-gray-500"
                }`}
              >
                Activities
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 py-4 ${
                activeTab === "expenses" ? "border-b-2 border-primary" : ""
              }`}
              onPress={() => setActiveTab("expenses")}
            >
              <Text
                className={`text-center text-lg font-medium ${
                  activeTab === "expenses" ? "text-primary" : "text-gray-500"
                }`}
              >
                Expenses
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Show only Expenses tab full-width for other roles
        <View className="bg-white shadow-sm">
          <View className="flex-row mx-4">
            <TouchableOpacity className="flex-1 py-4 border-b-2 border-primary">
              <Text className="text-center text-lg font-medium text-primary">
                Expenses
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tab Content */}
      <View className="flex-1">{renderContent()}</View>
    </ScreenWrapper>
  );
};

export default MainScreen;
