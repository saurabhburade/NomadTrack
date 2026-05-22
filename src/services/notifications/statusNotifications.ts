import * as Notifications from "expo-notifications";
import { openPdfFile } from "../export/pdfOpen";

type StatusNotificationOptions = {
  data?: Record<string, unknown>;
  identifier?: string;
};

const reportNotificationType = "nomadtrack-report-ready";
const handledReportNotificationIds = new Set<string>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export async function showStatusNotification(title: string, body: string, options: StatusNotificationOptions = {}) {
  try {
    const existing = await Notifications.getPermissionsAsync();
    const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return;

    if (options.identifier) {
      await dismissPresentedStatusNotifications(title, options.identifier);
    }

    await Notifications.scheduleNotificationAsync({
      identifier: options.identifier,
      content: { title, body, data: options.data },
      trigger: null
    });
  } catch (error) {
    console.warn(`[notifications] Status notification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function showReportReadyNotification(title: string, uri: string) {
  await showStatusNotification("Report ready", "PDF created. Tap to open sharing options.", {
    data: {
      title,
      type: reportNotificationType,
      uri
    },
    identifier: `nomadtrack-report-${sanitizeNotificationIdentifier(title)}`
  });
}

async function dismissPresentedStatusNotifications(title: string, keepIdentifier: string) {
  try {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      notifications
        .filter((notification) => notification.request.identifier !== keepIdentifier && notification.request.content.title === title)
        .map((notification) => Notifications.dismissNotificationAsync(notification.request.identifier))
    );
  } catch (error) {
    console.warn(`[notifications] Status notification cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

void dismissPresentedStatusNotifications("Taking location", "nomadtrack-status-location");

Notifications.addNotificationResponseReceivedListener((response) => {
  const { data } = response.notification.request.content;
  if (data.type !== reportNotificationType || typeof data.uri !== "string") return;

  const notificationId = response.notification.request.identifier;
  if (handledReportNotificationIds.has(notificationId)) return;
  handledReportNotificationIds.add(notificationId);

  const title = typeof data.title === "string" ? data.title : "Travel report";
  void openReportFromNotification(data.uri, title);
});

async function openReportFromNotification(uri: string, title: string) {
  try {
    await openPdfFile(uri, title);
  } catch (error) {
    console.warn(`[notifications] Report notification action failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function sanitizeNotificationIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}
