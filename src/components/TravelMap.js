'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────────
const CAT_CFG = {
    'Sightseeing': { color: '#5c8aff', emoji: '🗺️' },
    'Nature': { color: '#4caf50', emoji: '🌿' },
    'Food & Drink': { color: '#ff7043', emoji: '🍜' },
    'Culture': { color: '#b388ff', emoji: '🎭' },
    'Adventure': { color: '#ff5252', emoji: '⛰️' },
    'Shopping': { color: '#ff80ab', emoji: '🛍️' },
    'Nightlife': { color: '#80deea', emoji: '🌙' },
    'Transport': { color: '#90a4ae', emoji: '✈️' },
};
const DEFAULT_CFG = { color: '#d4a017', emoji: '📍' };

const MOOD_COLORS = {
    'Amazing': '#4caf50',
    'Peaceful': '#5c8aff',
    'Adventurous': '#ff7043',
    'Cultural': '#b388ff',
    'Foodie': '#ff9800',
    'Party': '#e040fb',
    'Chill': '#80deea',
    'Romantic': '#ff80ab',
};

const KINGDOM_RANKS = [
    { min: 0, title: '🏘️ Village Wanderer', color: '#90a4ae' },
    { min: 1, title: '🗺️ Regional Explorer', color: '#4caf50' },
    { min: 3, title: '⚔️ Continental Knight', color: '#5c8aff' },
    { min: 6, title: '🌍 World Traveler', color: '#b388ff' },
    { min: 11, title: '🏰 Kingdom Lord', color: '#ff7043' },
    { min: 21, title: '👑 Global Conqueror', color: '#d4a017' },
];

// GeoJSON source – Natural Earth 110m (free, no key)
const GEOJSON_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

// ── Helpers ───────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function getRank(countryCount) {
    let rank = KINGDOM_RANKS[0];
    for (const r of KINGDOM_RANKS) { if (countryCount >= r.min) rank = r; }
    return rank;
}

function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : Math.round(n).toString(); }

