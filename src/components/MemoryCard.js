'use client';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const categoryConfig = {
    'Sightseeing': { color: '#5c8aff', bg: 'rgba(92,138,255,0.12)', emoji: '🗺️' },
    'Nature': { color: '#4caf50', bg: 'rgba(76,175,80,0.12)', emoji: '🌿' },
    'Food & Drink': { color: '#ff7043', bg: 'rgba(255,112,67,0.12)', emoji: '🍜' },
    'Culture': { color: '#b388ff', bg: 'rgba(179,136,255,0.12)', emoji: '🎭' },
    'Adventure': { color: '#ff5252', bg: 'rgba(255,82,82,0.12)', emoji: '⛰️' },
    'Shopping': { color: '#ff80ab', bg: 'rgba(255,128,171,0.12)', emoji: '🛍️' },
    'Nightlife': { color: '#80deea', bg: 'rgba(128,222,234,0.12)', emoji: '🌙' },
    'Transport': { color: '#90a4ae', bg: 'rgba(144,164,174,0.12)', emoji: '✈️' },
};
const moodEmoji = { 'Amazing': '🤩', 'Peaceful': '😌', 'Adventurous': '🏔️', 'Cultural': '🏛️', 'Foodie': '🍜', 'Party': '🎉', 'Chill': '🌊', 'Romantic': '💕' };

