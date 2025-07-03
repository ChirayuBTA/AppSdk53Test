import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BaseToastProps } from "react-native-toast-message";

export const CustomToast = ({
  type,
  text1,
  text2,
}: BaseToastProps & { type: string }) => {
  const isSuccess = type === "success";
  const backgroundColor = isSuccess ? "#4BB543" : "#FF4D4F"; // green or red

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.message}>{text2}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "95%",
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    color: "white",
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: "white",
    lineHeight: 20,
  },
});
