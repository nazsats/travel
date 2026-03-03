'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, MapPin, Calendar, Type, Loader2, Globe, BookOpen, Compass, DollarSign, Cloud, Sparkles, Users, Heart, Utensils, Lightbulb } from 'lucide-react';

const CATEGORIES = ['Sightseeing', 'Nature', 'Food & Drink', 'Culture', 'Adventure', 'Shopping', 'Nightlife', 'Transport'];
const MOODS = ['Amazing', 'Peaceful', 'Adventurous', 'Cultural', 'Foodie', 'Party', 'Chill'];
const TRANSPORT = ['Flight', 'Train', 'Bus', 'Car', 'Walk', 'Boat', 'Bike'];
const BUDGET = ['Free', 'Budget', 'Moderate', 'Luxury'];
const WEATHER = ['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Windy', 'Hot', 'Cold'];

const MOOD_EMOJI = { 'Amazing': '🤩', 'Peaceful': '😌', 'Adventurous': '🏔️', 'Cultural': '🏛️', 'Foodie': '🍜', 'Party': '🎉', 'Chill': '🌊' };
const TRANSPORT_EMOJI = { 'Flight': '✈️', 'Train': '🚂', 'Bus': '🚌', 'Car': '🚗', 'Walk': '🚶', 'Boat': '⛵', 'Bike': '🚲' };
const WEATHER_EMOJI = { 'Sunny': '☀️', 'Cloudy': '☁️', 'Rainy': '🌧️', 'Snowy': '❄️', 'Windy': '🌬️', 'Hot': '🔥', 'Cold': '🧣' };

