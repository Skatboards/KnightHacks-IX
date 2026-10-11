"use client";

import { useEffect, useMemo, useState } from "react";
import Webcam from "react-webcam";

type Collectible = {
  poiId: string;
  collectibleTypeId: string;
  name: string;
  points: number;
  latitude: number;
  longitude: number;
};

type PoiResponse = {
  pois: Array<
    Omit<Collectible, "latitude" | "longitude"> & {
      latitude: number;
      longitude: number;
    }
  >;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

type OrientationWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  absolute?: boolean;
};

type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const COLLECTION_DISTANCE_METERS = 20;
const AR_DISPLAY_DISTANCE_METERS = 5000;
const CAMERA_FIELD_OF_VIEW_DEGREES = 70;

function distanceInMeters(
  origin: UserLocation,
  target: Pick<Collectible, "latitude" | "longitude">
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta =
    ((target.latitude - origin.latitude) * Math.PI) / 180;
  const longitudeDelta =
    ((target.longitude - origin.longitude) * Math.PI) / 180;
  const originLatitude = (origin.latitude * Math.PI) / 180;
  const targetLatitude = (target.latitude * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(targetLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function formatDistance(distance: number) {
  return distance < 1000
    ? `${Math.round(distance)} m away`
    : `${(distance / 1000).toFixed(1)} km away`;
}

function bearingBetween(
  origin: UserLocation,
  target: Pick<Collectible, "latitude" | "longitude">
) {
  const originLatitude = (origin.latitude * Math.PI) / 180;
  const targetLatitude = (target.latitude * Math.PI) / 180;
  const longitudeDelta =
    ((target.longitude - origin.longitude) * Math.PI) / 180;
  const y = Math.sin(longitudeDelta) * Math.cos(targetLatitude);
  const x =
    Math.cos(originLatitude) * Math.sin(targetLatitude) -
    Math.sin(originLatitude) *
      Math.cos(targetLatitude) *
      Math.cos(longitudeDelta);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function shortestAngleDelta(targetHeading: number, deviceHeading: number) {
  return ((targetHeading - deviceHeading + 540) % 360) - 180;
}

interface CameraProps {
  onCollect: (points: number) => void;
}

export default function Camera({ onCollect }: CameraProps) {
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [activeCollectibleId, setActiveCollectibleId] = useState<string | null>(
    null
  );
  const [creatingDemoCollectible, setCreatingDemoCollectible] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [compassError, setCompassError] = useState(false);
  const [orientationEventReceived, setOrientationEventReceived] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCollectibles() {
      try {
        const response = await fetch("/api/pois");
        const data = (await response.json()) as PoiResponse | { error?: string };
        if (!response.ok || !("pois" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Unable to load collectibles"
          );
        }

        if (!cancelled) {
          setCollectibles(
            data.pois.map((poi) => ({
              ...poi,
              latitude: poi.latitude,
              longitude: poi.longitude,
            }))
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load collectibles"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCollectibles();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Location is required to find nearby collectibles.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setError(null);
      },
      (geolocationError) => {
        console.error("AR location error:", geolocationError);
        setError("Allow location access to see collectibles around you.");
      },
      { enableHighAccuracy: true, maximumAge: 10_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const nearbyCollectibles = useMemo(() => {
    if (!location) {
      return [];
    }

    return collectibles
      .filter((collectible) => !collectedIds.includes(collectible.poiId))
      .map((collectible) => ({
        collectible,
        distance: distanceInMeters(location, collectible),
      }))
      .filter(({ distance }) => distance <= AR_DISPLAY_DISTANCE_METERS)
      .sort((left, right) => left.distance - right.distance);
  }, [collectibles, collectedIds, location]);

  const collectibleInRange = nearbyCollectibles.find(
    ({ distance }) => distance <= COLLECTION_DISTANCE_METERS
  );

  const activeCollectible = nearbyCollectibles.find(
    ({ collectible }) => collectible.poiId === activeCollectibleId
  );

  useEffect(() => {
    if (
      activeCollectibleId &&
      (!collectibleInRange ||
        collectibleInRange.collectible.poiId !== activeCollectibleId)
    ) {
      setActiveCollectibleId(null);
    }
  }, [activeCollectibleId, collectibleInRange]);

  useEffect(() => {
    if (!activeCollectible) {
      return;
    }

    let receivedEvent = false;
    const handleOrientation = (event: Event) => {
      const orientation = event as OrientationWithCompass;
      const compassHeading = orientation.webkitCompassHeading;
      const heading =
        typeof compassHeading === "number"
          ? compassHeading
          : typeof orientation.alpha === "number"
            ? (360 - orientation.alpha + 360) % 360
            : null;

      if (heading !== null) {
        receivedEvent = true;
        setDeviceHeading(heading);
        setOrientationEventReceived(true);
        setCompassError(false);
      }
    };

    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener(
      "deviceorientationabsolute",
      handleOrientation as EventListener
    );

    const sensorTimeout = window.setTimeout(() => {
      if (!receivedEvent) {
        setCompassError(true);
      }
    }, 2500);

    return () => {
      window.clearTimeout(sensorTimeout);
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation as EventListener
      );
    };
  }, [activeCollectible]);

  async function requestCompassPermission() {
    const orientationApi =
      DeviceOrientationEvent as DeviceOrientationWithPermission;

    if (typeof orientationApi.requestPermission !== "function") {
      return true;
    }

    const permission = await orientationApi.requestPermission();
    return permission === "granted";
  }

  async function openCamera(collectible: Collectible, distance: number) {
    if (!location || collectingId) {
      return;
    }

    if (distance > COLLECTION_DISTANCE_METERS) {
      setError(
        `Move within ${COLLECTION_DISTANCE_METERS} meters to collect ${collectible.name}.`
      );
      return;
    }

    setCameraError(false);
    setError(null);
    setDeviceHeading(null);
    setOrientationEventReceived(false);
    setCompassError(false);
    setActiveCollectibleId(collectible.poiId);

    try {
      const compassGranted = await requestCompassPermission();
      setCompassError(!compassGranted);
    } catch (permissionError) {
      console.error("Compass permission error:", permissionError);
      setCompassError(true);
    }
  }

  async function collectItem(collectible: Collectible, distance: number) {
    if (!location || collectingId || distance > COLLECTION_DISTANCE_METERS) {
      return;
    }

    setCollectingId(collectible.poiId);
    setError(null);

    try {
      const response = await fetch("/api/collectibles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poiId: collectible.poiId,
          collectibleTypeId: collectible.collectibleTypeId,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to collect this item");
      }

      setCollectedIds((current) => [...current, collectible.poiId]);
      onCollect(collectible.points);
      setActiveCollectibleId(null);
    } catch (collectError) {
      setError(
        collectError instanceof Error
          ? collectError.message
          : "Unable to collect this item"
      );
    } finally {
      setCollectingId(null);
    }
  }

  async function createDemoCollectible() {
    if (!location || creatingDemoCollectible) {
      return;
    }

    setCreatingDemoCollectible(true);
    setError(null);

    try {
      const response = await fetch("/api/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          name: "Demo Collectible",
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        poiId?: string;
        collectibleTypeId?: string;
        name?: string;
        points?: number;
        latitude?: number;
        longitude?: number;
      };

      if (
        !response.ok ||
        !result.poiId ||
        !result.collectibleTypeId ||
        typeof result.points !== "number"
      ) {
        throw new Error(result.error ?? "Unable to create demo collectible");
      }

      const demoCollectible: Collectible = {
        poiId: result.poiId,
        collectibleTypeId: result.collectibleTypeId,
        name: result.name ?? "Demo Collectible",
        points: result.points,
        latitude: result.latitude ?? location.latitude,
        longitude: result.longitude ?? location.longitude,
      };

      setCollectibles((current) => [
        ...current.filter((item) => item.poiId !== demoCollectible.poiId),
        demoCollectible,
      ]);
      setCollectedIds((current) =>
        current.filter((id) => id !== demoCollectible.poiId)
      );
    } catch (demoError) {
      setError(
        demoError instanceof Error
          ? demoError.message
          : "Unable to create demo collectible"
      );
    } finally {
      setCreatingDemoCollectible(false);
    }
  }

  const relativeBearing =
    activeCollectible && location && deviceHeading !== null
      ? shortestAngleDelta(
          bearingBetween(location, activeCollectible.collectible),
          deviceHeading
        )
      : null;
  const targetPosition = relativeBearing === null
    ? 50
    : Math.max(
        8,
        Math.min(
          92,
          50 + (relativeBearing / (CAMERA_FIELD_OF_VIEW_DEGREES / 2)) * 42
        )
      );

  return (
    <section
      className={`w-full overflow-hidden rounded-xl border border-purple-500/40 bg-black shadow-lg shadow-purple-950/20 ${
        collectibleInRange
          ? "fixed inset-x-4 bottom-4 z-[1000] mx-auto max-w-md"
          : ""
      }`}
    >
      <div className="flex items-center justify-between bg-gray-900 px-4 py-3">
        <div>
          <h2 className="font-bold text-purple-200">AR Collectibles</h2>
          <p className="text-xs text-gray-400">
            {collectibleInRange
              ? activeCollectible
                ? "Point your camera at it, then confirm collection."
                : "You are in range. Press collect to open the camera."
              : "Camera opens when you are within 20 meters"}
          </p>
        </div>
        <span className="rounded-full bg-green-400/15 px-2 py-1 text-xs text-green-300">
          {collectibleInRange ? "In range" : location ? "GPS ready" : "Locating..."}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-purple-500/20 bg-purple-950/30 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">
            Demo mode
          </p>
          <p className="text-xs text-gray-400">
            Put a test collectible at your current location.
          </p>
        </div>
        <button
          type="button"
          onClick={createDemoCollectible}
          disabled={!location || creatingDemoCollectible}
          className="shrink-0 rounded-lg border border-purple-400/50 px-3 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creatingDemoCollectible ? "Placing..." : "Place here"}
        </button>
      </div>

      {activeCollectible ? (
        <div className="relative aspect-[4/3] min-h-[320px] bg-gray-950">
          {!cameraError ? (
            <Webcam
              audio={false}
              className="absolute inset-0 h-full w-full object-cover"
              videoConstraints={{
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 960 },
              }}
              onUserMediaError={(mediaError) => {
                console.error("AR camera error:", mediaError);
                setCameraError(true);
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-gray-300">
              Camera access is unavailable. Use the map to collect this item.
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
          <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />

          <div
            className="pointer-events-none absolute top-[43%] -translate-x-1/2 -translate-y-1/2 text-center text-white transition-[left] duration-300"
            style={{ left: `${targetPosition}%` }}
          >
            <div className="ar-target-float relative mx-auto flex h-32 w-32 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-yellow-300/70" />
              <span className="absolute inset-3 rounded-full border border-yellow-200/80 bg-yellow-300/10 shadow-[0_0_35px_rgba(253,224,71,0.65)]" />
              <span className="relative text-7xl drop-shadow-[0_4px_5px_rgba(0,0,0,0.7)]" aria-hidden="true">
                🍎
              </span>
            </div>
            <div className="mt-1 rounded-full bg-gray-950/80 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              {compassError
                ? "Compass unavailable on this device"
                : !orientationEventReceived
                  ? "Waiting for compass..."
                : relativeBearing !== null &&
                    Math.abs(relativeBearing) > CAMERA_FIELD_OF_VIEW_DEGREES / 2
                  ? "Turn toward the collectible"
                  : activeCollectible.distance <= COLLECTION_DISTANCE_METERS
                ? "Collectible in range"
                : "Walk closer"}
            </div>
          </div>

          <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/20 bg-gray-950/80 p-3 text-white backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <span className="text-3xl" aria-hidden="true">
                    🍎
                  </span>
                  {activeCollectible.collectible.name}
                </p>
                <p className="text-xs text-gray-300">
                  {activeCollectible.collectible.points} points ·{" "}
                  {formatDistance(activeCollectible.distance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  collectItem(
                    activeCollectible.collectible,
                    activeCollectible.distance
                  )
                }
                disabled={collectingId !== null}
                className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-300"
              >
                {collectingId === activeCollectible.collectible.poiId
                  ? "Collecting..."
                  : "Confirm collection"}
              </button>
            </div>
          </div>
        </div>
      ) : collectibleInRange ? (
        <div className="flex items-center justify-between gap-3 bg-gray-950 px-4 py-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold text-white">
              {collectibleInRange.collectible.name}
            </p>
            <p>
              {collectibleInRange.collectible.points} points ·{" "}
              {formatDistance(collectibleInRange.distance)}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              openCamera(
                collectibleInRange.collectible,
                collectibleInRange.distance
              )
            }
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
          >
            Collect
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-gray-950 px-4 py-4 text-sm text-gray-300">
          <span className="text-2xl" aria-hidden="true">
            📍
          </span>
          <p>
            {loading
              ? "Loading nearby collectibles..."
              : location
                  ? "Follow the map route. Press Collect when you are close to open the camera."
                : "Waiting for your location..."}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="bg-red-950/80 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </section>
  );
}
