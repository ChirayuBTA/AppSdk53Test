import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface DropdownItem {
  id: string;
  name: string;
  [key: string]: any; // Allow additional properties for flexibility
}

interface ApiResponse {
  success: boolean;
  data: DropdownItem[];
  total?: number;
  message?: string;
}

interface DynamicDropdownProps {
  label?: string;
  placeholder: string;
  isRequired?: boolean;
  selectedValue: string;
  selectedLabel: string;
  onSelect: (item: DropdownItem) => void;
  apiCall: (params: any) => Promise<ApiResponse>;
  searchable?: boolean;
  pageSize?: number;
  formatDisplayText?: (item: DropdownItem) => string;
  formatSelectedText?: (item: DropdownItem) => string;
  disabled?: boolean;
  maxHeight?: number;
  searchPlaceholder?: string;
  noDataMessage?: string;
  errorMessage?: string;
  additionalQueryParams?: Record<string, any>;
  debounceDelay?: number;
  onDropdownToggle?: (isOpen: boolean) => void;
}

const DynamicDropdown: React.FC<DynamicDropdownProps> = ({
  label,
  placeholder,
  isRequired = false,
  selectedValue,
  selectedLabel,
  onSelect,
  apiCall,
  searchable = true,
  pageSize = 10,
  formatDisplayText = (item) => item.name,
  formatSelectedText = (item) => item.name,
  disabled = false,
  maxHeight = 320,
  searchPlaceholder = "Search...",
  noDataMessage = "No items found",
  errorMessage = "Failed to load items. Please try again.",
  additionalQueryParams = {},
  debounceDelay = 500,
  onDropdownToggle,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [items, setItems] = useState<DropdownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  // Reset states when dropdown opens
  useEffect(() => {
    if (showDropdown) {
      fetchItems(true);
    }
  }, [showDropdown]);

  // Handle search with debounce
  useEffect(() => {
    if (showDropdown && searchable) {
      const delayedSearch = setTimeout(() => {
        fetchItems(true);
      }, debounceDelay);

      return () => clearTimeout(delayedSearch);
    }
  }, [searchText]);

  const fetchItems = async (reset = false) => {
    try {
      setError("");

      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const queryParams = {
        page: reset ? 1 : page,
        limit: pageSize,
        ...(searchText.trim() && searchable && { search: searchText.trim() }),
        ...additionalQueryParams,
      };

      const response = await apiCall(queryParams);

      if (response && response.success) {
        const newItems = response.data || [];

        if (reset) {
          setItems(newItems);
        } else {
          // Filter out duplicates when appending new items
          const existingIds = new Set(items.map((item) => item.id));
          const uniqueNewItems = newItems.filter(
            (item) => !existingIds.has(item.id)
          );
          setItems((prevItems) => [...prevItems, ...uniqueNewItems]);
        }

        setTotal(response.total || newItems.length);
        setTotalPages(
          Math.ceil((response.total || newItems.length) / pageSize)
        );

        if (!reset) {
          setPage((prev) => prev + 1);
        }
      } else {
        throw new Error(response?.message || "Failed to fetch items");
      }
    } catch (err) {
      console.error("Error fetching items:", err);
      setError(errorMessage);
      if (reset) {
        setItems([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && page <= totalPages && items.length < total) {
      fetchItems(false);
    }
  };

  const handleSelect = (item: DropdownItem) => {
    onSelect(item);
    setShowDropdown(false);
    setSearchText("");
  };

  const toggleDropdown = () => {
    if (disabled) return;

    const newShowDropdown = !showDropdown;
    setShowDropdown(newShowDropdown);

    // Notify parent about dropdown state
    onDropdownToggle?.(newShowDropdown);

    if (!newShowDropdown) {
      setSearchText("");
      setPage(1);
      setError("");
    }
  };

  return (
    <View className="mb-4">
      {/* Label */}
      <Text className={`text-sm font-medium text-gray-700 ${label && "mb-2"}`}>
        {label} {isRequired && <Text className="text-red-500">*</Text>}
      </Text>

      {/* Selected Value Display */}
      <TouchableOpacity
        onPress={toggleDropdown}
        className={`border border-gray-300 rounded-lg p-3 bg-white flex-row items-center justify-between ${
          disabled ? "opacity-50" : ""
        }`}
        disabled={disabled}
      >
        <Text
          className={selectedLabel ? "text-gray-900" : "text-gray-500"}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {selectedLabel || placeholder}
        </Text>
        {loading && <ActivityIndicator size="small" color="#666" />}
        <Text className="text-gray-400 ml-2">{showDropdown ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {/* Dropdown Content */}
      {showDropdown && (
        <View
          className="border border-gray-300 rounded-lg mt-1 bg-white"
          style={{ maxHeight }}
        >
          {/* Search Bar */}
          {searchable && (
            <View className="p-3 border-b border-gray-200">
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder={searchPlaceholder}
                className="border border-gray-300 rounded-lg p-2 bg-gray-50"
              />
            </View>
          )}

          {/* Loading State */}
          {loading ? (
            <View className="p-4 items-center">
              <ActivityIndicator size="small" color="#666" />
              <Text className="text-gray-500 mt-2">Loading...</Text>
            </View>
          ) : error ? (
            /* Error State */
            <View className="p-4 items-center">
              <Text className="text-red-500 text-center">{error}</Text>
              <TouchableOpacity
                onPress={() => fetchItems(true)}
                className="mt-2 bg-blue-500 px-4 py-2 rounded"
              >
                <Text className="text-white">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : items.length === 0 ? (
            /* No Data State */
            <View className="p-4 items-center">
              <Text className="text-gray-500">{noDataMessage}</Text>
            </View>
          ) : (
            /* Items List */
            <ScrollView
              style={{ maxHeight: maxHeight - (searchable ? 60 : 0) }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {items.map((item, index) => (
                <TouchableOpacity
                  key={`${item.id}-${index}`}
                  onPress={() => handleSelect(item)}
                  className="p-3 border-b border-gray-100"
                >
                  <Text className="text-gray-900" numberOfLines={2}>
                    {formatDisplayText(item)}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Load More Button */}
              {page <= totalPages && items.length < total && (
                <TouchableOpacity
                  onPress={handleLoadMore}
                  className="p-3 items-center border-t border-gray-200"
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : (
                    <Text className="text-blue-600 font-medium">
                      Load More ({items.length} of {total})
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

export default DynamicDropdown;
