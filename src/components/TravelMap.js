'use client';

import { useEffect, useState, useRef } from 'react';

// ── Category config (mirrors page.js) ────────────────────────────
const categoryConfig = {
    'Sightseeing': { color: '#5c8aff', emoji: '🗺️' },
    'Nature': { color: '#4caf50', emoji: '🌿' },
    'Food & Drink': { color: '#ff7043', emoji: '🍜' },
    'Culture': { color: '#b388ff', emoji: '🎭' },
    'Adventure': { color: '#ff5252', emoji: '⛰️' },
    'Shopping': { color: '#ff80ab', emoji: '🛍️' },
    'Nightlife': { color: '#80deea', emoji: '🌙' },
    'Transport': { color: '#90a4ae', emoji: '✈️' },
};
const DEFAULT_CAT = { color: '#d4a017', emoji: '📍' };

// ── Nominatim geocoding (free, no key) ───────────────────────────
const geocodeCache = {};
async function geocode(location, country) {
    const key = `${location},${country}`;
    if (geocodeCache[key]) return geocodeCache[key];
    try {
        const query = encodeURIComponent(`${location}${country ? ', ' + country : ''}`);
        const r = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await r.json();
        if (data[0]) {
            const result = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            geocodeCache[key] = result;
            return result;
        }
    } catch { /* silent */ }
    return null;
}