// ── Geocoding cache ───────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────
export default function TravelMap({ memories }) {
    const mapRef = useRef(null);
    const mapInst = useRef(null);
    const layersRef = useRef({ markers: [], path: null, heatCircles: [], kingdom: null, planePath: null, aiPin: null });

    const [resolved, setResolved] = useState([]);
    const [geocoding, setGeocoding] = useState(true);

    // Layer toggles
    const [showKingdom, setShowKingdom] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showPath, setShowPath] = useState(true);

    // Playback
    const [playing, setPlaying] = useState(false);
    const [playIdx, setPlayIdx] = useState(-1);
    const playRef = useRef(null);

    // AI states
    const [aiDestLoading, setAiDestLoading] = useState(false);
    const [aiDest, setAiDest] = useState(null);
    const [storyLoading, setStoryLoading] = useState(false);
    const [story, setStory] = useState(null);
    const [showStory, setShowStory] = useState(false);

    // Stats
    const [kingdomArea, setKingdomArea] = useState(0);
    const [totalDist, setTotalDist] = useState(0);
    const [geoJson, setGeoJson] = useState(null);

    // ── Fetch GeoJSON once ─────────────────────────────────────────
    useEffect(() => {
        fetch(GEOJSON_URL).then(r => r.json()).then(setGeoJson).catch(console.error);
    }, []);

    // ── Geocode all memories ───────────────────────────────────────
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

    // ── Compute distance ───────────────────────────────────────────
    useEffect(() => {
        if (resolved.length < 2) { setTotalDist(0); return; }
        const sorted = [...resolved].sort((a, b) => new Date(a.memory.date) - new Date(b.memory.date));
        let dist = 0;
        for (let i = 1; i < sorted.length; i++) {
            dist += haversine(sorted[i - 1].latlng[0], sorted[i - 1].latlng[1], sorted[i].latlng[0], sorted[i].latlng[1]);
        }
        setTotalDist(dist);
    }, [resolved]);

    // ── Fetch country areas ────────────────────────────────────────
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

    // ── Init Leaflet ───────────────────────────────────────────────
    useEffect(() => {
        if (!mapRef.current || mapInst.current) return;
        import('leaflet').then(L => {
            delete L.Icon.Default.prototype._getIconUrl;
            const map = L.map(mapRef.current, { center: [20, 0], zoom: 2, minZoom: 1, maxZoom: 16, zoomControl: false });
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OSM © CARTO', subdomains: 'abcd', maxZoom: 19,
            }).addTo(map);
            L.control.zoom({ position: 'bottomright' }).addTo(map);
            mapInst.current = map;
        });
        return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
    }, []);

    // ── Render main map layers ─────────────────────────────────────
    useEffect(() => {
        if (!mapInst.current || !resolved.length) return;
        import('leaflet').then(L => {
            const map = mapInst.current;
            const lrs = layersRef.current;

            // Clear all
            lrs.markers.forEach(m => m.remove());
            lrs.heatCircles.forEach(c => c.remove());
            if (lrs.path) lrs.path.remove();
            if (lrs.kingdom) lrs.kingdom.remove();
            lrs.markers = []; lrs.heatCircles = []; lrs.path = null; lrs.kingdom = null;

            const sorted = [...resolved].sort((a, b) => new Date(a.memory.date) - new Date(b.memory.date));

            // ── Kingdom territory overlay ─────────────────────────────
            if (showKingdom && geoJson) {
                const conqueredCountries = new Set(memories?.map(m => m.country?.toLowerCase()).filter(Boolean));
                lrs.kingdom = L.geoJSON(geoJson, {
                    style: feature => {
                        const name = (feature.properties?.name || '').toLowerCase();
                        const isConquered = [...conqueredCountries].some(c =>
                            name.includes(c) || c.includes(name.split(' ')[0])
                        );
                        return isConquered ? {
                            fillColor: '#d4a017',
                            fillOpacity: 0.22,
                            color: '#f5d56e',
                            weight: 1.5,
                            opacity: 0.6,
                        } : {
                            fillColor: '#000000',
                            fillOpacity: 0,
                            color: '#1a1a28',
                            weight: 0.5,
                            opacity: 0.4,
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        const name = (feature.properties?.name || '').toLowerCase();
                        const conqueredCountries2 = new Set(memories?.map(m => m.country?.toLowerCase()).filter(Boolean));
                        const isConquered = [...conqueredCountries2].some(c =>
                            name.includes(c) || c.includes(name.split(' ')[0])
                        );
                        if (isConquered) {
                            const count = memories?.filter(m => m.country?.toLowerCase() === name || name.includes(m.country?.toLowerCase())).length || 0;
                            layer.bindTooltip(`👑 ${feature.properties?.name} — ${count} memor${count !== 1 ? 'ies' : 'y'} conquered`, {
                                className: 'tm-tooltip', sticky: true,
                            });
                        }
                    },
                }).addTo(map);
            }

            // ── Journey path ───────────────────────────────────────────
            if (showPath && sorted.length > 1) {
                lrs.path = L.polyline(sorted.map(r => r.latlng), {
                    color: '#d4a017', weight: 2, opacity: 0.6, dashArray: '8, 10',
                }).addTo(map);
            }

            // ── Mood heatmap circles ───────────────────────────────────
            if (showHeatmap) {
                resolved.forEach(({ memory, latlng }) => {
                    const moodColor = MOOD_COLORS[memory.mood] || CAT_CFG[memory.category]?.color || '#d4a017';
                    const ratingScale = (memory.rating || 3) / 5;
                    const circle = L.circle(latlng, {
                        radius: 80000 + ratingScale * 80000,
                        color: moodColor, fillColor: moodColor,
                        fillOpacity: 0.18 + ratingScale * 0.12,
                        weight: 1.5,
                    }).addTo(map);
                    circle.bindTooltip(
                        `${memory.mood || ''} ${['☆', '★'][ratingScale > 0.6 ? 1 : 0]} ${memory.location}`,
                        { className: 'tm-tooltip' }
                    );
                    lrs.heatCircles.push(circle);
                });
            }

            // ── Markers ────────────────────────────────────────────────
            resolved.forEach(({ memory, latlng }, idx) => {
                const cfg = CAT_CFG[memory.category] || DEFAULT_CFG;
                const stars = memory.rating ? '★'.repeat(memory.rating) + '☆'.repeat(5 - memory.rating) : '';
                const dateStr = memory.date ? new Date(memory.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                const isPlaying = playing && idx <= playIdx;

                const icon = L.divIcon({
                    className: '',
                    html: `<div style="
            width:44px;height:44px;border-radius:50%;
            background:rgba(10,10,16,0.93);
            border:2.5px solid ${cfg.color};
            box-shadow:0 0 ${isPlaying ? '24px' : '10px'} ${cfg.color}${isPlaying ? 'dd' : '66'},0 4px 12px rgba(0,0,0,.6);
            display:flex;align-items:center;justify-content:center;
            font-size:1.3rem;cursor:pointer;
            opacity:${playing && idx > playIdx ? 0.2 : 1};
            transition:all 0.5s;
          ">${cfg.emoji}</div>
          <div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${cfg.color};opacity:${playing && idx > playIdx ? 0.2 : 1};"></div>`,
                    iconSize: [44, 52], iconAnchor: [22, 52], popupAnchor: [0, -56],
                });

                const popupHtml = `
          <div style="font-family:'Patrick Hand',sans-serif;background:#13131c;color:#f0e6d0;border-radius:16px;padding:0;min-width:220px;max-width:280px;border:2px solid ${cfg.color};overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 20px ${cfg.color}44;">
            ${memory.photoUrl ? `<img src="${memory.photoUrl}" alt="${memory.title}" style="width:100%;height:120px;object-fit:cover;display:block;"/>` : `<div style="height:48px;background:linear-gradient(135deg,${cfg.color}22,${cfg.color}08);display:flex;align-items:center;justify-content:center;font-size:2rem;">${cfg.emoji}</div>`}
            <div style="padding:12px 14px 14px;">
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
                <span style="padding:2px 8px;border-radius:999px;font-size:0.72rem;background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color};">${cfg.emoji} ${memory.category || 'Memory'}</span>
                ${stars ? `<span style="font-size:0.72rem;color:#d4a017;">${stars}</span>` : ''}
              </div>
              <p style="font-family:'Caveat',cursive;font-weight:700;font-size:1.15rem;color:#f0e6d0;margin:0 0 4px;line-height:1.2;">${memory.title}</p>
              <p style="font-size:0.8rem;color:#b8a88a;margin:0 0 2px;">📍 ${memory.location}${memory.country ? ', ' + memory.country : ''}</p>
              ${dateStr ? `<p style="font-size:0.78rem;color:#7a6f5a;margin:0;">📅 ${dateStr}</p>` : ''}
              ${memory.highlights ? `<p style="font-size:0.8rem;color:#b8a88a;margin:6px 0 0;padding-top:6px;border-top:1px solid #2a2a38;line-height:1.5;">${memory.highlights.slice(0, 100)}${memory.highlights.length > 100 ? '…' : ''}</p>` : ''}
            </div>
          </div>`;

                const marker = L.marker(latlng, { icon })
                    .bindPopup(L.popup({ maxWidth: 300, className: 'tm-popup' }).setContent(popupHtml))
                    .addTo(map);
                lrs.markers.push(marker);
            });

            // Fit bounds
            if (resolved.length === 1) map.setView(resolved[0].latlng, 8);
            else if (resolved.length > 1) {
                const group = L.featureGroup(lrs.markers);
                map.fitBounds(group.getBounds().pad(0.25));
            }
        });
    }, [resolved, showKingdom, showHeatmap, showPath, geoJson, playing, playIdx]);

    // ── AI Destination pin ─────────────────────────────────────────
    useEffect(() => {
        if (!mapInst.current) return;
        import('leaflet').then(L => {
            if (layersRef.current.aiPin) { layersRef.current.aiPin.remove(); layersRef.current.aiPin = null; }
            if (!aiDest?.latitude || !aiDest?.longitude) return;
            const map = mapInst.current;
            const icon = L.divIcon({
                className: '',
                html: `<div style="position:relative;">
          <div style="width:54px;height:54px;border-radius:50%;background:rgba(10,10,16,0.95);border:2.5px solid #b388ff;box-shadow:0 0 30px #b388ffaa,0 0 60px #b388ff44;display:flex;align-items:center;justify-content:center;font-size:1.6rem;animation:tm-dream-pulse 2s ease-in-out infinite;">🧭</div>
          <div style="position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #b388ff;"></div>
          <div style="position:absolute;top:-8px;right:-8px;width:20px;height:20px;border-radius:50%;background:#b388ff;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#fff;">AI</div>
        </div>`,
                iconSize: [54, 63], iconAnchor: [27, 63], popupAnchor: [0, -65],
            });
            const popup = L.popup({ maxWidth: 320, className: 'tm-popup' }).setContent(`
        <div style="font-family:'Patrick Hand',sans-serif;background:#13131c;color:#f0e6d0;border-radius:16px;padding:0;min-width:240px;max-width:300px;border:2px solid #b388ff;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 30px #b388ff44;">
          <div style="height:4px;background:linear-gradient(90deg,#b388ff,#ce93d8,#b388ff);"></div>
          <div style="padding:16px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="padding:3px 10px;border-radius:999px;font-size:0.75rem;background:rgba(179,136,255,0.15);color:#b388ff;border:1px solid #b388ff;">🧭 AI Dream Destination</span>
            </div>
            <p style="font-family:'Caveat',cursive;font-weight:700;font-size:1.3rem;color:#f0e6d0;margin:0 0 4px;">${aiDest.destination}</p>
            <p style="font-size:0.82rem;color:#b8a88a;margin:0 0 10px;">🌍 ${aiDest.country}</p>
            <p style="font-size:0.85rem;color:#ce93d8;font-style:italic;margin:0 0 10px;line-height:1.5;">"${aiDest.tagline}"</p>
            <p style="font-size:0.8rem;color:#b8a88a;line-height:1.55;margin:0 0 10px;">${aiDest.reasoning}</p>
            ${aiDest.insiderTip ? `<div style="padding:8px 10px;border-radius:10px;background:rgba(179,136,255,0.08);border:1px solid rgba(179,136,255,0.2);"><p style="font-size:0.78rem;color:#b388ff;margin:0;">💡 ${aiDest.insiderTip}</p></div>` : ''}
          </div>
        </div>`);
            layersRef.current.aiPin = L.marker([aiDest.latitude, aiDest.longitude], { icon }).bindPopup(popup).addTo(map);
            layersRef.current.aiPin.openPopup();
            map.flyTo([aiDest.latitude, aiDest.longitude], 6, { duration: 2 });
        });
    }, [aiDest]);

    // ── Playback logic ─────────────────────────────────────────────
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
                mapInst.current.flyTo(sorted[idx].latlng, 8, { duration: 1.2 });
                // Auto-open popup
                setTimeout(() => {
                    if (layersRef.current.markers[idx]) layersRef.current.markers[idx].openPopup();
                }, 1300);
            }
        }, 2500);
        return () => clearInterval(playRef.current);
    }, [playing, resolved]);

    // ── AI calls ──────────────────────────────────────────────────
    const fetchAiDestination = useCallback(async () => {
        if (aiDestLoading || !memories?.length) return;
        setAiDestLoading(true);
        setAiDest(null);
        try {
            let userCountry = '';
            if ('geolocation' in navigator) {
                try {
                    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }));
                    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
                    const d = await r.json();
                    userCountry = d.address?.country || '';
                } catch { /**/ }
            }
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

    // ── Derived stats ──────────────────────────────────────────────
    const countries = [...new Set(memories?.map(m => m.country).filter(Boolean))];
    const rank = getRank(countries.length);
    const categoryCounts = {};
    memories?.forEach(m => { if (m.category) categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1; });
    const topCat = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    const sortedByDate = [...resolved].sort((a, b) => new Date(a.memory.date) - new Date(b.memory.date));
    const firstMemory = sortedByDate[0]?.memory;
    const lastMemory = sortedByDate[sortedByDate.length - 1]?.memory;

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {/* ── CSS ──────────────────────────────────────────────────── */}
            <style>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        .leaflet-container { background:#0a0a10!important; font-family:'Patrick Hand',sans-serif; }
        .tm-popup .leaflet-popup-content-wrapper { background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important; }
        .tm-popup .leaflet-popup-content { margin:0!important;line-height:1.4; }
        .tm-popup .leaflet-popup-tip-container { display:none; }
        .tm-popup .leaflet-popup-close-button { color:#7a6f5a!important;font-size:16px!important;right:8px!important;top:8px!important;z-index:10; }
        .tm-tooltip { background:rgba(10,10,16,0.92)!important;border:1px solid rgba(212,160,23,0.3)!important;color:#f0e6d0!important;font-family:'Patrick Hand',sans-serif!important;font-size:0.82rem!important;border-radius:8px!important;box-shadow:0 4px 16px rgba(0,0,0,.4)!important; }
        .tm-tooltip::before { display:none!important; }
        .leaflet-control-zoom a { background:#13131c!important;color:#f0e6d0!important;border-color:#2a2a38!important; }
        .leaflet-control-zoom a:hover { background:#1e1e2e!important;color:#d4a017!important; }
        .leaflet-control-attribution { background:rgba(10,10,16,.7)!important;color:#3a3a4a!important;font-size:10px!important; }
        .leaflet-control-attribution a { color:#5a5a6a!important; }
        @keyframes tm-spin { to { transform:rotate(360deg); } }
        @keyframes tm-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tm-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.4)} 50%{box-shadow:0 0 0 14px rgba(212,160,23,0)} }
        @keyframes tm-kingdom { from{fill-opacity:0} to{fill-opacity:0.22} }
        @keyframes tm-dream-pulse { 0%,100%{box-shadow:0 0 20px #b388ffaa,0 0 40px #b388ff44} 50%{box-shadow:0 0 40px #b388ffcc,0 0 70px #b388ff66} }
        @keyframes tm-story-in { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
      `}</style>

            {/* ── Toolbar ───────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {/* Layer toggles */}
                <ToolBtn active={showKingdom} color="#d4a017" onClick={() => setShowKingdom(v => !v)}>👑 Kingdom</ToolBtn>
                <ToolBtn active={showHeatmap} color="#ff7043" onClick={() => setShowHeatmap(v => !v)}>🌡️ Mood Map</ToolBtn>
                <ToolBtn active={showPath} color="#5c8aff" onClick={() => setShowPath(v => !v)}>✈️ Path</ToolBtn>

                <div style={{ flex: 1, minWidth: '8px' }} />

                {/* Playback */}
                <ToolBtn active={playing} color="#4caf50" onClick={() => { if (!playing && resolved.length > 0) { setPlaying(true); } else { setPlaying(false); setPlayIdx(-1); } }}>
                    {playing ? '⏹️ Stop' : '▶️ Play Journey'}
                </ToolBtn>

                {/* AI buttons */}
                <ToolBtn active={!!aiDest} color="#b388ff" onClick={fetchAiDestination} loading={aiDestLoading}>
                    {aiDestLoading ? '🔮 Finding...' : aiDest ? '🧭 Rethink Dest.' : '🧭 AI Destination'}
                </ToolBtn>
                <ToolBtn active={false} color="#ce93d8" onClick={fetchStory} loading={storyLoading}>
                    {storyLoading ? '📝 Writing...' : '📖 My Story'}
                </ToolBtn>
            </div>

            {/* ── Playback progress bar ──────────────────────────────── */}
            {playing && (
                <div style={{ marginBottom: '10px', background: '#111118', borderRadius: '8px', height: '6px', overflow: 'hidden', border: '1px solid #2a2a38' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg,#4caf50,#d4a017)', borderRadius: '8px', width: `${Math.max(2, ((playIdx + 1) / Math.max(resolved.length, 1)) * 100)}%`, transition: 'width 0.5s' }} />
                </div>
            )}
            {playing && resolved.length > 0 && (
                <div style={{ fontFamily: 'Caveat, cursive', fontSize: '0.92rem', color: '#7a6f5a', marginBottom: '10px', textAlign: 'center' }}>
                    {playIdx >= 0 && playIdx < sortedByDate.length
                        ? `✈️ Visiting: ${sortedByDate[playIdx]?.memory?.location || 'Unknown'}`
                        : '🌍 Starting journey...'}
                </div>
            )}

            {/* ── Map container ─────────────────────────────────────── */}
            <div style={{ position: 'relative' }}>
                <div ref={mapRef} style={{ width: '100%', height: '520px', borderRadius: '20px', border: '2px solid #2a2a38', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.5)' }} />

                {/* ── Geocoding overlay ────────────────────────────────── */}
                {geocoding && memories?.length > 0 && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '20px', background: 'rgba(10,10,16,0.7)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', zIndex: 500 }}>
                        <div style={{ fontSize: '2.8rem', animation: 'tm-spin 2s linear infinite' }}>🌍</div>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.1rem', color: '#f0e6d0' }}>Placing your kingdom on the map…</p>
                    </div>
                )}

                {/* ── Empty state ──────────────────────────────────────── */}
                {!geocoding && memories?.length === 0 && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '20px', background: 'rgba(10,10,16,0.75)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', zIndex: 500 }}>
                        <div style={{ fontSize: '3rem' }}>🏰</div>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.2rem', color: '#f0e6d0' }}>Your kingdom awaits!</p>
                        <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.85rem', color: '#7a6f5a' }}>Add a memory to claim your first territory.</p>
                    </div>
                )}

                {/* ── Kingdom stats panel (top-left) ───────────────────── */}
                {resolved.length > 0 && (
                    <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 450, background: 'rgba(10,10,16,0.9)', backdropFilter: 'blur(14px)', border: `1.5px solid ${rank.color}44`, borderRadius: '16px', padding: '14px 18px', minWidth: '180px', boxShadow: `0 8px 24px rgba(0,0,0,.5),0 0 20px ${rank.color}22`, animation: 'tm-fade .5s ease-out' }}>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.95rem', color: rank.color, marginBottom: '10px' }}>
                            {rank.title}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <KStat icon="📍" value={resolved.length} label="Memories pinned" />
                            <KStat icon="🌏" value={countries.length} label="Countries" />
                            {kingdomArea > 0 && <KStat icon="🗺️" value={`${fmt(kingdomArea)} km²`} label="Territory claimed" />}
                            {totalDist > 0 && <KStat icon="✈️" value={`${fmt(totalDist)} km`} label="Total distance" />}
                            {topCat && <KStat icon={CAT_CFG[topCat[0]]?.emoji || '📌'} value={topCat[0]} label="Top category" small />}
                        </div>
                        {firstMemory && lastMemory && firstMemory.id !== lastMemory.id && (
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${rank.color}22` }}>
                                <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.72rem', color: '#5a4f3a' }}>
                                    {firstMemory.date ? new Date(firstMemory.date).getFullYear() : '?'} → {lastMemory.date ? new Date(lastMemory.date).getFullYear() : '?'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── AI Destination card (bottom-right) ───────────────── */}
                {aiDest && (
                    <div style={{ position: 'absolute', bottom: '14px', right: '55px', zIndex: 450, background: 'rgba(10,10,16,0.92)', backdropFilter: 'blur(14px)', border: '1.5px solid rgba(179,136,255,0.35)', borderRadius: '14px', padding: '12px 16px', maxWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,.5),0 0 20px rgba(179,136,255,0.15)', animation: 'tm-fade .4s ease-out' }}>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.9rem', color: '#b388ff', marginBottom: '4px' }}>🧭 Suggested Next</p>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.05rem', color: '#f0e6d0', marginBottom: '2px' }}>{aiDest.destination}</p>
                        <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.75rem', color: '#7a6f5a' }}>🌍 {aiDest.country}</p>
                    </div>
                )}

                {/* ── Legend (bottom-left) ──────────────────────────────── */}
                {resolved.length > 0 && Object.keys(categoryCounts).length > 0 && (
                    <div style={{ position: 'absolute', bottom: '14px', left: '14px', zIndex: 450, background: 'rgba(10,10,16,0.88)', backdropFilter: 'blur(12px)', border: '1.5px solid #2a2a38', borderRadius: '14px', padding: '10px 14px', maxWidth: '200px', animation: 'tm-fade .5s ease-out' }}>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.78rem', color: '#5a4f3a', marginBottom: '7px' }}>LEGEND</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {Object.entries(categoryCounts).map(([cat, count]) => {
                                const cfg = CAT_CFG[cat] || DEFAULT_CFG;
                                return <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '999px', border: `1px solid ${cfg.color}`, background: `${cfg.color}18`, fontSize: '0.7rem', fontFamily: 'Patrick Hand, sans-serif', color: cfg.color }}>{cfg.emoji} {cat} ({count})</span>;
                            })}
                        </div>
                        {showKingdom && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '7px', paddingTop: '7px', borderTop: '1px solid #1e1e2e' }}>
                                <div style={{ width: '14px', height: '10px', borderRadius: '2px', background: '#d4a01744', border: '1px solid #d4a01799' }} />
                                <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.7rem', color: '#7a6f5a' }}>Kingdom territory</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── AI Journey Story Modal ────────────────────────────── */}
            {showStory && story && (
                <div onClick={e => e.target === e.currentTarget && setShowStory(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ width: '100%', maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto', background: '#0e0e18', border: '2px solid rgba(212,160,23,0.3)', borderRadius: '24px', boxShadow: '0 24px 64px rgba(0,0,0,.8),0 0 60px rgba(212,160,23,.1)', animation: 'tm-story-in .4s cubic-bezier(.16,1,.3,1)' }}>
                        {/* Header bar */}
                        <div style={{ height: '4px', borderRadius: '22px 22px 0 0', background: 'linear-gradient(90deg,#d4a017,#b388ff,#4caf50)' }} />
                        <div style={{ padding: '28px 32px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' }}>
                                <div>
                                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.85rem', color: '#d4a017', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>📖 Your Travel Story</p>
                                    <h2 style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '2rem', color: '#f0e6d0', lineHeight: 1.2, marginBottom: '4px' }}>{story.title}</h2>
                                    {story.subtitle && <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.9rem', color: '#7a6f5a' }}>{story.subtitle}</p>}
                                </div>
                                <button onClick={() => setShowStory(false)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #2a2a38', background: '#1a1a24', color: '#7a6f5a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                            </div>

                            {story.travelPersona && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 14px', borderRadius: '999px', background: 'rgba(179,136,255,0.12)', border: '1px solid rgba(179,136,255,0.3)', fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem', color: '#b388ff', marginBottom: '20px' }}>
                                    ✨ {story.travelPersona}
                                </span>
                            )}
                        </div>

                        {story.openingLine && (
                            <div style={{ margin: '0 32px 24px', padding: '16px 20px', borderRadius: '14px', background: 'rgba(212,160,23,0.07)', border: '1.5px solid rgba(212,160,23,0.2)', borderLeft: '4px solid #d4a017' }}>
                                <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.15rem', color: '#f5d56e', fontStyle: 'italic', lineHeight: 1.6 }}>"{story.openingLine}"</p>
                            </div>
                        )}

                        <div style={{ padding: '0 32px 32px' }}>
                            {(story.story || '').split('\n\n').filter(Boolean).map((para, i) => (
                                <p key={i} style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '1rem', color: '#c8b99a', lineHeight: 1.85, marginBottom: '18px' }}>{para}</p>
                            ))}
                            <div style={{ paddingTop: '24px', borderTop: '1px solid #2a2a38', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <p style={{ fontFamily: 'Caveat, cursive', fontSize: '0.85rem', color: '#5a4f3a' }}>
                                    {story.totalChapters} chapters · {countries.length} countries
                                </p>
                                <button onClick={() => setShowStory(false)} style={{ padding: '9px 24px', borderRadius: '999px', border: '2px solid #d4a017', background: 'rgba(212,160,23,0.12)', color: '#f5d56e', fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
                                    Close Story ✈️
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Mini UI helpers ───────────────────────────────────────────────
function ToolBtn({ children, active, color, onClick, loading }) {
    return (
        <button type="button" onClick={onClick} disabled={loading} style={{
            padding: '7px 14px', borderRadius: '999px', cursor: loading ? 'wait' : 'pointer',
            border: `1.5px solid ${active ? color : '#2a2a38'}`,
            background: active ? `${color}18` : '#111118',
            color: active ? color : '#7a6f5a',
            fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem',
            transition: 'all .18s', opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: '5px',
        }}>
            {children}
        </button>
    );
}

function KStat({ icon, value, label, small }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.88rem' }}>{icon}</span>
            <div>
                <span style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: small ? '0.82rem' : '1rem', color: '#f0e6d0' }}>{value}</span>
                {' '}
                <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.72rem', color: '#5a4f3a' }}>{label}</span>
            </div>
        </div>
    );
}
