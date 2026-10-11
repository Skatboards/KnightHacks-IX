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

export default function MapView({ currentSteps, stepGoal }: MapViewProps) {
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [poi, setPoi] = useState<POIItem | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [collecting, setCollecting] = useState(false);
  const [collected, setCollected] = useState(false);

  const collectItem = () => {
    if (!poi || collecting) {
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
              targetLatitude: poi.lat,
              targetLongitude: poi.lng,
            }),
          });

          const result = (await response.json()) as { error?: string };
          if (!response.ok) {
            throw new Error(result.error ?? "Unable to collect this item");
          }

          setCollected(true);
        } catch (error) {
          console.error("Collectible collection failed:", error);
          alert(
            error instanceof Error ? error.message : "Unable to collect this item"
          );
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
          setPoi(targetItem);
          setCollected(false);

          const streetCoords = await fetchStreetRoute(origin, {
            lat: targetItem.lat,
            lng: targetItem.lng,
          });

          const polylineCoords: [number, number][] = streetCoords.map((pt) => [
            pt.lat,
            pt.lng,
          ]);
          setRoute(polylineCoords);
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

        {poi && (
          <Marker position={[poi.lat, poi.lng]} icon={defaultIcon}>
            <Popup>
              <strong>{poi.name}</strong>
              <p>{poi.points} points</p>
              {collected ? (
                <p>Collected!</p>
              ) : (
                <button
                  type="button"
                  onClick={collectItem}
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
        )}

        {route.length > 0 && <Polyline positions={route} color="#8B5CF6" weight={5} />}
      </MapContainer>
    </div>
  );
}