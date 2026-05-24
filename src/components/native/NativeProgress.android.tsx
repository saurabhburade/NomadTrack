import { CircularProgress, LinearProgress } from "@expo/ui/jetpack-compose";
import { type ColorValue, type StyleProp, type ViewStyle } from "react-native";

type NativeProgressProps = {
  color?: ColorValue;
  progress?: number | null;
  style?: StyleProp<ViewStyle>;
  variant?: "circular" | "linear";
};

export function NativeProgress({ color, progress = null, style, variant = "circular" }: NativeProgressProps) {
  if (variant === "linear") {
    return <LinearProgress color={color} progress={progress} style={style} />;
  }

  return <CircularProgress color={color} progress={progress} style={style} />;
}
