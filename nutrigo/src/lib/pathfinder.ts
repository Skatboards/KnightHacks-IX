// src/lib/pathfinder.ts

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface POIItem {
  name: string;
  points: number;
  lat: number;
  lng: number;
}

// Calculates one-way distance for a round trip (Total steps remaining / 2)
export function getRemainingMeters(currentSteps: number, stepGoal: number): number {
  const stepsLeft = Math.max(0, stepGoal - currentSteps);
  const totalMeters = stepsLeft * 0.6; // Adjusted step scaling factor
  return totalMeters / 2; // Half distance out, half distance back
}

// Generate turnaround POI location
export function generatePOILocation(origin: Coordinate, currentSteps: number, stepGoal: number): POIItem {
  const distanceMeters = getRemainingMeters(currentSteps, stepGoal);

  // Offset latitude for the turnaround point
  const targetLat = origin.lat + (distanceMeters / 111000);
  const targetLng = origin.lng + 0.001;

  return {
    name: "Golden Apple",
    points: 150,
    lat: targetLat,
    lng: targetLng,
  };
}

// Fetch round-trip sidewalk route: Origin -> Destination -> Origin
export function fetchStreetRoute(origin: Coordinate, destination: Coordinate): Promise<Coordinate[]> {
  // Adding the final origin coordinate creates a complete round-trip loop in OSRM
  const url = `https://router.project-osrm.org/route/v1/foot/${origin.lng},${origin.lat};${destination.lng},${destination.lat};${origin.lng},${origin.lat}?overview=full&geometries=geojson`;

  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (!data.routes || data.routes.length === 0) {
        return [origin, destination, origin]; // Fallback loop
      }
      return data.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
        lat: coord[1],
        lng: coord[0],
      }));
    })
    .catch(() => {
      return [origin, destination, origin];
    });
}