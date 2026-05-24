import { useMemo } from "react";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CalendarDays, ChartPie, Map as MapIcon, Settings as SettingsIcon, type LucideIcon } from "lucide-react-native";
import { useColorScheme, View } from "react-native";
import { DashboardScreen } from "../screens/DashboardScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { MapScreen } from "../screens/MapScreen";
import { TripsScreen } from "../screens/TripsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { YearOverviewScreen } from "../screens/YearOverviewScreen";
import { getNeutralPalette, iconStrokeWidth } from "../lib/colors";
import { useAppStore } from "../store/appStore";

export type RootTabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Map: undefined;
  Trips: undefined;
  Settings: undefined;
  YearOverview: undefined;
};

type VisibleTabParamList = Pick<RootTabParamList, "Dashboard" | "Calendar" | "Map" | "Settings">;
type VisibleTabRouteName = keyof VisibleTabParamList;

type RootStackParamList = {
  MainTabs: undefined;
  Trips: undefined;
  YearOverview: undefined;
};

const NativeTab = createBottomTabNavigator<VisibleTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const tabIcons: Record<VisibleTabRouteName, LucideIcon> = {
  Dashboard: ChartPie,
  Calendar: CalendarDays,
  Map: MapIcon,
  Settings: SettingsIcon
};

export function AppNavigator() {
  const scheme = useColorScheme();
  const appearance = useAppStore((state) => state.settings.appearance);
  const isDark = appearance === "dark" || (appearance === "system" && scheme === "dark");
  const palette = getNeutralPalette(isDark);
  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: palette.backgroundPrimary,
        border: palette.border,
        card: palette.backgroundPrimary,
        primary: palette.primary,
        text: palette.foreground
      }
    };
  }, [isDark, palette.backgroundPrimary, palette.border, palette.foreground, palette.primary]);

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer theme={navigationTheme}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs">
            {() => <MainTabs palette={palette} />}
          </RootStack.Screen>
          <RootStack.Screen name="Trips" component={TripsScreen} />
          <RootStack.Screen name="YearOverview" component={YearOverviewScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    </View>
  );
}

function MainTabs({ palette }: { palette: ReturnType<typeof getNeutralPalette> }) {
  return (
    <NativeTab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => {
        const Icon = tabIcons[route.name as VisibleTabRouteName] ?? tabIcons.Dashboard;

        return {
          headerShown: false,
          lazy: false,
          sceneStyle: { backgroundColor: palette.backgroundPrimary },
          tabBarActiveTintColor: palette.primary,
          tabBarInactiveTintColor: palette.foregroundTertiary,
          tabBarIcon: ({ color, size }) => <Icon size={size} color={color} strokeWidth={iconStrokeWidth} />,
          tabBarLabel: route.name,
          tabBarStyle: {
            backgroundColor: palette.backgroundPrimary,
            borderTopColor: palette.border
          },
          title: route.name
        };
      }}
    >
      <NativeTab.Screen name="Dashboard" component={DashboardScreen} />
      <NativeTab.Screen name="Calendar" component={CalendarScreen} />
      <NativeTab.Screen name="Map" component={MapScreen} />
      <NativeTab.Screen name="Settings" component={SettingsScreen} />
    </NativeTab.Navigator>
  );
}
