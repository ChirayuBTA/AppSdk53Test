import React, { ReactNode } from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

interface MenuOptionProps {
  onSelect: () => void;
  onClose?: () => void;
  icon?: ReactNode;
  children: ReactNode;
}

export const MenuOption: React.FC<MenuOptionProps> = ({
  onSelect,
  onClose,
  icon,
  children,
}) => {
  const handlePress = () => {
    onSelect();
    if (onClose) {
      onClose();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.menuOption}>
      <View style={styles.menuContent}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={styles.menuText}>{children}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  menuOption: {
    padding: 10,
  },
  menuContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 10,
  },
  menuText: {
    fontSize: 16,
  },
});
