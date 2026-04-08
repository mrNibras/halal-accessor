import axios from "axios";

const SHOP_LAT = parseFloat(process.env.SHOP_LAT || "7.1221");
const SHOP_LNG = parseFloat(process.env.SHOP_LNG || "40.0098");
const GOOGLE_API = "https://maps.googleapis.com/maps/api/distancematrix/json";

const FALLBACK_FEE = 100;
const BASE_FEE = 50;
const PER_KM_RATE = 20;
const MAX_DISTANCE_KM = 50;

export const calculateDistance = async (
  customerLat: number,
  customerLng: number
): Promise<{ distanceKm: number; durationMin: number }> => {
  if (!process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY === "your_google_maps_api_key_here") {
    // Fallback: use Haversine formula for straight-line distance
    return calculateHaversineDistance(customerLat, customerLng);
  }

  try {
    const response = await axios.get(GOOGLE_API, {
      params: {
        origins: `${SHOP_LAT},${SHOP_LNG}`,
        destinations: `${customerLat},${customerLng}`,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const element = response.data.rows?.[0]?.elements?.[0];

    if (!element || element.status !== "OK") {
      console.warn("Google Maps API failed, using fallback");
      return calculateHaversineDistance(customerLat, customerLng);
    }

    const distanceKm = element.distance.value / 1000;
    const durationMin = Math.round(element.duration.value / 60);

    return { distanceKm, durationMin };
  } catch (error) {
    console.error("Distance API error:", error);
    return calculateHaversineDistance(customerLat, customerLng);
  }
};

export const calculateHaversineDistance = (
  lat1: number,
  lng1: number
): { distanceKm: number; durationMin: number } => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat1 - SHOP_LAT) * Math.PI) / 180;
  const dLng = ((lng1 - SHOP_LNG) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((SHOP_LAT * Math.PI) / 180) *
      Math.cos((lat1 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  const durationMin = Math.round(distanceKm * 3); // rough estimate

  return { distanceKm, durationMin };
};

export const calculateDeliveryFee = (distanceKm: number): number => {
  if (distanceKm > MAX_DISTANCE_KM) {
    throw new Error("Out of delivery range");
  }

  return Math.round(BASE_FEE + distanceKm * PER_KM_RATE);
};

export const getDeliveryDetails = async (
  lat: number,
  lng: number
): Promise<{ distanceKm: number; durationMin: number; fee: number }> => {
  const { distanceKm, durationMin } = await calculateDistance(lat, lng);
  const fee = calculateDeliveryFee(distanceKm);

  return { distanceKm: Math.round(distanceKm * 100) / 100, durationMin, fee };
};
