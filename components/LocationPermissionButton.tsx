import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import * as Location from "expo-location";
import { MapPin } from "lucide-react-native";
import { useRouter } from "expo-router";

interface LocationPermissionModalProps {
  visible: boolean;
  onRequestClose: () => void;
  onLocationGranted: (location: {
    latitude: number;
    longitude: number;
    formattedAddress?: string;
  }) => void;
}

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  visible,
  onRequestClose,
  onLocationGranted,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );
  const router = useRouter();

  useEffect(() => {
    // Setup app state change listener
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Check for location permission when the modal becomes visible
    if (visible) {
      checkLocationPermission();
    }

    // Clean up subscription when component unmounts
    return () => {
      subscription.remove();
    };
  }, [visible]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // When app comes back to foreground from background (likely after visiting settings)
    if (
      appState.match(/inactive|background/) &&
      nextAppState === "active" &&
      visible
    ) {
      console.log(
        "App has come to the foreground - checking location permission"
      );
      checkLocationPermission();
    }
    setAppState(nextAppState);
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      // If permission is now granted, proceed with getting location
      if (status === "granted") {
        console.log("Location permission is granted, getting location");
        getLocation();
      }
    } catch (error) {
      console.error("Error checking location permission:", error);
    }
  };

  const getLocation = async () => {
    setIsLoading(true);
    try {
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Use OpenStreetMap Nominatim API for reverse geocoding
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${locationData.latitude}&lon=${locationData.longitude}&format=json`;

        const response = await fetch(url, {
          headers: {
            "User-Agent": "LocationApp/1.0",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const osmData = await response.json();

        // Return location data with formatted address
        const locationWithAddress = {
          ...locationData,
          formattedAddress: osmData.display_name || "",
        };

        onLocationGranted(locationWithAddress);
        onRequestClose(); // Close the modal after successful location capture
      } catch (geoError) {
        console.error("Error in reverse geocoding:", geoError);

        // Still call callback with coordinates only
        onLocationGranted(locationData);
        onRequestClose(); // Close the modal
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to access location services.");
    } finally {
      setIsLoading(false);
    }
  };

  const openSettings = async () => {
    try {
      // Open app settings
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error("Failed to open settings:", error);
      Alert.alert(
        "Settings Unavailable",
        "Please open your device settings and enable location permissions manually"
      );
    }
    // Do not close modal here, as we want it to remain visible when user returns
  };

  const handleCancel = async () => {
    router.replace("/dashboard");
  };

  const handleRequestLocation = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need your location to proceed. Please enable location services in your device settings.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: onRequestClose,
            },
            {
              text: "Open Settings",
              onPress: openSettings,
            },
          ]
        );
        setIsLoading(false);
        return;
      }

      // Permission was granted directly, proceed with getting location
      getLocation();
    } catch (error) {
      console.error("Error requesting location permission:", error);
      Alert.alert("Error", "Failed to request location permissions.");
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Location Access Required</Text>

        <View style={styles.iconContainer}>
          <MapPin color="#f89f22" size={50} />
        </View>

        <Text style={styles.modalText}>
          Please grant location access.{"\n\n"}
          If you enable location access in your device settings, please return
          here and tap "Grant Location Access" again to continue.
        </Text>

        <TouchableOpacity
          style={styles.grantButton}
          onPress={handleRequestLocation}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.buttonText}>Getting Location...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <MapPin color="#ffffff" size={18} />
              <Text style={styles.buttonText}>Grant Location Access</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    // backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    marginVertical: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
    color: "#555",
  },
  grantButton: {
    backgroundColor: "#f89f22",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#555",
    fontSize: 16,
  },
});

export default LocationPermissionModal;
