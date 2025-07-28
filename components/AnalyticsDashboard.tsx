import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import { api } from "@/utils/api"; // Import your API utility
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
} from "date-fns";

const { width: screenWidth } = Dimensions.get("window");

interface AnalyticsData {
  labels: string[];
  datasets: [
    {
      data: number[];
      color?: (opacity: number) => string;
      strokeWidth?: number;
    }
  ];
}

interface DropdownOption {
  label: string;
  value: string;
}

interface AnalyticsDashboardProps {
  onDataChange?: (metric: string, period: string) => void;
  defaultOpen?: boolean;
  title?: string;
  description?: string;
  userId: string | null;
}

interface ApiDataItem {
  date?: string;
  month?: string;
  count: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  onDataChange,
  defaultOpen = false,
  title = "Analytics Dashboard",
  description = "Track your performance metrics",
  userId,
}) => {
  const [selectedMetric, setSelectedMetric] = useState("channels");
  const [selectedPeriod, setSelectedPeriod] = useState("last7days");
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [animation] = useState(new Animated.Value(defaultOpen ? 1 : 0));
  const [error, setError] = useState<string | null>(null);

  const metricOptions: DropdownOption[] = [
    { label: "Channels", value: "channels" },
    { label: "Activities", value: "activities" },
  ];

  const periodOptions: DropdownOption[] = [
    { label: "Last 7 Days", value: "last7days" },
    { label: "Last 30 Days", value: "last30days" },
    { label: "Last 12 Months", value: "last12months" },
    { label: "This Week", value: "thisWeek" },
    { label: "This Month", value: "thisMonths" },
    { label: "Year to Date", value: "ytd" },
  ];

  // Toggle accordion
  const toggleAccordion = () => {
    Animated.timing(animation, {
      toValue: isOpen ? 0 : 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
    setIsOpen(!isOpen);
  };

  // Generate height animation
  const heightInterpolation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Generate labels for date ranges
  const generateLabelsForPeriod = (period: string): string[] => {
    const now = new Date();

    switch (period) {
      case "last7days":
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (6 - i));
          return format(date, "EEE"); // Mon, Tue, Wed, etc.
        });

      case "last30days":
        return Array.from({ length: 30 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (29 - i));
          return format(date, "MM/dd");
        });

      case "last12months":
        return Array.from({ length: 12 }, (_, i) => {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (11 - i));
          return format(date, "MM/yy");
        });

      case "thisWeek":
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + i);
          return format(date, "EEE");
        });

      case "thisMonths":
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const daysInMonth = monthEnd.getDate();
        return Array.from({ length: daysInMonth }, (_, i) => {
          return (i + 1).toString();
        });

      case "ytd":
        const yearStart = startOfYear(now);
        const currentMonth = now.getMonth();
        const yearStartMonth = yearStart.getMonth();
        const monthsFromYearStart = currentMonth - yearStartMonth + 1;

        return Array.from({ length: monthsFromYearStart }, (_, i) => {
          const date = new Date(now.getFullYear(), yearStartMonth + i, 1);
          return format(date, "MMM");
        });

      default:
        return [];
    }
  };

  // Transform API data to chart format
  const transformApiDataToChart = (
    apiData: ApiDataItem[],
    period: string
  ): AnalyticsData => {
    const labels = generateLabelsForPeriod(period);
    const dataMap: Record<string, number> = {};

    // Create a map from API data
    apiData.forEach((item) => {
      let key: string;

      if (item.date) {
        const date = parseISO(item.date);
        switch (period) {
          case "last7days":
          case "thisWeek":
            key = format(date, "EEE");
            break;
          case "last30days":
            key = format(date, "MM/dd");
            break;
          case "thisMonths":
            key = format(date, "d");
            break;
          default:
            key = format(date, "MM/dd");
        }
      } else if (item.month) {
        const date = parseISO(item.month + "-01");
        switch (period) {
          case "last12months":
            key = format(date, "MMM yyyy");
            break;
          case "ytd":
            key = format(date, "MMM");
            break;
          default:
            key = format(date, "MMM yyyy");
        }
      } else {
        return;
      }

      dataMap[key] = (dataMap[key] || 0) + item.count;
    });

    // Fill in missing data points with 0
    const data = labels.map((label) => dataMap[label] || 0);

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  // Fetch analytics data from API
  const fetchAnalyticsData = async (metric: string, period: string) => {
    setLoading(true);
    setError(null);

    try {
      // Map frontend metric names to backend type parameter
      const typeParam = metric === "channels" ? "channel" : "activity";

      const response = await api.getBarGraphData({
        userId,
        range: period,
        type: typeParam,
      });

      if (response.success && response.data) {
        const chartData = transformApiDataToChart(response.data, period);
        setAnalyticsData(chartData);
      } else {
        throw new Error(response.message || "Failed to fetch data");
      }

      // Call the callback if provided
      onDataChange?.(metric, period);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch analytics data"
      );

      // Set empty data on error
      setAnalyticsData({
        labels: generateLabelsForPeriod(period),
        datasets: [
          {
            data: [],
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (isOpen) {
      fetchAnalyticsData(selectedMetric, selectedPeriod);
    }
  }, [isOpen]);

  // Handle metric selection
  const handleMetricSelect = (metric: string) => {
    setSelectedMetric(metric);
    setShowMetricDropdown(false);
    if (isOpen) {
      fetchAnalyticsData(metric, selectedPeriod);
    }
  };

  // Handle period selection
  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod(period);
    setShowPeriodDropdown(false);
    if (isOpen) {
      fetchAnalyticsData(selectedMetric, period);
    }
  };

  // Get selected option labels
  const getSelectedMetricLabel = () => {
    return (
      metricOptions.find((option) => option.value === selectedMetric)?.label ||
      "Channels"
    );
  };

  const getSelectedPeriodLabel = () => {
    return (
      periodOptions.find((option) => option.value === selectedPeriod)?.label ||
      "Last 7 Days"
    );
  };

  // Calculate responsive chart width
  const chartWidth = Math.max(
    screenWidth - 32,
    analyticsData?.labels.length ? analyticsData.labels.length * 60 : 0
  );
  const chartHeight = 260;

  // Chart configuration
  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(248, 159, 34, ${opacity})`, // main chart color
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // muted gray for labels
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#f89f22", // dot stroke in primary color
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#E5E7EB",
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 12,
      fontFamily: "System",
    },
    fillShadowGradient: "rgba(248, 159, 34, 0.2)", // area under line
    fillShadowGradientOpacity: 1,
    barPercentage: 0.6,
    formatYLabel: (value: string) => {
      const num = parseInt(value, 10);
      if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
      return value;
    },
  };

  // Custom Dropdown Component with Modal
  const CustomDropdown: React.FC<{
    options: DropdownOption[];
    selectedValue: string;
    onSelect: (value: string) => void;
    showDropdown: boolean;
    setShowDropdown: (show: boolean) => void;
    placeholder: string;
  }> = ({
    options,
    selectedValue,
    onSelect,
    showDropdown,
    setShowDropdown,
    placeholder,
  }) => {
    const selectedOption = options.find(
      (option) => option.value === selectedValue
    );

    return (
      <View className="flex-1">
        <TouchableOpacity
          onPress={() => setShowDropdown(true)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
        >
          <Text className="text-gray-800 font-medium">
            {selectedOption?.label || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>

        <Modal
          visible={showDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDropdown(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
            <View className="flex-1 bg-black/50 justify-center items-center px-4">
              <TouchableWithoutFeedback>
                <View className="bg-white rounded-2xl shadow-lg mx-8 max-w-sm w-full">
                  {/* Modal Header */}
                  <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <Text className="text-lg font-semibold text-gray-800">
                      {placeholder}
                    </Text>
                    <TouchableOpacity onPress={() => setShowDropdown(false)}>
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Options List */}
                  <View className="max-h-80">
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {options.map((option, index) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            onSelect(option.value);
                            setShowDropdown(false);
                          }}
                          className={`px-4 py-4 flex-row items-center justify-between ${
                            index !== options.length - 1
                              ? "border-b border-gray-50"
                              : ""
                          } ${
                            selectedValue === option.value ? "bg-yellow-50" : ""
                          }`}
                        >
                          <Text
                            className={
                              selectedValue === option.value
                                ? "text-base text-yellow-600 font-semibold"
                                : "text-base text-gray-700"
                            }
                          >
                            {option.label}
                          </Text>

                          {selectedValue === option.value && (
                            <Ionicons
                              name="checkmark-circle"
                              size={24}
                              color="#f89f22"
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  };

  // Rotate animation for the chevron icon
  const rotateAnimation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View className="bg-white rounded-3xl shadow-md overflow-hidden">
      {/* Accordion Header */}
      <TouchableOpacity
        onPress={toggleAccordion}
        className="flex-row items-center justify-between p-6"
      >
        <View className="flex-row items-center">
          <View className="bg-primary p-3 rounded-full mr-4">
            <Ionicons name="analytics" size={24} color="white" />
          </View>
          <View>
            <Text className="text-xl font-bold text-gray-800">{title}</Text>
            <Text className="text-gray-500 text-sm mt-1">{description}</Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateAnimation }] }}>
          <Ionicons name="chevron-down" size={24} color="#6B7280" />
        </Animated.View>
      </TouchableOpacity>

      {/* Accordion Content */}
      <Animated.View
        style={{
          height: isOpen ? undefined : 0,
          overflow: "hidden",
          opacity: animation,
        }}
      >
        <View className="px-6 pb-6">
          {/* Dropdown Controls */}
          <View className="flex-row space-x-3 mb-6 gap-2">
            <CustomDropdown
              options={metricOptions}
              selectedValue={selectedMetric}
              onSelect={handleMetricSelect}
              showDropdown={showMetricDropdown}
              setShowDropdown={setShowMetricDropdown}
              placeholder="Select Metric"
            />

            <CustomDropdown
              options={periodOptions}
              selectedValue={selectedPeriod}
              onSelect={handlePeriodSelect}
              showDropdown={showPeriodDropdown}
              setShowDropdown={setShowPeriodDropdown}
              placeholder="Select Period"
            />
          </View>

          {/* Chart Section */}
          <View className="bg-gray-50 rounded-2xl p-4">
            {loading ? (
              <View className="items-center justify-center py-12">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-gray-500 mt-3">Loading analytics...</Text>
              </View>
            ) : error ? (
              <View className="items-center justify-center py-12">
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color="#EF4444"
                />
                <Text className="text-red-500 mt-3 text-center">{error}</Text>
                <TouchableOpacity
                  onPress={() =>
                    fetchAnalyticsData(selectedMetric, selectedPeriod)
                  }
                  className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">Retry</Text>
                </TouchableOpacity>
              </View>
            ) : analyticsData && analyticsData.datasets[0].data.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                <View>
                  {/* Chart Title */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-lg font-semibold text-gray-800">
                      {getSelectedMetricLabel()} - {getSelectedPeriodLabel()}
                    </Text>
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
                      <Text className="text-gray-600 text-sm">
                        {getSelectedMetricLabel()}
                      </Text>
                    </View>
                  </View>

                  {/* Bar Chart */}
                  <BarChart
                    data={analyticsData}
                    width={chartWidth}
                    height={chartHeight}
                    chartConfig={chartConfig}
                    verticalLabelRotation={0}
                    showValuesOnTopOfBars={true}
                    fromZero={true}
                    yAxisLabel=""
                    yAxisSuffix=""
                    withHorizontalLabels={true}
                    withVerticalLabels={true}
                    segments={5}
                    style={{
                      marginVertical: 8,
                      borderRadius: 16,
                    }}
                    yLabelsOffset={10}
                    xLabelsOffset={-10}
                  />
                </View>
              </ScrollView>
            ) : (
              <View className="items-center justify-center py-12">
                <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-3">No data available</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

export default AnalyticsDashboard;
