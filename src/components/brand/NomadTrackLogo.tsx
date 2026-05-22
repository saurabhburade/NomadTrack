import { Image, StyleSheet } from "react-native";

type NomadTrackLogoProps = {
  size?: number;
};

export function NomadTrackLogo({ size = 96 }: NomadTrackLogoProps) {
  return (
    <Image
      source={require("../../../assets/nomadtrack-logo.png")}
      style={[styles.logo, { width: size, height: size }]}
      accessibilityRole="image"
      accessibilityLabel="NomadTrack logo"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    resizeMode: "cover"
  }
});
