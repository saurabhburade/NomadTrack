import { type ComponentType } from "react";
import { View } from "react-native";
import { type LucideProps } from "lucide-react-native";
import { Card } from "./card";
import { Text } from "./text";
import { iconStrokeWidth } from "../../lib/colors";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  Icon: ComponentType<LucideProps>;
  color?: string;
};

export function MetricCard({ label, value, detail, Icon, color = "#0a0a0a" }: MetricCardProps) {
  return (
    <Card className="flex-1 gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="caption" className="uppercase tracking-normal">
          {label}
        </Text>
        <Icon size={18} color={color} strokeWidth={iconStrokeWidth} />
      </View>
      <Text variant="metric">{value}</Text>
      {detail ? <Text variant="muted">{detail}</Text> : null}
    </Card>
  );
}
