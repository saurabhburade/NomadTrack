import { WifiOff } from "lucide-react-native";
import { View } from "react-native";
import { iconStrokeWidth } from "../../lib/colors";
import { Text } from "./text";

type OfflineBannerProps = {
  isOffline: boolean;
  pendingCount: number;
};

export function OfflineBanner({ isOffline, pendingCount }: OfflineBannerProps) {
  if (!isOffline && pendingCount === 0) return null;

  return (
    <View className="mx-4 mt-3 flex-row items-center gap-3 rounded-lg border border-warning/40 bg-warning/15 p-3">
      <WifiOff size={18} color="#ca8a04" strokeWidth={iconStrokeWidth} />
      <View className="flex-1">
        <Text className="text-xs font-semibold text-warning">{isOffline ? "Offline tracking active" : "Validation queue pending"}</Text>
        <Text variant="caption">
          {pendingCount} {pendingCount === 1 ? "location" : "locations"} waiting for validation
        </Text>
      </View>
    </View>
  );
}
