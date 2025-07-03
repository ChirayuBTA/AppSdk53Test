import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import {
  ArrowRightCircle,
  LogOut,
  Search,
  MapPin,
  Building,
  ChevronRight,
  Map,
  Home,
  Tag,
  Landmark,
} from "lucide-react-native";
import Constants from "expo-constants";
import { api } from "@/utils/api";
import {
  getAuthValue,
  getLocValue,
  storeAuthData,
  storeLocData,
} from "@/utils/storage";
import { useRouter } from "expo-router";
import CustomHeader from "@/components/CustomHeader";
import SearchDropdown from "@/components/SearchDropdown";
import * as Location from "expo-location";

// Define types for our data structures
interface City {
  id: string;
  name: string;
}

interface Society {
  id: string;
  name: string;
  status: string;
  areaName: string;
  cityName: string;
  activityId: string;
  activityName: string;
  brandNames: string[];
  // activity: {
  //   id: string;
  //   name: string;
  // };
}

interface SelectItem {
  key: string;
  value: string;
}

interface NavigationProps {
  navigate: (screen: string, params?: any) => void;
}

interface LocationScreenProps {
  navigation: NavigationProps;
}

export default function LocationScreen({ navigation }: LocationScreenProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedSociety, setSelectedSociety] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null
  );
  const [cities, setCities] = useState<SelectItem[]>([]);
  const [societies, setSocieties] = useState<SelectItem[]>([]);
  const [societiesData, setSocietiesData] = useState<Society[]>([]); // Store full society objects
  const [loadingCities, setLoadingCities] = useState<boolean>(true);
  const [loadingSocieties, setLoadingSocieties] = useState<boolean>(false);
  const [citySearch, setCitySearch] = useState<string>("");
  const [societySearch, setSocietySearch] = useState<string>("");
  const [selectedCityName, setSelectedCityName] = useState<string>("");
  const [selectedSocietyName, setSelectedSocietyName] = useState<string>("");
  const [selectedBrandName, setSelectedBrandName] = useState<string>("");
  const [selectedAreaName, setSelectedAreaName] = useState<string>("");
  const [projectId, setProjectId] = useState("");
  const [cityId, setCityId] = useState("");
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const router = useRouter();

  const fetchStorageData = async () => {
    const fetchedProjectId = await getAuthValue("projectId");
    const fetchedCityId = await getAuthValue("cityId");
    console.log("cityId", fetchedCityId);
    setProjectId(fetchedProjectId);
    setCityId(fetchedCityId);
  };

  useEffect(() => {
    fetchStorageData();
  }, []);

  // const fetchCurrentLocation = async () => {
  //   try {
  //     const { status } = await Location.requestForegroundPermissionsAsync();
  //     if (status !== "granted") {
  //       Alert.alert("Permission denied", "Location permission is required.");
  //       return;
  //     }

  //     const location = await Location.getCurrentPositionAsync({});
  //     const { latitude, longitude } = location.coords;

  //     const address = await Location.reverseGeocodeAsync({
  //       latitude,
  //       longitude,
  //     });

  //     if (address.length > 0) {
  //       const { city, district, region, country } = address[0];
  //       const locationString = `${district || ""}, ${city || ""}, ${
  //         region || ""
  //       }, ${country || ""}`;
  //       setCurrentLocation(locationString);
  //     } else {
  //       setCurrentLocation(`Lat: ${latitude}, Lon: ${longitude}`);
  //     }
  //   } catch (error) {
  //     console.log("Error fetching location:", error);
  //     Alert.alert("Error", "Failed to fetch location.");
  //   }
  // };

  // useEffect(() => {
  //   fetchCurrentLocation();
  // }, []);

  // Get status bar height
  const statusBarHeight =
    Platform.OS === "ios"
      ? Constants.statusBarHeight
      : StatusBar.currentHeight || 24;

  // const fetchCities = () => {
  //   setLoadingCities(true);

  //   api
  //     .getCities({ limit: 20, page: 1, search: citySearch })
  //     .then(({ data }) => {
  //       console.log("city data--", data);

  //       setCities(
  //         data?.map(({ id, name }: City) => ({ key: id, value: name })) || []
  //       );
  //     })
  //     .catch((error) => {
  // if (error.name === "AppUpdateRequiredError") {
  //   return;
  // }
  //       // console.error("Error fetching cities:", error);
  //       console.log("city error--", error);

  //       Alert.alert(
  //         "Error",
  //         error.message || "Failed to load cities. Please try again."
  //       );
  //     })
  //     .finally(() => setLoadingCities(false));
  // };

  const fetchSocieties = (projectId: string, cityId: string) => {
    setLoadingSocieties(true);

    const params = {
      limit: 20,
      page: 1,
      search: societySearch,
      projectId,
      cityId,
    };

    api
      .getSocities(params)
      .then(({ data }) => {
        setSocietiesData(data || []);
        setSocieties(
          data?.map(({ id, name }: Society) => ({ key: id, value: name })) || []
        );
      })
      .catch((error) => {
        if (error.name === "AppUpdateRequiredError") {
          return;
        }
        // console.error("Error fetching societies:", error);
        Alert.alert(
          "Error",
          error.message || "Failed to load societies. Please try again."
        );
      })
      .finally(() => setLoadingSocieties(false));
  };

  const handleCitySelect = (cityId: string) => {
    setSelectedCity(cityId);
    const selectedCityObj = cities.find((city) => city.key === cityId);
    setSelectedCityName(selectedCityObj?.value || "");
    setSelectedSociety(null);
    setSelectedActivityId(null);
    setSelectedSocietyName("");
  };

  const handleSocietySelect = (societyId: string) => {
    setSelectedSociety(societyId);

    // Find the selected society from the full dataset
    const selectedSocietyObj = societiesData.find(
      (society) => society.id === societyId
    );

    // Set society name
    setSelectedSocietyName(selectedSocietyObj?.name || "");

    // Store the activity ID if available
    if (selectedSocietyObj?.activityId) {
      setSelectedActivityId(selectedSocietyObj.activityId);
    }
  };

  const handleContinue = async () => {
    if (selectedSociety) {
      Alert.alert(
        "Confirm Selection",
        `You've selected ${selectedSocietyName}. This cannot be changed later.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: async () => {
              // Store the selected society and activity IDs
              const locationData = {
                activityLocId: selectedSociety,
                activityLocName: selectedSocietyName,
                activityId: selectedActivityId,
              };

              // Store the data using the provided function
              const stored = await storeLocData(locationData);
              if (stored) {
                console.log("Location data stored successfully:", locationData);
                // Navigate to next screen
                router.replace("/dashboard");
                // navigation.navigate("/dashboard");
              } else {
                Alert.alert(
                  "Error",
                  "Failed to save your selection. Please try again."
                );
              }
            },
          },
        ]
      );
    } else {
      // This is a fallback in case something is missing
      Alert.alert(
        "Error",
        "Please select both city and society before continuing."
      );
    }
  };

  // useEffect(() => {
  //   fetchCities();
  // }, [citySearch]);

  useEffect(() => {
    // if (selectedCity) {
    fetchSocieties(projectId, cityId);
    // }
  }, [societySearch, cityId]);

  const handleSocietySelectByName = (societyName: string) => {
    const selected = societiesData.find(
      (s) => s.name.toLowerCase() === societyName.toLowerCase()
    );

    if (selected) {
      setSelectedSociety(selected.id);
      setSelectedSocietyName(selected.name);

      if (selected.activityId) {
        setSelectedActivityId(selected.activityId);
      }
      if (selected.areaName) {
        setSelectedAreaName(selected.areaName);
      }
      if (selected.brandNames) {
        setSelectedBrandName(selected.brandNames[0]);
      }
      if (selected.cityName) {
        setSelectedCityName(selected.cityName);
      }
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-100"
      style={{ paddingTop: statusBarHeight }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <CustomHeader isLocationScreen={true} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Title Section */}
        <View className="mb-6 mt-2">
          <Text className="text-2xl font-bold text-gray-800 text-center">
            Select Your Location
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Please select your city and society below
          </Text>
          <View className="flex-row justify-center mt-2">
            <View className="bg-red-50 px-3 py-1 rounded-full">
              <Text className="text-red-500 text-xs font-medium">
                Note: Selection cannot be changed later
              </Text>
            </View>
          </View>
        </View>

        {currentLocation && (
          <View className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
            <View className="flex-row items-center mb-1">
              <MapPin size={16} color="#f89f22" />
              <Text className="text-gray-800 font-medium ml-2">
                Your Current Location
              </Text>
            </View>
            <Text className="text-gray-600 ml-6">{currentLocation}</Text>
          </View>
        )}

        {/* Selection Cards */}
        {/* <View className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <MapPin size={18} color="#EF4444" />
            <Text className="text-gray-800 font-semibold text-lg ml-2">
              City
            </Text>
          </View>

          {loadingCities ? (
            <View className="h-12 justify-center items-center">
              <ActivityIndicator size="small" color="#EF4444" />
            </View>
          ) : (
            <View className="border border-gray-200 rounded-lg bg-gray-50">
              <SelectList
                setSelected={(val: string) => handleCitySelect(val)}
                data={cities}
                save="key"
                placeholder="Search for your city..."
                boxStyles={{
                  borderWidth: 0,
                  backgroundColor: "transparent",
                  height: 50,
                }}
                inputStyles={{
                  fontSize: 16,
                  color: "#1F2937",
                }}
                dropdownStyles={{
                  borderColor: "#E5E7EB",
                  backgroundColor: "white",
                  maxHeight: 200,
                }}
                dropdownItemStyles={{
                  paddingVertical: 12,
                }}
                dropdownTextStyles={{
                  fontSize: 16,
                }}
                search={true}
                searchPlaceholder="Type to search cities..."
                onSelect={() => {
                  // We'll use setSelected for the actual value setting
                  // This is just for any additional actions on selection
                }}
              />
            </View>
          )}
        </View> */}

        {/* {selectedCity && ( */}
        <View className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <View className="flex-row items-center mb-2">
            <Building size={18} color="#f89f22" />
            <Text className="text-gray-800 font-semibold text-lg ml-2">
              Society
            </Text>
          </View>

          {loadingSocieties ? (
            <View className="h-12 justify-center items-center">
              <ActivityIndicator size="small" color="#f89f22" />
            </View>
          ) : (
            <SearchDropdown
              placeholder="Search for your society..."
              fetchData={async (query, page) => {
                try {
                  const { data } = await api.getSocities({
                    limit: 20,
                    page,
                    search: query,
                    projectId,
                    cityId,
                  });

                  return data?.map(({ id, name }: any) => ({ id, name })) || [];
                } catch (error: any) {
                  Alert.alert(
                    "Error",
                    error.message ||
                      "Failed to load societies. Please try again."
                  );
                  return [];
                }
              }}
              onValueChange={(val: string) => {
                handleSocietySelectByName(val);
              }}
              onReset={() => {
                // Clear the selected society when search is reset
                setSelectedSociety(null);
                setSelectedActivityId(null);
                setSelectedSocietyName("");
              }}
            />
          )}
        </View>
        {/* )} */}

        {/* Selected Location Summary */}
        {selectedSocietyName && (
          <View className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
            <Text className="text-gray-700 font-medium mb-2">
              Your Selection:
            </Text>

            {selectedSocietyName && (
              <View className="flex-row items-center">
                <Home size={14} color="#4B5563" />
                <Text className="text-gray-700 ml-2">
                  {selectedSocietyName}
                </Text>
              </View>
            )}

            {selectedAreaName && (
              <View className="flex-row items-center">
                <MapPin size={14} color="#4B5563" />
                <Text className="text-gray-700 ml-2">
                  {selectedAreaName}
                  {selectedCityName && ", " + selectedCityName}
                </Text>
              </View>
            )}

            {/* {selectedCityName && (
              <View className="flex-row items-center mb-1">
                <Map size={14} color="#4B5563" />
                <Text className="text-gray-700 ml-2">{selectedCityName}</Text>
              </View>
            )} */}

            {selectedBrandName && (
              <View className="flex-row items-center">
                <Tag size={14} color="#4B5563" />
                <Text className="text-gray-700 ml-2">{selectedBrandName}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer Action Button */}
      <View className="p-4 border-t border-gray-200 bg-white">
        <TouchableOpacity
          onPress={handleContinue}
          className={`flex-row justify-center items-center p-4 rounded-lg ${
            selectedSociety ? "bg-primary" : "bg-gray-300"
          }`}
          disabled={!selectedSociety}
        >
          <Text className="text-white font-semibold text-lg mr-2">
            Confirm Selection
          </Text>
          <ChevronRight size={20} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
