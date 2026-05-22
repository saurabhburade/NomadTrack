import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { NomadTrackLogo } from "../components/brand/NomadTrackLogo";

type Props = {
  isPreparing: boolean;
};

export function SplashScreen(_props: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true
    }).start();
  }, [opacity]);

  return (
    <View className="flex-1 bg-[#d7f7f3]">
      <Animated.View className="flex-1" style={{ opacity }}>
        <View className="absolute inset-0">
          <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
            <Defs>
              <LinearGradient id="splashBase" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#e8fbf7" />
                <Stop offset="0.28" stopColor="#a9eee4" />
                <Stop offset="0.58" stopColor="#6c9af0" />
                <Stop offset="1" stopColor="#1162b4" />
              </LinearGradient>
              <LinearGradient id="splashBlush" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#f6bed1" />
                <Stop offset="0.52" stopColor="#df5aa6" />
                <Stop offset="1" stopColor="#9b15ee" />
              </LinearGradient>
              <LinearGradient id="splashViolet" x1="0" y1="0.15" x2="1" y2="1">
                <Stop offset="0" stopColor="#d613bb" />
                <Stop offset="0.48" stopColor="#8d16e9" />
                <Stop offset="1" stopColor="#3500a8" />
              </LinearGradient>
            </Defs>
            <Rect width={390} height={844} fill="url(#splashBase)" />
            <Path d="M272-42c51 57 93 98 121 169 32 83 26 185-18 272-45 88-37 165 26 235V844H230c-42-55-55-113-39-174 18-70 68-113 74-184 7-84-55-145-54-240C212 126 243 44 272-42Z" fill="url(#splashBlush)" opacity={0.56} />
            <Path d="M-62 236c80 97 129 180 194 275 73 106 140 161 267 192V844H-62V236Z" fill="url(#splashViolet)" opacity={0.72} />
            <Path d="M-20 460c62 42 97 106 156 145 83 56 156 38 254 92V844H-20V460Z" fill="#27009f" opacity={0.28} />
            <Ellipse cx={55} cy={150} rx={178} ry={292} fill="#e9fbf6" opacity={0.42} />
            <Ellipse cx={115} cy={585} rx={225} ry={270} fill="#86efe0" opacity={0.25} />
            <Ellipse cx={342} cy={744} rx={164} ry={92} fill="#dc10e6" opacity={0.34} />
          </Svg>
          <BlurView intensity={36} tint="light" style={StyleSheet.absoluteFill} />
          <View className="absolute inset-0 bg-white/10" />
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-7 overflow-hidden rounded-[28px]">
            <NomadTrackLogo size={124} />
          </View>
          <Text className="text-center text-5xl font-extrabold text-white">NomadTrack</Text>
        </View>
      </Animated.View>
    </View>
  );
}
