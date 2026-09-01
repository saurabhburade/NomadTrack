import "react-native-gesture-handler";
import "./global.css";

import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { colorScheme as nativeWindColorScheme } from "nativewind";
import { useEffect } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getNeutralPalette } from "./src/lib/colors";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { useAppStore } from "./src/store/appStore";

export default function App() {
  const { initialize, isReady, settings } = useAppStore();
  const scheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Inter_400Regular: require("./assets/fonts/Inter_400Regular.ttf"),
    Inter_500Medium: require("./assets/fonts/Inter_500Medium.ttf"),
    Inter_600SemiBold: require("./assets/fonts/Inter_600SemiBold.ttf"),
    Inter_700Bold: require("./assets/fonts/Inter_700Bold.ttf"),
    Inter_800ExtraBold: require("./assets/fonts/Inter_800ExtraBold.ttf")
  });
  const phase = !isReady || !fontsLoaded ? "loading" : settings.onboardingCompleted ? "app" : "onboarding";
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getNeutralPalette(isDark);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    nativeWindColorScheme.set(settings.appearance === "system" ? "system" : isDark ? "dark" : "light");
  }, [isDark, settings.appearance]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.backgroundPrimary }}>
      <SafeAreaProvider>
        <View className="flex-1" style={{ backgroundColor: palette.backgroundPrimary }}>
          <StatusBar style={phase === "onboarding" ? "dark" : isDark ? "light" : "dark"} />
          {phase === "loading" ? null : phase === "onboarding" ? <OnboardingScreen /> : <AppNavigator />}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
