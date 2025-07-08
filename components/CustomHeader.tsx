import React from "react";
import { View, Text, TouchableOpacity, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { LogOut } from "lucide-react-native";
import {
  clearAuthData,
  clearLocData,
  getLocData,
  getAuthData,
} from "@/utils/storage";
import DropdownMenu from "./DropdownMenu";
import { MenuTrigger } from "./MenuTrigger";
import { MenuOption } from "./MenuOption";

const CustomHeader = ({
  isLocationScreen,
  isLegalScreen,
}: {
  isLocationScreen?: boolean;
  isLegalScreen?: boolean;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const isProfileScreen = pathname === "/Profile";

  const handleResetSettings = async () => {
    Alert.alert("Reset?", `Are you sure you want to reset your settings?`, [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          await clearLocData();
          router.replace("/location");
        },
      },
    ]);
  };

  const handleUploadImages = () => {
    router.push("/uploadImages");
  };

  const handleEnterVendorCode = () => {
    // Navigate to vendor code entry screen or show a modal
    console.log("Enter Vendor Code Clicked");

    // router.push("/enterVendorCode"); // Update this with the actual path
  };

  const handleLogout = async () => {
    Alert.alert("Logout?", `Are you sure you want to logout?`, [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          // await clearLocData();
          // await clearAuthData();
          // router.replace("/");
          router.push("/LogoutImage");
        },
      },
    ]);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "white",
      }}
    >
      {/* Logo */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Image
          source={require("@/assets/images/appLogo.png")}
          style={{ width: 80, height: 40, resizeMode: "contain" }}
        />
      </View>

      {!isLegalScreen && (
        <View>
          {isLocationScreen ? (
            <TouchableOpacity style={{ padding: 8 }} onPress={handleLogout}>
              <LogOut size={22} color="red" />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* Show Home icon only if not on /Profile */}
              {!isProfileScreen && (
                <TouchableOpacity
                  style={{ marginRight: 16 }}
                  onPress={() => router.replace("/dashboard")}
                >
                  <Ionicons name="home-outline" size={28} color="black" />
                </TouchableOpacity>
              )}

              {/* Dropdown Menu */}
              <DropdownMenu
                trigger={(onPress) => (
                  <MenuTrigger onPress={onPress}>
                    <Ionicons name="menu" size={28} color="black" />
                  </MenuTrigger>
                )}
              >
                {isProfileScreen ? (
                  <>
                    <MenuOption
                      onSelect={handleEnterVendorCode}
                      icon={
                        <Ionicons name="key-outline" size={20} color="black" />
                      }
                    >
                      Enter Vendor Code
                    </MenuOption>

                    <MenuOption
                      onSelect={handleLogout}
                      icon={
                        <Ionicons
                          name="log-out-outline"
                          size={20}
                          color="red"
                        />
                      }
                    >
                      Logout
                    </MenuOption>
                  </>
                ) : (
                  <>
                    {/* <MenuOption
                      onSelect={handleResetSettings}
                      icon={<Ionicons name="refresh" size={20} color="black" />}
                    >
                      Reset Settings
                    </MenuOption> */}

                    <MenuOption
                      onSelect={handleUploadImages}
                      icon={<Ionicons name="image" size={20} color="black" />}
                    >
                      Event Images Upload
                    </MenuOption>

                    <MenuOption
                      onSelect={handleLogout}
                      icon={
                        <Ionicons
                          name="log-out-outline"
                          size={20}
                          color="red"
                        />
                      }
                    >
                      Logout
                    </MenuOption>
                  </>
                )}
              </DropdownMenu>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default CustomHeader;
