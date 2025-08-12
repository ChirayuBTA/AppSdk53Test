import { api } from "@/utils/api";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// You'll need to install this package: npm install indian-pincodes
// If not available, you can use a pincode API or create a local mapping
// const pincodes = require("indian-pincodes");
const pincodes = require("india-pincode-lookup");

interface City {
  id: string;
  name: string;
  slug: string;
  state: string;
  status: string;
  pincode: string | null;
  latitude: string | null;
  longitude: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  areas: any[];
  hasSoc: boolean;
}

interface LocationData {
  address: string;
  cityId: string;
  cityName: string;
  pincode: string;
  state: string;
  areaName: string;
}

interface LocationSelectorProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  isRequired?: boolean;
  addressLabel?: string;
  addressPlaceholder?: string;
  showLabels?: boolean;
  forceUpdate?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  value,
  onChange,
  isRequired = false,
  addressLabel = "Address",
  addressPlaceholder = "Enter address",
  showLabels = true,
  forceUpdate,
}) => {
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [areaSuggestions, setAreaSuggestions] = useState<any[]>([]);
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Add this useEffect to force re-render when needed:
  useEffect(() => {
    // This will trigger a re-render when forceUpdate changes
  }, [forceUpdate]);

  // Fetch all cities on component mount
  useEffect(() => {
    fetchAllCities();
  }, []);

  const fetchAllCities = async () => {
    try {
      const response = await api.getAllCities({ page: 1, limit: 1000 }); // Adjust limit as needed
      if (response?.data?.items) {
        setAllCities(response.data.items);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  // Handle address change
  const handleAddressChange = (address: string) => {
    onChange({
      ...value,
      address,
    });
  };

  // Handle manual city change
  const handleCityChange = (cityName: string) => {
    onChange({
      ...value,
      cityName,
      cityId: "", // Clear cityId when manually typing
    });
  };

  // Find matching city based on pincode data
  const findMatchingCity = (
    cityNameFromPincode: string,
    stateFromPincode: string
  ): City | null => {
    if (!allCities || allCities.length === 0) return null;

    // First, try exact match with city name and state
    let matchingCity = allCities.find(
      (city) =>
        city.name.toLowerCase() === cityNameFromPincode.toLowerCase() &&
        city.state.toLowerCase() === stateFromPincode.toLowerCase()
    );

    // If no exact match, try partial match with city name
    if (!matchingCity) {
      matchingCity = allCities.find(
        (city) =>
          city.name.toLowerCase().includes(cityNameFromPincode.toLowerCase()) &&
          city.state.toLowerCase() === stateFromPincode.toLowerCase()
      );
    }

    // If still no match, try reverse - check if pincode city name contains our city name
    if (!matchingCity) {
      matchingCity = allCities.find(
        (city) =>
          cityNameFromPincode.toLowerCase().includes(city.name.toLowerCase()) &&
          city.state.toLowerCase() === stateFromPincode.toLowerCase()
      );
    }

    return matchingCity || null;
  };

  // Handle pincode change and fetch state/city
  const handlePincodeChange = async (pincode: string) => {
    // Only allow numeric input
    const numericPincode = pincode.replace(/[^0-9]/g, "");

    // Limit to 6 digits
    const limitedPincode = numericPincode.slice(0, 6);

    // Clear state and city if pincode is incomplete
    if (limitedPincode.length < 6) {
      onChange({
        ...value,
        pincode: limitedPincode,
        state: "",
        cityId: "",
        cityName: "",
      });
      return;
    }

    // Update pincode immediately
    onChange({
      ...value,
      pincode: limitedPincode,
    });

    // Fetch state and city when pincode is 6 digits
    if (limitedPincode.length === 6) {
      setIsLoadingPincode(true);
      try {
        console.log("limitedPincode----", limitedPincode);
        const pincodeData = pincodes.lookup(limitedPincode);
        console.log("pincodeData---", pincodeData);

        if (pincodeData && pincodeData.length > 0) {
          const state = pincodeData[0].stateName || pincodeData[0].state;
          const cityFromPincode =
            pincodeData[0].districtName ||
            pincodeData[0].district ||
            pincodeData[0].city;

          // Find matching city in our database
          const matchingCity = findMatchingCity(cityFromPincode, state);

          if (matchingCity) {
            // Auto-fill the city name
            onChange({
              ...value,
              pincode: limitedPincode,
              state: state,
              cityName: cityFromPincode,
              cityId: matchingCity ? matchingCity.id : "",
            });
          } else {
            // If no matching city found, just update with pincode city name
            onChange({
              ...value,
              pincode: limitedPincode,
              state: state,
              cityName: cityFromPincode,
              cityId: "",
            });
          }
        } else {
          // If pincode not found, show alert and clear state/city
          Alert.alert(
            "Invalid Pincode",
            "The entered pincode is not valid. Please check and try again."
          );
          onChange({
            ...value,
            pincode: limitedPincode,
            state: "",
            cityName: "",
            cityId: "",
          });
        }
      } catch (error) {
        console.error("Error fetching pincode data:", error);
        Alert.alert(
          "Error",
          "Failed to validate pincode. Please check your internet connection and try again."
        );
        onChange({
          ...value,
          pincode: limitedPincode,
          state: "",
          cityName: "",
          cityId: "",
        });
      } finally {
        setIsLoadingPincode(false);
      }
    }
  };

  const requiredAsterisk = isRequired ? (
    <Text className="text-red-500">*</Text>
  ) : null;

  // Add this function to fetch area suggestions using Nominatim (OpenStreetMap) API
  const fetchAreaSuggestions = async (query: string) => {
    if (query.trim().length < 3) {
      setAreaSuggestions([]);
      setShowAreaSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=5&countrycodes=in&addressdetails=1`;
      console.log("url---", url);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "chirayu/1.0 (chirayuchawande.work@gmail.com)",
          "Accept-Language": "en",
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const formattedSuggestions = data.map((item: any) => ({
        id: item.place_id,
        name: item.name,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));

      setAreaSuggestions(formattedSuggestions);
      setShowAreaSuggestions(formattedSuggestions.length > 0);
    } catch (error) {
      console.error("Error fetching area suggestions:", error);
      setAreaSuggestions([]);
      setShowAreaSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Add debounced function
  const debounceTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const debouncedFetchAreaSuggestions = React.useCallback((query: string) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchAreaSuggestions(query);
    }, 500);
  }, []);

  // Add cleanup useEffect
  React.useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  // Add area selection handler
  const handleAreaSuggestionSelect = (suggestion: any) => {
    const formattedAreaName = `${suggestion.name}`;
    onChange({
      ...value,
      areaName: formattedAreaName,
    });
    setShowAreaSuggestions(false);
    setAreaSuggestions([]);
  };

  // Handle area name change
  const handleAreaChange = (areaName: string) => {
    onChange({
      ...value,
      areaName,
    });
    debouncedFetchAreaSuggestions(areaName);
  };

  return (
    <View className="">
      {/* Address Field */}
      <View className="mb-4">
        {showLabels && (
          <Text className="text-sm font-medium text-gray-700 mb-2">
            {addressLabel} {requiredAsterisk}
          </Text>
        )}
        <TextInput
          value={value.address}
          onChangeText={handleAddressChange}
          placeholder={addressPlaceholder}
          placeholderTextColor="grey"
          multiline
          numberOfLines={3}
          className="border border-gray-300 rounded-lg p-3 bg-white"
          textAlignVertical="top"
        />
      </View>
      {/* Area Selection with Suggestions */}
      <View className="mb-4" style={{ zIndex: 500 }}>
        {showLabels && (
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Area {requiredAsterisk}
          </Text>
        )}
        <View className="relative">
          <TextInput
            value={value.areaName}
            onChangeText={handleAreaChange}
            placeholder="Enter Area"
            placeholderTextColor="grey"
            className="border border-gray-300 rounded-lg p-3 bg-white pr-16"
            style={{ minHeight: 48, zIndex: 502 }}
            onFocus={() => {
              if (value.areaName.trim().length >= 3) {
                setShowAreaSuggestions(true);
              }
            }}
          />

          {/* Loading indicator positioned better */}
          {isLoadingSuggestions && (
            <View
              className="absolute right-3 top-1/2"
              style={{
                transform: [{ translateY: -6 }],
                backgroundColor: "white",
                paddingHorizontal: 4,
                borderRadius: 4,
                zIndex: 503,
              }}
            >
              <Text className="text-primary text-xs">Loading...</Text>
            </View>
          )}

          {/* Area Suggestions Dropdown */}
          {showAreaSuggestions && areaSuggestions.length > 0 && (
            <View
              className="absolute left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48"
              style={{
                top: 50,
                zIndex: 501,
                elevation: 8,
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
              }}
            >
              <ScrollView
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {areaSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    onPress={() => handleAreaSuggestionSelect(suggestion)}
                    className={`p-3 ${
                      index < areaSuggestions.length - 1
                        ? "border-b border-gray-200"
                        : ""
                    }`}
                    style={{ backgroundColor: "white" }}
                  >
                    <Text className="text-gray-900 font-medium text-sm">
                      {suggestion.name}
                    </Text>
                    <Text
                      className="text-gray-600 text-xs mt-1"
                      numberOfLines={2}
                    >
                      {suggestion.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        {/* Touch overlay to close suggestions when tapping outside */}
        {showAreaSuggestions && (
          <TouchableOpacity
            style={{
              position: "absolute",
              top: -1000,
              left: -1000,
              right: -1000,
              bottom: -1000,
              zIndex: 499,
            }}
            onPress={() => setShowAreaSuggestions(false)}
            activeOpacity={1}
          />
        )}
      </View>
      {/* Pincode Field */}
      <View className="mb-4">
        {showLabels && (
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Pincode {requiredAsterisk}
          </Text>
        )}
        <TextInput
          value={value.pincode}
          onChangeText={handlePincodeChange}
          placeholder="Enter 6-digit pincode"
          placeholderTextColor="grey"
          keyboardType="numeric"
          maxLength={6}
          className="border border-gray-300 rounded-lg p-3 bg-white"
          editable={!isLoadingPincode}
          style={{ minHeight: 48 }} // Add this line
        />
        {isLoadingPincode && (
          <Text className="text-xs text-blue-600 mt-1">
            Validating pincode...
          </Text>
        )}
      </View>
      {/* Pincode and State Row */}
      <View className="flex-row gap-2">
        {/* City Input Field */}
        <View className="flex-1">
          {showLabels && (
            <Text className="text-sm font-medium text-gray-700 mb-2">City</Text>
          )}
          <TextInput
            value={value.cityName}
            onChangeText={handleCityChange}
            placeholder="City will auto-populate"
            placeholderTextColor="grey"
            className="border border-gray-300 rounded-lg p-3 bg-gray-50"
            editable={false}
            style={{ minHeight: 48 }} // Add this line
          />
          {isLoadingPincode && (
            <Text className="text-xs text-blue-600 mt-1">
              Auto-filling city from pincode...
            </Text>
          )}
        </View>

        {/* State Field */}
        <View className="flex-1">
          {showLabels && (
            <Text className="text-sm font-medium text-gray-700 mb-2">
              State
            </Text>
          )}
          <TextInput
            value={value.state}
            placeholder="State will auto-populate"
            placeholderTextColor="grey"
            className="border border-gray-300 rounded-lg p-3 bg-gray-50"
            editable={false}
            style={{ color: "#374151", minHeight: 48 }} // Add minHeight here
          />
        </View>
      </View>
    </View>
  );
};

export default LocationSelector;
