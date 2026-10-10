
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function StreetMap() {
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        // Example location; replace with GPS coordinates.
        const latitude = 28.6024;
        const longitude = -81.2001;

        const map = L.map(mapRef.current).setView(
            [latitude, longitude],
            16
        );

        L.tileLayer(
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution: "&copy; OpenStreetMap contributors",
                maxZoom: 19,
            }
        ).addTo(map);

        L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup("Your location");

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
                    body: new URLSearchParams({ data: query }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to load streets");
            }

            const data = await response.json();

            for (const road of data.elements) {
                if (!road.geometry) continue;

                const points = road.geometry.map(
                    (point: { lat: number; lon: number }) =>
                        L.latLng(point.lat, point.lon)
                );

                L.polyline(points, {
                    color: "#3388ff",
                    weight: 3,
                }).addTo(map);
            }
        }

        loadStreets().catch(console.error);

        return () => {
            map.remove();
        };
    }, []);

    return (
        <div
            ref={mapRef}
            style={{ height: "500px", width: "100%" }}
        />
    );
}