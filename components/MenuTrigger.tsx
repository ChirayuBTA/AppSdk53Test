import React, { ReactNode } from "react";
import { TouchableOpacity } from "react-native";

export const MenuTrigger = ({
  onPress,
  children,
}: {
  onPress: () => void;
  children: ReactNode;
}) => {
  return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
};
