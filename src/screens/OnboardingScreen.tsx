import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { ChevronRight } from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Text } from "../components/ui/text";
import { NomadTrackLogo } from "../components/brand/NomadTrackLogo";
import { hasLocalTravelData } from "../db/database";
import { iconStrokeWidth } from "../lib/colors";
import { listDriveBackups, restoreLatestDriveBackup } from "../services/backup/driveBackup";
import { getGoogleDriveAuthSetup, storeGoogleTokenResponse, useGoogleDriveAuthRequest } from "../services/auth/googleAuth";
import { useAppStore } from "../store/appStore";

export function OnboardingScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [restoreState, setRestoreState] = useState<"idle" | "checking" | "available" | "restoring">("idle");
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const updateSetting = useAppStore((state) => state.updateSetting);
  const refresh = useAppStore((state) => state.refresh);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  const [googleAuthRequest, response, promptAsync] = useGoogleDriveAuthRequest();
  const googleAuthSetup = useMemo(() => getGoogleDriveAuthSetup(), []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true
    }).start();
  }, [opacity]);

  useEffect(() => {
    if (response?.type === "success" && response.authentication?.accessToken) {
      void storeGoogleTokenResponse(response.authentication)
        .then(() => checkForRestorableBackup())
        .catch((error) => {
          Alert.alert("Google login failed", error instanceof Error ? error.message : "Could not connect Google Drive.");
          setIsSigningIn(false);
        });
      return;
    }

    if (response && response.type !== "success") {
      setIsSigningIn(false);
    }
  }, [response]);

  async function finishOnboarding() {
    await updateSetting("onboardingCompleted", true);
    await refresh();
  }

  async function checkForRestorableBackup() {
    setRestoreState("checking");
    setRestoreMessage("Checking Google Drive for backups...");

    try {
      if (await hasLocalTravelData()) {
        await finishOnboarding();
        return;
      }

      const result = await listDriveBackups();
      const latest = result.files.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime))[0];
      if (!latest) {
        await finishOnboarding();
        return;
      }

      setRestoreState("available");
      setRestoreMessage(`Backup last updated ${formatOnboardingBackupTime(latest.modifiedTime)}.`);
    } catch (error) {
      setRestoreState("idle");
      setRestoreMessage(null);
      Alert.alert("Backup check failed", error instanceof Error ? error.message : "Could not check Google Drive backups.");
      await finishOnboarding();
    } finally {
      setIsSigningIn(false);
    }
  }

  async function restoreBackupAndContinue() {
    setRestoreState("restoring");
    setRestoreMessage("Restoring your Google Drive backup...");

    try {
      const result = await restoreLatestDriveBackup();
      await setSelectedDate(result.displayDate);
      await finishOnboarding();
    } catch (error) {
      setRestoreState("available");
      Alert.alert("Restore failed", error instanceof Error ? error.message : "Could not restore the Google Drive backup.");
    }
  }

  function skipRestoreAndContinue() {
    void finishOnboarding();
  }

  function completeWithoutGoogle() {
    void finishOnboarding();
  }

  function handleGetStarted() {
    if (!googleAuthSetup.canUseGoogleAuth || !googleAuthRequest) {
      completeWithoutGoogle();
      return;
    }

    setIsSigningIn(true);
    void promptAsync().catch(() => setIsSigningIn(false));
  }

  return (
    <View className="flex-1 bg-white">
      <Animated.View className="flex-1" style={{ opacity }}>
        <View className="absolute inset-0">
          <GradientScene />
        </View>

        <SafeAreaView className="flex-1 bg-transparent">
          <View className="flex-1 justify-end px-8 pb-10 pt-16">
            <View className="items-center gap-7">
              <View className="items-center gap-2">
                <View className="overflow-hidden rounded-[20px]">
                  <NomadTrackLogo size={74} />
                </View>
                <Text className="text-center text-2xl font-extrabold leading-8 text-[#0a0a0a]">NomadTrack</Text>
              </View>

              <View className="items-center gap-2">
                <Text className="max-w-[310px] text-center text-[26px] font-extrabold leading-[32px] text-[#0a0a0a]">
                  Your Travel Records,{"\n"}All in One Place
                </Text>
                <Text className="max-w-[280px] text-center text-base font-semibold leading-6 text-[#6b6b6b]">
                  Private, organized, and ready when you need them.
                </Text>
              </View>

              {restoreState !== "available" ? (
                <Button
                  className="h-16 w-full justify-between rounded-full border-[#0a0a0a] bg-[#0a0a0a] px-7"
                  disabled={isSigningIn || restoreState === "checking" || restoreState === "restoring"}
                  onPress={handleGetStarted}
                >
                  <Text className="text-sm font-bold text-white">{getPrimaryButtonLabel(isSigningIn, restoreState)}</Text>
                  <ChevronRight size={25} color="#fff" strokeWidth={iconStrokeWidth} />
                </Button>
              ) : null}
              {restoreState === "available" ? (
                <View className="w-full gap-4">
                  <Text className="mx-auto max-w-[300px] text-center text-sm font-medium leading-5 text-[#6b6b6b]">{restoreMessage}</Text>
                  <Button className="h-14 rounded-full border-[#0a0a0a] bg-[#0a0a0a]" onPress={restoreBackupAndContinue}>
                    <Text className="text-sm font-bold text-white">Restore Backup</Text>
                  </Button>
                  <Button className="h-12 rounded-full border-[#d4d4d4] bg-white" variant="outline" onPress={skipRestoreAndContinue}>
                    <Text className="text-sm font-bold text-[#0a0a0a]">Continue Without Restore</Text>
                  </Button>
                </View>
              ) : restoreMessage ? (
                <Text className="text-center text-sm font-semibold leading-5 text-[#525252]">{restoreMessage}</Text>
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

function getPrimaryButtonLabel(isSigningIn: boolean, restoreState: "idle" | "checking" | "available" | "restoring") {
  if (restoreState === "checking") return "Checking Backup...";
  if (restoreState === "restoring") return "Restoring...";
  if (isSigningIn) return "Connecting...";
  return "Get Started";
}

function formatOnboardingBackupTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function GradientScene() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="heroBackdrop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f7f7f7" />
          <Stop offset="0.48" stopColor="#eeeeee" />
          <Stop offset="1" stopColor="#ffffff" />
        </LinearGradient>
        <LinearGradient id="mountain" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9b9b9b" />
          <Stop offset="1" stopColor="#e5e5e5" />
        </LinearGradient>
        <LinearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="0.44" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="0.58" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#ffffff" />
        </LinearGradient>
      </Defs>
      <Rect width={390} height={844} fill="url(#heroBackdrop)" />
      <Path
        d="M-30 235c58-9 95 13 137 55 31 31 55 35 76 13 31-31 79-23 126 19 35 32 51 72 78 112 24 35 56 28 103-20"
        stroke="#ffffff"
        strokeOpacity={0.8}
        strokeWidth={1.4}
        fill="none"
      />
      <Circle cx={260} cy={416} r={22} fill="#f3d76a" opacity={0.45} />
      <Circle cx={260} cy={416} r={13} fill="#f3d76a" opacity={0.75} />
      <Path d="M-20 401c36 3 41 38 80 40 43 1 67-25 103-41 47-21 88-9 121 32 31 37 61 49 126 17v395H-20z" fill="#ffffff" opacity={0.9} />
      <Path d="M-20 504c58-50 101-69 130-57 33 14 59-31 98-58l15 32-33 22-10 49 51 27 72-49c37-25 72-31 107-18v392H-20z" fill="url(#mountain)" />
      <Path d="M-20 528c70-12 133-11 189 3 60 15 133 13 241-10v323H-20z" fill="#3f3f3f" />
      <Path d="M-20 558c70-24 144-31 220-21 72 10 142 4 210-18v325H-20z" fill="#d9d9d9" />
      <Path d="M-20 582c74-21 146-28 216-20 73 9 145 5 214-13v295H-20z" fill="#ffffff" />
      <Rect width={390} height={844} fill="url(#bottomFade)" />
    </Svg>
  );
}
