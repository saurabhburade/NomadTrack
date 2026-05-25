import { type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { Text } from "./text";
import { cn } from "../../lib/utils";
import { LiquidGlassLayer } from "../native/LiquidGlassLayer";

export const buttonVariants = cva(
  "h-11 flex-row items-center justify-center gap-2 rounded-lg border px-4 active:opacity-80 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary",
        secondary: "border-secondary bg-secondary",
        outline: "border-border bg-card",
        ghost: "border-transparent bg-transparent",
        destructive: "border-destructive bg-destructive"
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3",
        lg: "h-12 px-5",
        icon: "h-11 w-11 px-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

const textVariants = cva("text-xs font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      outline: "text-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive-foreground"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    children: ReactNode;
    contentStyle?: StyleProp<ViewStyle>;
    glass?: boolean;
    icon?: ComponentProps<typeof Pressable>["children"];
    label?: string;
  };

export function Button({ className, variant, size, children, contentStyle, glass = true, ...props }: ButtonProps) {
  return (
    <Pressable className={cn(buttonVariants({ variant, size }), "overflow-hidden", className)} accessibilityRole="button" {...props}>
      {glass ? <LiquidGlassLayer glassStyle="regular" intensity={72} tint="systemThinMaterial" style={styles.glassLayer} /> : null}
      <View style={[styles.content, contentStyle]}>
        {typeof children === "string" ? <Text className={textVariants({ variant })}>{children}</Text> : children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    zIndex: 1
  },
  glassLayer: {
    borderRadius: 999
  }
});
