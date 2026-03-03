'use client';

import { useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, MapPin, Calendar, Type, Loader2, Globe, Camera, Upload, Sparkles } from 'lucide-react';

// ── Option sets ──────────────────────────────────────────────
const CATEGORIES = [
    { label: 'Sightseeing', emoji: '🗺️' }, { label: 'Nature', emoji: '🌿' },
    { label: 'Food & Drink', emoji: '🍜' }, { label: 'Culture', emoji: '🎭' },
    { label: 'Adventure', emoji: '⛰️' }, { label: 'Shopping', emoji: '🛍️' },
    { label: 'Nightlife', emoji: '🌙' }, { label: 'Transport', emoji: '✈️' },
];
const MOODS = [
    { label: 'Amazing', emoji: '🤩' }, { label: 'Peaceful', emoji: '😌' },
    { label: 'Adventurous', emoji: '🏔️' }, { label: 'Cultural', emoji: '🏛️' },
    { label: 'Foodie', emoji: '🍜' }, { label: 'Party', emoji: '🎉' },
    { label: 'Chill', emoji: '🌊' }, { label: 'Romantic', emoji: '💕' },
];
const WEATHER = [
    { label: 'Sunny', emoji: '☀️' }, { label: 'Cloudy', emoji: '☁️' },
    { label: 'Rainy', emoji: '🌧️' }, { label: 'Snowy', emoji: '❄️' },
    { label: 'Hot', emoji: '🔥' }, { label: 'Cold', emoji: '🧣' },
];
const TRANSPORT = [
    { label: 'Flight', emoji: '✈️' }, { label: 'Train', emoji: '🚂' },
    { label: 'Car', emoji: '🚗' }, { label: 'Bus', emoji: '🚌' },
    { label: 'Boat', emoji: '⛵' }, { label: 'Walk', emoji: '🚶' },
];
const COMPANIONS = [
    { label: 'Solo', emoji: '🧍' }, { label: 'Couple', emoji: '👫' },
    { label: 'Friends', emoji: '👯' }, { label: 'Family', emoji: '👨‍👩‍👧' },
    { label: 'Group', emoji: '👥' },
];
const BUDGET = [
    { label: 'Free', emoji: '🎁' }, { label: 'Budget', emoji: '💸' },
    { label: 'Moderate', emoji: '💳' }, { label: 'Luxury', emoji: '💎' },
];