function AIPanel({ memory, onUpdate }) {
    const [mode, setMode] = useState(null); // null | 'insights' | 'reflect'
    const [loading, setLoading] = useState(false);

    const fetchAI = async (type) => {
        if (loading) return;
        if (type === 'insights' && memory.aiFunFacts) { setMode('insights'); return; }
        if (type === 'reflect' && memory.aiReflection) { setMode('reflect'); return; }
        setLoading(true); setMode(type);
        try {
            const endpoint = type === 'insights' ? '/api/ai-enhance' : '/api/ai-reflect';
            const res = await fetch(endpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memory),
            });
            const data = await res.json();
            if (data.success) {
                const updates = type === 'insights' ? {
                    aiFunFacts: data.data.funFacts,
                    aiTravelTips: data.data.travelTips,
                    aiLocalCuisine: data.data.localCuisine,
                    aiEnhanced: data.data.enhancedDescription,
                    aiTravelQuote: data.data.travelQuote,
                    aiMoodColor: data.data.moodColor,
                    aiHiddenGem: data.data.hiddenGem,
                    aiSoundtrack: data.data.soundtrack,
                    aiLocalPhrase: typeof data.data.localPhrase === 'object'
                        ? `"${data.data.localPhrase.phrase}" (${data.data.localPhrase.language}) — ${data.data.localPhrase.romanized} — ${data.data.localPhrase.meaning}`
                        : data.data.localPhrase,
                } : {
                    aiReflection: data.data.reflection,
                    aiQuestion1: data.data.question1,
                    aiQuestion2: data.data.question2,
                };
                await updateDoc(doc(db, 'memories', memory.id), updates);
                onUpdate({ ...memory, ...updates });
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const box = (bg, border, content) => (
        <div style={{ padding: '12px 14px', borderRadius: '12px', background: bg, border: `1px solid ${border}` }}>
            {content}
        </div>
    );

    return (
        <div style={{ borderTop: '1px solid #1e1e2e', background: 'rgba(0,0,0,0.18)', padding: '14px 22px 18px 26px' }}>
            {/* Mode toggle buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => mode === 'insights' ? setMode(null) : fetchAI('insights')} style={{
                    padding: '6px 16px', borderRadius: '999px', cursor: 'pointer',
                    border: `2px solid ${mode === 'insights' ? '#d4a017' : '#2a2a38'}`,
                    background: mode === 'insights' ? 'rgba(212,160,23,0.15)' : '#111118',
                    color: mode === 'insights' ? '#f5d56e' : '#7a6f5a',
                    fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.92rem',
                    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .18s',
                }}>
                    {loading && mode === 'insights' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : '🧠'}
                    {loading && mode === 'insights' ? 'Thinking...' : 'AI Insights'}
                </button>
                <button type="button" onClick={() => mode === 'reflect' ? setMode(null) : fetchAI('reflect')} style={{
                    padding: '6px 16px', borderRadius: '999px', cursor: 'pointer',
                    border: `2px solid ${mode === 'reflect' ? '#b388ff' : '#2a2a38'}`,
                    background: mode === 'reflect' ? 'rgba(179,136,255,0.15)' : '#111118',
                    color: mode === 'reflect' ? '#ce93d8' : '#7a6f5a',
                    fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.92rem',
                    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .18s',
                }}>
                    {loading && mode === 'reflect' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : '💬'}
                    {loading && mode === 'reflect' ? 'Writing...' : 'AI Reflection'}
                </button>
            </div>

            {/* AI Insights content */}
            {mode === 'insights' && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn .3s ease-out' }}>
                    {memory.aiTravelQuote && box('rgba(212,160,23,0.07)', 'rgba(212,160,23,0.2)',
                        <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1rem', color: '#f5d56e', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.55 }}>&ldquo;{memory.aiTravelQuote}&rdquo;</p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '10px' }}>
                        {memory.aiFunFacts?.length > 0 && box('rgba(92,138,255,0.07)', 'rgba(92,138,255,0.18)', <>
                            <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem', color: '#5c8aff', marginBottom: '6px' }}>🎯 Fun Facts</p>
                            {memory.aiFunFacts.map((f, i) => <p key={i} style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#b8a88a', lineHeight: 1.5, marginBottom: '3px' }}>• {f}</p>)}
                        </>)}
                        {memory.aiTravelTips?.length > 0 && box('rgba(76,175,80,0.07)', 'rgba(76,175,80,0.18)', <>
                            <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem', color: '#4caf50', marginBottom: '6px' }}>💡 Insider Tips</p>
                            {memory.aiTravelTips.map((t, i) => <p key={i} style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#b8a88a', lineHeight: 1.5, marginBottom: '3px' }}>• {t}</p>)}
                        </>)}
                        {memory.aiLocalCuisine?.length > 0 && box('rgba(255,112,67,0.07)', 'rgba(255,112,67,0.18)', <>
                            <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem', color: '#ff7043', marginBottom: '6px' }}>🍽️ Must-Try Food</p>
                            {memory.aiLocalCuisine.map((c, i) => <p key={i} style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#b8a88a', lineHeight: 1.5, marginBottom: '3px' }}>• {c}</p>)}
                        </>)}
                        {memory.aiHiddenGem && box('rgba(179,136,255,0.07)', 'rgba(179,136,255,0.18)', <>
                            <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem', color: '#b388ff', marginBottom: '4px' }}>🗝️ Hidden Gem</p>
                            <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#b8a88a', lineHeight: 1.5 }}>{memory.aiHiddenGem}</p>
                        </>)}
                        {memory.aiSoundtrack && box('rgba(212,160,23,0.06)', 'rgba(212,160,23,0.15)', <>
                            <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem', color: '#d4a017', marginBottom: '4px' }}>🎵 Soundtrack</p>
                            <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#b8a88a', lineHeight: 1.5 }}>{memory.aiSoundtrack}</p>
                        </>)}
                        {memory.aiLocalPhrase && box('rgba(255,128,171,0.06)', 'rgba(255,128,171,0.15)', <>
                            <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem', color: '#ff80ab', marginBottom: '4px' }}>🗣️ Local Phrase</p>
                            <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#b8a88a', lineHeight: 1.5 }}>{memory.aiLocalPhrase}</p>
                        </>)}
                    </div>
                    {!memory.aiFunFacts && <p style={{ fontFamily: 'Caveat, cursive', color: '#7a6f5a', textAlign: 'center', fontSize: '0.95rem' }}>Click &ldquo;AI Insights&rdquo; above to generate facts about {memory.location}!</p>}
                </div>
            )}

            {/* AI Reflection content */}
            {mode === 'reflect' && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn .3s ease-out' }}>
                    {memory.aiReflection && box('rgba(179,136,255,0.07)', 'rgba(179,136,255,0.2)',
                        <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.05rem', color: '#ce93d8', lineHeight: 1.7, fontStyle: 'italic' }}>&ldquo;{memory.aiReflection}&rdquo;</p>
                    )}
                    {memory.aiQuestion1 && <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,213,110,0.06)', border: '1.5px dashed rgba(212,160,23,0.3)' }}>
                        <p style={{ fontFamily: 'Caveat, cursive', fontSize: '0.95rem', color: '#f5d56e', fontWeight: 700 }}>💭 {memory.aiQuestion1}</p>
                    </div>}
                    {memory.aiQuestion2 && <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,213,110,0.06)', border: '1.5px dashed rgba(212,160,23,0.3)' }}>
                        <p style={{ fontFamily: 'Caveat, cursive', fontSize: '0.95rem', color: '#f5d56e', fontWeight: 700 }}>💭 {memory.aiQuestion2}</p>
                    </div>}
                    {!memory.aiReflection && <p style={{ fontFamily: 'Caveat, cursive', color: '#7a6f5a', textAlign: 'center', fontSize: '0.95rem' }}>Click &ldquo;AI Reflection&rdquo; to generate a poetic diary entry!</p>}
                </div>
            )}
        </div>
    );
}

export function MemoryCard({ memory: initialMemory, hovered, onHover, onUnhover, onDelete, deletingId, index, expanded, onToggleExpand }) {
    const [memory, setMemory] = useState(initialMemory);
    const cat = memory.category || 'Sightseeing';
    const cfg = categoryConfig[cat] || categoryConfig['Sightseeing'];

    return (
        <div style={{ paddingLeft: '52px', position: 'relative', animationDelay: `${index * 0.07}s` }}
            className="anim-fade-up" onMouseEnter={onHover} onMouseLeave={onUnhover}>
            {/* Timeline node */}
            <div style={{
                position: 'absolute', left: '4px', top: '24px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', zIndex: 10,
                background: cfg.bg, border: `2px solid ${cfg.color}`, borderRadius: '50%',
                boxShadow: hovered ? `0 0 12px ${cfg.color}55` : `0 0 6px ${cfg.color}33`,
                transition: 'box-shadow 0.2s, transform 0.2s', transform: hovered ? 'scale(1.15)' : 'scale(1)',
            }}>{cfg.emoji}</div>

            <div style={{
                background: '#13131c', border: `2px solid ${hovered ? '#d4a017' : '#2a2a38'}`,
                borderRadius: '18px', overflow: 'hidden',
                transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
                boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4),0 0 20px rgba(212,160,23,0.15)' : '0 4px 16px rgba(0,0,0,0.3)',
                transform: hovered ? 'translate(-2px,-3px)' : 'translate(0,0)',
            }}>
                {/* Left accent */}
                <div style={{ height: '100%', width: '4px', position: 'absolute', left: 0, top: 0, bottom: 0, background: `linear-gradient(to bottom,${cfg.color},${cfg.color}88)`, borderRadius: '16px 0 0 16px' }} />

                <div style={{ padding: '18px 20px 18px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap', position: 'relative' }}>
                    {/* Photo */}
                    {memory.photoUrl && (
                        <div style={{ width: '90px', height: '90px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${cfg.color}44` }}>
                            <img src={memory.photoUrl} alt={memory.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    )}

                    {/* Content */}
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontFamily: 'Caveat, cursive', fontSize: '1.35rem', fontWeight: 700, color: '#f0e6d0', lineHeight: 1.2 }}>
                                {memory.mood && <span style={{ marginRight: '6px' }}>{moodEmoji[memory.mood] || ''}</span>}
                                {memory.title}
                            </h3>
                            <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.8rem', color: '#7a6f5a', flexShrink: 0 }}>
                                📅 {memory.date ? new Date(memory.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                            </span>
                        </div>

                        {/* Tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {memory.location && <span style={{ padding: '2px 10px', borderRadius: '999px', border: '1px solid #2a2a38', fontSize: '0.78rem', fontFamily: 'Patrick Hand, sans-serif', color: '#b8a88a', background: '#111118' }}>📍 {memory.location}{memory.country ? `, ${memory.country}` : ''}</span>}
                            {memory.category && <span style={{ padding: '2px 10px', borderRadius: '999px', border: `1px solid ${cfg.color}`, fontSize: '0.78rem', fontFamily: 'Patrick Hand, sans-serif', color: cfg.color, background: cfg.bg }}>{cfg.emoji} {memory.category}</span>}
                            {memory.rating && <span style={{ padding: '2px 10px', borderRadius: '999px', border: '1px solid #d4a017', fontSize: '0.78rem', color: '#d4a017', background: 'rgba(212,160,23,0.1)', fontFamily: 'Patrick Hand, sans-serif' }}>{'★'.repeat(memory.rating)}{'☆'.repeat(5 - memory.rating)}</span>}
                            {memory.companions && <span style={{ padding: '2px 10px', borderRadius: '999px', border: '1px solid #2a2a38', fontSize: '0.78rem', fontFamily: 'Patrick Hand, sans-serif', color: '#b8a88a', background: '#111118' }}>👥 {memory.companions}</span>}
                            {memory.weather && <span style={{ padding: '2px 10px', borderRadius: '999px', border: '1px solid #2a2a38', fontSize: '0.78rem', fontFamily: 'Patrick Hand, sans-serif', color: '#b8a88a', background: '#111118' }}>{memory.weather}</span>}
                        </div>

                        {memory.highlights && <p style={{ fontFamily: 'Patrick Hand, sans-serif', color: '#b8a88a', fontSize: '0.92rem', lineHeight: 1.65, marginBottom: '10px', borderLeft: `3px solid ${cfg.color}`, paddingLeft: '10px', borderRadius: '2px' }}>{memory.highlights}</p>}

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', paddingTop: '8px', borderTop: '1px solid #1e1e2e' }}>
                            <button type="button" onClick={e => { e.stopPropagation(); onDelete(memory.id); }} disabled={deletingId === memory.id} style={{
                                background: 'transparent', border: '1.5px solid transparent', borderRadius: '8px',
                                cursor: 'pointer', padding: '4px 8px', color: '#7a6f5a', transition: 'all .2s',
                                opacity: deletingId === memory.id ? 0.4 : 1,
                            }}
                                onMouseOver={e => { e.currentTarget.style.color = '#ff5252'; e.currentTarget.style.borderColor = '#ff5252'; e.currentTarget.style.background = 'rgba(255,82,82,0.08)'; }}
                                onMouseOut={e => { e.currentTarget.style.color = '#7a6f5a'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}>
                                🗑️
                            </button>
                            <button type="button" onClick={e => { e.stopPropagation(); onToggleExpand(); }} style={{
                                padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.84rem',
                                border: `1.5px solid ${expanded ? '#d4a017' : 'transparent'}`,
                                background: expanded ? 'rgba(212,160,23,0.12)' : 'transparent',
                                color: expanded ? '#d4a017' : '#7a6f5a',
                                fontFamily: 'Caveat, cursive', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: '4px', transition: 'all .2s',
                            }}>
                                {expanded ? <>Hide {<ChevronUp size={11} />}</> : <>Details {<ChevronDown size={11} />}</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Expanded AI panel */}
                {expanded && <AIPanel memory={memory} onUpdate={setMemory} />}
            </div>
        </div>
    );
}
