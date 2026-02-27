'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, MapPin, Calendar, Type, Loader2, Sparkles, Globe, Tag, Star, BookOpen, Compass, DollarSign, Cloud } from 'lucide-react';

const CATEGORIES = ['Sightseeing', 'Nature', 'Food & Drink', 'Culture', 'Adventure', 'Shopping', 'Nightlife', 'Transport'];
const MOODS = ['Amazing', 'Peaceful', 'Adventurous', 'Cultural', 'Foodie', 'Party', 'Chill'];
const TRANSPORT = ['Flight', 'Train', 'Bus', 'Car', 'Walk', 'Boat', 'Bike'];
const BUDGET = ['Free', 'Budget', 'Moderate', 'Luxury'];
const WEATHER = ['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Windy', 'Hot', 'Cold'];

export default function AddMemoryForm({ onClose, onMemoryAdded }) {
    const [form, setForm] = useState({
        title: '', location: '', country: '', date: '',
        description: '', notes: '', category: 'Sightseeing',
        mood: 'Amazing', rating: 5, transport: '', budget: 'Moderate', weather: 'Sunny',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1); // 1=basic, 2=details

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.location || !form.date) {
            setError('Please fill in Title, Location, and Date.'); return;
        }
        setError(''); setIsSubmitting(true);
        try {
            const docRef = await addDoc(collection(db, 'memories'), {
                ...form, createdAt: serverTimestamp(),
            });
            onMemoryAdded({ id: docRef.id, ...form });
        } catch (err) {
            console.error(err);
            setError('Failed to save. Please check your connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyle = {
        background: 'rgba(10,10,22,0.7)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '13px', color: '#eeeeff', fontSize: '0.88rem',
        padding: '11px 14px', width: '100%',
        fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s, box-shadow 0.2s',
    };

    const labelStyle = {
        display: 'block', fontSize: '0.72rem', fontWeight: 600,
        color: 'rgba(152,152,184,0.85)', textTransform: 'uppercase',
        letterSpacing: '0.07em', marginBottom: '6px',
        fontFamily: 'Space Grotesk, sans-serif',
    };

    const iconSlot = (icon) => ({
        position: 'absolute', left: '13px', top: '50%',
        transform: 'translateY(-50%)', color: 'rgba(90,90,120,0.7)', pointerEvents: 'none',
    });

    return (
        <>
            <style>{`
        @keyframes overlay-in { from{opacity:0;}to{opacity:1;} }
        @keyframes modal-in   { from{opacity:0;transform:translateY(28px) scale(0.96);}to{opacity:1;transform:translateY(0) scale(1);} }
        .mf-input { transition: border-color .18s, box-shadow .18s, background .18s !important; }
        .mf-input:focus { border-color:rgba(79,70,229,.7)!important; box-shadow:0 0 0 3px rgba(79,70,229,.2)!important; background:rgba(10,10,30,.9)!important; outline:none!important; }
        .mf-close:hover { background:rgba(225,29,72,.14)!important; color:#f87171!important; border-color:rgba(225,29,72,.35)!important; }
        .pill-opt { cursor:pointer; padding:6px 13px; border-radius:999px; font-size:.76rem; font-weight:600; border:1px solid rgba(255,255,255,.08); background:transparent; color:rgba(152,152,184,.7); font-family:'Space Grotesk',sans-serif; transition:all .18s; }
        .pill-opt:hover { border-color:rgba(79,70,229,.4); color:#c4b5fd; background:rgba(79,70,229,.1); }
        .pill-opt.active { background:rgba(79,70,229,.2); border-color:rgba(79,70,229,.5); color:#a5b4fc; }
        input[type=date] { color-scheme:dark; }
        .step-dot { width:8px; height:8px; border-radius:50%; transition:all .25s; }
      `}</style>

            {/* Overlay */}
            <div
                onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}
                style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(2,2,10,0.88)', backdropFilter: 'blur(14px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '16px', animation: 'overlay-in 0.25s ease-out',
                }}
            >
                {/* Modal */}
                <div style={{
                    width: '100%', maxWidth: '580px',
                    background: 'linear-gradient(145deg,rgba(12,12,28,.98),rgba(6,6,18,.98))',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '28px', overflow: 'hidden',
                    boxShadow: '0 32px 90px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,0.07)',
                    maxHeight: '92vh', overflowY: 'auto',
                    animation: 'modal-in 0.4s cubic-bezier(0.16,1,0.3,1)',
                }}>
                    {/* Header with gradient stripe */}
                    <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg,#7c3aed,#4f46e5,#2563eb)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '13px',
                                    background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 16px rgba(79,70,229,.45)',
                                }}>
                                    <Sparkles size={19} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1.35rem', fontWeight: 700, color: '#eeeeff', letterSpacing: '-0.025em' }}>
                                        New Memory
                                    </h2>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(152,152,184,.75)', marginTop: '1px' }}>
                                        Capture this moment forever
                                    </p>
                                </div>
                            </div>
                            <button className="mf-close" onClick={onClose} disabled={isSubmitting} style={{
                                width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.1)',
                                background: 'rgba(255,255,255,.04)', color: 'rgba(152,152,184,.8)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', flexShrink: 0,
                            }}>
                                <X size={15} />
                            </button>
                        </div>

                        {/* Step indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px' }}>
                            <div className="step-dot" style={{ background: step >= 1 ? '#7c3aed' : 'rgba(255,255,255,.15)', width: '24px', height: '6px', borderRadius: '3px' }} />
                            <div className="step-dot" style={{ background: step >= 2 ? '#7c3aed' : 'rgba(255,255,255,.15)', width: '24px', height: '6px', borderRadius: '3px' }} />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: '4px' }}>Step {step} of 2</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                            {/* ── STEP 1: Basic ──────────────────────── */}
                            {step === 1 && <>
                                {/* Title */}
                                <div>
                                    <label style={labelStyle}>Memory Title <span style={{ color: '#f87171' }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <Type size={14} style={iconSlot()} />
                                        <input className="mf-input" type="text" placeholder="e.g. Sunrise over Machu Picchu"
                                            value={form.title} onChange={e => set('title', e.target.value)}
                                            required disabled={isSubmitting}
                                            style={{ ...inputStyle, paddingLeft: '38px' }} />
                                    </div>
                                </div>

                                {/* Location + Country row */}
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1 1 130px' }}>
                                        <label style={labelStyle}>Place / City <span style={{ color: '#f87171' }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <MapPin size={14} style={iconSlot()} />
                                            <input className="mf-input" type="text" placeholder="Machu Picchu"
                                                value={form.location} onChange={e => set('location', e.target.value)}
                                                required disabled={isSubmitting}
                                                style={{ ...inputStyle, paddingLeft: '38px' }} />
                                        </div>
                                    </div>
                                    <div style={{ flex: '1 1 130px' }}>
                                        <label style={labelStyle}>Country</label>
                                        <div style={{ position: 'relative' }}>
                                            <Globe size={14} style={iconSlot()} />
                                            <input className="mf-input" type="text" placeholder="Peru"
                                                value={form.country} onChange={e => set('country', e.target.value)}
                                                disabled={isSubmitting}
                                                style={{ ...inputStyle, paddingLeft: '38px' }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Date */}
                                <div>
                                    <label style={labelStyle}>Date <span style={{ color: '#f87171' }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar size={14} style={iconSlot()} />
                                        <input className="mf-input" type="date"
                                            value={form.date} onChange={e => set('date', e.target.value)}
                                            required disabled={isSubmitting}
                                            style={{ ...inputStyle, paddingLeft: '38px', colorScheme: 'dark' }} />
                                    </div>
                                </div>

                                {/* Category */}
                                <div>
                                    <label style={labelStyle}>Category</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                                        {CATEGORIES.map(c => (
                                            <button key={c} type="button" onClick={() => set('category', c)}
                                                className={`pill-opt ${form.category === c ? 'active' : ''}`}>
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label style={labelStyle}>Description</label>
                                    <textarea className="mf-input" placeholder="What made this place special?"
                                        value={form.description} onChange={e => set('description', e.target.value)}
                                        rows={3} disabled={isSubmitting}
                                        style={{ ...inputStyle, resize: 'vertical', minHeight: '88px' }} />
                                </div>
                            </>}

                            {/* ── STEP 2: Details ────────────────────── */}
                            {step === 2 && <>
                                {/* Rating */}
                                <div>
                                    <label style={labelStyle}>Rating</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button key={n} type="button" onClick={() => set('rating', n)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', opacity: form.rating >= n ? 1 : 0.25, transition: 'opacity .15s' }}>
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Mood */}
                                <div>
                                    <label style={labelStyle}>Mood</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                                        {MOODS.map(m => (
                                            <button key={m} type="button" onClick={() => set('mood', m)}
                                                className={`pill-opt ${form.mood === m ? 'active' : ''}`}>
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Transport */}
                                <div>
                                    <label style={labelStyle}><Compass size={10} style={{ display: 'inline', marginRight: '4px' }} />How did you get there?</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                                        {TRANSPORT.map(t => (
                                            <button key={t} type="button" onClick={() => set('transport', t)}
                                                className={`pill-opt ${form.transport === t ? 'active' : ''}`}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Budget + Weather row */}
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1 1 120px' }}>
                                        <label style={labelStyle}><DollarSign size={10} style={{ display: 'inline', marginRight: '4px' }} />Budget Range</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                                            {BUDGET.map(b => (
                                                <button key={b} type="button" onClick={() => set('budget', b)}
                                                    className={`pill-opt ${form.budget === b ? 'active' : ''}`}>
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ flex: '1 1 120px' }}>
                                        <label style={labelStyle}><Cloud size={10} style={{ display: 'inline', marginRight: '4px' }} />Weather</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                                            {WEATHER.map(w => (
                                                <button key={w} type="button" onClick={() => set('weather', w)}
                                                    className={`pill-opt ${form.weather === w ? 'active' : ''}`}>
                                                    {w}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label style={labelStyle}><BookOpen size={10} style={{ display: 'inline', marginRight: '4px' }} />Private Notes</label>
                                    <textarea className="mf-input" placeholder="Anything else you want to remember..."
                                        value={form.notes} onChange={e => set('notes', e.target.value)}
                                        rows={3} disabled={isSubmitting}
                                        style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} />
                                </div>
                            </>}

                            {/* Error */}
                            {error && (
                                <div style={{
                                    padding: '11px 14px', borderRadius: '12px',
                                    background: 'rgba(225,29,72,.08)', border: '1px solid rgba(225,29,72,.25)',
                                    color: '#fda4af', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '7px',
                                }}>
                                    <X size={13} /> {error}
                                </div>
                            )}

                            {/* Buttons */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', gap: '12px',
                                paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,.06)',
                            }}>
                                {step === 1 ? (
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={isSubmitting}>
                                        Cancel
                                    </button>
                                ) : (
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>
                                        ← Back
                                    </button>
                                )}

                                {step === 1 ? (
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            if (!form.title || !form.location || !form.date) {
                                                setError('Please fill in Title, Location, and Date.');
                                            } else { setError(''); setStep(2); }
                                        }}
                                        style={{ minWidth: '120px' }}
                                    >
                                        Next Step →
                                    </button>
                                ) : (
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting} style={{ minWidth: '130px' }}>
                                        {isSubmitting
                                            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                                            : <><Sparkles size={14} /> Save Memory</>
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
