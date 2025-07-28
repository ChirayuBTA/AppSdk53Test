import DynamicDropdown from "@/components/DynamicDropdown";
import ScreenWrapper from "@/components/ScreenWrapper";
import { api } from "@/utils/api";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface DropdownItem {
  id: string;
  name: string;
  [key: string]: any;
}

const AddArea = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    areaName: "",
    cityId: "",
    cityName: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // City Selection Handler
  const handleCitySelect = (item: DropdownItem) => {
    updateField("cityId", item.id);
    updateField("cityName", item.name);
  };

  const validateForm = () => {
    if (!formData.areaName.trim()) {
      Alert.alert("Error", "Please enter area name");
      return false;
    }

    if (!formData.cityId) {
      Alert.alert("Error", "Please select a city");
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const requestBody = {
      name: formData.areaName.trim(),
      cityId: formData.cityId,
    };

    console.log("Submitting area data:", requestBody);

    api
      .createArea(requestBody)
      .then((response) => {
        if (response && response.success) {
          Alert.alert("Success", "Area created successfully!", [
            {
              text: "OK",
              onPress: () => {
                // Reset form
                setFormData({
                  areaName: "",
                  cityId: "",
                  cityName: "",
                });
                // Navigate back
                router.back();
              },
            },
          ]);
        } else {
          Alert.alert(
            "Error",
            response?.message || "Failed to create area. Please try again."
          );
        }
      })
      .catch((error) => {
        console.error("Error creating area:", error);
        Alert.alert(
          "Error",
          "Failed to create area. Please check your connection and try again."
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <ScreenWrapper headerProps={{ showOnlyLogout: true }} showScroll={true}>
      <View className="p-6">
        <Text className="text-2xl font-bold text-primary mb-6">
          Add New Area
        </Text>

        {/* Area Name Input */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Area Name <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={formData.areaName}
            onChangeText={(value) => updateField("areaName", value)}
            placeholder="Enter area name"
            className="border border-gray-300 rounded-lg p-3 bg-white"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* City Selection Dropdown */}
        <DynamicDropdown
          label="City"
          placeholder="Select City"
          isRequired={true}
          selectedValue={formData.cityId}
          selectedLabel={formData.cityName}
          onSelect={handleCitySelect}
          apiCall={api.getAllCities}
          searchable={true}
          pageSize={10}
          noDataMessage="No cities available"
          errorMessage="Failed to load cities. Please try again."
        />

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          className="bg-primary rounded-lg p-4 items-center mt-6"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold text-lg">Add Area</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
};

export default AddArea;
