// src/lib/pathfinder.ts

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface POIItem extends Coordinate {
  name: string;
  points: number;
}

export function getRemainingMeters(
  currentSteps: number,
  stepGoal: number
): number {
  const stepsLeft = Math.max(0, stepGoal - currentSteps);
  const totalMeters = stepsLeft * 0.6;

  return totalMeters / 2;
}

export function generatePOILocation(
  origin: Coordinate,
  currentSteps: number,
  stepGoal: number
): POIItem {
  const distanceMeters = getRemainingMeters(currentSteps, stepGoal);

  const targetLat = origin.lat + distanceMeters / 111000;
  const targetLng = origin.lng + 0.001;

  return {
    name: "Golden Apple",
    points: 150,
    lat: targetLat,
    lng: targetLng,
  };
}

export function fetchStreetRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<Coordinate[]> {
  const url =
    `https://router.project-osrm.org/route/v1/foot/` +
    `${origin.lng},${origin.lat};` +
    `${destination.lng},${destination.lat};` +
    `${origin.lng},${origin.lat}` +
    `?overview=full&geometries=geojson`;

  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Route request failed: ${response.status}`);
      }

      return response.json();
    })
    .then((data) => {
      if (!data.routes || data.routes.length === 0) {
        return [origin, destination, origin];
      }

      return data.routes[0].geometry.coordinates.map(
        (coordinate: [number, number]) => ({
          lat: coordinate[1],
          lng: coordinate[0],
        })
      );
    })
    .catch((error) => {
      console.error("Unable to fetch walking route:", error);
      return [origin, destination, origin];
    });
}