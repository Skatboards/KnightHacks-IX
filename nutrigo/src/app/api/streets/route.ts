
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { latitude, longitude } = await request.json();

        if (
            typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            Math.abs(latitude) > 90 ||
            Math.abs(longitude) > 180
        ) {
            return NextResponse.json(
                { error: "Invalid coordinates" },
                { status: 400 }
            );
        }

        const query = `
            [out:json][timeout:20];
            way(around:250,${latitude},${longitude})
                ["highway"]
                ["highway"!~"footway|path|steps|cycleway"];
            out geom;
        `;

        const servers = [
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
        ];

        for (const server of servers) {
            try {
                const response = await fetch(server, {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded",
                        "User-Agent": "NutriGo/1.0",
                    },
                    body: new URLSearchParams({ data: query }),
                    signal: AbortSignal.timeout(25000),
                    cache: "no-store",
                });

                if (!response.ok) {
                    console.error(
                        `Overpass ${server} returned ${response.status}`
                    );
                    continue;
                }

                const data = await response.json();

                return NextResponse.json({
                    elements: data.elements ?? [],
                });
            } catch (error) {
                console.error(`Overpass request failed: ${server}`, error);
            }
        }

        return NextResponse.json(
            { error: "All Overpass servers failed. Try again later." },
            { status: 502 }
        );
    } catch (error) {
        console.error("Street API error:", error);

        return NextResponse.json(
            { error: "Unable to retrieve nearby streets." },
            { status: 500 }
        );
    }
}