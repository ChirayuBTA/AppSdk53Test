// context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import { getAuthData, storeAuthData, clearAuthData } from "../utils/storage";
import { getLocData, clearLocData } from "../utils/storage"; // Import location helpers

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authData, setAuthData] = useState(null);
  const [locData, setLocData] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [auth, loc] = await Promise.all([getAuthData(), getLocData()]);
        setAuthData(auth);
        setLocData(loc);
      } catch (error) {
        console.error("Failed to load auth or loc data:", error);
      } finally {
        setLoadingContext(false); // Set loading once both have completed
      }
    };
    loadInitialData();
  }, []);

  const login = async (data) => {
    try {
      await storeAuthData(data);
      setAuthData(data);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await clearAuthData();
      await clearLocData();
      setAuthData(null);
      setLocData(null);
      return true;
    } catch (error) {
      console.error("Logout failed:", error);
      return false;
    }
  };

  const value = {
    authData,
    locData,
    hasToken: !!authData?.token,
    hasSociety: !!locData?.activityLocId,
    loadingContext,
    login,
    logout,
    setLocData,
    projectId: authData?.projectId || null,
    promoterId: authData?.promoterId || null,
    brandId: authData?.brandId || null,
    vendorId: authData?.vendorId || null,
    token: authData?.token || null,
    role: authData?.role || null,
    activityLocId: locData?.activityLocId || null,
    activityLocName: locData?.activityLocName || null,
    activityId: locData?.activityId || null,
    cityId: authData?.cityId || null,
    cityName: authData?.cityName || null,
    activityCode:locData?.activityCode||null
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