export default function AddMemoryForm({ onClose, onMemoryAdded }) {
    const [form, setForm] = useState({
        title: '', location: '', country: '', date: '',
        description: '', notes: '', category: 'Sightseeing',
        mood: 'Amazing', rating: 5, transport: '', budget: 'Moderate', weather: 'Sunny',
        companions: '', highlights: '', foodTried: '', localTips: '', souvenirs: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1); // 1=basic, 2=details, 3=extras+AI
    const [aiLoading, setAiLoading] = useState(false);
    const [aiData, setAiData] = useState(null);
    const [aiError, setAiError] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleAiEnhance = async () => {
        setAiLoading(true);
        setAiError('');
        setAiData(null);
        try {
            const res = await fetch('/api/ai-enhance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    location: form.location,
                    country: form.country,
                    category: form.category,
                    mood: form.mood,
                    description: form.description,
                    companions: form.companions,
                    highlights: form.highlights,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setAiData(data.data);
            } else {
                setAiError(data.error || 'AI enhancement failed');
            }
        } catch (err) {
            setAiError('Failed to connect to AI. Please try again.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.location || !form.date) {
            setError('Please fill in Title, Location, and Date. ✍️'); return;
        }
        setError(''); setIsSubmitting(true);
        try {
            const saveData = {
                ...form,
                createdAt: serverTimestamp(),
            };
            if (aiData?.enhancedDescription) {
                saveData.aiEnhanced = aiData.enhancedDescription;
            }
            if (aiData?.funFacts) {
                saveData.aiFunFacts = aiData.funFacts;
            }
            if (aiData?.travelTips) {
                saveData.aiTravelTips = aiData.travelTips;
            }
            const docRef = await addDoc(collection(db, 'memories'), saveData);
            onMemoryAdded({ id: docRef.id, ...saveData });
        } catch (err) {
            console.error(err);
            setError('Failed to save. Please check your connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyle = {
        background: '#111118',
        border: '2px solid #2a2a38',
        borderRadius: '14px',
        color: '#f0e6d0',
        fontSize: '1rem',
        fontFamily: 'Patrick Hand, sans-serif',
        padding: '12px 14px',
        width: '100%',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
    };

    const labelStyle = {
        display: 'block', fontSize: '0.88rem', fontWeight: 700,
        color: '#d4a017', marginBottom: '7px',
        fontFamily: 'Caveat, cursive', letterSpacing: '0.02em',
    };

    const iconSlot = () => ({
        position: 'absolute', left: '13px', top: '50%',
        transform: 'translateY(-50%)', color: '#7a6f5a', pointerEvents: 'none',
    });

    const totalSteps = 3;

    return (
        <>
            <style>{`
        @keyframes overlay-in { from{opacity:0;}to{opacity:1;} }
        @keyframes modal-in   { from{opacity:0;transform:translateY(28px) scale(0.96);}to{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes ai-pulse { 0%,100%{box-shadow:0 0 8px rgba(212,160,23,0.3);} 50%{box-shadow:0 0 20px rgba(212,160,23,0.6);} }
        .mf-input { transition: border-color .18s, box-shadow .18s !important; }
        .mf-input:focus {
          border-color: #d4a017 !important;
          box-shadow: 0 0 0 3px rgba(212,160,23,0.25), inset 0 2px 6px rgba(0,0,0,0.3) !important;
          outline: none !important;
          background: #1a1a24 !important;
        }
        .mf-close:hover { background:rgba(255,82,82,0.15) !important; color:#ff5252 !important; border-color:#ff5252 !important; }
        .pill-opt {
          cursor:pointer; padding:6px 14px; border-radius:999px;
          font-size:0.95rem; font-weight:700;
          border:2px solid #2a2a38;
          background:#13131c; color:#b8a88a;
          font-family:'Caveat',cursive;
          transition:all .18s;
          box-shadow: none;
        }
        .pill-opt:hover {
          border-color:#d4a017; color:#f0e6d0;
          box-shadow: 0 0 8px rgba(212,160,23,0.15);
          transform: translate(-1px,-1px);
        }
        .pill-opt.active {
          background:rgba(212,160,23,0.15); border-color:#d4a017; color:#f5d56e;
          box-shadow: 0 0 12px rgba(212,160,23,0.2);
          transform: translate(-1px,-1px);
        }
        input[type=date] { color-scheme: dark; }
        .mf-star { cursor:pointer; font-size:1.8rem; transition:transform .15s; }
        .mf-star:hover { transform: scale(1.25); }
        .step-pill {
          display:inline-flex; align-items:center; justify-content:center;
          width:28px; height:28px; border-radius:50%;
          border:2px solid #2a2a38;
          font-family:'Caveat',cursive; font-weight:700; font-size:0.9rem;
          transition:all .25s;
          color: #7a6f5a;
        }
      `}</style>

            {/* Overlay */}
            <div
                onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}
                style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '16px', animation: 'overlay-in 0.25s ease-out',
                }}
            >
                {/* Modal */}
                <div style={{
                    width: '100%', maxWidth: '620px',
                    background: '#13131c',
                    border: '2px solid rgba(212,160,23,0.3)',
                    borderRadius: '24px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(212,160,23,0.1)',
                    maxHeight: '92vh', overflowY: 'auto',
                    animation: 'modal-in 0.4s cubic-bezier(0.16,1,0.3,1)',
                }}>
                    {/* Gold top accent */}
                    <div style={{
                        height: '4px', borderRadius: '22px 22px 0 0',
                        background: 'linear-gradient(90deg, #d4a017, #b8860b, #d4a017, #f5d56e, #d4a017)',
                    }} />

                    {/* Header */}
                    <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid #2a2a38' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, rgba(212,160,23,0.2), rgba(212,160,23,0.05))',
                                    border: '2px solid #d4a017',
                                    boxShadow: '0 0 15px rgba(212,160,23,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.5rem',
                                }}>
                                    ✈️
                                </div>
                                <div>
                                    <h2 style={{ fontFamily: 'Caveat, cursive', fontSize: '1.6rem', fontWeight: 700, color: '#f0e6d0', letterSpacing: '0.01em', lineHeight: 1.1 }}>
                                        New Memory ✏️
                                    </h2>
                                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#7a6f5a', marginTop: '1px' }}>
                                        Capture this moment forever
                                    </p>
                                </div>
                            </div>
                            <button
                                className="mf-close"
                                onClick={onClose}
                                disabled={isSubmitting}
                                style={{
                                    width: '34px', height: '34px', borderRadius: '50%',
                                    border: '2px solid #2a2a38',
                                    background: '#1a1a24', color: '#7a6f5a', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all .2s', flexShrink: 0,
                                }}
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Step indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                            {[1, 2, 3].map(s => (
                                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="step-pill" style={{
                                        background: step >= s ? 'rgba(212,160,23,0.15)' : '#1a1a24',
                                        color: step >= s ? '#d4a017' : '#7a6f5a',
                                        borderColor: step >= s ? '#d4a017' : '#2a2a38',
                                    }}>{s}</div>
                                    {s < 3 && <div style={{
                                        width: '40px', height: '2px',
                                        background: step > s
                                            ? 'repeating-linear-gradient(90deg,#d4a017 0,#d4a017 6px,transparent 6px,transparent 10px)'
                                            : 'repeating-linear-gradient(90deg,#2a2a38 0,#2a2a38 6px,transparent 6px,transparent 10px)',
                                    }} />}
                                </div>
                            ))}
                            <span style={{ fontFamily: 'Caveat, cursive', fontSize: '0.95rem', color: '#7a6f5a', marginLeft: '6px' }}>
                                Step {step} of {totalSteps}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                            {/* ── STEP 1: Basic ─────────────────── */}
                            {step === 1 && <>
                                <div>
                                    <label style={labelStyle}>📌 Memory Title <span style={{ color: '#ff5252' }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <Type size={14} style={iconSlot()} />
                                        <input
                                            className="mf-input" type="text"
                                            placeholder="e.g. Sunrise over Machu Picchu"
                                            value={form.title} onChange={e => set('title', e.target.value)}
                                            required disabled={isSubmitting}
                                            style={{ ...inputStyle, paddingLeft: '38px' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1 1 130px' }}>
                                        <label style={labelStyle}>📍 Place / City <span style={{ color: '#ff5252' }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <MapPin size={14} style={iconSlot()} />
                                            <input
                                                className="mf-input" type="text" placeholder="Machu Picchu"
                                                value={form.location} onChange={e => set('location', e.target.value)}
                                                required disabled={isSubmitting}
                                                style={{ ...inputStyle, paddingLeft: '38px' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ flex: '1 1 130px' }}>
                                        <label style={labelStyle}>🌍 Country</label>
                                        <div style={{ position: 'relative' }}>
                                            <Globe size={14} style={iconSlot()} />
                                            <input
                                                className="mf-input" type="text" placeholder="Peru"
                                                value={form.country} onChange={e => set('country', e.target.value)}
                                                disabled={isSubmitting}
                                                style={{ ...inputStyle, paddingLeft: '38px' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>📅 Date <span style={{ color: '#ff5252' }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar size={14} style={iconSlot()} />
                                        <input
                                            className="mf-input" type="date"
                                            value={form.date} onChange={e => set('date', e.target.value)}
                                            required disabled={isSubmitting}
                                            style={{ ...inputStyle, paddingLeft: '38px', colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>🏷️ Category</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {CATEGORIES.map(c => (
                                            <button key={c} type="button" onClick={() => set('category', c)}
                                                className={`pill-opt ${form.category === c ? 'active' : ''}`}>
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>📖 Description</label>
                                    <textarea
                                        className="mf-input"
                                        placeholder="What made this place special? ✨"
                                        value={form.description} onChange={e => set('description', e.target.value)}
                                        rows={3} disabled={isSubmitting}
                                        style={{ ...inputStyle, resize: 'vertical', minHeight: '88px' }}
                                    />
                                </div>
                            </>}

                            {/* ── STEP 2: Details ────────────────── */}
                            {step === 2 && <>
                                <div>
                                    <label style={labelStyle}>⭐ Rating</label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button key={n} type="button" onClick={() => set('rating', n)}
                                                className="mf-star"
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    opacity: form.rating >= n ? 1 : 0.25,
                                                    filter: form.rating >= n ? 'none' : 'grayscale(1)',
                                                }}>
                                                ⭐
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>😊 Mood</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {MOODS.map(m => (
                                            <button key={m} type="button" onClick={() => set('mood', m)}
                                                className={`pill-opt ${form.mood === m ? 'active' : ''}`}>
                                                {MOOD_EMOJI[m]} {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>🧭 How did you get there?</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {TRANSPORT.map(t => (
                                            <button key={t} type="button" onClick={() => set('transport', t)}
                                                className={`pill-opt ${form.transport === t ? 'active' : ''}`}>
                                                {TRANSPORT_EMOJI[t]} {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1 1 120px' }}>
                                        <label style={labelStyle}>💰 Budget Range</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {BUDGET.map(b => (
                                                <button key={b} type="button" onClick={() => set('budget', b)}
                                                    className={`pill-opt ${form.budget === b ? 'active' : ''}`}>
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ flex: '1 1 120px' }}>
                                        <label style={labelStyle}>🌤️ Weather</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {WEATHER.map(w => (
                                                <button key={w} type="button" onClick={() => set('weather', w)}
                                                    className={`pill-opt ${form.weather === w ? 'active' : ''}`}>
                                                    {WEATHER_EMOJI[w]} {w}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>📝 Private Notes</label>
                                    <textarea
                                        className="mf-input"
                                        placeholder="Anything else you want to remember... 🤫"
                                        value={form.notes} onChange={e => set('notes', e.target.value)}
                                        rows={3} disabled={isSubmitting}
                                        style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                                    />
                                </div>
                            </>}

                            {/* ── STEP 3: Extras & AI ──────────────── */}
                            {step === 3 && <>
                                <div>
                                    <label style={labelStyle}>👥 Travel Companions</label>
                                    <input
                                        className="mf-input" type="text"
                                        placeholder="Who were you with? Solo, family, friends..."
                                        value={form.companions} onChange={e => set('companions', e.target.value)}
                                        disabled={isSubmitting}
                                        style={inputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={labelStyle}>✨ Trip Highlights</label>
                                    <textarea
                                        className="mf-input"
                                        placeholder="Best moments, unforgettable experiences..."
                                        value={form.highlights} onChange={e => set('highlights', e.target.value)}
                                        rows={2} disabled={isSubmitting}
                                        style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1 1 130px' }}>
                                        <label style={labelStyle}>🍜 Food You Tried</label>
                                        <input
                                            className="mf-input" type="text"
                                            placeholder="Local dishes, restaurants..."
                                            value={form.foodTried} onChange={e => set('foodTried', e.target.value)}
                                            disabled={isSubmitting}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ flex: '1 1 130px' }}>
                                        <label style={labelStyle}>🛍️ Souvenirs</label>
                                        <input
                                            className="mf-input" type="text"
                                            placeholder="What did you bring back?"
                                            value={form.souvenirs} onChange={e => set('souvenirs', e.target.value)}
                                            disabled={isSubmitting}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>💡 Local Tips</label>
                                    <textarea
                                        className="mf-input"
                                        placeholder="Tips for future travelers..."
                                        value={form.localTips} onChange={e => set('localTips', e.target.value)}
                                        rows={2} disabled={isSubmitting}
                                        style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
                                    />
                                </div>

                                {/* AI Enhance Button */}
                                <div style={{
                                    padding: '16px', borderRadius: '16px',
                                    background: 'linear-gradient(135deg, rgba(212,160,23,0.08), rgba(179,136,255,0.06))',
                                    border: '1.5px solid rgba(212,160,23,0.25)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <div>
                                            <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.15rem', color: '#f5d56e' }}>
                                                ✨ AI Travel Assistant
                                            </p>
                                            <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#7a6f5a', marginTop: '2px' }}>
                                                Get fun facts, travel tips, and a vivid description powered by AI
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAiEnhance}
                                        disabled={aiLoading || !form.title || !form.location}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            width: '100%', padding: '12px', borderRadius: '12px',
                                            border: '2px solid #d4a017',
                                            background: aiLoading ? '#1a1a24' : 'linear-gradient(135deg, rgba(212,160,23,0.2), rgba(184,134,11,0.15))',
                                            color: '#f5d56e',
                                            fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.05rem',
                                            cursor: (aiLoading || !form.title || !form.location) ? 'not-allowed' : 'pointer',
                                            animation: aiLoading ? 'ai-pulse 2s ease-in-out infinite' : 'none',
                                            transition: 'all 0.2s',
                                            opacity: (!form.title || !form.location) ? 0.5 : 1,
                                        }}
                                    >
                                        {aiLoading ? (
                                            <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> AI is thinking...</>
                                        ) : (
                                            <><Sparkles size={16} /> Enhance with AI ✨</>
                                        )}
                                    </button>

                                    {aiError && (
                                        <p style={{ color: '#ff5252', fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.88rem', marginTop: '8px' }}>
                                            ⚠️ {aiError}
                                        </p>
                                    )}
                                </div>

                                {/* AI Results */}
                                {aiData && (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', gap: '12px',
                                        animation: 'fade-up 0.4s ease-out',
                                    }}>
                                        {/* Enhanced Description */}
                                        {aiData.enhancedDescription && (
                                            <div style={{
                                                padding: '14px 16px', borderRadius: '14px',
                                                background: 'rgba(212,160,23,0.08)', border: '1.5px solid rgba(212,160,23,0.2)',
                                            }}>
                                                <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.9rem', color: '#d4a017', marginBottom: '6px' }}>
                                                    ✨ Enhanced Description
                                                </p>
                                                <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.92rem', color: '#b8a88a', lineHeight: 1.65 }}>
                                                    {aiData.enhancedDescription}
                                                </p>
                                            </div>
                                        )}

                                        {/* Fun Facts */}
                                        {aiData.funFacts?.length > 0 && (
                                            <div style={{
                                                padding: '14px 16px', borderRadius: '14px',
                                                background: 'rgba(92,138,255,0.06)', border: '1.5px solid rgba(92,138,255,0.15)',
                                            }}>
                                                <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.9rem', color: '#5c8aff', marginBottom: '6px' }}>
                                                    🎯 Fun Facts
                                                </p>
                                                {aiData.funFacts.map((f, i) => (
                                                    <p key={i} style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.88rem', color: '#b8a88a', lineHeight: 1.65, marginBottom: '4px' }}>
                                                        • {f}
                                                    </p>
                                                ))}
                                            </div>
                                        )}

                                        {/* Travel Tips */}
                                        {aiData.travelTips?.length > 0 && (
                                            <div style={{
                                                padding: '14px 16px', borderRadius: '14px',
                                                background: 'rgba(76,175,80,0.06)', border: '1.5px solid rgba(76,175,80,0.15)',
                                            }}>
                                                <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.9rem', color: '#4caf50', marginBottom: '6px' }}>
                                                    💡 Travel Tips
                                                </p>
                                                {aiData.travelTips.map((t, i) => (
                                                    <p key={i} style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.88rem', color: '#b8a88a', lineHeight: 1.65, marginBottom: '4px' }}>
                                                        • {t}
                                                    </p>
                                                ))}
                                            </div>
                                        )}

                                        {/* Local Cuisine */}
                                        {aiData.localCuisine?.length > 0 && (
                                            <div style={{
                                                padding: '14px 16px', borderRadius: '14px',
                                                background: 'rgba(255,112,67,0.06)', border: '1.5px solid rgba(255,112,67,0.15)',
                                            }}>
                                                <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.9rem', color: '#ff7043', marginBottom: '6px' }}>
                                                    🍽️ Must-Try Local Cuisine
                                                </p>
                                                {aiData.localCuisine.map((c, i) => (
                                                    <p key={i} style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.88rem', color: '#b8a88a', lineHeight: 1.65, marginBottom: '4px' }}>
                                                        • {c}
                                                    </p>
                                                ))}
                                            </div>
                                        )}

                                        {/* Extra tidbits */}
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                                        }}>
                                            {aiData.hiddenGem && (
                                                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(179,136,255,0.06)', border: '1px solid rgba(179,136,255,0.15)' }}>
                                                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.82rem', color: '#b388ff', marginBottom: '4px' }}>🗝️ Hidden Gem</p>
                                                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.8rem', color: '#b8a88a', lineHeight: 1.5 }}>{aiData.hiddenGem}</p>
                                                </div>
                                            )}
                                            {aiData.localPhrase && (
                                                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,128,171,0.06)', border: '1px solid rgba(255,128,171,0.15)' }}>
                                                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.82rem', color: '#ff80ab', marginBottom: '4px' }}>🗣️ Local Phrase</p>
                                                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.8rem', color: '#b8a88a', lineHeight: 1.5 }}>{aiData.localPhrase}</p>
                                                </div>
                                            )}
                                            {aiData.soundtrack && (
                                                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.15)' }}>
                                                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.82rem', color: '#d4a017', marginBottom: '4px' }}>🎵 Soundtrack</p>
                                                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.8rem', color: '#b8a88a', lineHeight: 1.5 }}>{aiData.soundtrack}</p>
                                                </div>
                                            )}
                                            {aiData.bestTimeToVisit && (
                                                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(76,175,80,0.06)', border: '1px solid rgba(76,175,80,0.15)' }}>
                                                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.82rem', color: '#4caf50', marginBottom: '4px' }}>📅 Best Time</p>
                                                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.8rem', color: '#b8a88a', lineHeight: 1.5 }}>{aiData.bestTimeToVisit}</p>
                                                </div>
                                            )}
                                        </div>

                                        {aiData.memoryPrompt && (
                                            <div style={{
                                                padding: '12px 16px', borderRadius: '12px',
                                                background: 'rgba(245,213,110,0.06)', border: '1.5px dashed rgba(212,160,23,0.3)',
                                                textAlign: 'center',
                                            }}>
                                                <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1rem', color: '#f5d56e', fontWeight: 700 }}>
                                                    💭 {aiData.memoryPrompt}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>}

                            {/* Error */}
                            {error && (
                                <div style={{
                                    padding: '12px 16px', borderRadius: '14px',
                                    background: 'rgba(255,82,82,0.1)', border: '2px solid #ff5252',
                                    color: '#ff5252', fontSize: '0.95rem',
                                    fontFamily: 'Caveat, cursive', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            {/* Navigation */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', gap: '12px',
                                paddingTop: '16px', borderTop: '1px solid #2a2a38',
                            }}>
                                {step === 1 ? (
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={isSubmitting}>
                                        Cancel
                                    </button>
                                ) : (
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(s => s - 1)}>
                                        ← Back
                                    </button>
                                )}

                                {step < totalSteps ? (
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            if (step === 1 && (!form.title || !form.location || !form.date)) {
                                                setError('Please fill in Title, Location, and Date. ✍️');
                                            } else { setError(''); setStep(s => s + 1); }
                                        }}
                                        style={{ minWidth: '130px' }}
                                    >
                                        Next Step →
                                    </button>
                                ) : (
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting} style={{ minWidth: '150px' }}>
                                        {isSubmitting
                                            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                                            : <>✈️ Save Memory!</>
                                        }
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
