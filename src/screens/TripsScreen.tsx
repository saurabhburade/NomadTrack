import { Plane, Plus } from "lucide-react-native";
import { ScrollView, useColorScheme, View } from "react-native";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Text } from "../components/ui/text";
import { getNeutralPalette, iconStrokeWidth } from "../lib/colors";
import { useAppStore } from "../store/appStore";

export function TripsScreen() {
  const { settings, trips } = useAppStore();
  const scheme = useColorScheme();
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getNeutralPalette(isDark);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View className="gap-4 px-4 pb-8 pt-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text variant="title">Trips</Text>
            <Text variant="muted">Auto-detected trips, manual entries, and ghost trips.</Text>
          </View>
          <Button size="icon" variant="outline">
            <Plus size={18} color={palette.foreground} strokeWidth={iconStrokeWidth} />
          </Button>
        </View>

        {trips.length === 0 ? (
          <Card className="items-center gap-3 py-8">
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-tertiary">
              <Plane size={24} color={palette.foreground} strokeWidth={iconStrokeWidth} />
            </View>
            <Text className="font-semibold">No trips detected yet</Text>
            <Text variant="muted" className="text-center">
              Trips are created when country changes or long-distance movement is detected.
            </Text>
          </Card>
        ) : (
          trips.map((trip) => (
            <Card key={trip.id} className="gap-2">
              <Text className="font-semibold">{trip.countryName}</Text>
              <Text variant="muted">
                {trip.startDate} to {trip.endDate}
              </Text>
              <Text variant="caption">{trip.cities.join(", ") || "Cities pending validation"}</Text>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}
