import "react-native-gesture-handler";
import "./global.css";

import { useEffect, useState } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { colorScheme as nativeWindColorScheme } from "nativewind";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { useAppStore } from "./src/store/appStore";
import { getNeutralPalette } from "./src/lib/colors";

export default function App() {
  const { initialize, isReady, settings } = useAppStore();
  const scheme = useColorScheme();
  const [splashComplete, setSplashComplete] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular: require("./assets/fonts/Inter_400Regular.ttf"),
    Inter_500Medium: require("./assets/fonts/Inter_500Medium.ttf"),
    Inter_600SemiBold: require("./assets/fonts/Inter_600SemiBold.ttf"),
    Inter_700Bold: require("./assets/fonts/Inter_700Bold.ttf"),
    Inter_800ExtraBold: require("./assets/fonts/Inter_800ExtraBold.ttf")
  });
  const phase = !isReady || !fontsLoaded || !splashComplete ? "splash" : settings.onboardingCompleted ? "app" : "onboarding";
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getNeutralPalette(isDark);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const timer = setTimeout(() => setSplashComplete(true), 1700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    nativeWindColorScheme.set(settings.appearance === "system" ? "system" : isDark ? "dark" : "light");
  }, [isDark, settings.appearance]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.backgroundPrimary }}>
      <SafeAreaProvider>
        <View className="flex-1" style={{ backgroundColor: palette.backgroundPrimary }}>
          <StatusBar style={phase === "splash" ? "light" : phase === "onboarding" ? "dark" : isDark ? "light" : "dark"} />
          {phase === "splash" ? <SplashScreen isPreparing={!isReady || !fontsLoaded} /> : phase === "onboarding" ? <OnboardingScreen /> : <AppNavigator />}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
