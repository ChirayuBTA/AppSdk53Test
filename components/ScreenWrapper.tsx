// components/ScreenWrapper.tsx
import React from "react";
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import CustomHeader, { CustomHeaderProps } from "./CustomHeader";

interface ScreenWrapperProps {
  children: React.ReactNode;
  showScroll?: boolean; // Enable scroll or not
  headerProps?: CustomHeaderProps | null; // Pass null to hide header
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  showScroll = true,
  headerProps,
  containerStyle,
  contentStyle,
}) => {
  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: "white" }, containerStyle]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Render header only if headerProps is provided */}
      {headerProps && <CustomHeader {...headerProps} />}

      {showScroll ? (
        <KeyboardAwareScrollView
          contentContainerStyle={[
            { flexGrow: 1, paddingBottom: 100 },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableOnAndroid
          extraHeight={Platform.OS === "ios" ? 120 : 100}
          extraScrollHeight={Platform.OS === "ios" ? 120 : 100}
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

export default ScreenWrapper;
