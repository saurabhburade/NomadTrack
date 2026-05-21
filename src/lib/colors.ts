export const statusColors = {
  success: "#16a34a",
  warning: "#ca8a04",
  error: "#dc2626"
};

export const iconStrokeWidth = 2;

export const distributionColors = ["#6d28d9", "#16a34a", "#dc2626", "#ca8a04", "#db2777", "#7c2d12", "#525252", "#a16207"];

export function getNeutralPalette(isDark: boolean) {
  return {
    backgroundPrimary: isDark ? "#0a0a0a" : "#ffffff",
    backgroundSecondary: isDark ? "#171717" : "#f3f3f3",
    backgroundTertiary: isDark ? "#262626" : "#e5e5e5",
    foreground: isDark ? "#f5f5f5" : "#0a0a0a",
    foregroundSecondary: isDark ? "#a3a3a3" : "#6b6b6b",
    foregroundTertiary: isDark ? "#737373" : "#a3a3a3",
    border: isDark ? "#333333" : "#d9d9d9",
    primary: isDark ? "#f5f5f5" : "#000000",
    primaryForeground: isDark ? "#0a0a0a" : "#ffffff",
    muted: isDark ? "#262626" : "#f3f3f3",
    shadow: "#000000"
  };
}