// ── Main component ────────────────────────────────────────────────
export default function TravelMap({ memories }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const pathRef = useRef(null);
    const circlesRef = useRef([]);
    const [resolved, setResolved] = useState([]); // [{memory, latlng}]
    const [geocoding, setGeocoding] = useState(true);
    const [selected, setSelected] = useState(null);

    // ── Geocode all memories ───────────────────────────────────────
    useEffect(() => {
        if (!memories?.length) { setGeocoding(false); return; }
        let cancelled = false;
        (async () => {
            setGeocoding(true);
            const results = [];
            for (const m of memories) {
                if (cancelled) return;
                if (!m.location) continue;
                const latlng = await geocode(m.location, m.country);
                if (latlng) results.push({ memory: m, latlng });
                // small delay to be polite to Nominatim rate-limit (1 req/s)
                await new Promise(r => setTimeout(r, 350));
            }
            if (!cancelled) { setResolved(results); setGeocoding(false); }
        })();
        return () => { cancelled = true; };
    }, [memories]);

    // ── Init Leaflet map ──────────────────────────────────────────
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Leaflet must only run client-side
        import('leaflet').then(L => {
            // Fix default icon paths broken by webpack
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const map = L.map(mapRef.current, {
                center: [20, 0],
                zoom: 2,
                minZoom: 1,
                maxZoom: 16,
                zoomControl: false,
            });

            // CartoDB Dark Matter tiles — free, no API key
            L.tileLayer(
                'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                {
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 19,
                }
            ).addTo(map);

            // Custom zoom control – bottom right
            L.control.zoom({ position: 'bottomright' }).addTo(map);

            mapInstanceRef.current = map;
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // ── Update markers & path when resolved data changes ──────────
    useEffect(() => {
        if (!mapInstanceRef.current || !resolved.length) return;
        import('leaflet').then(L => {
            const map = mapInstanceRef.current;

            // Clear previous layers
            markersRef.current.forEach(m => m.remove());
            circlesRef.current.forEach(c => c.remove());
            if (pathRef.current) pathRef.current.remove();
            markersRef.current = [];
            circlesRef.current = [];

            // Sort by date for path
            const sorted = [...resolved].sort((a, b) =>
                new Date(a.memory.date) - new Date(b.memory.date)
            );

            // ── Journey path (dashed polyline) ───────────────────────
            if (sorted.length > 1) {
                const latlngs = sorted.map(r => r.latlng);
                pathRef.current = L.polyline(latlngs, {
                    color: '#d4a017',
                    weight: 2,
                    opacity: 0.55,
                    dashArray: '8, 10',
                }).addTo(map);
            }

            // ── Halo circles (category colour) ───────────────────────
            resolved.forEach(({ memory, latlng }) => {
                const cfg = categoryConfig[memory.category] || DEFAULT_CAT;
                const circle = L.circle(latlng, {
                    radius: 60000,
                    color: cfg.color,
                    fillColor: cfg.color,
                    fillOpacity: 0.08,
                    weight: 0,
                }).addTo(map);
                circlesRef.current.push(circle);
            });

            // ── Emoji markers ─────────────────────────────────────────
            resolved.forEach(({ memory, latlng }) => {
                const cfg = categoryConfig[memory.category] || DEFAULT_CAT;
                const stars = memory.rating ? '★'.repeat(memory.rating) + '☆'.repeat(5 - memory.rating) : '';
                const dateStr = memory.date
                    ? new Date(memory.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '';

                // Custom div icon
                const icon = L.divIcon({
                    className: '',
                    html: `
            <div style="
              width:44px;height:44px;border-radius:50%;
              background:rgba(10,10,16,0.92);
              border:2.5px solid ${cfg.color};
              box-shadow:0 0 14px ${cfg.color}88,0 4px 12px rgba(0,0,0,0.6);
              display:flex;align-items:center;justify-content:center;
              font-size:1.3rem;cursor:pointer;
              transition:transform 0.2s;
            ">
              ${cfg.emoji}
            </div>
            <div style="
              position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);
              width:0;height:0;
              border-left:6px solid transparent;
              border-right:6px solid transparent;
              border-top:7px solid ${cfg.color};
            "></div>
          `,
                    iconSize: [44, 52],
                    iconAnchor: [22, 52],
                    popupAnchor: [0, -54],
                });

                // Popup HTML
                const popupHtml = `
          <div style="
            font-family:'Patrick Hand',sans-serif;
            background:#13131c;color:#f0e6d0;
            border-radius:16px;padding:0;
            min-width:220px;max-width:280px;
            border:2px solid ${cfg.color};
            overflow:hidden;
            box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 20px ${cfg.color}44;
          ">
            ${memory.photoUrl ? `<img src="${memory.photoUrl}" alt="${memory.title}" style="width:100%;height:120px;object-fit:cover;display:block;" />` : `<div style="height:48px;background:linear-gradient(135deg,${cfg.color}22,${cfg.color}08);display:flex;align-items:center;justify-content:center;font-size:2rem;">${cfg.emoji}</div>`}
            <div style="padding:12px 14px 14px;">
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
                <span style="
                  padding:2px 8px;border-radius:999px;font-size:0.72rem;
                  background:${cfg.color}22;color:${cfg.color};
                  border:1px solid ${cfg.color};
                ">${cfg.emoji} ${memory.category || 'Memory'}</span>
                ${stars ? `<span style="font-size:0.72rem;color:#d4a017;">${stars}</span>` : ''}
              </div>
              <p style="font-family:'Caveat',cursive;font-weight:700;font-size:1.15rem;color:#f0e6d0;margin:0 0 4px;line-height:1.2;">${memory.title}</p>
              <p style="font-size:0.8rem;color:#b8a88a;margin:0 0 2px;">📍 ${memory.location}${memory.country ? ', ' + memory.country : ''}</p>
              ${dateStr ? `<p style="font-size:0.78rem;color:#7a6f5a;margin:0;">📅 ${dateStr}</p>` : ''}
              ${memory.highlights ? `<p style="font-size:0.8rem;color:#b8a88a;margin:6px 0 0;padding-top:6px;border-top:1px solid #2a2a38;line-height:1.5;">${memory.highlights.slice(0, 100)}${memory.highlights.length > 100 ? '…' : ''}</p>` : ''}
            </div>
          </div>
        `;

                const marker = L.marker(latlng, { icon })
                    .bindPopup(L.popup({
                        maxWidth: 300,
                        className: 'tm-popup',
                    }).setContent(popupHtml))
                    .addTo(map);

                marker.on('click', () => setSelected(memory));
                markersRef.current.push(marker);
            });

            // Fit map to all markers
            if (resolved.length === 1) {
                map.setView(resolved[0].latlng, 7);
            } else if (resolved.length > 1) {
                const group = L.featureGroup(markersRef.current);
                map.fitBounds(group.getBounds().pad(0.2));
            }
        });
    }, [resolved]);

    // ── Derived stats ──────────────────────────────────────────────
    const countries = [...new Set(memories?.map(m => m.country).filter(Boolean))];
    const categoryCounts = {};
    memories?.forEach(m => { if (m.category) categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1; });
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {/* ── Leaflet CSS injected via style tag ─────────────────── */}
            <style>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

        .leaflet-container {
          background: #0a0a10 !important;
          font-family: 'Patrick Hand', sans-serif;
        }
        .tm-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .tm-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: 1.4;
        }
        .tm-popup .leaflet-popup-tip-container { display: none; }
        .tm-popup .leaflet-popup-close-button {
          color: #7a6f5a !important;
          font-size: 16px !important;
          right: 8px !important;
          top: 8px !important;
          z-index: 10;
        }
        .leaflet-control-zoom a {
          background: #13131c !important;
          color: #f0e6d0 !important;
          border-color: #2a2a38 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #1e1e2e !important;
          color: #d4a017 !important;
        }
        .leaflet-control-attribution {
          background: rgba(10,10,16,0.7) !important;
          color: #3a3a4a !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a { color: #7a6f5a !important; }
        @keyframes tm-spin { to { transform: rotate(360deg); } }
        @keyframes tm-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

            {/* ── Map container ─────────────────────────────────────── */}
            <div
                ref={mapRef}
                style={{
                    width: '100%',
                    height: '520px',
                    borderRadius: '20px',
                    border: '2px solid #2a2a38',
                    overflow: 'hidden',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                }}
            />

            {/* ── Geocoding spinner overlay ──────────────────────────── */}
            {geocoding && memories?.length > 0 && (
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: '20px',
                    background: 'rgba(10,10,16,0.65)', backdropFilter: 'blur(4px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px',
                    zIndex: 500,
                }}>
                    <div style={{ fontSize: '2.8rem', animation: 'tm-spin 2s linear infinite' }}>🌍</div>
                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.15rem', color: '#f0e6d0' }}>
                        Placing your memories on the map…
                    </p>
                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#7a6f5a' }}>
                        Geocoding {memories?.length} location{memories?.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}

            {/* ── Empty state ───────────────────────────────────────── */}
            {!geocoding && memories?.length === 0 && (
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: '20px',
                    background: 'rgba(10,10,16,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
                    zIndex: 500,
                }}>
                    <div style={{ fontSize: '3rem' }}>🗺️</div>
                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.2rem', color: '#f0e6d0' }}>
                        No memories on the map yet!
                    </p>
                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.85rem', color: '#7a6f5a' }}>
                        Add a memory to pin your first location.
                    </p>
                </div>
            )}

            {/* ── Floating Stats Panel ──────────────────────────────── */}
            {resolved.length > 0 && (
                <div style={{
                    position: 'absolute', top: '14px', left: '14px', zIndex: 450,
                    background: 'rgba(10,10,16,0.88)', backdropFilter: 'blur(12px)',
                    border: '1.5px solid rgba(212,160,23,0.25)', borderRadius: '16px',
                    padding: '14px 18px', minWidth: '160px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(212,160,23,0.08)',
                    animation: 'tm-fade 0.5s ease-out',
                }}>
                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1rem', color: '#d4a017', marginBottom: '10px' }}>
                        🌍 Journey Stats
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        <StatRow icon="📍" value={resolved.length} label="Pinned" />
                        <StatRow icon="🌏" value={countries.length} label="Countries" />
                        {topCategory && <StatRow icon={categoryConfig[topCategory[0]]?.emoji || '📌'} value={topCategory[0]} label="Top category" small />}
                    </div>
                </div>
            )}

            {/* ── Legend ───────────────────────────────────────────── */}
            {resolved.length > 0 && (
                <div style={{
                    position: 'absolute', bottom: '14px', left: '14px', zIndex: 450,
                    background: 'rgba(10,10,16,0.88)', backdropFilter: 'blur(12px)',
                    border: '1.5px solid #2a2a38', borderRadius: '14px',
                    padding: '10px 14px', maxWidth: '220px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    animation: 'tm-fade 0.5s ease-out',
                }}>
                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.82rem', color: '#7a6f5a', marginBottom: '8px' }}>
                        LEGEND
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {Object.entries(categoryCounts).map(([cat, count]) => {
                            const cfg = categoryConfig[cat] || DEFAULT_CAT;
                            return (
                                <span key={cat} style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    padding: '2px 8px', borderRadius: '999px',
                                    border: `1px solid ${cfg.color}`,
                                    background: `${cfg.color}18`,
                                    fontSize: '0.72rem', fontFamily: 'Patrick Hand, sans-serif', color: cfg.color,
                                }}>
                                    {cfg.emoji} {cat} ({count})
                                </span>
                            );
                        })}
                    </div>
                    {resolved.length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1e1e2e' }}>
                            <div style={{ flex: 1, height: '2px', background: 'repeating-linear-gradient(90deg, #d4a017 0, #d4a017 6px, transparent 6px, transparent 12px)', opacity: 0.6 }} />
                            <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.72rem', color: '#7a6f5a' }}>Journey path</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Mini helper ───────────────────────────────────────────────────
function StatRow({ icon, value, label, small }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9rem' }}>{icon}</span>
            <div>
                <span style={{
                    fontFamily: 'Caveat, cursive', fontWeight: 700,
                    fontSize: small ? '0.82rem' : '1rem', color: '#f0e6d0',
                }}>{value}</span>
                {' '}
                <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.75rem', color: '#7a6f5a' }}>{label}</span>
            </div>
        </div>
    );
}
