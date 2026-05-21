import { type ComponentProps, type ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { Text } from "./text";
import { cn } from "../../lib/utils";

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
    icon?: ComponentProps<typeof Pressable>["children"];
    label?: string;
  };

export function Button({ className, variant, size, children, ...props }: ButtonProps) {
  return (
    <Pressable className={cn(buttonVariants({ variant, size }), className)} accessibilityRole="button" {...props}>
      {typeof children === "string" ? <Text className={textVariants({ variant })}>{children}</Text> : children}
    </Pressable>
  );
}
