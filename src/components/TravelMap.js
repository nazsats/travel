'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// ── Config ────────────────────────────────────────────────────────
const CAT_CFG = {
    'Sightseeing': { color: '#5c8aff', glow: '#5c8aff', emoji: '🗺️' },
    'Nature': { color: '#4caf50', glow: '#4caf50', emoji: '🌿' },
    'Food & Drink': { color: '#ff7043', glow: '#ff7043', emoji: '🍜' },
    'Culture': { color: '#b388ff', glow: '#b388ff', emoji: '🎭' },
    'Adventure': { color: '#ff5252', glow: '#ff5252', emoji: '⛰️' },
    'Shopping': { color: '#ff80ab', glow: '#ff80ab', emoji: '🛍️' },
    'Nightlife': { color: '#80deea', glow: '#80deea', emoji: '🌙' },
    'Transport': { color: '#90a4ae', glow: '#90a4ae', emoji: '✈️' },
};
const DEFAULT_CFG = { color: '#d4a017', glow: '#d4a017', emoji: '📍' };

const MOOD_COLORS = {
    'Amazing': '#4caf50', 'Peaceful': '#5c8aff', 'Adventurous': '#ff7043',
    'Cultural': '#b388ff', 'Foodie': '#ff9800', 'Party': '#e040fb',
    'Chill': '#80deea', 'Romantic': '#ff80ab',
};

const KINGDOM_RANKS = [
    { min: 0, title: '🏘️ Village Wanderer', color: '#90a4ae' },
    { min: 1, title: '🗺️ Regional Explorer', color: '#4caf50' },
    { min: 3, title: '⚔️ Continental Knight', color: '#5c8aff' },
    { min: 6, title: '🌍 World Traveler', color: '#b388ff' },
    { min: 11, title: '🏰 Kingdom Lord', color: '#ff7043' },
    { min: 21, title: '👑 Global Conqueror', color: '#d4a017' },
];

// Three free tile layers — no API key needed
const TILE_LAYERS = {
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        label: '🌑 Dark', subdomains: 'abcd', attribution: '© OSM © CARTO',
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        label: '🛰️ Satellite', attribution: '© Esri',
    },
    terrain: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        label: '🗻 Terrain', attribution: '© Esri',
    },
};

const GEOJSON_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

// ── Helpers ───────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
function getRank(n) { let r = KINGDOM_RANKS[0]; for (const k of KINGDOM_RANKS) { if (n >= k.min) r = k; } return r; }
function fmt(n) { return n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : Math.round(n).toString(); }

const geoCache = {};
async function geocode(location, country) {
    const key = `${location}|${country}`;
    if (geoCache[key]) return geoCache[key];
    try {
        const q = encodeURIComponent(`${location}${country ? ', ' + country : ''}`);
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, { headers: { 'Accept-Language': 'en' } });
        const d = await r.json();
        if (d[0]) { const v = [parseFloat(d[0].lat), parseFloat(d[0].lon)]; geoCache[key] = v; return v; }
    } catch { /**/ }
    return null;
}

