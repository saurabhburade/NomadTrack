import { countryBoundaries } from "../../data/countryBoundaries";

type CountryMatch = {
  countryCode: string;
  countryName: string;
};

const coordinateEpsilon = 1e-10;

export function resolveCountryFromBoundaries(latitude: number, longitude: number): CountryMatch | undefined {
  for (const [countryCode, boundary] of Object.entries(countryBoundaries)) {
    if (boundary.bbox && !isInsideBbox(latitude, longitude, boundary.bbox)) continue;
    if (boundary.polygons.some((polygon) => isPointInPolygon(latitude, longitude, polygon))) {
      return { countryCode, countryName: boundary.name };
    }
  }
  return undefined;
}

function isInsideBbox(latitude: number, longitude: number, bbox: number[]) {
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox;
  if (minLongitude === undefined || minLatitude === undefined || maxLongitude === undefined || maxLatitude === undefined) {
    return false;
  }

  return longitude >= minLongitude && longitude <= maxLongitude && latitude >= minLatitude && latitude <= maxLatitude;
}

function isPointInPolygon(latitude: number, longitude: number, polygon: Array<[number, number]>) {
  let inside = false;
  for (let currentIndex = 0, previousIndex = polygon.length - 1; currentIndex < polygon.length; previousIndex = currentIndex++) {
    const [currentLongitude, currentLatitude] = polygon[currentIndex]!;
    const [previousLongitude, previousLatitude] = polygon[previousIndex]!;

    if (isPointOnSegment(latitude, longitude, currentLatitude, currentLongitude, previousLatitude, previousLongitude)) {
      return true;
    }

    const intersects =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude < ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) / (previousLatitude - currentLatitude) + currentLongitude;
    if (intersects) inside = !inside;
  }

  return inside;
}

function isPointOnSegment(latitude: number, longitude: number, startLatitude: number, startLongitude: number, endLatitude: number, endLongitude: number) {
  const cross = (longitude - startLongitude) * (endLatitude - startLatitude) - (latitude - startLatitude) * (endLongitude - startLongitude);
  if (Math.abs(cross) > coordinateEpsilon) return false;

  const minLatitude = Math.min(startLatitude, endLatitude) - coordinateEpsilon;
  const maxLatitude = Math.max(startLatitude, endLatitude) + coordinateEpsilon;
  const minLongitude = Math.min(startLongitude, endLongitude) - coordinateEpsilon;
  const maxLongitude = Math.max(startLongitude, endLongitude) + coordinateEpsilon;
  return latitude >= minLatitude && latitude <= maxLatitude && longitude >= minLongitude && longitude <= maxLongitude;
}
