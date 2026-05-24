import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { CalendarDays, ChartPie, Map as MapIcon, Settings as SettingsIcon } from "lucide-react-native";
import { Pressable, StyleSheet, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing as ReanimatedEasing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { DashboardScreen } from "../screens/DashboardScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { MapScreen } from "../screens/MapScreen";
import { TripsScreen } from "../screens/TripsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { YearOverviewScreen } from "../screens/YearOverviewScreen";
import { LiquidGlassLayer } from "../components/native/LiquidGlassLayer";
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

const Tab = createBottomTabNavigator<RootTabParamList>();

type TabRouteName = keyof RootTabParamList;
type TabVisualName = "Dashboard" | "Calendar" | "Map" | "Settings";
type TabIcon = typeof ChartPie;

const icons: Record<TabVisualName, TabIcon> = {
  Dashboard: ChartPie,
  Calendar: CalendarDays,
  Map: MapIcon,
  Settings: SettingsIcon
};

const labels: Record<TabVisualName, string> = {
  Dashboard: "Dashboard",
  Calendar: "Calendar",
  Map: "Map",
  Settings: "Settings"
};

const visibleTabs: Array<{ name: TabVisualName; routeName: TabRouteName }> = [
  { name: "Dashboard", routeName: "Dashboard" },
  { name: "Calendar", routeName: "Calendar" },
  { name: "Map", routeName: "Map" },
  { name: "Settings", routeName: "Settings" }
];

const tabBarPadding = 8;
const tabIndicatorInset = 5;

export function AppNavigator() {
  const scheme = useColorScheme();
  const appearance = useAppStore((state) => state.settings.appearance);
  const isDark = appearance === "dark" || (appearance === "system" && scheme === "dark");
  const palette = getNeutralPalette(isDark);
  const [transitionSequence, setTransitionSequence] = useState(0);
  const triggerTabTransition = useCallback(() => {
    setTransitionSequence((sequence) => sequence + 1);
  }, []);
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
    <View style={styles.navigatorRoot}>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          detachInactiveScreens={false}
          tabBar={(props) => <LiquidGlassTabBar {...props} isDark={isDark} onRouteChange={triggerTabTransition} />}
          screenOptions={{
            headerShown: false,
            animation: "none",
            freezeOnBlur: false,
            lazy: false,
            sceneStyle: { backgroundColor: palette.backgroundPrimary },
            tabBarShowLabel: false,
            tabBarHideOnKeyboard: true
          }}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Calendar" component={CalendarScreen} />
          <Tab.Screen name="Map" component={MapScreen} />
          <Tab.Screen name="Trips" component={TripsScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
          <Tab.Screen name="YearOverview" component={YearOverviewScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      <TabTransitionBlur isDark={isDark} sequence={transitionSequence} />
    </View>
  );
}

function TabTransitionBlur({ isDark, sequence }: { isDark: boolean; sequence: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const opacity = useSharedValue<number>(0);

  useEffect(() => {
    if (sequence === 0) return;

    setIsVisible(true);
    cancelAnimation(opacity);
    opacity.value = 0.5;
    opacity.value = withTiming(
      0,
      {
        duration: 500,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic)
      },
      (finished) => {
        if (finished) runOnJS(setIsVisible)(false);
      }
    );

    const fallbackTimer = setTimeout(() => setIsVisible(false), 700);
    return () => clearTimeout(fallbackTimer);
  }, [opacity, sequence]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  if (!isVisible) return null;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.transitionBlurLayer, overlayStyle]}>
      <BlurView intensity={52} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function LiquidGlassTabBar({ state, descriptors, navigation, isDark, onRouteChange }: BottomTabBarProps & { isDark: boolean; onRouteChange: () => void }) {
  const insets = useSafeAreaInsets();
  const palette = getNeutralPalette(isDark);
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = useSharedValue(state.index);
  const previousRouteIndex = useRef(state.index);
  const currentRouteName = state.routes[state.index]?.name as TabRouteName | undefined;
  const routesByName = useMemo(() => new globalThis.Map(state.routes.map((route) => [route.name as TabRouteName, route])), [state.routes]);
  const activeVisibleIndex = useMemo(() => {
    const visibleIndex = visibleTabs.findIndex((tab) => tab.routeName === currentRouteName);
    return visibleIndex >= 0 ? visibleIndex : 0;
  }, [currentRouteName]);
  const itemWidth = useMemo(() => (barWidth > 0 ? (barWidth - tabBarPadding * 2) / visibleTabs.length : 0), [barWidth]);

  useEffect(() => {
    if (previousRouteIndex.current !== state.index) {
      previousRouteIndex.current = state.index;
      onRouteChange();
    }
  }, [onRouteChange, state.index]);

  useEffect(() => {
    activeIndex.value = withSpring(activeVisibleIndex, {
      damping: 16,
      stiffness: 175,
      mass: 0.72,
      overshootClamping: false
    });
  }, [activeIndex, activeVisibleIndex]);

  const indicatorStyle = useAnimatedStyle(() => {
    const distanceFromRest = Math.abs(activeIndex.value - Math.round(activeIndex.value));
    const stretch = 1 + Math.min(distanceFromRest * 0.42, 0.2);

    return {
      opacity: itemWidth > 0 ? 1 : 0,
      width: Math.max(itemWidth - tabIndicatorInset * 2, 0),
      transform: [
        { translateX: tabBarPadding + activeIndex.value * itemWidth + tabIndicatorInset },
        { scaleX: stretch }
      ]
    };
  }, [itemWidth]);

  return (
    <View
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      pointerEvents="box-none"
      style={[
        styles.tabBar,
        {
          backgroundColor: isDark ? "rgba(18,18,20,0.08)" : "rgba(255,255,255,0.08)",
          borderColor: isDark ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.48)",
          bottom: Math.max(insets.bottom, 10)
        }
      ]}
    >
      <LiquidGlassLayer colorScheme={isDark ? "dark" : "light"} glassStyle="regular" intensity={98} tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.liquidIndicator,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.28)",
            borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.58)",
            shadowColor: palette.shadow
          },
          indicatorStyle
        ]}
      />

      {visibleTabs.map((tab, index) => {
        const route = routesByName.get(tab.routeName);
        if (!route) return null;

        const descriptor = descriptors[route.key];
        const isFocused = activeVisibleIndex === index;

        return (
          <LiquidGlassTab
            key={tab.name}
            accessibilityLabel={descriptor?.options.tabBarAccessibilityLabel ?? labels[tab.name]}
            isDark={isDark}
            isFocused={isFocused}
            name={tab.name}
            onLongPress={() => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            }}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            testID={descriptor?.options.tabBarButtonTestID}
          />
        );
      })}
    </View>
  );
}

