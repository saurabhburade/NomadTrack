import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text as RNText, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import Animated, { Easing as ReanimatedEasing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedText = Animated.createAnimatedComponent(RNText);
const supportsTextFilter = Platform.OS === "web";

type BlurReplaceTextProps = Omit<TextProps, "children"> & {
  animateOnMount?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  value: string;
};

export function BlurReplaceText({ animateOnMount = false, containerStyle, numberOfLines = 1, style, value, ...textProps }: BlurReplaceTextProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const currentValueRef = useRef(value);
  const progress = useSharedValue(animateOnMount ? 0 : 1);
  const flattenedStyle = StyleSheet.flatten(style);
  const textAlign = flattenedStyle?.textAlign ?? "center";
  const textShadowColor = typeof flattenedStyle?.color === "string" ? flattenedStyle.color : "rgba(0, 0, 0, 0.45)";

  useEffect(() => {
    if (!animateOnMount) return;

    progress.value = withTiming(1, {
      duration: 240,
      easing: ReanimatedEasing.out(ReanimatedEasing.cubic)
    });
  }, [animateOnMount, progress]);

  useEffect(() => {
    if (value === currentValueRef.current) return;

    setPreviousValue(currentValueRef.current);
    currentValueRef.current = value;
    setCurrentValue(value);

    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: 240,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic)
      },
      (finished) => {
        if (finished) {
          runOnJS(setPreviousValue)(null);
        }
      }
    );
  }, [progress, value]);

  const currentStyle = useAnimatedStyle(() => {
    const blur = interpolate(progress.value, [0, 1], [7, 0]);

    return {
      ...(supportsTextFilter
        ? { filter: [{ blur }] }
        : {
            textShadowColor,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: blur
          }),
      opacity: interpolate(progress.value, [0, 0.38, 1], [0, 0.26, 1]),
      transform: [{ scale: interpolate(progress.value, [0, 1], [0.96, 1]) }]
    } as TextStyle;
  });

  const previousStyle = useAnimatedStyle(() => {
    const blur = interpolate(progress.value, [0, 1], [0, 7]);

    return {
      ...(supportsTextFilter
        ? { filter: [{ blur }] }
        : {
            textShadowColor,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: blur
          }),
      opacity: interpolate(progress.value, [0, 0.72, 1], [1, 0.18, 0]),
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.96]) }]
    } as TextStyle;
  });

  return (
    <View pointerEvents="none" style={[styles.stage, containerStyle]}>
      <AnimatedText {...textProps} numberOfLines={numberOfLines} style={[styles.nativeText, style, currentStyle]}>
        {currentValue}
      </AnimatedText>
      {previousValue ? (
        <AnimatedText {...textProps} numberOfLines={numberOfLines} style={[styles.nativeText, style, styles.previousText, { textAlign }, previousStyle]}>
          {previousValue}
        </AnimatedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  nativeText: {
    backgroundColor: "transparent"
  },
  previousText: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  stage: {
    alignItems: "center",
    justifyContent: "center"
  }
});
