export const TARGET_PLACE = {
  latitude: 36.8065,
  longitude: 10.1815,
  label: "Point cible",
} as const;

export interface DistanceResult {
  meters: number;
  kilometers: number;
  formatted: string;
}

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const firstLatitude = toRadians(lat1);
  const secondLatitude = toRadians(lat2);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
};

export const computeDistance = (
  fromLat: number,
  fromLon: number,
  toLat: number = TARGET_PLACE.latitude,
  toLon: number = TARGET_PLACE.longitude,
): DistanceResult => {
  const meters =
    Math.round(haversineDistance(fromLat, fromLon, toLat, toLon) * 10) / 10;
  const kilometers = Math.round((meters / 1000) * 100) / 100;

  return {
    meters,
    kilometers,
    formatted: meters < 1000 ? `${meters} m` : `${kilometers} km`,
  };
};

export const computeBearingDegrees = (
  fromLat: number,
  fromLon: number,
  toLat: number = TARGET_PLACE.latitude,
  toLon: number = TARGET_PLACE.longitude,
): number => {
  const latitude1 = toRadians(fromLat);
  const latitude2 = toRadians(toLat);
  const longitudeDelta = toRadians(toLon - fromLon);

  const y = Math.sin(longitudeDelta) * Math.cos(latitude2);
  const x =
    Math.cos(latitude1) * Math.sin(latitude2) -
    Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(longitudeDelta);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return (bearing + 360) % 360;
};

export const formatBearing = (
  fromLat: number,
  fromLon: number,
  toLat: number = TARGET_PLACE.latitude,
  toLon: number = TARGET_PLACE.longitude,
): string => {
  const normalizedBearing = computeBearingDegrees(
    fromLat,
    fromLon,
    toLat,
    toLon,
  );
  const sectors = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const sectorIndex = Math.round(normalizedBearing / 45) % sectors.length;

  return sectors[sectorIndex];
};