function LiquidGlassTab({
  accessibilityLabel,
  isDark,
  isFocused,
  name,
  onLongPress,
  onPress,
  testID
}: {
  accessibilityLabel: string;
  isDark: boolean;
  isFocused: boolean;
  name: TabVisualName;
  onLongPress: () => void;
  onPress: () => void;
  testID?: string;
}) {
  const Icon = icons[name];
  const palette = getNeutralPalette(isDark);
  const activeProgress = useSharedValue(isFocused ? 1 : 0);
  const hop = useSharedValue(0);

  useEffect(() => {
    activeProgress.value = withTiming(isFocused ? 1 : 0, { duration: isFocused ? 190 : 150 });

    if (isFocused) {
      hop.value = withSequence(
        withTiming(-9, { duration: 90, easing: ReanimatedEasing.out(ReanimatedEasing.quad) }),
        withSpring(0, { damping: 8, stiffness: 190, mass: 0.55 })
      );
    }
  }, [activeProgress, hop, isFocused]);

  const tabContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hop.value }, { scale: 1 + activeProgress.value * 0.06 }]
  }));

  const iconColor = isFocused ? palette.foreground : palette.foregroundSecondary;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : undefined}
      onLongPress={onLongPress}
      onPress={onPress}
      style={styles.tabButton}
      testID={testID}
    >
      <Animated.View style={[styles.tabContent, tabContentStyle]}>
        <Icon color={iconColor} size={isFocused ? 28 : 26} strokeWidth={iconStrokeWidth} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navigatorRoot: {
    flex: 1
  },
  transitionBlurLayer: {
    elevation: 30,
    zIndex: 30
  },
  tabBar: {
    alignItems: "center",
    borderRadius: 38,
    borderWidth: 1,
    elevation: 12,
    flexDirection: "row",
    height: 78,
    overflow: "hidden",
    paddingHorizontal: tabBarPadding,
    position: "absolute",
    left: 18,
    right: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20
  },
  liquidIndicator: {
    borderRadius: 30,
    borderWidth: 1,
    bottom: 10,
    elevation: 8,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    top: 10
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    height: 62,
    justifyContent: "center",
    zIndex: 1
  },
  tabContent: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    minWidth: 44
  }
});
