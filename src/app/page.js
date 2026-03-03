'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import {
  Plane, MapPin, Camera, Plus, Star, ChevronRight,
  Image as ImageIcon, Trash2, Globe, BookOpen, Sparkles, Clock,
  Mountain, Compass, Calendar, Layers
} from 'lucide-react';
import AddMemoryForm from '@/components/AddMemoryForm';
import { GooglePhotosUploader } from '@/components/GooglePhotosUploader';
import { GooglePhotosGallery } from '@/components/GooglePhotosGallery';

// ── Emoji / colour maps ────────────────────────────────────
const moodEmoji = {
  'Amazing': '🤩', 'Peaceful': '😌', 'Adventurous': '🏔️',
  'Cultural': '🏛️', 'Foodie': '🍜', 'Party': '🎉', 'Chill': '🌊'
};

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

// Dark stat card colours
const NOTE_COLORS = ['rgba(212,160,23,0.1)', 'rgba(76,175,80,0.1)', 'rgba(92,138,255,0.1)', 'rgba(255,128,171,0.1)'];
const NOTE_BORDERS = ['#d4a017', '#4caf50', '#5c8aff', '#ff80ab'];
const NOTE_ROTATE = ['-1.5deg', '1deg', '-0.8deg', '1.2deg'];

// ── Doodle decorations ─────────────────────────────────────
const DoodleUnderline = () => (
  <svg width="200" height="12" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', margin: '0 auto' }}>
    <path d="M4 8 Q50 2 100 8 Q150 14 196 6"
      stroke="#d4a017" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

// ── Stat Card ──────────────────────────────────────────────
function StatCard({ icon, value, label, colorIdx }) {
  const bg = NOTE_COLORS[colorIdx % 4];
  const border = NOTE_BORDERS[colorIdx % 4];
  const rotate = NOTE_ROTATE[colorIdx % 4];
  return (
    <div className="card-3d" style={{
      padding: '24px 16px', textAlign: 'center',
      background: bg,
      border: `2px solid ${border}`,
      borderRadius: '16px',
      boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 15px ${border}33`,
      cursor: 'default',
      transform: `rotate(${rotate})`,
      position: 'relative',
    }}>
      <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>{icon}</div>
      <div style={{
        fontFamily: 'Caveat, cursive', fontSize: '2.6rem', fontWeight: 700,
        color: '#f0e6d0', lineHeight: 1, marginBottom: '4px',
      }}>{value}</div>
      <div style={{
        fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.88rem',
        color: '#b8a88a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{label}</div>
      {/* Pin decoration */}
      <div style={{
        position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
        width: '14px', height: '14px', borderRadius: '50%',
        background: border, border: `2px solid ${border}`,
        boxShadow: `0 0 8px ${border}66`,
      }} />
    </div>
  );
}

// ── Memory Card ────────────────────────────────────────────
function MemoryCard({ memory, hovered, onHover, onUnhover, onDelete, deletingId, index }) {
  const cat = memory.category || 'Sightseeing';
  const cfg = categoryConfig[cat] || categoryConfig['Sightseeing'];
  const mood = memory.mood;

  return (
    <div
      style={{ paddingLeft: '52px', position: 'relative', animationDelay: `${index * 0.07}s` }}
      className="anim-fade-up"
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
    >
      {/* Timeline emoji node */}
      <div style={{
        position: 'absolute', left: '4px', top: '24px',
        width: '32px', height: '32px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.3rem', zIndex: 10,
        background: cfg.bg,
        border: `2px solid ${cfg.color}`,
        borderRadius: '50%',
        boxShadow: hovered ? `0 0 12px ${cfg.color}55` : `0 0 6px ${cfg.color}33`,
        transition: 'box-shadow 0.2s, transform 0.2s',
        transform: hovered ? 'scale(1.15)' : 'scale(1)',
      }}>
        {cfg.emoji}
      </div>

      {/* Card */}
      <div
        style={{
          background: '#13131c',
          border: `2px solid ${hovered ? '#d4a017' : '#2a2a38'}`,
          borderRadius: '18px',
          overflow: 'hidden',
          transition: 'transform 0.25s var(--spring), box-shadow 0.25s, border-color 0.25s',
          boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(212,160,23,0.15)' : '0 4px 16px rgba(0,0,0,0.3)',
          transform: hovered ? 'translate(-2px, -3px)' : 'translate(0,0)',
        }}
      >
        {/* Coloured left border accent */}
        <div style={{
          height: '100%', width: '4px',
          position: 'absolute', left: 0, top: 0, bottom: 0,
          background: `linear-gradient(to bottom, ${cfg.color}, ${cfg.color}88)`,
          borderRadius: '16px 0 0 16px',
        }} />

        <div style={{ padding: '20px 22px 20px 26px', display: 'flex', gap: '18px', flexWrap: 'wrap', position: 'relative' }}>
          {/* Content */}
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'Caveat, cursive', fontSize: '1.4rem', fontWeight: 700, color: '#f0e6d0', lineHeight: 1.2 }}>
                {mood && <span style={{ marginRight: '6px' }}>{moodEmoji[mood] || ''}</span>}
                {memory.title}
              </h3>
              <span className="badge badge-yellow" style={{ flexShrink: 0, fontSize: '0.85rem' }}>
                <Calendar size={10} />
                {memory.date ? new Date(memory.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
              </span>
            </div>

            {/* Meta tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '12px' }}>
              {memory.location && (
                <span className="tag"><MapPin size={10} /> {memory.location}</span>
              )}
              {memory.country && (
                <span className="tag"><Globe size={10} /> {memory.country}</span>
              )}
              {memory.category && (
                <span className="tag" style={{ color: cfg.color, borderColor: cfg.color, background: cfg.bg }}>
                  {cfg.emoji} {memory.category}
                </span>
              )}
              {memory.rating && (
                <span className="tag" style={{ color: '#d4a017', borderColor: '#d4a017', background: 'rgba(212,160,23,0.12)' }}>
                  {'★'.repeat(memory.rating)}{'☆'.repeat(5 - memory.rating)}
                </span>
              )}
            </div>

            {/* Description */}
            {memory.description && (
              <p style={{
                fontFamily: 'Patrick Hand, sans-serif', color: '#b8a88a',
                fontSize: '0.97rem', lineHeight: 1.7, marginBottom: '12px',
                borderLeft: `3px solid ${cfg.color}`,
                paddingLeft: '12px',
                borderRadius: '2px',
              }}>
                {memory.description}
              </p>
            )}

            {/* AI Enhanced Content */}
            {memory.aiEnhanced && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
                background: 'rgba(212,160,23,0.08)', border: '1.5px solid rgba(212,160,23,0.25)',
              }}>
                <p style={{ fontSize: '0.85rem', fontFamily: 'Patrick Hand, sans-serif', color: '#d4a017', lineHeight: 1.65 }}>
                  ✨ {memory.aiEnhanced}
                </p>
              </div>
            )}

            {/* Notes */}
            {memory.notes && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
                background: 'rgba(179,136,255,0.08)', border: '1.5px solid rgba(179,136,255,0.2)',
              }}>
                <p style={{ fontSize: '0.88rem', fontFamily: 'Patrick Hand, sans-serif', color: '#b388ff', lineHeight: 1.65 }}>
                  📝 {memory.notes}
                </p>
              </div>
            )}

            {/* Budget / Transport / Weather */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '12px' }}>
              {memory.transport && <span className="tag">✈️ {memory.transport}</span>}
              {memory.budget && <span className="tag">💰 {memory.budget}</span>}
              {memory.weather && <span className="tag">🌤 {memory.weather}</span>}
              {memory.companions && <span className="tag">👥 {memory.companions}</span>}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #2a2a38' }}>
              <span style={{ fontSize: '0.78rem', fontFamily: 'Patrick Hand, sans-serif', color: '#7a6f5a' }}>
                <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                {memory.date ? new Date(memory.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(memory.id); }}
                  disabled={deletingId === memory.id}
                  style={{
                    background: hovered ? 'rgba(255,82,82,0.1)' : 'transparent',
                    border: hovered ? '1.5px solid #ff5252' : '1.5px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer', padding: '4px 8px',
                    color: hovered ? '#ff5252' : '#7a6f5a',
                    transition: 'all 0.2s',
                    opacity: deletingId === memory.id ? 0.4 : 1,
                  }}
                ><Trash2 size={13} /></button>
                <button style={{
                  background: hovered ? 'rgba(212,160,23,0.12)' : 'transparent',
                  border: hovered ? '1.5px solid #d4a017' : '1.5px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer', padding: '4px 8px',
                  color: hovered ? '#d4a017' : '#7a6f5a',
                  fontSize: '0.82rem', fontWeight: 700,
                  fontFamily: 'Caveat, cursive',
                  display: 'flex', alignItems: 'center', gap: '3px',
                  transition: 'all 0.2s',
                }}>Details <ChevronRight size={11} /></button>
              </div>
            </div>
          </div>

          {/* Photo slot */}
          <div style={{
            width: '110px', flexShrink: 0, borderRadius: '14px', overflow: 'hidden',
            background: cfg.bg, border: `1.5px dashed ${cfg.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '110px',
          }}>
            <div style={{ textAlign: 'center', color: '#7a6f5a' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>📷</div>
              <div style={{ fontSize: '0.65rem', fontFamily: 'Caveat, cursive', fontWeight: 600 }}>No photo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterCat, setFilterCat] = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'memories'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMemories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    try { await deleteDoc(doc(db, 'memories', id)); }
    catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  };

  const countries = [...new Set(memories.map(m => m.country).filter(Boolean))];
  const categories = ['All', ...Object.keys(categoryConfig)];
  const filtered = filterCat === 'All' ? memories : memories.filter(m => m.category === filterCat);

  const totalDays = memories.length
    ? (() => {
      const dates = memories.map(m => new Date(m.date)).filter(d => !isNaN(d));
      if (dates.length < 2) return 1;
      const diff = Math.max(...dates) - Math.min(...dates);
      return Math.max(1, Math.ceil(diff / 86400000) + 1);
    })()
    : 0;

  return (
    <>
      {/* ── Navbar ─────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10, 10, 15, 0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid rgba(212, 160, 23, 0.2)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
      }}>
        <div className="site-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '66px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="anim-float" style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(212,160,23,0.2), rgba(212,160,23,0.05))',
              border: '2px solid #d4a017',
              boxShadow: '0 0 15px rgba(212,160,23,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem',
            }}>
              🧭
            </div>
            <div>
              <div style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.35rem', lineHeight: 1.1, color: '#f0e6d0' }}>
                Travel <span className="g-text">Memories</span>
              </div>
              <div style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.68rem', color: '#7a6f5a', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                ✏️ Your Journey Journal
              </div>
            </div>
          </div>

          {/* Nav right */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="badge badge-gold" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#d4a017', animation: 'pulse-dot 2s infinite', display: 'inline-block' }} />
              Live
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add Memory
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page ──────────────────────────────────────── */}
      <div className="site-wrap anim-fade-up" style={{ paddingTop: '90px', paddingBottom: '80px', margin: '0 auto', width: '100%' }}>

        {/* ── HERO ──────────────────────────────────── */}
        <header style={{ textAlign: 'center', marginBottom: '64px', padding: '48px 0 0', position: 'relative' }}>

          {/* Floating decorations */}
          <div style={{ position: 'absolute', top: '20px', left: '10%', fontSize: '2rem', animation: 'float 5s ease-in-out infinite', animationDelay: '0s', opacity: 0.5 }}>✈️</div>
          <div style={{ position: 'absolute', top: '60px', right: '8%', fontSize: '1.6rem', animation: 'float 4s ease-in-out infinite', animationDelay: '0.5s', opacity: 0.5 }}>🗺️</div>
          <div style={{ position: 'absolute', top: '10px', right: '20%', fontSize: '1.4rem', animation: 'float 6s ease-in-out infinite', animationDelay: '1s', opacity: 0.4 }}>📸</div>
          <div style={{ position: 'absolute', top: '80px', left: '18%', fontSize: '1.2rem', animation: 'float 5.5s ease-in-out infinite', animationDelay: '0.8s', opacity: 0.4 }}>🌍</div>

          <span className="badge badge-violet" style={{ marginBottom: '20px', fontSize: '1rem' }}>
            ✈️ Personal Travel Journal
          </span>

          <h1 style={{
            fontFamily: 'Caveat, cursive',
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            fontWeight: 700, lineHeight: 1.05,
            marginBottom: '8px', color: '#f0e6d0',
          }}>
            Every Journey.<br />
            <span className="g-text">Every Memory.</span>
          </h1>
          <DoodleUnderline />

          <p style={{
            fontFamily: 'Patrick Hand, sans-serif',
            color: '#b8a88a', fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            maxWidth: '440px', margin: '18px auto 44px', lineHeight: 1.8,
          }}>
            Capture your adventures around the world — the people, places, and moments that made them special. ✨
          </p>

          {/* Doodle globe */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
            <div className="anim-float" style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(92,138,255,0.15), rgba(212,160,23,0.1))',
              border: '2px solid #d4a017',
              boxShadow: '0 0 30px rgba(212,160,23,0.15), 0 0 60px rgba(92,138,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3.5rem',
              position: 'relative',
            }}>
              🌍
              <div style={{
                position: 'absolute', inset: '-12px',
                borderRadius: '50%', border: '1px dashed rgba(212,160,23,0.3)', opacity: 0.6,
              }} />
            </div>
          </div>

          {/* Stat cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '20px', maxWidth: '680px', margin: '0 auto',
          }}>
            <StatCard icon="📸" value={memories.length} label="Memories" colorIdx={0} />
            <StatCard icon="🌍" value={countries.length || 0} label="Countries" colorIdx={1} />
            <StatCard icon="📍" value={new Set(memories.map(m => m.location).filter(Boolean)).size} label="Places" colorIdx={2} />
            <StatCard icon="📅" value={totalDays} label="Days" colorIdx={3} />
          </div>
        </header>

        {/* ── Google Photos Sync ──────────────────────── */}
        <section style={{
          marginBottom: '0px', overflow: 'hidden',
          background: '#13131c',
          border: '2px solid rgba(212,160,23,0.2)',
          borderRadius: '24px 24px 0 0',
          boxShadow: 'none',
          borderBottom: '1px solid #2a2a38',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div style={{
              flex: '1 1 260px', padding: '32px',
              borderRight: '1px solid #2a2a38',
              display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center',
            }}>
              <div style={{ fontSize: '2.5rem' }}>📷</div>
              <div>
                <h3 style={{ fontFamily: 'Caveat, cursive', fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#f0e6d0' }}>
                  Google Photos Sync
                </h3>
                <p style={{ fontFamily: 'Patrick Hand, sans-serif', color: '#b8a88a', fontSize: '0.95rem', lineHeight: 1.7 }}>
                  Upload your travel photos to organised albums in Google Photos — great for keeping each trip neatly sorted.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['📁 Albums', '✅ Organised', '⚡ Instant'].map(t => (
                  <span key={t} className="badge badge-gold" style={{ fontSize: '0.88rem' }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ flex: '1 1 260px', padding: '32px' }}>
              <GooglePhotosUploader />
            </div>
          </div>
        </section>

        {/* ── Google Photos Gallery ───────────────────── */}
        <section style={{
          marginBottom: '56px',
          background: '#13131c',
          border: '2px solid rgba(212,160,23,0.2)',
          borderRadius: '0 0 24px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 20px rgba(212,160,23,0.05)',
          padding: '32px',
          borderTop: 'none',
        }}>
          <GooglePhotosGallery albumTitle="My Travel Photos" />
        </section>

        {/* ── Timeline ──────────────────────────────── */}
        <section>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontFamily: 'Caveat, cursive', fontSize: '2.2rem', fontWeight: 700, color: '#f0e6d0' }}>
                🗺️ Journey Timeline
              </h2>
              <p style={{ fontFamily: 'Patrick Hand, sans-serif', color: '#7a6f5a', fontSize: '0.88rem', marginTop: '2px' }}>
                {filtered.length} {filtered.length === 1 ? 'memory' : 'memories'} {filterCat !== 'All' ? `in ${filterCat}` : 'total'}
              </p>
            </div>
            <div className="divider" />
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ flexShrink: 0 }}>
              <Plus size={13} /> New ✏️
            </button>
          </div>

          {/* Category filter pills */}
          {memories.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
              {categories.map(cat => {
                const active = filterCat === cat;
                const cfg = categoryConfig[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    style={{
                      padding: '6px 16px', borderRadius: '999px',
                      border: `2px solid ${active ? (cfg ? cfg.color : '#d4a017') : '#2a2a38'}`,
                      background: active ? (cfg ? cfg.bg : 'rgba(212,160,23,0.12)') : '#13131c',
                      color: active ? (cfg ? cfg.color : '#d4a017') : '#b8a88a',
                      fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'Caveat, cursive',
                      boxShadow: active ? `0 0 12px ${cfg ? cfg.color : '#d4a017'}33` : 'none',
                      transition: 'all 0.18s var(--spring)',
                      transform: active ? 'translate(-1px, -1px)' : 'none',
                    }}
                  >
                    {cfg ? `${cfg.emoji} ` : ''}{cat}
                  </button>
                );
              })}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '3rem', animation: 'spin 1.5s linear infinite' }}>✈️</div>
              <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.3rem', color: '#b8a88a' }}>
                Loading your memories...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && memories.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '72px 32px',
              background: '#13131c',
              border: '2px solid rgba(212,160,23,0.2)',
              borderRadius: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <div className="anim-float" style={{ fontSize: '5rem', marginBottom: '18px' }}>🏕️</div>
              <h3 style={{ fontFamily: 'Caveat, cursive', fontSize: '2rem', fontWeight: 700, marginBottom: '10px', color: '#f0e6d0' }}>
                The adventure starts here! 🌍
              </h3>
              <p style={{ fontFamily: 'Patrick Hand, sans-serif', color: '#b8a88a', maxWidth: '320px', margin: '0 auto 28px', fontSize: '1rem', lineHeight: 1.75 }}>
                Start adding your travel memories — every trip, every place, every story.
              </p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Log First Memory ✏️
              </button>
            </div>
          )}

          {/* Memory list */}
          {!loading && filtered.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Gold dashed timeline line */}
              <div style={{
                position: 'absolute', left: '20px', top: '40px', bottom: '40px', width: '2px',
                background: 'repeating-linear-gradient(to bottom, rgba(212,160,23,0.3) 0px, rgba(212,160,23,0.3) 8px, transparent 8px, transparent 14px)',
                borderRadius: '2px',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {filtered.map((memory, i) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    index={i}
                    hovered={hoveredId === memory.id}
                    onHover={() => setHoveredId(memory.id)}
                    onUnhover={() => setHoveredId(null)}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && memories.length > 0 && filtered.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px',
              fontFamily: 'Caveat, cursive', color: '#7a6f5a', fontSize: '1.2rem',
            }}>
              No memories in "{filterCat}" yet. {' '}
              <button onClick={() => setFilterCat('All')} style={{
                color: '#d4a017', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 700, fontFamily: 'Caveat, cursive', fontSize: '1.2rem',
                textDecoration: 'underline',
              }}>Show all</button>
            </div>
          )}
        </section>
      </div>

      {/* ── Modal ──────────────────────────────────── */}
      {showForm && (
        <AddMemoryForm onClose={() => setShowForm(false)} onMemoryAdded={() => setShowForm(false)} />
      )}

      <style jsx global>{`
        @keyframes pulse-dot {
          0%,100%{ box-shadow:0 0 0 0 rgba(212,160,23,.5); }
          50%     { box-shadow:0 0 0 6px rgba(212,160,23,0); }
        }
        @keyframes pulse-ring {
          0%  { transform:scale(1);   opacity:0.6; }
          100% { transform:scale(2.6); opacity:0; }
        }
      `}</style>
    </>
  );
}
