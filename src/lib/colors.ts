export const statusColors = {
  success: "#16a34a",
  warning: "#ca8a04",
  error: "#dc2626"
};

export const iconStrokeWidth = 2;

export const distributionColors = ["#6d28d9", "#16a34a", "#dc2626", "#ca8a04", "#db2777", "#7c2d12", "#525252", "#a16207"];

export function getNeutralPalette(isDark: boolean) {
  return {
    backgroundPrimary: isDark ? "#000000" : "#ffffff",
    backgroundSecondary: isDark ? "#1c1c1e" : "#f3f3f3",
    backgroundTertiary: isDark ? "#2c2c2e" : "#e5e5e5",
    foreground: isDark ? "#f2f2f7" : "#0a0a0a",
    foregroundSecondary: isDark ? "#a1a1a8" : "#6b6b6b",
    foregroundTertiary: isDark ? "#6d6d72" : "#a3a3a3",
    border: isDark ? "#38383a" : "#d9d9d9",
    primary: isDark ? "#ffffff" : "#000000",
    primaryForeground: isDark ? "#000000" : "#ffffff",
    muted: isDark ? "#1c1c1e" : "#f3f3f3",
    shadow: "#000000"
  };
}
