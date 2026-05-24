import type { StyleProp, ViewStyle } from "react-native";

type NativeBottomSheetProps = {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  fitToContents?: boolean;
  presentationDetents?: Array<number | "medium" | "large">;
  visible: boolean;
  onClose: () => void;
};

export function NativeBottomSheet(_props: NativeBottomSheetProps) {
  return null;
}
