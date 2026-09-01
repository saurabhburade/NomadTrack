import { CircularProgress, Host, LinearProgress } from "@expo/ui/swift-ui";
import { type ColorValue, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

type NativeProgressProps = {
  color?: ColorValue;
  progress?: number | null;
  style?: StyleProp<ViewStyle>;
  variant?: "circular" | "linear";
};

export function NativeProgress({ color, progress = null, style, variant = "circular" }: NativeProgressProps) {
  return (
    <View style={[variant === "linear" ? styles.linearShell : styles.circularShell, style]}>
      <Host matchContents>
        {variant === "linear" ? <LinearProgress color={color} progress={progress} /> : <CircularProgress color={color} progress={progress} />}
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  circularShell: {
    minHeight: 28,
    minWidth: 28
  },
  linearShell: {
    minHeight: 4,
    width: "100%"
  }
});
