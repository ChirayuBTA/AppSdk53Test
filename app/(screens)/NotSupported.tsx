import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NotSupported() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This web app is only accessible from an iOS device.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
  },
});
