
"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { getUserCoordinates } from "@/lib/getCoords";

export default function StreetMap() {
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let map: import("leaflet").Map | undefined;
        let cancelled = false;

        async function initializeMap() {
            try {
                // Load Leaflet only in the browser.
                const L = await import("leaflet");

                if (!mapRef.current || cancelled) return;

                // Get the user's actual GPS coordinates.
                const { latitude, longitude } =
                    await getUserCoordinates();

                if (!mapRef.current || cancelled) return;

                // Create the map centered on the user.
                map = L.map(mapRef.current).setView(
                    [latitude, longitude],
                    16
                );

                // Display OpenStreetMap tiles.
                L.tileLayer(
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                    {
                        attribution:
                            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                        maxZoom: 19,
                    }
                ).addTo(map);

                // Mark the user's location.
                L.marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup("Your location");

                // Retrieve nearby streets from Overpass.
                async function loadStreets() {
                    const query = `
                        [out:json][timeout:25];
                        way(around:500,${latitude},${longitude})
                            ["highway"]
                            ["highway"!~"footway|path|steps|cycleway"];
                        out geom;
                    `;

                    const response = await fetch(
                        "https://overpass-api.de/api/interpreter",
                        {
                            method: "POST",
                            body: new URLSearchParams({
                                data: query,
                            }),
                        }
                    );

                    if (!response.ok) {
                        throw new Error(
                            `Overpass request failed: ${response.status}`
                        );
                    }

                    const data = await response.json();

                    if (cancelled || !map) return;

                    // Draw each returned road on the map.
                    for (const road of data.elements) {
                        if (!road.geometry) continue;

                        const points = road.geometry.map(
                            (point: {
                                lat: number;
                                lon: number;
                            }) => L.latLng(point.lat, point.lon)
                        );

                        L.polyline(points, {
                            color: "#3388ff",
                            weight: 3,
                        }).addTo(map);
                    }
                }

                await loadStreets();
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        "Failed to initialize map or load streets:",
                        error
                    );
                }
            }
        }

        initializeMap();

        return () => {
            cancelled = true;
            map?.remove();
        };
    }, []);

    return (
        <div
            ref={mapRef}
            style={{
                height: "500px",
                width: "100%",
            }}
        />
    );
}