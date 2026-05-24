import { TextInput } from "@expo/ui/jetpack-compose";
import { type StyleProp, type ViewStyle } from "react-native";

type NativeTextInputProps = {
  defaultValue?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "ascii-capable" | "url" | "decimal-pad";
  multiline?: boolean;
  numberOfLines?: number;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  onChangeText: (value: string) => void;
};

export function NativeTextInput({ defaultValue, keyboardType, multiline, numberOfLines, style, onChangeText }: NativeTextInputProps) {
  return (
    <TextInput
      autocorrection={false}
      defaultValue={defaultValue}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
      style={style}
      onChangeText={onChangeText}
    />
  );
}
