import { Text as RNText, type TextProps } from "react-native";
import { cn } from "../../lib/utils";

type Props = TextProps & {
  variant?: "body" | "title" | "subtitle" | "caption" | "metric" | "muted";
};

const variants = {
  body: "text-sm text-foreground",
  title: "text-xl font-semibold text-foreground",
  subtitle: "text-base font-semibold text-foreground",
  caption: "text-xs text-muted-foreground",
  metric: "text-2xl font-bold text-foreground",
  muted: "text-xs text-muted-foreground"
};

const variantFontFamilies: Record<NonNullable<Props["variant"]>, string> = {
  body: "Inter_400Regular",
  title: "Inter_600SemiBold",
  subtitle: "Inter_600SemiBold",
  caption: "Inter_400Regular",
  metric: "Inter_700Bold",
  muted: "Inter_400Regular"
};

function getInterFontFamily(className: string | undefined, variant: NonNullable<Props["variant"]>) {
  if (className?.includes("font-extrabold")) return "Inter_800ExtraBold";
  if (className?.includes("font-bold")) return "Inter_700Bold";
  if (className?.includes("font-semibold")) return "Inter_600SemiBold";
  if (className?.includes("font-medium")) return "Inter_500Medium";
  return variantFontFamilies[variant];
}

export function Text({ className, variant = "body", style, ...props }: Props) {
  return <RNText className={cn(variants[variant], className)} style={[{ fontFamily: getInterFontFamily(className, variant) }, style]} {...props} />;
}
