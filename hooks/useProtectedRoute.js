// hooks/useProtectedRoute.js
import { useEffect } from "react";
import { router, useSegments } from "expo-router";
import { getAuthData } from "../utils/storage";

const authFreeRoutes = ["/login", "/otp"];

export const useProtectedRoute = () => {
  const segments = useSegments();

  useEffect(() => {
    const checkAuth = async () => {
      const authData = await getAuthData();
      const token = authData?.token;

      const currentPath = `/${segments.join("/")}`;

      if (token && authFreeRoutes.includes(currentPath)) {
        router.replace("/dashboard"); // Redirect authenticated users away from login/otp
      }

      if (!token && !authFreeRoutes.includes(currentPath)) {
        router.replace("/login"); // Redirect unauthenticated users to login
      }
    };

    checkAuth();
  }, [segments]);
};
