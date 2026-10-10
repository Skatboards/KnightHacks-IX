
"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export default function StreetMap() {
    const mapRef = useRef<HTMLDivElement>(null);

    const [steps, setSteps] = useState(0);
    const [locationStatus, setLocationStatus] =
        useState("Locating...");
    const [streetStatus, setStreetStatus] =
        useState("Loading streets...");

    useEffect(() => {
        let map: import("leaflet").Map | undefined;
        let marker: import("leaflet").Marker | undefined;
        let accuracyCircle: import("leaflet").Circle | undefined;
        let watchId: number | undefined;
        let cancelled = false;
        let totalDistance = 0;

        let lastStepPosition: {
            lat: number;
            lon: number;
        } | null = null;

        let streetsLoaded = false;
        let lastMapUpdate = 0;

        function distanceBetween(
            lat1: number,
            lon1: number,
            lat2: number,
            lon2: number
        ): number {
            const radians = (degrees: number) =>
                (degrees * Math.PI) / 180;

            const R = 6371000;
            const dLat = radians(lat2 - lat1);
            const dLon = radians(lon2 - lon1);

            const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(radians(lat1)) *
                    Math.cos(radians(lat2)) *
                    Math.sin(dLon / 2) ** 2;

            return (
                R *
                2 *
                Math.atan2(
                    Math.sqrt(a),
                    Math.sqrt(1 - a)
                )
            );
        }

        async function loadStreets(
            L: typeof import("leaflet"),
            latitude: number,
            longitude: number
        ) {
            if (streetsLoaded || cancelled || !map) return;

            streetsLoaded = true;
            setStreetStatus("Loading nearby streets...");

            try {
                const response = await fetch("/api/streets", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        latitude,
                        longitude,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ??
                            `Request failed: ${response.status}`
                    );
                }

                if (cancelled || !map) return;

                let roadCount = 0;

                for (const road of data.elements ?? []) {
                    if (!road.geometry) continue;

                    const points = road.geometry.map(
                        (point: {
                            lat: number;
                            lon: number;
                        }) => L.latLng(point.lat, point.lon)
                    );

                    L.polyline(points, {
                        color: "#3388ff",
                        weight: 4,
                        opacity: 0.85,
                    }).addTo(map);

                    roadCount++;
                }

                setStreetStatus(
                    `Loaded ${roadCount} nearby roads`
                );

                console.log("Nearby roads loaded:", roadCount);
            } catch (error) {
                streetsLoaded = false;

                console.error(
                    "Failed to load streets:",
                    error
                );

                if (!cancelled) {
                    setStreetStatus(
                        "Street loading failed. Try refreshing."
                    );
                }
            }
        }

        async function initializeMap() {
            try {
                console.log("Initializing map...");

                const L = await import("leaflet");

                if (cancelled || !mapRef.current) return;

                if (!navigator.geolocation) {
                    throw new Error(
                        "This browser does not support geolocation."
                    );
                }

                // Obtain the initial location before creating the map.
                const position =
                    await new Promise<GeolocationPosition>(
                        (resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(
                                resolve,
                                reject,
                                {
                                    enableHighAccuracy: false,
                                    maximumAge: 0,
                                    timeout: 120000,
                                }
                            );
                        }
                    );

                if (cancelled || !mapRef.current) return;

                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                console.log("Initial position:", {
                    latitude,
                    longitude,
                    accuracy,
                    timestamp: new Date(
                        position.timestamp
                    ).toLocaleTimeString(),
                });

                map = L.map(mapRef.current).setView(
                    [latitude, longitude],
                    17
                );

                L.tileLayer(
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                    {
                        attribution:
                            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                        maxZoom: 19,
                    }
                ).addTo(map);

                // CSS marker; does not require Leaflet PNG assets.
                const playerIcon = L.divIcon({
                    className: "player-marker-container",
                    html: `
                        <div style="
                            width: 22px;
                            height: 22px;
                            background: #2878ff;
                            border: 3px solid white;
                            border-radius: 50%;
                            box-shadow: 0 1px 6px rgba(0,0,0,0.5);
                        "></div>
                    `,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                });

                marker = L.marker(
                    [latitude, longitude],
                    { icon: playerIcon }
                )
                    .addTo(map)
                    .bindPopup("Your location");

                accuracyCircle = L.circle(
                    [latitude, longitude],
                    {
                        radius: accuracy,
                        color: "#2878ff",
                        fillColor: "#2878ff",
                        fillOpacity: 0.08,
                        weight: 1,
                    }
                ).addTo(map);

                lastStepPosition = {
                    lat: latitude,
                    lon: longitude,
                };

                setLocationStatus(
                    `Tracking (accuracy ±${Math.round(accuracy)} m)`
                );

                void loadStreets(L, latitude, longitude);

                console.log("Starting continuous GPS tracking...");

                console.log("Registering GPS watch...");

                watchId = navigator.geolocation.watchPosition(
                    (currentPosition) => {
                        const lat =
                            currentPosition.coords.latitude;
                        const lon =
                            currentPosition.coords.longitude;
                        const currentAccuracy =
                            currentPosition.coords.accuracy;

                        // Detailed success log for every GPS callback.
                        console.log("GPS SUCCESS:", {
                            time: new Date().toLocaleTimeString(),
                            latitude: lat,
                            longitude: lon,
                            accuracy: currentAccuracy,
                            timestamp: new Date(
                                currentPosition.timestamp
                            ).toLocaleTimeString(),
                        });

                        if (
                            cancelled ||
                            !map ||
                            !marker ||
                            !accuracyCircle
                        ) {
                            console.log(
                                "Update ignored: map unavailable or cancelled"
                            );
                            return;
                        }

                        if (currentAccuracy > 50) {
                            console.warn(
                                "GPS accuracy is low:",
                                currentAccuracy,
                                "meters"
                            );
                        }

                        const current = { lat, lon };

                        if (lastStepPosition) {
                            const distance = distanceBetween(
                                lastStepPosition.lat,
                                lastStepPosition.lon,
                                lat,
                                lon
                            );

                            console.log(
                                "Distance from previous position:",
                                distance.toFixed(2),
                                "meters"
                            );

                            // No GPS accuracy threshold.
                            if (
                                distance >= 3 &&
                                distance <= 30
                            ) {
                                totalDistance += distance;
                                lastStepPosition = current;

                                // Estimate one step per 0.75 meters.
                                setSteps(
                                    Math.floor(totalDistance / 0.75)
                                );
                            } else if (distance > 30) {
                                console.warn(
                                    "Large position jump; resetting movement baseline."
                                );

                                lastStepPosition = current;
                            } else {
                                console.log(
                                    "Movement below 3 meters; ignoring."
                                );
                            }
                        } else {
                            lastStepPosition = current;
                        }

                        marker.setLatLng([lat, lon]);

                        accuracyCircle
                            .setLatLng([lat, lon])
                            .setRadius(currentAccuracy);

                        // Avoid excessively frequent map animations.
                        const now = Date.now();

                        if (now - lastMapUpdate >= 3000) {
                            map.panTo([lat, lon]);
                            lastMapUpdate = now;
                        }

                        setLocationStatus(
                            `Tracking (accuracy ±${Math.round(currentAccuracy)} m)`
                        );

                        console.log("Updated Position:", lat, lon);
                    },
                    (error) => {
                        if (cancelled) return;

                        console.error("GPS ERROR:", {
                            time: new Date().toLocaleTimeString(),
                            code: error.code,
                            message: error.message,
                        });

                        setLocationStatus(
                            `GPS issue: ${error.message}`
                        );
                    },
                    {
                        enableHighAccuracy: true,
                        maximumAge: 0,
                        timeout: 30000,
                    }
                );

                console.log("GPS watch registered:", watchId);
            } catch (error) {
                if (cancelled) return;

                console.error(
                    "Failed to initialize map:",
                    error
                );

                setLocationStatus(
                    error instanceof Error
                        ? error.message
                        : "Could not get your location."
                );
            }
        }

        void initializeMap();

        return () => {
            cancelled = true;

            if (
                watchId !== undefined &&
                navigator.geolocation
            ) {
                navigator.geolocation.clearWatch(watchId);
            }

            map?.remove();
        };
    }, []);

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <div
                style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    zIndex: 1000,
                    background: "white",
                    color: "#222",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    fontSize: "14px",
                }}
            >
                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: "17px",
                    }}
                >
                    Steps: {steps.toLocaleString()}
                </div>

                <div style={{ marginTop: "4px", fontSize: "12px" }}>
                    {locationStatus}
                </div>

                <div style={{ marginTop: "4px", fontSize: "12px" }}>
                    {streetStatus}
                </div>
            </div>

            <div
                ref={mapRef}
                style={{
                    height: "500px",
                    width: "100%",
                    borderRadius: "10px",
                }}
            />
        </div>
    );
}