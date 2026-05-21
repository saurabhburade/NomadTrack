import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

type Props = {
  isPreparing: boolean;
};

export function SplashScreen({ isPreparing }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true
    }).start();
  }, [opacity]);

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]">
      <Animated.View className="flex-1" style={{ opacity }}>
        <View className="absolute inset-0">
          <Svg width="100%" height="100%" viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice">
            <Defs>
              <LinearGradient id="splashSky" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#0a0a0a" />
                <Stop offset="0.62" stopColor="#262626" />
                <Stop offset="1" stopColor="#525252" />
              </LinearGradient>
            </Defs>
            <Rect width={390} height={760} fill="url(#splashSky)" />
            <Path d="M-40 300c65-15 111 7 156 54 27 28 51 34 73 13 36-34 86-23 151 31 32 27 58 28 91 1" stroke="#fff" strokeOpacity={0.45} strokeWidth={1.5} fill="none" />
          </Svg>
        </View>

        <View className="flex-1 items-center justify-center gap-5 px-8">
          <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-white/20">
            <Text className="text-xl font-extrabold text-white">T</Text>
          </View>
          <Text className="text-xl font-bold text-white">Travel Tracker</Text>
          <View className="h-8 items-center justify-center">
            {isPreparing ? <ActivityIndicator color="#ffffff" /> : <View className="h-1.5 w-28 rounded-full bg-white/85" />}
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
