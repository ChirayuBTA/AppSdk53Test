import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import MainDashboard from "./MainDashboard";
import CustomHeader from "@/components/CustomHeader";
import ExpensesScreen from "./Expenses";

const MainScreen = () => {
  const [activeTab, setActiveTab] = useState("activities");

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
    <SafeAreaView
      className="flex-1 bg-gray-100"
      style={{ paddingTop: statusBarHeight }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <CustomHeader showOnlyLogout={true} />

      {/* Tab Header */}
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

      {/* Tab Content */}
      <View className="flex-1">{renderContent()}</View>
    </SafeAreaView>
  );
};

export default MainScreen;
