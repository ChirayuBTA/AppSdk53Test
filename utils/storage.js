// utils/storage.js
import AsyncStorage from "@react-native-async-storage/async-storage";

// Keys
const AUTH_DATA_KEY = "authData";
const LOC_DATA_KEY = "locData";

// Store authentication data
export const storeAuthData = async (data) => {
  try {
    await AsyncStorage.setItem(AUTH_DATA_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error storing auth data:", error);
    return false;
  }
};
export const storeLocData = async (data) => {
  try {
    await AsyncStorage.setItem(LOC_DATA_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error storing location data:", error);
    return false;
  }
};

// Get authentication data
export const getAuthData = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(AUTH_DATA_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error("Error reading auth data:", error);
    return null;
  }
};
export const getLocData = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(LOC_DATA_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error("Error reading location data:", error);
    return null;
  }
};

// Get specific auth value
export const getAuthValue = async (key) => {
  try {
    const authData = await getAuthData();
    return authData ? authData[key] : null;
  } catch (error) {
    console.error(`Error getting auth value for ${key}:`, error);
    return null;
  }
};
export const getLocValue = async (key) => {
  try {
    const locData = await getLocData();
    return locData ? locData[key] : null;
  } catch (error) {
    console.error(`Error getting location value for ${key}:`, error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const authData = await getAuthData();
    return !!authData && !!authData.token;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
};

// Clear authentication data (logout)
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_DATA_KEY);
    return true;
  } catch (error) {
    console.error("Error clearing auth data:", error);
    return false;
  }
};

// Clear location data (logout)
export const clearLocData = async () => {
  try {
    await AsyncStorage.removeItem(LOC_DATA_KEY); // Remove the entire location data object
    return true;
  } catch (error) {
    console.error("Error clearing location data:", error);
    return false;
  }
};
