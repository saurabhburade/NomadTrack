import { DynamicColorIOS, Platform } from "react-native";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

const adaptiveForeground =
  Platform.OS === "ios"
    ? DynamicColorIOS({
        dark: "#ffffff",
        light: "#000000"
      })
    : "#000000";

const adaptiveMuted =
  Platform.OS === "ios"
    ? DynamicColorIOS({
        dark: "rgba(255,255,255,0.52)",
        light: "rgba(0,0,0,0.44)"
      })
    : "rgba(0,0,0,0.54)";

export default function TabLayout() {
  return (
    <NativeTabs
      backgroundColor={null}
      blurEffect="systemDefault"
      disableTransparentOnScrollEdge={false}
      iconColor={{ default: adaptiveMuted, selected: adaptiveForeground }}
      labelStyle={{
        default: { color: adaptiveMuted, fontFamily: "Inter_600SemiBold", fontSize: 11 },
        selected: { color: adaptiveForeground, fontFamily: "Inter_700Bold", fontSize: 11 }
      }}
      minimizeBehavior="automatic"
      shadowColor="transparent"
      tintColor={adaptiveForeground}
    >
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "chart.pie", selected: "chart.pie.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <Icon sf={{ default: "calendar", selected: "calendar" }} />
        <Label>Calendar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Map</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