// ── Component ─────────────────────────────────────────────────────
export default function TravelMap({ memories }) {
    const mapRef = useRef(null);
    const mapWrapRef = useRef(null);
    const mapInst = useRef(null);
    const tileLayerRef = useRef(null);
    const layersRef = useRef({ markers: [], pathGlow: null, path: null, heatCircles: [], kingdom: null, aiPin: null });

    const [resolved, setResolved] = useState([]);
    const [geocoding, setGeocoding] = useState(true);
    const [geoJson, setGeoJson] = useState(null);

    // Layer toggles
    const [tileMode, setTileMode] = useState('dark');
    const [tilt3D, setTilt3D] = useState(false);
    const [showKingdom, setShowKingdom] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showPath, setShowPath] = useState(true);

    // Playback
    const [playing, setPlaying] = useState(false);
    const [playIdx, setPlayIdx] = useState(-1);
    const playRef = useRef(null);

    // AI
    const [aiDestLoading, setAiDestLoading] = useState(false);
    const [aiDest, setAiDest] = useState(null);
    const [storyLoading, setStoryLoading] = useState(false);
    const [story, setStory] = useState(null);
    const [showStory, setShowStory] = useState(false);

    // Stats
    const [kingdomArea, setKingdomArea] = useState(0);
    const [totalDist, setTotalDist] = useState(0);

    // ── GeoJSON ───────────────────────────────────────────────────
    useEffect(() => { fetch(GEOJSON_URL).then(r => r.json()).then(setGeoJson).catch(console.error); }, []);

    // ── Geocode ───────────────────────────────────────────────────
    useEffect(() => {
        if (!memories?.length) { setGeocoding(false); return; }
        let cancelled = false;
        (async () => {
            setGeocoding(true);
            const results = [];
            for (const m of memories) {
                if (cancelled || !m.location) continue;
                const latlng = await geocode(m.location, m.country);
                if (latlng) results.push({ memory: m, latlng });
                await new Promise(r => setTimeout(r, 350));
            }
            if (!cancelled) { setResolved(results); setGeocoding(false); }
        })();
        return () => { cancelled = true; };
    }, [JSON.stringify(memories?.map(m => m.id))]);

    // ── Distance ─────────────────────────────────────────────────
    useEffect(() => {
        if (resolved.length < 2) { setTotalDist(0); return; }
        const sorted = [...resolved].sort((a, b) => new Date(a.memory.date) - new Date(b.memory.date));
        setTotalDist(sorted.reduce((sum, r, i) => i === 0 ? 0 : sum + haversine(sorted[i - 1].latlng[0], sorted[i - 1].latlng[1], r.latlng[0], r.latlng[1]), 0));
    }, [resolved]);

    // ── Country areas ─────────────────────────────────────────────
    useEffect(() => {
        const countries = [...new Set(memories?.map(m => m.country).filter(Boolean))];
        if (!countries.length) { setKingdomArea(0); return; }
        (async () => {
            let total = 0;
            for (const c of countries) {
                try {
                    const r = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(c)}?fields=area`);
                    const d = await r.json();
                    if (Array.isArray(d) && d[0]?.area) total += d[0].area;
                } catch { /**/ }
            }
            setKingdomArea(total);
        })();
    }, [JSON.stringify(memories?.map(m => m.country))]);

    // ── Init map ──────────────────────────────────────────────────
    useEffect(() => {
        if (!mapRef.current || mapInst.current) return;
        import('leaflet').then(L => {
            delete L.Icon.Default.prototype._getIconUrl;
            const map = L.map(mapRef.current, {
                center: [20, 0], zoom: 2, minZoom: 1, maxZoom: 18,
                zoomControl: false,
                preferCanvas: true, // faster canvas renderer
            });
            const cfg = TILE_LAYERS[tileMode];
            tileLayerRef.current = L.tileLayer(cfg.url, {
                attribution: cfg.attribution, subdomains: cfg.subdomains || '', maxZoom: 19,
            }).addTo(map);
            L.control.zoom({ position: 'bottomright' }).addTo(map);
            mapInst.current = map;
        });
        return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
    }, []);

    // ── Swap tile layer ───────────────────────────────────────────
    useEffect(() => {
        if (!mapInst.current) return;
        import('leaflet').then(L => {
            if (tileLayerRef.current) tileLayerRef.current.remove();
            const cfg = TILE_LAYERS[tileMode];
            tileLayerRef.current = L.tileLayer(cfg.url, {
                attribution: cfg.attribution, subdomains: cfg.subdomains || '', maxZoom: 19,
            }).addTo(mapInst.current);
            tileLayerRef.current.bringToBack();
        });
    }, [tileMode]);

    // ── 3D Tilt ───────────────────────────────────────────────────
    useEffect(() => {
        if (!mapInst.current) return;
        setTimeout(() => mapInst.current?.invalidateSize(), 600);
    }, [tilt3D]);

    // ── Main layers ───────────────────────────────────────────────
    useEffect(() => {
        if (!mapInst.current || !resolved.length) return;
        import('leaflet').then(L => {
            const map = mapInst.current;
            const lrs = layersRef.current;
            lrs.markers.forEach(m => m.remove());
            lrs.heatCircles.forEach(c => c.remove());
            if (lrs.path) lrs.path.remove();
            if (lrs.pathGlow) lrs.pathGlow.remove();
            if (lrs.kingdom) lrs.kingdom.remove();
            lrs.markers = []; lrs.heatCircles = []; lrs.path = null; lrs.pathGlow = null; lrs.kingdom = null;

            const sorted = [...resolved].sort((a, b) => new Date(a.memory.date) - new Date(b.memory.date));

            // ── Kingdom GeoJSON ───────────────────────────────────────
            if (showKingdom && geoJson) {
                const conquered = new Set(memories?.map(m => m.country?.toLowerCase()).filter(Boolean));
                lrs.kingdom = L.geoJSON(geoJson, {
                    style: feat => {
                        const name = (feat.properties?.name || '').toLowerCase();
                        const hit = [...conquered].some(c => name.includes(c) || c.includes(name.split(' ')[0]));
                        return hit
                            ? { fillColor: '#d4a017', fillOpacity: 0.28, color: '#f5d56e', weight: 1.5, opacity: 0.7, className: 'tm-kingdom-layer' }
                            : { fillColor: '#000', fillOpacity: 0, color: '#1a1a28', weight: 0.4, opacity: 0.3 };
                    },
                    onEachFeature: (feat, layer) => {
                        const name = (feat.properties?.name || '').toLowerCase();
                        const conquered2 = new Set(memories?.map(m => m.country?.toLowerCase()).filter(Boolean));
                        const hit = [...conquered2].some(c => name.includes(c) || c.includes(name.split(' ')[0]));
                        if (hit) {
                            const count = memories?.filter(m => m.country?.toLowerCase() === name || name.includes(m.country?.toLowerCase())).length || 0;
                            layer.bindTooltip(`👑 ${feat.properties?.name} — ${count} memor${count !== 1 ? 'ies' : 'y'} conquered`, { className: 'tm-tooltip', sticky: true });
                        }
                    },
                }).addTo(map);
            }

            // ── Neon glow path ────────────────────────────────────────
            if (showPath && sorted.length > 1) {
                const pts = sorted.map(r => r.latlng);
                // Outer glow — wide, soft
                lrs.pathGlow = L.polyline(pts, { color: '#f5d56e', weight: 12, opacity: 0.07, lineCap: 'round' }).addTo(map);
                // Mid glow
                L.polyline(pts, { color: '#d4a017', weight: 5, opacity: 0.18, lineCap: 'round' }).addTo(map);
                // Core line
                lrs.path = L.polyline(pts, { color: '#f5d56e', weight: 2.5, opacity: 0.85, dashArray: '10, 12', lineCap: 'round' }).addTo(map);
            }

            // ── Mood heatmap ──────────────────────────────────────────
            if (showHeatmap) {
                resolved.forEach(({ memory, latlng }) => {
                    const c = MOOD_COLORS[memory.mood] || CAT_CFG[memory.category]?.color || '#d4a017';
                    const scale = (memory.rating || 3) / 5;
                    // Outer glow
                    L.circle(latlng, { radius: 160000, color: c, fillColor: c, fillOpacity: 0.04, weight: 0 }).addTo(map);
                    // Inner
                    const circle = L.circle(latlng, {
                        radius: 80000 + scale * 80000, color: c, fillColor: c,
                        fillOpacity: 0.16 + scale * 0.14, weight: 1.5,
                    }).addTo(map);
                    circle.bindTooltip(`${memory.mood || ''} · ${memory.location}`, { className: 'tm-tooltip' });
                    lrs.heatCircles.push(circle);
                });
            }

            // ── 3D sphere markers ─────────────────────────────────────
            resolved.forEach(({ memory, latlng }, idx) => {
                const cfg = CAT_CFG[memory.category] || DEFAULT_CFG;
                const stars = memory.rating ? '★'.repeat(memory.rating) + '☆'.repeat(5 - memory.rating) : '';
                const dateStr = memory.date ? new Date(memory.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                const dimmed = playing && idx > playIdx;
                const active = playing && idx === playIdx;
                const delay = (idx * 0.3) % 3;

                const icon = L.divIcon({
                    className: '',
                    html: `
            <div style="position:relative;filter:drop-shadow(0 0 ${active ? 16 : 8}px ${cfg.color});">
              <div style="
                width:50px;height:50px;border-radius:50%;
                background: radial-gradient(circle at 33% 30%, ${cfg.color}ee 0%, ${cfg.color}88 45%, rgba(0,0,0,0.92) 100%);
                border:2px solid ${cfg.color};
                box-shadow:
                  0 0 ${active ? 30 : 14}px ${cfg.color}${active ? 'cc' : '77'},
                  0 0 ${active ? 60 : 28}px ${cfg.color}${active ? '66' : '33'},
                  inset 0 2px 6px rgba(255,255,255,0.18),
                  inset 0 -2px 6px rgba(0,0,0,0.55),
                  0 10px 20px rgba(0,0,0,0.6);
                display:flex;align-items:center;justify-content:center;
                font-size:1.4rem;cursor:pointer;
                opacity:${dimmed ? 0.18 : 1};
                transition: all 0.45s cubic-bezier(.16,1,.3,1);
                animation: tm-float 4s ease-in-out ${delay}s infinite;
                transform-origin: center bottom;
              ">${cfg.emoji}</div>
              <div style="
                position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);
                width:0;height:0;
                border-left:7px solid transparent;
                border-right:7px solid transparent;
                border-top:9px solid ${cfg.color};
                filter:drop-shadow(0 2px 4px ${cfg.color}88);
                opacity:${dimmed ? 0.18 : 1};
                transition:opacity 0.45s;
              "></div>
              ${active ? `<div style="
                position:absolute;top:-6px;right:-6px;
                width:18px;height:18px;border-radius:50%;
                background:${cfg.color};
                animation: tm-ping 0.8s cubic-bezier(0,0,.2,1) infinite;
                opacity:0.7;
              "></div>` : ''}
            </div>`,
                    iconSize: [50, 60], iconAnchor: [25, 60], popupAnchor: [0, -62],
                });

                const popupHtml = `
          <div style="font-family:'Patrick Hand',sans-serif;background:#0d0d18;color:#f0e6d0;border-radius:18px;padding:0;min-width:230px;max-width:290px;border:2px solid ${cfg.color};overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.8),0 0 30px ${cfg.color}55;">
            <div style="height:3px;background:linear-gradient(90deg,${cfg.color},${cfg.color}88,${cfg.color})"></div>
            ${memory.photoUrl ? `<img src="${memory.photoUrl}" alt="${memory.title}" style="width:100%;height:130px;object-fit:cover;display:block;"/>` : `<div style="height:52px;background:radial-gradient(circle at 50% 50%,${cfg.color}22,transparent);display:flex;align-items:center;justify-content:center;font-size:2.2rem;">${cfg.emoji}</div>`}
            <div style="padding:14px 16px 16px;">
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
                <span style="padding:2px 9px;border-radius:999px;font-size:0.72rem;background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color};">${cfg.emoji} ${memory.category || 'Memory'}</span>
                ${stars ? `<span style="font-size:0.72rem;color:#d4a017;letter-spacing:1px;">${stars}</span>` : ''}
              </div>
              <p style="font-family:'Caveat',cursive;font-weight:700;font-size:1.2rem;color:#f0e6d0;margin:0 0 5px;line-height:1.2;">${memory.title}</p>
              <p style="font-size:0.8rem;color:#b8a88a;margin:0 0 3px;">📍 ${memory.location}${memory.country ? ', ' + memory.country : ''}</p>
              ${dateStr ? `<p style="font-size:0.78rem;color:#5a4f3a;margin:0;">📅 ${dateStr}</p>` : ''}
              ${memory.highlights ? `<p style="font-size:0.8rem;color:#b8a88a;margin:8px 0 0;padding-top:8px;border-top:1px solid #1e1e2e;line-height:1.55;">${memory.highlights.slice(0, 110)}${memory.highlights.length > 110 ? '…' : ''}</p>` : ''}
            </div>
          </div>`;

                const marker = L.marker(latlng, { icon })
                    .bindPopup(L.popup({ maxWidth: 310, className: 'tm-popup' }).setContent(popupHtml))
                    .addTo(map);
                lrs.markers.push(marker);
            });

            if (resolved.length === 1) map.setView(resolved[0].latlng, 8);
            else if (resolved.length > 1) {
                const group = L.featureGroup(lrs.markers);
                map.fitBounds(group.getBounds().pad(0.28));
            }
        });
    }, [resolved, showKingdom, showHeatmap, showPath, geoJson, playing, playIdx]);

    // ── AI Destination pin ────────────────────────────────────────
    useEffect(() => {
        if (!mapInst.current) return;
        import('leaflet').then(L => {
            if (layersRef.current.aiPin) { layersRef.current.aiPin.remove(); layersRef.current.aiPin = null; }
            if (!aiDest?.latitude || !aiDest?.longitude) return;
            const map = mapInst.current;
            const icon = L.divIcon({
                className: '',
                html: `<div style="position:relative;">
          <div style="width:58px;height:58px;border-radius:50%;
            background:radial-gradient(circle at 33% 30%,#ce93d8ee,#b388ff88 45%,rgba(0,0,0,0.92));
            border:2.5px solid #b388ff;
            box-shadow:0 0 32px #b388ffaa,0 0 64px #b388ff44,inset 0 2px 6px rgba(255,255,255,0.2);
            display:flex;align-items:center;justify-content:center;font-size:1.6rem;
            animation:tm-dream-pulse 2s ease-in-out infinite;">🧭</div>
          <div style="position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #b388ff;filter:drop-shadow(0 2px 6px #b388ffaa);"></div>
          <div style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#b388ff,#ce93d8);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:#fff;box-shadow:0 0 12px #b388ffaa;">AI</div>
        </div>`,
                iconSize: [58, 68], iconAnchor: [29, 68], popupAnchor: [0, -70],
            });
            const popup = L.popup({ maxWidth: 330, className: 'tm-popup' }).setContent(`
        <div style="font-family:'Patrick Hand',sans-serif;background:#0d0d18;color:#f0e6d0;border-radius:18px;padding:0;min-width:250px;max-width:310px;border:2px solid #b388ff;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.8),0 0 40px #b388ff44;">
          <div style="height:3px;background:linear-gradient(90deg,#b388ff,#ce93d8,#b388ff);"></div>
          <div style="padding:18px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><span style="padding:3px 10px;border-radius:999px;font-size:0.74rem;background:rgba(179,136,255,0.15);color:#b388ff;border:1px solid #b388ff;">🧭 AI Dream Destination</span></div>
            <p style="font-family:'Caveat',cursive;font-weight:700;font-size:1.4rem;color:#f0e6d0;margin:0 0 4px;">${aiDest.destination}</p>
            <p style="font-size:0.82rem;color:#b8a88a;margin:0 0 12px;">🌍 ${aiDest.country}</p>
            <p style="font-size:0.88rem;color:#ce93d8;font-style:italic;margin:0 0 12px;line-height:1.6;">"${aiDest.tagline}"</p>
            <p style="font-size:0.82rem;color:#b8a88a;line-height:1.6;margin:0 0 12px;">${aiDest.reasoning}</p>
            ${aiDest.insiderTip ? `<div style="padding:10px 12px;border-radius:10px;background:rgba(179,136,255,0.08);border:1px solid rgba(179,136,255,0.22);"><p style="font-size:0.79rem;color:#b388ff;margin:0;">💡 ${aiDest.insiderTip}</p></div>` : ''}
          </div>
        </div>`);
            layersRef.current.aiPin = L.marker([aiDest.latitude, aiDest.longitude], { icon }).bindPopup(popup).addTo(map);
            layersRef.current.aiPin.openPopup();
            map.flyTo([aiDest.latitude, aiDest.longitude], 6, { duration: 2.5, easeLinearity: 0.25 });
        });
    }, [aiDest]);

    // ── Playback ──────────────────────────────────────────────────
    useEffect(() => {
        if (!playing) { clearInterval(playRef.current); return; }
        const sorted = [...resolved].sort((a, b) => new Date(a.memory.date) - new Date(b.memory.date));
        setPlayIdx(-1);
        let idx = -1;
        playRef.current = setInterval(() => {
            idx++;
            if (idx >= sorted.length) { clearInterval(playRef.current); setPlaying(false); setPlayIdx(sorted.length); return; }
            setPlayIdx(idx);
            if (mapInst.current && sorted[idx]) {
                mapInst.current.flyTo(sorted[idx].latlng, 9, { duration: 1.4, easeLinearity: 0.3 });
                setTimeout(() => { if (layersRef.current.markers[idx]) layersRef.current.markers[idx].openPopup(); }, 1500);
            }
        }, 2800);
        return () => clearInterval(playRef.current);
    }, [playing, resolved]);

    // ── AI calls ─────────────────────────────────────────────────
    const fetchAiDestination = useCallback(async () => {
        if (aiDestLoading || !memories?.length) return;
        setAiDestLoading(true); setAiDest(null);
        try {
            let userCountry = '';
            try {
                const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }));
                const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
                const d = await r.json(); userCountry = d.address?.country || '';
            } catch { /**/ }
            const res = await fetch('/api/ai-destination', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memories, userCountry }) });
            const data = await res.json();
            if (data.success) setAiDest(data.data);
        } catch (e) { console.error(e); }
        setAiDestLoading(false);
    }, [memories, aiDestLoading]);

    const fetchStory = useCallback(async () => {
        if (storyLoading || !memories?.length) return;
        setStoryLoading(true);
        try {
            const res = await fetch('/api/ai-journey-story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memories }) });
            const data = await res.json();
            if (data.success) { setStory(data.data); setShowStory(true); }
        } catch (e) { console.error(e); }
        setStoryLoading(false);
    }, [memories, storyLoading]);

    // ── Derived ───────────────────────────────────────────────────
    const countries = [...new Set(memories?.map(m => m.country).filter(Boolean))];
    const rank = getRank(countries.length);
    const catCounts = {};
    memories?.forEach(m => { if (m.category) catCounts[m.category] = (catCounts[m.category] || 0) + 1; });
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    const sortedByDate = [...resolved].sort((a, b) => new Date(a.memory.date) - new Date(b.memory.date));

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {/* ── Global CSS ─────────────────────────────────────────── */}
            <style>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        .leaflet-container { background:#0a0a10!important; font-family:'Patrick Hand',sans-serif; }
        .tm-popup .leaflet-popup-content-wrapper { background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important; }
        .tm-popup .leaflet-popup-content { margin:0!important;line-height:1.4; }
        .tm-popup .leaflet-popup-tip-container { display:none!important; }
        .tm-popup .leaflet-popup-close-button { color:#5a4f3a!important;font-size:15px!important;right:10px!important;top:8px!important;z-index:20; }
        .tm-tooltip { background:rgba(8,8,18,0.95)!important;border:1px solid rgba(212,160,23,0.35)!important;color:#f0e6d0!important;font-family:'Patrick Hand',sans-serif!important;font-size:0.83rem!important;border-radius:10px!important;box-shadow:0 4px 20px rgba(0,0,0,.5),0 0 16px rgba(212,160,23,0.1)!important;padding:5px 10px!important; }
        .tm-tooltip::before { display:none!important; }
        .leaflet-control-zoom a { background:#0e0e1a!important;color:#f0e6d0!important;border-color:#2a2a38!important;box-shadow:0 4px 12px rgba(0,0,0,0.4)!important; }
        .leaflet-control-zoom a:hover { background:#1e1e2e!important;color:#d4a017!important;border-color:#d4a01755!important; }
        .leaflet-control-attribution { background:rgba(8,8,16,0.7)!important;color:#3a3a4a!important;font-size:9px!important; }
        .leaflet-control-attribution a { color:#555577!important; }

        @keyframes tm-float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-7px) scale(1.02)} }
        @keyframes tm-spin { to{transform:rotate(360deg)} }
        @keyframes tm-fade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tm-ping { 75%,100%{transform:scale(2.2);opacity:0} }
        @keyframes tm-dream-pulse { 0%,100%{box-shadow:0 0 24px #b388ffaa,0 0 48px #b388ff44} 50%{box-shadow:0 0 44px #b388ffdd,0 0 80px #b388ff66} }
        @keyframes tm-kingdom-sweep { from{fill-opacity:0;stroke-opacity:0} to{fill-opacity:.28;stroke-opacity:.7} }
        @keyframes tm-story-in { from{opacity:0;transform:translateY(20px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes tm-glow-border { 0%,100%{border-color:rgba(212,160,23,0.3)} 50%{border-color:rgba(212,160,23,0.7)} }
      `}</style>

            {/* ── Top toolbar ────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                {/* Tile switcher */}
                <div style={{ display: 'flex', background: '#111118', borderRadius: '999px', border: '1.5px solid #2a2a38', overflow: 'hidden', padding: '3px', gap: '2px' }}>
                    {Object.entries(TILE_LAYERS).map(([key, t]) => (
                        <button key={key} type="button" onClick={() => setTileMode(key)} style={{
                            padding: '5px 13px', borderRadius: '999px', cursor: 'pointer', border: 'none',
                            background: tileMode === key ? 'rgba(212,160,23,0.18)' : 'transparent',
                            color: tileMode === key ? '#f5d56e' : '#5a4f3a',
                            fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.85rem',
                            transition: 'all .18s',
                        }}>{t.label}</button>
                    ))}
                </div>

                {/* 3D toggle */}
                <ToolBtn active={tilt3D} color="#80deea" onClick={() => setTilt3D(v => !v)}>
                    {tilt3D ? '🌐 3D On' : '🌐 3D Tilt'}
                </ToolBtn>

                <div style={{ width: '1px', height: '28px', background: '#2a2a38' }} />

                {/* Layer toggles */}
                <ToolBtn active={showKingdom} color="#d4a017" onClick={() => setShowKingdom(v => !v)}>👑 Kingdom</ToolBtn>
                <ToolBtn active={showHeatmap} color="#ff7043" onClick={() => setShowHeatmap(v => !v)}>🌡️ Mood</ToolBtn>
                <ToolBtn active={showPath} color="#5c8aff" onClick={() => setShowPath(v => !v)}>✈️ Path</ToolBtn>

                <div style={{ flex: 1 }} />

                {/* AI & playback */}
                <ToolBtn active={playing} color="#4caf50" onClick={() => { if (!playing && resolved.length > 0) setPlaying(true); else { setPlaying(false); setPlayIdx(-1); } }}>
                    {playing ? '⏹️ Stop' : '▶️ Play'}
                </ToolBtn>
                <ToolBtn active={!!aiDest} color="#b388ff" onClick={fetchAiDestination} loading={aiDestLoading}>
                    {aiDestLoading ? '🔮 Finding…' : '🧭 AI Dest'}
                </ToolBtn>
                <ToolBtn active={false} color="#ce93d8" onClick={fetchStory} loading={storyLoading}>
                    {storyLoading ? '📝 Writing…' : '📖 Story'}
                </ToolBtn>
            </div>

            {/* ── Playback bar ───────────────────────────────────────── */}
            {playing && (
                <div style={{ marginBottom: '8px' }}>
                    <div style={{ background: '#0d0d14', borderRadius: '6px', height: '5px', overflow: 'hidden', border: '1px solid #1e1e28' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg,#4caf50,#d4a017,#5c8aff)', borderRadius: '6px', width: `${Math.max(2, ((playIdx + 1) / Math.max(resolved.length, 1)) * 100)}%`, transition: 'width 0.6s', boxShadow: '0 0 8px rgba(212,160,23,0.5)' }} />
                    </div>
                    <p style={{ fontFamily: 'Caveat, cursive', fontSize: '0.88rem', color: '#7a6f5a', marginTop: '5px', textAlign: 'center' }}>
                        {playIdx >= 0 && playIdx < sortedByDate.length ? `✈️ ${sortedByDate[playIdx]?.memory?.location || '…'}` : '🌍 Starting…'}
                    </p>
                </div>
            )}

            {/* ── Map wrapper (3D transform applied here) ────────────── */}
            <div
                ref={mapWrapRef}
                style={{
                    position: 'relative',
                    transformOrigin: 'center 40%',
                    transform: tilt3D
                        ? 'perspective(1600px) rotateX(18deg) scale(1.06)'
                        : 'perspective(1600px) rotateX(0deg) scale(1)',
                    transition: 'transform 0.65s cubic-bezier(.16,1,.3,1)',
                    borderRadius: '22px',
                    // Extra glow when 3D is active
                    boxShadow: tilt3D
                        ? '0 40px 80px rgba(0,0,0,.8), 0 0 60px rgba(212,160,23,0.12)'
                        : '0 12px 40px rgba(0,0,0,.5)',
                }}
            >
                {/* Vignette overlay */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 200, borderRadius: '22px', pointerEvents: 'none',
                    background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)',
                }} />

                {/* Top edge shimmer */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px', zIndex: 210,
                    background: 'linear-gradient(90deg, transparent, #d4a01788, #5c8aff88, #d4a01788, transparent)',
                    borderRadius: '22px 22px 0 0', pointerEvents: 'none',
                    animation: 'tm-glow-border 3s ease-in-out infinite',
                }} />

                {/* Map canvas */}
                <div ref={mapRef} style={{ width: '100%', height: '540px', borderRadius: '22px', overflow: 'hidden', border: '2px solid #1e1e2e' }} />

                {/* Loading overlay */}
                {geocoding && memories?.length > 0 && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '22px', background: 'rgba(5,5,14,0.72)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', zIndex: 500 }}>
                        <div style={{ fontSize: '3rem', animation: 'tm-spin 2s linear infinite' }}>🌍</div>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.1rem', color: '#f0e6d0' }}>Placing your kingdom…</p>
                    </div>
                )}

                {/* Empty */}
                {!geocoding && memories?.length === 0 && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '22px', background: 'rgba(5,5,14,0.78)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', zIndex: 500 }}>
                        <div style={{ fontSize: '3.5rem' }}>🏰</div>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.25rem', color: '#f0e6d0' }}>Your kingdom awaits!</p>
                        <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.88rem', color: '#5a4f3a' }}>Add a memory to claim your first territory.</p>
                    </div>
                )}

                {/* ── Kingdom Stats panel ─────────────────────────────── */}
                {resolved.length > 0 && (
                    <div style={{
                        position: 'absolute', top: '14px', left: '14px', zIndex: 450,
                        background: 'rgba(5,5,14,0.92)', backdropFilter: 'blur(20px)',
                        border: `1.5px solid ${rank.color}55`,
                        borderRadius: '18px', padding: '16px 20px', minWidth: '190px',
                        boxShadow: `0 12px 40px rgba(0,0,0,.6), 0 0 30px ${rank.color}18, inset 0 1px 0 rgba(255,255,255,0.05)`,
                        animation: 'tm-fade .5s ease-out',
                    }}>
                        {/* Rank badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: `1px solid ${rank.color}28` }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: rank.color, boxShadow: `0 0 8px ${rank.color}` }} />
                            <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1rem', color: rank.color }}>{rank.title}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                            <KStat icon="📍" value={resolved.length} label="Memories" />
                            <KStat icon="🌏" value={countries.length} label="Countries" />
                            {kingdomArea > 0 && <KStat icon="🗺️" value={`${fmt(kingdomArea)} km²`} label="Territory" />}
                            {totalDist > 0 && <KStat icon="✈️" value={`${fmt(totalDist)} km`} label="Traveled" />}
                            {topCat && <KStat icon={CAT_CFG[topCat[0]]?.emoji || '📌'} value={topCat[0]} label="Top style" small />}
                        </div>
                        {sortedByDate.length > 1 && (
                            <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.7rem', color: '#3a3028', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${rank.color}18` }}>
                                {sortedByDate[0]?.memory?.date ? new Date(sortedByDate[0].memory.date).getFullYear() : '?'} → {sortedByDate[sortedByDate.length - 1]?.memory?.date ? new Date(sortedByDate[sortedByDate.length - 1].memory.date).getFullYear() : '?'}
                            </p>
                        )}
                    </div>
                )}

                {/* ── AI Destination bottom card ──────────────────────── */}
                {aiDest && (
                    <div style={{ position: 'absolute', bottom: '14px', right: '55px', zIndex: 450, background: 'rgba(5,5,14,0.94)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(179,136,255,0.4)', borderRadius: '14px', padding: '12px 16px', maxWidth: '200px', boxShadow: '0 12px 32px rgba(0,0,0,.6),0 0 24px rgba(179,136,255,0.18)', animation: 'tm-fade .4s ease-out' }}>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem', color: '#b388ff', marginBottom: '4px' }}>🧭 Dream Next</p>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.05rem', color: '#f0e6d0', marginBottom: '2px' }}>{aiDest.destination}</p>
                        <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.74rem', color: '#5a4f3a' }}>🌍 {aiDest.country}</p>
                    </div>
                )}

                {/* ── Legend bottom-left ──────────────────────────────── */}
                {resolved.length > 0 && Object.keys(catCounts).length > 0 && (
                    <div style={{ position: 'absolute', bottom: '14px', left: '14px', zIndex: 450, background: 'rgba(5,5,14,0.9)', backdropFilter: 'blur(20px)', border: '1.5px solid #1e1e2e', borderRadius: '14px', padding: '10px 14px', maxWidth: '220px', animation: 'tm-fade .5s ease-out' }}>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.75rem', color: '#3a3028', marginBottom: '7px', letterSpacing: '0.06em' }}>LEGEND</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {Object.entries(catCounts).map(([cat, count]) => {
                                const cfg = CAT_CFG[cat] || DEFAULT_CFG;
                                return <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', border: `1px solid ${cfg.color}`, background: `${cfg.color}14`, fontSize: '0.7rem', fontFamily: 'Patrick Hand, sans-serif', color: cfg.color }}>{cfg.emoji} {cat} ({count})</span>;
                            })}
                        </div>
                        {showKingdom && <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '7px', paddingTop: '7px', borderTop: '1px solid #1a1a24' }}><div style={{ width: '14px', height: '10px', borderRadius: '2px', background: '#d4a01730', border: '1px solid #d4a01770' }} /><span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.7rem', color: '#5a4f3a' }}>Kingdom territory</span></div>}
                        {showPath && resolved.length > 1 && <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '5px' }}><div style={{ flex: 1, height: '2px', background: 'repeating-linear-gradient(90deg,#d4a017 0,#d4a017 6px,transparent 6px,transparent 12px)', opacity: 0.7 }} /><span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.7rem', color: '#5a4f3a' }}>Journey</span></div>}
                    </div>
                )}

                {/* 3D label badge */}
                {tilt3D && (
                    <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 450, padding: '4px 12px', borderRadius: '999px', background: 'rgba(128,222,234,0.12)', border: '1px solid rgba(128,222,234,0.4)', fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.82rem', color: '#80deea', pointerEvents: 'none' }}>
                        🌐 3D Mode
                    </div>
                )}
            </div>

            {/* ── AI Journey Story Modal ────────────────────────────── */}
            {showStory && story && (
                <div onClick={e => e.target === e.currentTarget && setShowStory(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', background: 'linear-gradient(160deg,#0d0d1a,#0a0a14)', border: '2px solid rgba(212,160,23,0.28)', borderRadius: '26px', boxShadow: '0 32px 80px rgba(0,0,0,.85),0 0 80px rgba(212,160,23,.08)', animation: 'tm-story-in .45s cubic-bezier(.16,1,.3,1)' }}>
                        <div style={{ height: '4px', borderRadius: '24px 24px 0 0', background: 'linear-gradient(90deg,#d4a017,#b388ff,#4caf50,#5c8aff,#d4a017)', backgroundSize: '200% 100%' }} />
                        <div style={{ padding: '30px 36px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                                <div>
                                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.82rem', color: '#d4a017', marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>📖 Your Travel Story</p>
                                    <h2 style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '2.1rem', color: '#f0e6d0', lineHeight: 1.15, marginBottom: '6px' }}>{story.title}</h2>
                                    {story.subtitle && <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.92rem', color: '#5a4f3a' }}>{story.subtitle}</p>}
                                </div>
                                <button onClick={() => setShowStory(false)} style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #2a2a38', background: '#1a1a24', color: '#5a4f3a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>✕</button>
                            </div>
                            {story.travelPersona && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 14px', borderRadius: '999px', background: 'rgba(179,136,255,0.1)', border: '1px solid rgba(179,136,255,0.3)', fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.9rem', color: '#b388ff', marginBottom: '22px' }}>✨ {story.travelPersona}</span>}
                        </div>
                        {story.openingLine && (
                            <div style={{ margin: '0 36px 26px', padding: '18px 22px', borderRadius: '16px', background: 'rgba(212,160,23,0.06)', border: '1.5px solid rgba(212,160,23,0.18)', borderLeft: '4px solid #d4a017' }}>
                                <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.18rem', color: '#f5d56e', fontStyle: 'italic', lineHeight: 1.65 }}>"{story.openingLine}"</p>
                            </div>
                        )}
                        <div style={{ padding: '0 36px 36px' }}>
                            {(story.story || '').split('\n\n').filter(Boolean).map((para, i) => (
                                <p key={i} style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '1.02rem', color: '#c0b090', lineHeight: 1.9, marginBottom: '20px' }}>{para}</p>
                            ))}
                            <div style={{ paddingTop: '24px', borderTop: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <p style={{ fontFamily: 'Caveat, cursive', fontSize: '0.85rem', color: '#3a3028' }}>{story.totalChapters} chapters · {countries.length} countries explored</p>
                                <button onClick={() => setShowStory(false)} style={{ padding: '10px 26px', borderRadius: '999px', border: '2px solid #d4a017', background: 'rgba(212,160,23,0.12)', color: '#f5d56e', fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.98rem', cursor: 'pointer' }}>Close Story ✈️</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────
function ToolBtn({ children, active, color, onClick, loading }) {
    return (
        <button type="button" onClick={onClick} disabled={loading} style={{
            padding: '6px 14px', borderRadius: '999px', cursor: loading ? 'wait' : 'pointer',
            border: `1.5px solid ${active ? color : '#2a2a38'}`,
            background: active ? `${color}18` : '#0d0d14',
            color: active ? color : '#4a4a5a',
            fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.87rem',
            transition: 'all .18s', opacity: loading ? 0.65 : 1,
            boxShadow: active ? `0 0 12px ${color}33` : 'none',
        }}>{children}</button>
    );
}

function KStat({ icon, value, label, small }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{icon}</span>
            <div>
                <span style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: small ? '0.84rem' : '1.02rem', color: '#e8d8b8' }}>{value}</span>
                {' '}
                <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.71rem', color: '#3a3028' }}>{label}</span>
            </div>
        </div>
    );
}
