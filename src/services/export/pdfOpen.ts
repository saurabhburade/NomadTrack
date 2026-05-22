import * as Sharing from "expo-sharing";
import { Linking, Platform } from "react-native";

export async function openPdfFile(uri: string, title: string) {
  if (Platform.OS === "ios") {
    try {
      await Linking.openURL(uri);
      return true;
    } catch (error) {
      console.warn(`[report] Native PDF open failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!(await Sharing.isAvailableAsync())) return false;
  return sharePdfFile(uri, title);
}

async function sharePdfFile(uri: string, title: string) {
  const sharePromise = Sharing.shareAsync(uri, {
    dialogTitle: title,
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf"
  });
  const launched = await Promise.race([
    sharePromise.then(() => true),
    new Promise<"launched">((resolve) => {
      setTimeout(() => resolve("launched"), 1200);
    })
  ]);

  if (launched === "launched") {
    void sharePromise.catch((error) => {
      console.warn(`[report] PDF share failed after launch: ${error instanceof Error ? error.message : String(error)}`);
    });
    return true;
  }

  return launched;
}
