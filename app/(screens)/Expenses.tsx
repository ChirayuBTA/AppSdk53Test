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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { getAuthValue, getLocValue } from "../../utils/storage";
import { api } from "../../utils/api";
import { format } from "date-fns";
import CustomHeader from "@/components/CustomHeader";

interface ExpenseItem {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: "fuel" | "food" | "transport" | "other";
}

const ExpensesScreen = () => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [promoterId, setPromoterId] = useState(null);
  const [activityLocId, setActivityLocId] = useState(null);
  const [activityLocName, setActivityLocName] = useState("");

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

  // Mock data for demonstration - replace with actual API call
  const fetchExpenses = () => {
    if (!activityLocId || !promoterId) return;

    setLoading(true);

    // This is mock data - replace with actual API call
    setTimeout(() => {
      const mockExpenses = [
        {
          id: "1",
          amount: 500,
          description: "Fuel for delivery",
          category: "Transportation",
          date: "2025-01-21",
          type: "fuel" as const,
        },
        {
          id: "2",
          amount: 200,
          description: "Lunch",
          category: "Food",
          date: "2025-01-21",
          type: "food" as const,
        },
        {
          id: "3",
          amount: 150,
          description: "Bus fare",
          category: "Transportation",
          date: "2025-01-20",
          type: "transport" as const,
        },
      ];

      setExpenses(mockExpenses);
      setTotalExpenses(
        mockExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      );
      setLoading(false);
    }, 1000);

    // Uncomment and modify this when you have actual API endpoint
    /*
    api
      .getExpenses({ activityLocId, promoterId })
      .then(({ data }) => {
        setExpenses(data.expenses || []);
        setTotalExpenses(data.totalAmount || 0);
        setError(null);
      })
      .catch((error) => {
        if (error.name === "AppUpdateRequiredError") {
          return;
        }
        console.log("expenses error--", error);
        Alert.alert("Error", error.message);
      })
      .finally(() => {
        setLoading(false);
      });
    */
  };

  useEffect(() => {
    fetchExpenses();
  }, [activityLocId, promoterId]);

  const getExpenseIcon = (type: string) => {
    switch (type) {
      case "fuel":
        return "car-outline";
      case "food":
        return "restaurant-outline";
      case "transport":
        return "bus-outline";
      default:
        return "receipt-outline";
    }
  };

  const getExpenseColor = (type: string) => {
    switch (type) {
      case "fuel":
        return "#EF4444"; // Red
      case "food":
        return "#10B981"; // Green
      case "transport":
        return "#3B82F6"; // Blue
      default:
        return "#6B7280"; // Gray
    }
  };

  // Render Expense Item
  const renderExpenseItem = ({ item }: { item: ExpenseItem }) => (
    <View className="bg-white p-4 rounded-2xl shadow-md mb-3 border border-gray-100">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center flex-1">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: `${getExpenseColor(item.type)}20` }}
          >
            <Ionicons
              name={getExpenseIcon(item.type)}
              size={24}
              color={getExpenseColor(item.type)}
            />
          </View>

          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-800">
              {item.description}
            </Text>
            <Text className="text-gray-500 text-sm">
              {item.category} • {format(new Date(item.date), "MMM d, yyyy")}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-xl font-bold text-red-600">
            -₹{item.amount}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-100">
      {/* Don't render CustomHeader here since it's handled by MainScreen */}

      {/* Summary Card */}
      <View className="bg-white mx-4 my-4 rounded-3xl shadow-md p-6">
        <View className="items-center mb-4">
          <Text className="text-2xl font-semibold text-gray-800">
            Expenses Summary
          </Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="calendar-outline" size={20} color="gray" />
            <Text className="text-gray-500 ml-2">{currentDate}</Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mt-4">
          <View className="flex-row items-center">
            <Ionicons name="wallet-outline" size={24} color="gray" />
            <View className="ml-2">
              <Text className="text-gray-500">Total Expenses</Text>
              <Text className="text-xl font-semibold text-gray-800">
                This Month
              </Text>
            </View>
          </View>
          <View className="bg-red-500 h-16 w-20 rounded-lg items-center justify-center">
            <Text className="text-white text-lg font-bold">
              ₹{totalExpenses}
            </Text>
          </View>
        </View>
      </View>

      {/* Expenses List */}
      <View className="flex-1 mx-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-center text-gray-500 mt-2">
              Loading expenses...
            </Text>
          </View>
        ) : error ? (
          <Text className="text-center text-red-500 mt-4">{error}</Text>
        ) : expenses.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text className="text-center text-gray-500 text-lg mt-4">
              No expenses recorded yet
            </Text>
            <Text className="text-center text-gray-400 text-sm mt-2">
              Start adding your expenses to track your spending
            </Text>
          </View>
        ) : (
          <FlatList
            data={expenses}
            renderItem={renderExpenseItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      {/* Floating Action Button for Adding Expense */}
      <TouchableOpacity
        onPress={() => {
          // Navigate to add expense screen
          // router.push("/AddExpenseScreen");
          Alert.alert("Add Expense", "Navigate to Add Expense screen");
        }}
        className="absolute bottom-8 right-8 bg-red-500 rounded-full h-16 w-16 items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default ExpensesScreen;
