import { type KeyboardTypeOptions, type StyleProp, TextInput, type TextStyle } from "react-native";

type NativeTextInputProps = {
  defaultValue?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  numberOfLines?: number;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  onChangeText: (value: string) => void;
};

export function NativeTextInput({ defaultValue, keyboardType, multiline, numberOfLines, placeholder, style, onChangeText }: NativeTextInputProps) {
  return (
    <TextInput
      autoCorrect={false}
      defaultValue={defaultValue}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
      placeholder={placeholder}
      style={style}
      onChangeText={onChangeText}
    />
  );
}
