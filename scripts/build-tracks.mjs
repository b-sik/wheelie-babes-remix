// scripts/build-tracks.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { gpx as toGeoJSON } from "@tmcw/togeojson";
import * as turf from "@turf/turf";

const GPX_DIR = path.resolve("static/gpx"); // input .gpx folder
const OUT_DIR = path.resolve("static/tracks"); // static output
const FULL_DIR = path.join(OUT_DIR, "full");

// tweak: 25–100m is typical for whole-trip overview
const OVERVIEW_SIMPLIFY_TOLERANCE_METERS = 50;

function metersToDegrees(m) {
    return m / 111_320;
}

function simplifyFeature(f, meters) {
    const tolerance = metersToDegrees(meters);
    return turf.simplify(f, { tolerance, highQuality: false, mutate: false });
}

function extractLineStrings(gj) {
    const out = [];
    for (const f of gj.features ?? []) {
        if (!f?.geometry) continue;

        if (f.geometry.type === "LineString") {
            out.push(f);
        } else if (f.geometry.type === "MultiLineString") {
            for (const coords of f.geometry.coordinates) {
                out.push({
                    type: "Feature",
                    properties: { ...(f.properties || {}) },
                    geometry: { type: "LineString", coordinates: coords },
                });
            }
        }
    }
    return out;
}

function firstCoordinate(features) {
    for (const f of features) {
        const c = f?.geometry?.coordinates?.[0];
        if (c) return c; // [lng,lat]
    }
    return null;
}

function leafletBoundsForFeatures(features) {
    // Flatten all coords -> points -> bbox
    const pts = [];
    for (const f of features) {
        for (const c of f.geometry.coordinates) pts.push(c);
    }
    const fc = turf.featureCollection(
        pts.map(([lng, lat]) => turf.point([lng, lat]))
    );
    const b = turf.bbox(fc); // [minX,minY,maxX,maxY]
    return [
        [b[1], b[0]],
        [b[3], b[2]],
    ]; // [[lat,lng],[lat,lng]]
}

async function main() {
    await fs.mkdir(FULL_DIR, { recursive: true });

    const files = (await fs.readdir(GPX_DIR))
        .filter((f) => f.toLowerCase().endsWith(".gpx"))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const index = [];
    const overviewFeatures = []; // all simplified LineStrings for whole trip

    for (const file of files) {
        const id = Number(path.basename(file, ".gpx"));
        if (!Number.isFinite(id)) continue;

        let xml = await fs.readFile(path.join(GPX_DIR, file), "utf8");

        // Strip UTF-8 BOM if present and trim only the start (keep rest intact)
        xml = xml.replace(/^\uFEFF/, "").replace(/^\s+/, "");

        // Some exports include garbage before the first "<"
        const firstLt = xml.indexOf("<");
        if (firstLt > 0) xml = xml.slice(firstLt);

        const dom = new DOMParser().parseFromString(xml, "text/xml");

        const gj = toGeoJSON(dom);

        const lines = extractLineStrings(gj);
        if (!lines.length) continue;

        // FULL: keep exact points (FeatureCollection of LineStrings)
        const fullFC = turf.featureCollection(
            lines.map((f) => ({
                ...f,
                properties: { ...(f.properties || {}), id },
            }))
        );
        await fs.writeFile(
            path.join(FULL_DIR, `${id}.geojson`),
            JSON.stringify(fullFC)
        );

        // OVERVIEW: simplify each LineString, store for one big overview FC
        for (const lf of lines) {
            const simp = simplifyFeature(
                lf,
                OVERVIEW_SIMPLIFY_TOLERANCE_METERS
            );
            simp.properties = { ...(simp.properties || {}), id };
            overviewFeatures.push(simp);
        }

        const c0 = firstCoordinate(lines); // [lng,lat]
        const start = c0 ? [c0[1], c0[0]] : null; // [lat,lng]
        const bounds = leafletBoundsForFeatures(lines);

        index.push({
            id,
            full: `/tracks/full/${id}.geojson`,
            start,
            bounds,
        });
    }

    await fs.writeFile(path.join(OUT_DIR, "index.json"), JSON.stringify(index));
    await fs.writeFile(
        path.join(OUT_DIR, "overview.geojson"),
        JSON.stringify(turf.featureCollection(overviewFeatures))
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
