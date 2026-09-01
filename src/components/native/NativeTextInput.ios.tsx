import { Host, TextField, type TextFieldKeyboardType } from "@expo/ui/swift-ui";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

type NativeTextInputProps = {
  defaultValue?: string;
  keyboardType?: TextFieldKeyboardType;
  multiline?: boolean;
  numberOfLines?: number;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  onChangeText: (value: string) => void;
};

export function NativeTextInput({ defaultValue, keyboardType, multiline, numberOfLines, placeholder, style, onChangeText }: NativeTextInputProps) {
  return (
    <View style={[styles.shell, style]}>
      <Host matchContents>
        <TextField
          autocorrection={false}
          defaultValue={defaultValue}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          placeholder={placeholder}
          onChangeText={onChangeText}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 44
  }
});
