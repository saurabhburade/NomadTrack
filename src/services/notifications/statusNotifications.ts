import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export async function showStatusNotification(title: string, body: string) {
  try {
    const existing = await Notifications.getPermissionsAsync();
    const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return;

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null
    });
  } catch (error) {
    console.warn(`[notifications] Status notification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