function PillGroup({ options, value, onSelect, color = '#d4a017' }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {options.map(opt => {
                const active = value === opt.label;
                return (
                    <button
                        key={opt.label}
                        type="button"
                        onClick={() => onSelect(active ? '' : opt.label)}
                        style={{
                            padding: '7px 14px', borderRadius: '999px',
                            border: `2px solid ${active ? color : '#2a2a38'}`,
                            background: active ? `${color}22` : '#13131c',
                            color: active ? color : '#b8a88a',
                            fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.95rem',
                            cursor: 'pointer', transition: 'all .18s',
                            transform: active ? 'translate(-1px,-1px)' : 'none',
                            boxShadow: active ? `0 0 12px ${color}33` : 'none',
                        }}
                    >
                        {opt.emoji} {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function StarRating({ value, onChange }) {
    const [hov, setHov] = useState(0);
    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n} type="button"
                    onClick={() => onChange(n)}
                    onMouseEnter={() => setHov(n)}
                    onMouseLeave={() => setHov(0)}
                    style={{
                        fontSize: '2rem', background: 'none', border: 'none', cursor: 'pointer',
                        opacity: (hov || value) >= n ? 1 : 0.25,
                        filter: (hov || value) >= n ? 'none' : 'grayscale(1)',
                        transform: hov === n ? 'scale(1.3)' : 'scale(1)',
                        transition: 'transform .15s, opacity .15s',
                    }}
                >⭐</button>
            ))}
        </div>
    );
}

export default function AddMemoryForm({ onClose, onMemoryAdded }) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        title: '', location: '', country: '', date: '',
        category: '', rating: 5, mood: '', weather: '',
        transport: '', companions: '', budget: '', highlights: '',
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const photoRef = useRef(null);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handlePhotoChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setPhotoFile(f);
        setPhotoPreview(URL.createObjectURL(f));
    };

    const handleSubmit = async () => {
        if (!form.title || !form.location || !form.date) {
            setError('Please fill in Title, Location, and Date. ✍️'); return;
        }
        setError(''); setIsSubmitting(true);
        try {
            let photoUrl = null;
            // Upload photo if one was selected
            if (photoFile) {
                setUploading(true);
                const fd = new FormData();
                fd.append('file', photoFile);
                fd.append('albumMode', 'none');
                const res = await fetch('/api/upload-google-photo', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.firebaseUrl) photoUrl = data.firebaseUrl;
                setUploading(false);
            }
            const saveData = {
                ...form,
                photoUrl,
                createdAt: serverTimestamp(),
            };
            const docRef = await addDoc(collection(db, 'memories'), saveData);
            onMemoryAdded({ id: docRef.id, ...saveData });
        } catch (err) {
            console.error(err);
            setError('Failed to save. Please check your connection.');
        } finally {
            setIsSubmitting(false); setUploading(false);
        }
    };

    const inputStyle = {
        background: '#111118', border: '2px solid #2a2a38', borderRadius: '14px',
        color: '#f0e6d0', fontSize: '1rem', fontFamily: 'Patrick Hand, sans-serif',
        padding: '12px 14px', width: '100%',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)', transition: 'all .2s',
    };
    const label = (text) => (
        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.92rem', color: '#d4a017', marginBottom: '8px' }}>{text}</p>
    );
    const canNext = form.title && form.location && form.date;

    return (
        <>
            <style>{`
        @keyframes overlay-in{from{opacity:0}to{opacity:1}}
        @keyframes modal-in{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        .mf-input:focus{border-color:#d4a017!important;box-shadow:0 0 0 3px rgba(212,160,23,.22),inset 0 2px 6px rgba(0,0,0,.3)!important;outline:none!important;background:#1a1a24!important}
        .pill-btn{cursor:pointer;padding:7px 14px;border-radius:999px;border:2px solid #2a2a38;background:#13131c;color:#b8a88a;font-family:'Caveat',cursive;font-weight:700;font-size:.95rem;transition:all .18s}
        .pill-btn:hover{border-color:#d4a017;color:#f0e6d0}
        input[type=date]{color-scheme:dark}
      `}</style>

            {/* Overlay */}
            <div onClick={e => e.target === e.currentTarget && !isSubmitting && onClose()} style={{
                position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.78)',
                backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: '16px', animation: 'overlay-in .25s',
            }}>
                <div style={{
                    width: '100%', maxWidth: '560px', background: '#13131c',
                    border: '2px solid rgba(212,160,23,0.3)', borderRadius: '24px',
                    boxShadow: '0 24px 64px rgba(0,0,0,.6),0 0 40px rgba(212,160,23,.08)',
                    maxHeight: '90vh', overflowY: 'auto',
                    animation: 'modal-in .4s cubic-bezier(.16,1,.3,1)',
                }}>
                    {/* Gold accent */}
                    <div style={{ height: '4px', borderRadius: '22px 22px 0 0', background: 'linear-gradient(90deg,#d4a017,#f5d56e,#d4a017)' }} />

                    {/* Header */}
                    <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid #2a2a38', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.5rem', color: '#f0e6d0' }}>
                                {step === 1 ? '📌 New Memory' : '✨ Vibe & Details'}
                            </p>
                            {/* Step dots */}
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                {[1, 2].map(s => (
                                    <div key={s} style={{
                                        width: s <= step ? '24px' : '8px', height: '8px', borderRadius: '4px',
                                        background: s <= step ? '#d4a017' : '#2a2a38',
                                        transition: 'all .3s',
                                    }} />
                                ))}
                            </div>
                        </div>
                        <button type="button" onClick={onClose} style={{
                            width: '34px', height: '34px', borderRadius: '50%', border: '2px solid #2a2a38',
                            background: '#1a1a24', color: '#7a6f5a', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><X size={15} /></button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* ─── STEP 1 ─────────────── */}
                        {step === 1 && <>
                            {/* Title */}
                            <div>
                                {label('📌 Memory Title *')}
                                <input className="mf-input" type="text" placeholder="e.g. Sunrise over Machu Picchu"
                                    value={form.title} onChange={e => set('title', e.target.value)}
                                    style={inputStyle} />
                            </div>

                            {/* Location + Country */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    {label('📍 Place *')}
                                    <input className="mf-input" type="text" placeholder="Machu Picchu"
                                        value={form.location} onChange={e => set('location', e.target.value)}
                                        style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    {label('🌍 Country')}
                                    <input className="mf-input" type="text" placeholder="Peru"
                                        value={form.country} onChange={e => set('country', e.target.value)}
                                        style={inputStyle} />
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                {label('📅 Date *')}
                                <input className="mf-input" type="date"
                                    value={form.date} onChange={e => set('date', e.target.value)}
                                    style={inputStyle} />
                            </div>

                            {/* Rating */}
                            <div>
                                {label('⭐ Your Rating')}
                                <StarRating value={form.rating} onChange={v => set('rating', v)} />
                            </div>

                            {/* Category */}
                            <div>
                                {label('🗂️ Category')}
                                <PillGroup options={CATEGORIES} value={form.category} onSelect={v => set('category', v)} />
                            </div>

                            {/* Photo */}
                            <div>
                                {label('📷 Add a Photo (optional)')}
                                <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                                {photoPreview ? (
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <img src={photoPreview} alt="preview" style={{
                                            width: '100%', maxHeight: '180px', objectFit: 'cover',
                                            borderRadius: '14px', border: '2px solid #d4a017',
                                        }} />
                                        <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} style={{
                                            position: 'absolute', top: '8px', right: '8px',
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            background: 'rgba(0,0,0,0.8)', border: 'none', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}><X size={12} color="#fff" /></button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => photoRef.current?.click()} style={{
                                        width: '100%', padding: '18px', borderRadius: '14px',
                                        border: '2px dashed #2a2a38', background: '#0d0d14',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '10px', color: '#7a6f5a',
                                        fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1rem',
                                        transition: 'all .2s',
                                    }}
                                        onMouseOver={e => { e.currentTarget.style.borderColor = '#d4a017'; e.currentTarget.style.color = '#d4a017'; }}
                                        onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.color = '#7a6f5a'; }}>
                                        <Upload size={16} /> Click to upload a photo
                                    </button>
                                )}
                            </div>
                        </>}

                        {/* ─── STEP 2 ─────────────── */}
                        {step === 2 && <>
                            {/* Mood */}
                            <div>
                                {label('😊 Mood')}
                                <PillGroup options={MOODS} value={form.mood} onSelect={v => set('mood', v)} color="#b388ff" />
                            </div>

                            {/* Companions */}
                            <div>
                                {label('👥 Who were you with?')}
                                <PillGroup options={COMPANIONS} value={form.companions} onSelect={v => set('companions', v)} color="#5c8aff" />
                            </div>

                            {/* Transport */}
                            <div>
                                {label('🚀 How did you get there?')}
                                <PillGroup options={TRANSPORT} value={form.transport} onSelect={v => set('transport', v)} color="#4caf50" />
                            </div>

                            {/* Weather */}
                            <div>
                                {label('🌤 Weather')}
                                <PillGroup options={WEATHER} value={form.weather} onSelect={v => set('weather', v)} color="#80deea" />
                            </div>

                            {/* Budget */}
                            <div>
                                {label('💰 Budget')}
                                <PillGroup options={BUDGET} value={form.budget} onSelect={v => set('budget', v)} color="#ffa726" />
                            </div>

                            {/* Highlights — only free text field */}
                            <div>
                                {label('✨ Best moment (optional)')}
                                <textarea className="mf-input" rows={2}
                                    placeholder="What was the most memorable moment?"
                                    value={form.highlights} onChange={e => set('highlights', e.target.value)}
                                    style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} />
                            </div>
                        </>}

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '12px 16px', borderRadius: '12px',
                                background: 'rgba(255,82,82,0.1)', border: '2px solid #ff5252',
                                color: '#ff5252', fontFamily: 'Caveat, cursive', fontWeight: 700,
                            }}>⚠️ {error}</div>
                        )}

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingTop: '8px', borderTop: '1px solid #2a2a38' }}>
                            {step === 1 ? (
                                <button type="button" onClick={onClose} style={{
                                    padding: '10px 20px', borderRadius: '999px', border: '2px solid #2a2a38',
                                    background: 'transparent', color: '#7a6f5a', cursor: 'pointer',
                                    fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1rem',
                                }}>Cancel</button>
                            ) : (
                                <button type="button" onClick={() => setStep(1)} style={{
                                    padding: '10px 20px', borderRadius: '999px', border: '2px solid #2a2a38',
                                    background: 'transparent', color: '#7a6f5a', cursor: 'pointer',
                                    fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1rem',
                                }}>← Back</button>
                            )}

                            {step === 1 ? (
                                <button type="button" onClick={() => {
                                    if (!canNext) { setError('Please fill Title, Location and Date.'); return; }
                                    setError(''); setStep(2);
                                }} style={{
                                    padding: '10px 28px', borderRadius: '999px',
                                    border: '2px solid #d4a017',
                                    background: canNext ? 'linear-gradient(135deg,rgba(212,160,23,.2),rgba(184,134,11,.1))' : '#1a1a24',
                                    color: canNext ? '#f5d56e' : '#7a6f5a',
                                    cursor: canNext ? 'pointer' : 'not-allowed',
                                    fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1rem',
                                    boxShadow: canNext ? '0 0 18px rgba(212,160,23,.25)' : 'none',
                                    transition: 'all .2s',
                                }}>Next Step →</button>
                            ) : (
                                <button type="button" onClick={handleSubmit} disabled={isSubmitting} style={{
                                    padding: '10px 28px', borderRadius: '999px',
                                    border: '2px solid #4caf50',
                                    background: isSubmitting ? '#1a1a24' : 'linear-gradient(135deg,rgba(76,175,80,.2),rgba(56,142,60,.1))',
                                    color: isSubmitting ? '#7a6f5a' : '#81c784',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1rem',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    transition: 'all .2s',
                                }}>
                                    {isSubmitting
                                        ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {uploading ? 'Uploading...' : 'Saving...'}</>
                                        : <>✈️ Save Memory!</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
