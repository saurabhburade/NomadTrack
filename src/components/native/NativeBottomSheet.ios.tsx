import { BottomSheet } from "@expo/ui/swift-ui";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { LiquidGlassLayer } from "./LiquidGlassLayer";

type NativeBottomSheetProps = {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  fitToContents?: boolean;
  presentationDetents?: Array<number | "medium" | "large">;
  visible: boolean;
  onClose: () => void;
};

export function NativeBottomSheet({ children, contentStyle, fitToContents = true, presentationDetents, visible, onClose }: NativeBottomSheetProps) {
  return (
    <BottomSheet
      isOpened={visible}
      presentationDetents={presentationDetents ?? (fitToContents ? [0.42, "large"] : ["medium", "large"])}
      presentationDragIndicator="visible"
      onIsOpenedChange={(isOpened) => {
        if (!isOpened) onClose();
      }}
    >
      <View style={[styles.content, contentStyle]}>
        <LiquidGlassLayer glassStyle="regular" intensity={78} tint="systemThinMaterial" style={StyleSheet.absoluteFill} />
        <View style={styles.children}>{children}</View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  children: {
    zIndex: 1
  },
  content: {
    overflow: "hidden"
  }
});
