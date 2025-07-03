// helper/compressImage.ts

import * as FileSystem from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export const compressImage = async (uri: string): Promise<string> => {
  try {
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);

    // If file exists and size is already small, no need to compress
    if (fileInfo.exists && fileInfo.size && fileInfo.size < 300000) {
      return uri;
    }

    // Calculate compression quality based on file size
    let quality = 0.7;
    if (fileInfo.exists && fileInfo.size) {
      if (fileInfo.size > 1000000) quality = 0.5;
      if (fileInfo.size > 2000000) quality = 0.4;
      if (fileInfo.size > 5000000) quality = 0.3;
    }

    // Compress image
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }], // Resize to reasonable dimensions
      {
        compress: quality,
        format: SaveFormat.JPEG,
      }
    );

    return manipResult.uri;
  } catch (error) {
    console.error("Error compressing image:", error);
    // Return original if compression fails
    return uri;
  }
};
