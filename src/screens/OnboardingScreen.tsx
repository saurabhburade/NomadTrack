import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { ChevronRight } from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Text } from "../components/ui/text";
import { iconStrokeWidth } from "../lib/colors";
import { getGoogleDriveAuthSetup, storeGoogleTokenResponse, useGoogleDriveAuthRequest } from "../services/auth/googleAuth";
import { useAppStore } from "../store/appStore";

export function OnboardingScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const updateSetting = useAppStore((state) => state.updateSetting);
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
        .then(() => updateSetting("onboardingCompleted", true))
        .finally(() => setIsSigningIn(false));
      return;
    }

    if (response && response.type !== "success") {
      setIsSigningIn(false);
    }
  }, [response, updateSetting]);

  function completeWithoutGoogle() {
    void updateSetting("onboardingCompleted", true);
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
    <SafeAreaView className="flex-1 bg-white">
      <Animated.View className="flex-1" style={{ opacity }}>
        <View className="h-[64%] min-h-[430px] overflow-hidden bg-[#f3f3f3]">
          <GradientScene />
        </View>

        <View className="-mt-20 flex-1 justify-end rounded-t-[46px] bg-white px-8 pb-10 pt-14">
          <View className="items-center gap-8">
            <Text className="max-w-[310px] text-center text-2xl font-extrabold leading-[32px] text-[#0a0a0a]">
              One App for{"\n"}All Your Travel{"\n"}
              <Text className="text-2xl font-extrabold leading-[32px] text-[#6b6b6b]">Records</Text>
            </Text>

            <Button
              className="h-16 w-full justify-between rounded-full border-[#0a0a0a] bg-[#0a0a0a] px-7"
              disabled={isSigningIn}
              onPress={handleGetStarted}
            >
              <Text className="text-sm font-bold text-white">{isSigningIn ? "Connecting..." : "Get Started"}</Text>
              <ChevronRight size={25} color="#fff" strokeWidth={iconStrokeWidth} />
            </Button>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function GradientScene() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 560" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="heroBackdrop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.55" stopColor="#eeeeee" />
          <Stop offset="1" stopColor="#f8f8f8" />
        </LinearGradient>
        <LinearGradient id="mountain" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9b9b9b" />
          <Stop offset="1" stopColor="#e5e5e5" />
        </LinearGradient>
      </Defs>
      <Rect width={390} height={560} fill="url(#heroBackdrop)" />
      <Path
        d="M-30 205c58-9 95 13 137 55 31 31 55 35 76 13 31-31 79-23 126 19 35 32 51 72 78 112 24 35 56 28 103-20"
        stroke="#ffffff"
        strokeOpacity={0.8}
        strokeWidth={1.4}
        fill="none"
      />
      <Circle cx={260} cy={364} r={22} fill="#f3d76a" opacity={0.45} />
      <Circle cx={260} cy={364} r={13} fill="#f3d76a" opacity={0.75} />
      <Path d="M-20 349c36 3 41 38 80 40 43 1 67-25 103-41 47-21 88-9 121 32 31 37 61 49 126 17v163H-20z" fill="#ffffff" opacity={0.9} />
      <Path d="M-20 452c58-50 101-69 130-57 33 14 59-31 98-58l15 32-33 22-10 49 51 27 72-49c37-25 72-31 107-18v160H-20z" fill="url(#mountain)" />
      <Path d="M-20 476c70-12 133-11 189 3 60 15 133 13 241-10v91H-20z" fill="#3f3f3f" />
      <Path d="M-20 506c70-24 144-31 220-21 72 10 142 4 210-18v93H-20z" fill="#d9d9d9" />
      <Path d="M-20 530c74-21 146-28 216-20 73 9 145 5 214-13v63H-20z" fill="#ffffff" />
    </Svg>
  );
}
