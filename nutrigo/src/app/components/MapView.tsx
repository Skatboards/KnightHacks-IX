// src/app/components/MapView.tsx
"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Coordinate,
  fetchStreetRoute,
  generatePOILocation,
  POIItem,
} from "@/lib/pathfinder";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Forces Leaflet to redraw tiles whenever the map pane changes
function MapController() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

interface MapViewProps {
  currentSteps: number;
  stepGoal: number;
}

type MapCollectible = POIItem & {
  poiId: string;
  collectibleTypeId: string;
  source: "step_path" | "hard_coded";
};

export default function MapView({ currentSteps, stepGoal }: MapViewProps) {
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [pois, setPois] = useState<MapCollectible[]>([]);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [collecting, setCollecting] = useState(false);
  const [collectedPoiIds, setCollectedPoiIds] = useState<string[]>([]);

  const collectItem = (selectedPoi: MapCollectible) => {
    if (collecting || collectedPoiIds.includes(selectedPoi.poiId)) {
      return;
    }

    setCollecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/collectibles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              poiId: selectedPoi.poiId,
              collectibleTypeId: selectedPoi.collectibleTypeId,
            }),
          });

          const result = (await response.json()) as { error?: string };
          if (!response.ok) {
            throw new Error(result.error ?? "Unable to collect this item");
          }

          setCollectedPoiIds((current) => [...current, selectedPoi.poiId]);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to collect this item";
          alert(message);
        } finally {
          setCollecting(false);
        }
      },
      (error) => {
        console.error("Geolocation error while collecting:", error);
        alert("Your location is required to collect this item.");
        setCollecting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const origin: Coordinate = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(origin);

          const targetItem = generatePOILocation(origin, currentSteps, stepGoal);

          const streetCoords = await fetchStreetRoute(origin, {
            lat: targetItem.lat,
            lng: targetItem.lng,
          });

          const polylineCoords: [number, number][] = streetCoords.map((pt) => [
            pt.lat,
            pt.lng,
          ]);
          setRoute(polylineCoords);

          const routeIndexes = [
            Math.floor(streetCoords.length / 3),
            Math.floor(streetCoords.length / 2),
            Math.floor((streetCoords.length * 2) / 3),
          ];

          const stepPathPois = await Promise.all(
            routeIndexes.map(async (routeIndex, index) => {
              const routePoint = streetCoords[routeIndex] ?? origin;
              const poiResponse = await fetch("/api/pois", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  latitude: routePoint.lat,
                  longitude: routePoint.lng,
                  name: `Step Path Collectible ${index + 1}`,
                }),
              });

              if (!poiResponse.ok) {
                const error = (await poiResponse.json()) as { error?: string };
                throw new Error(error.error ?? "Unable to create a route collectible");
              }

              const savedPoi = (await poiResponse.json()) as {
                poiId: string;
                collectibleTypeId: string;
                name: string;
                points: number;
              };

              return {
                name: savedPoi.name,
                points: savedPoi.points,
                lat: routePoint.lat,
                lng: routePoint.lng,
                poiId: savedPoi.poiId,
                collectibleTypeId: savedPoi.collectibleTypeId,
                source: "step_path" as const,
              };
            })
          );

          const fixedPoiResponse = await fetch("/api/pois");
          if (!fixedPoiResponse.ok) {
            const error = (await fixedPoiResponse.json()) as { error?: string };
            throw new Error(error.error ?? "Unable to load fixed collectibles");
          }

          const fixedPoiData = (await fixedPoiResponse.json()) as {
            pois: Array<
              Omit<MapCollectible, "lat" | "lng"> & {
                latitude: number;
                longitude: number;
              }
            >;
          };

          setPois([
            ...stepPathPois,
            ...fixedPoiData.pois.map((fixedPoi) => ({
              ...fixedPoi,
              lat: fixedPoi.latitude,
              lng: fixedPoi.longitude,
            })),
          ]);
          setCollectedPoiIds([]);
          setLoading(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLoading(false);
        }
      );
    }
  }, [currentSteps, stepGoal]);

  if (loading || !userLocation) {
    return (
      <div className="h-[450px] w-full bg-gray-800 rounded-xl flex items-center justify-center text-gray-300 border border-gray-700">
        Acquiring current GPS location and generating path...
      </div>
    );
  }

  return (
    <div className="relative h-[450px] w-full rounded-xl overflow-hidden border border-gray-700">
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={16}
        scrollWheelZoom={true}
        preferCanvas={true}
        style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0 }}
      >
        <MapController />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[userLocation.lat, userLocation.lng]} icon={defaultIcon}>
          <Popup>You Are Here</Popup>
        </Marker>

        {pois.map((poi) => (
          <Marker key={poi.poiId} position={[poi.lat, poi.lng]} icon={defaultIcon}>
            <Popup>
              <strong>{poi.name}</strong>
              <p>
                {poi.points} points{" "}
                {poi.source === "hard_coded" ? "(campus bonus)" : "(step path)"}
              </p>
              {collectedPoiIds.includes(poi.poiId) ? (
                <p>Collected!</p>
              ) : (
                <button
                  type="button"
                  onClick={() => collectItem(poi)}
                  disabled={collecting}
                  style={{
                    borderRadius: 6,
                    background: "#8B5CF6",
                    color: "white",
                    cursor: collecting ? "wait" : "pointer",
                    padding: "6px 10px",
                  }}
                >
                  {collecting ? "Collecting..." : "Collect"}
                </button>
              )}
            </Popup>
          </Marker>
        ))}

        {route.length > 0 && <Polyline positions={route} color="#8B5CF6" weight={5} />}
      </MapContainer>
    </div>
  );
}