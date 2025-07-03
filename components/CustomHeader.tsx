import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { LogOut } from "lucide-react-native";
import {
  clearAuthData,
  clearLocData,
  getLocData,
  getAuthData,
  getAuthValue,
} from "@/utils/storage";
import DropdownMenu from "./DropdownMenu";
import { MenuTrigger } from "./MenuTrigger";
import { MenuOption } from "./MenuOption";

interface CustomHeaderProps {
  isLocationScreen?: boolean;
  isLegalScreen?: boolean;
  showOnlyLogout?: boolean;
  showHome?: boolean;
  className?: string;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  isLocationScreen = false,
  isLegalScreen = false,
  showOnlyLogout = false,
  showHome = true,
  className,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setuserRole] = useState<string | null>(null);

  const fetchStoredData = async () => {
    const role = await getAuthValue("role");
    console.log("role-", role);
    setuserRole(role);
  };

  useEffect(() => {
    fetchStoredData();
  }, []);

  // Memoize computed values
  const isProfileScreen = useMemo(() => pathname === "/Profile", [pathname]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleResetSettings = useCallback(async () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset your settings?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await clearLocData();
              router.replace("/location");
            } catch (error) {
              console.error("Error clearing location data:", error);
              Alert.alert(
                "Error",
                "Failed to reset settings. Please try again."
              );
            }
          },
        },
      ]
    );
  }, [router]);

  const handleUploadImages = useCallback(() => {
    router.push("/uploadImages");
  }, [router]);

  const handleEnterVendorCode = useCallback(() => {
    // TODO: Implement vendor code entry navigation
    console.log("Enter Vendor Code Clicked");
    // router.push("/enterVendorCode");
  }, []);

  const handleLogout = useCallback(async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          router.push("/LogoutImage");
        },
      },
    ]);
  }, [router]);

  const handleOnlyLogout = useCallback(async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await clearLocData();
          await clearAuthData();
          router.replace("/");
        },
      },
    ]);
  }, [router]);

  const handleHomePress = useCallback(() => {
    router.replace("/dashboard");
  }, [router]);

  // Memoized menu trigger component
  const menuTrigger = useCallback(
    (onPress: () => void) => (
      <MenuTrigger onPress={onPress}>
        <Ionicons name="menu" size={28} color="black" />
      </MenuTrigger>
    ),
    []
  );

  // Memoized menu options based on screen type
  const menuOptions = useMemo(() => {
    if (showOnlyLogout) {
      return (
        <>
          <MenuOption
            onSelect={handleOnlyLogout}
            icon={<Ionicons name="log-out-outline" size={20} color="red" />}
          >
            Logout
          </MenuOption>
        </>
      );
    }

    return (
      <>
        <MenuOption
          onSelect={handleUploadImages}
          icon={<Ionicons name="image" size={20} color="black" />}
        >
          Event Images Upload
        </MenuOption>

        <MenuOption
          onSelect={handleLogout}
          icon={<Ionicons name="log-out-outline" size={20} color="red" />}
        >
          Logout
        </MenuOption>
      </>
    );
  }, [
    isProfileScreen,
    handleEnterVendorCode,
    handleUploadImages,
    userRole,
    handleLogout,
  ]);

  // Early return for legal screen
  if (isLegalScreen) {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/appLogo.png")}
            style={styles.logo}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} className={`${className}`}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/appLogo.png")}
          style={styles.logo}
        />
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {showOnlyLogout ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleOnlyLogout}
            accessibilityLabel="Logout"
            accessibilityRole="button"
          >
            <LogOut size={22} color="red" />
          </TouchableOpacity>
        ) : (
          <View style={styles.menuContainer}>
            {showHome && (
              <TouchableOpacity
                style={styles.homeButton}
                onPress={handleHomePress}
                accessibilityLabel="Go to dashboard"
                accessibilityRole="button"
              >
                <Ionicons name="home-outline" size={28} color="black" />
              </TouchableOpacity>
            )}

            <DropdownMenu trigger={menuTrigger}>{menuOptions}</DropdownMenu>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "white",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 40,
    resizeMode: "contain",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
  },
  menuContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  homeButton: {
    marginRight: 16,
  },
});

export default React.memo(CustomHeader);
