import { View } from "react-native";
import { cn } from "../../lib/utils";
import { Text } from "./text";

type BadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
};

const tones = {
  neutral: "bg-muted",
  success: "bg-success/15",
  warning: "bg-warning/20",
  danger: "bg-destructive/15",
  info: "bg-tertiary"
};

const textTones = {
  neutral: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-secondary"
};

export function Badge({ label, tone = "neutral", className }: BadgeProps) {
  return (
    <View className={cn("self-start rounded-full px-3 py-1", tones[tone], className)}>
      <Text className={cn("text-xs font-semibold", textTones[tone])}>{label}</Text>
    </View>
  );
}
