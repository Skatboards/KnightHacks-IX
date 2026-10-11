import { randomUUID } from "crypto";

export type DemoPoi = {
  poiId: string;
  collectibleTypeId: string;
  name: string;
  points: number;
  latitude: number;
  longitude: number;
  source: "step_path" | "hard_coded";
};

const pois = new Map<string, DemoPoi>();
const collected = new Set<string>();

export function createDemoPoi(
  poi: Omit<DemoPoi, "poiId" | "collectibleTypeId">
) {
  const savedPoi: DemoPoi = {
    ...poi,
    poiId: randomUUID(),
    collectibleTypeId: "demo-golden-apple",
  };
  pois.set(savedPoi.poiId, savedPoi);
  return savedPoi;
}

export function getDemoPoi(poiId: string) {
  return pois.get(poiId);
}

export function getDemoPois() {
  return [...pois.values()];
}

export function markDemoPoiCollected(poiId: string) {
  if (collected.has(poiId)) {
    return false;
  }

  collected.add(poiId);
  return true;
}
