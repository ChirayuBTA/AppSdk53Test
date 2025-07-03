import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import DynamicDropdown from "@/components/DynamicDropdown";
import { api } from "@/utils/api";

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
}

interface LocationSelectorProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  isRequired?: boolean;
  addressLabel?: string;
  addressPlaceholder?: string;
  showLabels?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  value,
  onChange,
  isRequired = false,
  addressLabel = "Address",
  addressPlaceholder = "Enter address",
  showLabels = true,
}) => {
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);

  // Handle address change
  const handleAddressChange = (address: string) => {
    onChange({
      ...value,
      address,
    });
  };

  // Handle city selection
  const handleCitySelect = (item: any) => {
    const city = item as City;
    onChange({
      ...value,
      cityId: city.id,
      cityName: `${city.name}`,
    });
  };

  // Format city display text for dropdown
  const formatCityDisplayText = (item: any) => {
    const city = item as City;
    return `${city.name}\n${city.state}`;
  };

  // Handle pincode change and fetch state
  const handlePincodeChange = async (pincode: string) => {
    // Only allow numeric input
    const numericPincode = pincode.replace(/[^0-9]/g, "");

    // Limit to 6 digits
    const limitedPincode = numericPincode.slice(0, 6);

    onChange({
      ...value,
      pincode: limitedPincode,
      state: limitedPincode.length === 6 ? value.state : "", // Clear state if pincode is incomplete
    });

    // Fetch state when pincode is 6 digits
    if (limitedPincode.length === 6) {
      setIsLoadingPincode(true);
      try {
        // Using indian-pincodes package
        console.log("limitedPincode----", limitedPincode);
        const pincodeData = pincodes.lookup(limitedPincode);
        console.log("pincodeData---", pincodeData);

        if (pincodeData && pincodeData.length > 0) {
          const state = pincodeData[0].stateName || pincodeData[0].state;
          onChange({
            ...value,
            pincode: limitedPincode,
            state: state,
          });
        } else {
          // If pincode not found, show alert and clear state
          Alert.alert(
            "Invalid Pincode",
            "The entered pincode is not valid. Please check and try again."
          );
          onChange({
            ...value,
            pincode: limitedPincode,
            state: "",
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
        });
      } finally {
        setIsLoadingPincode(false);
      }
    }
  };

  const requiredAsterisk = isRequired ? (
    <Text className="text-red-500">*</Text>
  ) : null;

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
          multiline
          numberOfLines={3}
          className="border border-gray-300 rounded-lg p-3 bg-white"
          textAlignVertical="top"
        />
      </View>

      {/* City Dropdown */}
      <View className="mb-2">
        <DynamicDropdown
          label={showLabels ? "City" : undefined}
          placeholder="Select City"
          isRequired={isRequired}
          selectedValue={value.cityId}
          selectedLabel={value.cityName}
          onSelect={handleCitySelect}
          apiCall={api.getAllCities}
          searchable={true}
          pageSize={10}
          formatDisplayText={formatCityDisplayText}
          searchPlaceholder="Search cities..."
          noDataMessage="No cities found"
          errorMessage="Failed to load cities. Please try again."
          maxHeight={320}
        />
      </View>

      {/* Pincode and State Row */}
      <View className="flex-row space-x-3 gap-2">
        {/* Pincode Field */}
        <View className="flex-1">
          {showLabels && (
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Pincode {requiredAsterisk}
            </Text>
          )}
          <TextInput
            value={value.pincode}
            onChangeText={handlePincodeChange}
            placeholder="Enter 6-digit pincode"
            keyboardType="numeric"
            maxLength={6}
            className="border border-gray-300 rounded-lg p-3 bg-white"
            editable={!isLoadingPincode}
          />
          {isLoadingPincode && (
            <Text className="text-xs text-blue-600 mt-1">
              Validating pincode...
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
            className="border border-gray-300 rounded-lg p-3 bg-gray-50"
            editable={false}
            style={{ color: "#374151" }}
          />
        </View>
      </View>
    </View>
  );
};

export default LocationSelector;
