import { View, type ViewProps } from "react-native";
import { cn } from "../../lib/utils";
import { Text } from "./text";

export function Card({ className, ...props }: ViewProps) {
  return <View className={cn("rounded-lg border border-border bg-card p-4", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn("mb-3 gap-1", className)} {...props} />;
}

export function CardTitle({ children }: { children: string }) {
  return <Text variant="subtitle">{children}</Text>;
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn("gap-3", className)} {...props} />;
}
