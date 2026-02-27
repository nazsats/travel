'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import {
  Plane, MapPin, Camera, Plus, Star, Sunset, ChevronRight,
  Image as ImageIcon, Trash2, Globe, BookOpen, Sparkles, Clock,
  Mountain, Compass, Calendar, Layers
} from 'lucide-react';
import AddMemoryForm from '@/components/AddMemoryForm';
import { GooglePhotosUploader } from '@/components/GooglePhotosUploader';

// ── Emoji category icons ───────────────────────────────
const moodEmoji = { 'Amazing': '🤩', 'Peaceful': '😌', 'Adventurous': '🏔️', 'Cultural': '🏛️', 'Foodie': '🍜', 'Party': '🎉', 'Chill': '🌊' };
const categoryColors = {
  'Sightseeing': '#4f46e5', 'Nature': '#059669', 'Food & Drink': '#d97706',
  'Culture': '#7c3aed', 'Adventure': '#dc2626', 'Shopping': '#db2777',
  'Nightlife': '#0891b2', 'Transport': '#6b7280',
};

function StatCard({ icon, value, label, color }) {
  return (
    <div className="glass card-3d" style={{
      padding: '24px 16px', textAlign: 'center',
      borderRadius: '20px', cursor: 'default',
    }}>
      <div style={{
        width: '46px', height: '46px', borderRadius: '14px',
        background: `${color}20`, border: `1px solid ${color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, margin: '0 auto 14px',
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: 'Space Grotesk', fontSize: '2rem', fontWeight: 700, lineHeight: 1,
        background: 'linear-gradient(180deg,#eeeeff,#7070a0)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '6px',
      }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
    </div>
  );
}

function MemoryCard({ memory, hovered, onHover, onUnhover, onDelete, deletingId, index }) {
  const cardRef = useRef(null);
  const cat = memory.category || 'Sightseeing';
  const catColor = categoryColors[cat] || '#4f46e5';
  const mood = memory.mood;

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(900px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateY(-4px)`;
    cardRef.current.style.boxShadow = `0 24px 60px rgba(0,0,0,0.65), 0 0 40px ${catColor}20`;
  };
  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.boxShadow = '';
    }
    onUnhover();
  };

  return (
    <div
      style={{ paddingLeft: '48px', position: 'relative', animationDelay: `${index * 0.07}s` }}
      className="anim-fade-up"
      onMouseEnter={onHover}
      onMouseLeave={handleMouseLeave}
    >
      {/* Timeline node */}
      <div style={{ position: 'absolute', left: '8px', top: '28px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        {hovered && <div style={{ position: 'absolute', width: '24px', height: '24px', borderRadius: '50%', background: `${catColor}55`, animation: 'pulse-ring 1s ease-out infinite' }} />}
        <div style={{
          width: '14px', height: '14px', borderRadius: '50%',
          border: `2px solid ${hovered ? catColor : `${catColor}70`}`,
          background: hovered ? catColor : 'var(--bg)',
          transition: 'all 0.25s',
          boxShadow: hovered ? `0 0 14px ${catColor}90` : 'none',
        }} />
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className="glass"
        onMouseMove={handleMouseMove}
        style={{
          padding: '0', borderRadius: '20px', overflow: 'hidden',
          transition: 'transform 0.35s var(--spring), box-shadow 0.35s', transformStyle: 'preserve-3d',
        }}
      >
        {/* Color accent stripe */}
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${catColor}, ${catColor}00)` }} />

        <div style={{ padding: '22px 24px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Left: content */}
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '1.15rem', fontWeight: 700, color: '#eeeeff', lineHeight: 1.2 }}>
                {mood && <span style={{ marginRight: '6px' }}>{moodEmoji[mood] || ''}</span>}
                {memory.title}
              </h3>
              <span className="badge badge-violet" style={{ flexShrink: 0 }}>
                <Calendar size={9} /> {memory.date ? new Date(memory.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
              </span>
            </div>

            {/* Meta tags row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {memory.location && (
                <span className="tag"><MapPin size={10} /> {memory.location}</span>
              )}
              {memory.country && (
                <span className="tag"><Globe size={10} /> {memory.country}</span>
              )}
              {memory.category && (
                <span className="tag" style={{ color: catColor, borderColor: `${catColor}30`, background: `${catColor}10` }}>
                  {memory.category}
                </span>
              )}
              {memory.rating && (
                <span className="tag" style={{ color: '#fbbf24' }}>
                  {'★'.repeat(memory.rating)}{'☆'.repeat(5 - memory.rating)}
                </span>
              )}
            </div>

            {/* Description */}
            {memory.description && (
              <p style={{
                color: 'var(--text-2)', fontSize: '0.87rem', lineHeight: 1.75,
                marginBottom: '14px',
                borderLeft: `2px solid ${catColor}50`,
                paddingLeft: '12px',
              }}>
                {memory.description}
              </p>
            )}

            {/* Notes */}
            {memory.notes && (
              <div style={{
                padding: '10px 14px', borderRadius: '12px', marginBottom: '14px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
              }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.65 }}>
                  <BookOpen size={11} style={{ display: 'inline', marginRight: '5px', opacity: 0.6 }} />
                  {memory.notes}
                </p>
              </div>
            )}

            {/* Budget / Transport */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {memory.transport && <span className="tag"><Compass size={10} /> {memory.transport}</span>}
              {memory.budget && <span className="tag">💰 {memory.budget}</span>}
              {memory.weather && <span className="tag">🌤 {memory.weather}</span>}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                {memory.date ? new Date(memory.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(memory.id); }}
                  disabled={deletingId === memory.id}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
                    color: hovered ? '#f87171' : 'var(--text-3)',
                    transition: 'color 0.2s', opacity: deletingId === memory.id ? 0.4 : 1,
                  }}
                ><Trash2 size={13} /></button>
                <button style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
                  color: hovered ? '#a5b4fc' : 'var(--text-3)',
                  fontSize: '0.76rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', transition: 'color 0.2s',
                  fontFamily: 'Space Grotesk',
                }}>Details <ChevronRight size={11} /></button>
              </div>
            </div>
          </div>

          {/* Right: photo */}
          <div style={{
            width: '130px', flexShrink: 0, borderRadius: '14px', overflow: 'hidden',
            background: `linear-gradient(135deg, ${catColor}15, ${catColor}05)`,
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px',
          }}>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)' }}>
              <ImageIcon size={26} />
              <div style={{ fontSize: '0.6rem', marginTop: '6px', fontWeight: 500 }}>No photo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const categories = ['All', ...Object.keys(categoryColors)];
  const filtered = filterCat === 'All' ? memories : memories.filter(m => m.category === filterCat);

  const totalDays = memories.length
    ? (() => {
      const dates = memories.map(m => new Date(m.date)).filter(d => !isNaN(d));
      if (dates.length < 2) return 1;
      const diff = Math.max(...dates) - Math.min(...dates);
      return Math.max(1, Math.ceil(diff / 86400000) + 1);
    })() : 0;

  return (
    <>
      {/* ── Navbar ────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(4,4,13,0.82)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="site-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="anim-float" style={{
              width: '36px', height: '36px', borderRadius: '11px',
              background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(79,70,229,0.5)',
            }}>
              <Globe size={18} color="white" />
            </div>
            <div>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Travel <span className="g-text">Memories</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Your Journey Journal
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="badge badge-red" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', animation: 'pulse-dot 2s infinite', display: 'inline-block' }} />
              &nbsp;Live
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add Memory
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page ──────────────────────────────────────── */}
      <div className="site-wrap anim-fade-up" style={{ paddingTop: '88px', paddingBottom: '80px' }}>

        {/* ── HERO ────────────────────────────────────── */}
        <header style={{ textAlign: 'center', marginBottom: '64px', padding: '48px 0 0' }}>
          <span className="badge badge-violet" style={{ marginBottom: '20px' }}>
            <Sparkles size={11} /> Personal Travel Journal
          </span>
          <h1 style={{ fontSize: 'clamp(2.6rem,6vw,5.2rem)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.04, marginBottom: '18px' }}>
            Every Journey.<br />
            <span className="g-text">Every Memory.</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 'clamp(0.95rem,2vw,1.1rem)', maxWidth: '460px', margin: '0 auto 48px', lineHeight: 1.75 }}>
            Capture your adventures around the world — the people, places, and moments that made them special.
          </p>

          {/* 3D rotating globe orb */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, rgba(124,58,237,0.6), rgba(79,70,229,0.3) 50%, rgba(37,99,235,0.15))',
              border: '1px solid rgba(124,58,237,0.3)',
              boxShadow: '0 0 60px rgba(79,70,229,0.4), inset 0 0 40px rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'float 5s ease-in-out infinite',
            }}>
              <Globe size={44} color="rgba(200,200,255,0.7)" />
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))',
            gap: '14px', maxWidth: '700px', margin: '0 auto',
          }}>
            <StatCard icon={<Camera size={20} />} value={memories.length} label="Memories" color="#4f46e5" />
            <StatCard icon={<Globe size={20} />} value={countries.length || 0} label="Countries" color="#7c3aed" />
            <StatCard icon={<MapPin size={20} />} value={new Set(memories.map(m => m.location).filter(Boolean)).size} label="Places" color="#2563eb" />
            <StatCard icon={<Calendar size={20} />} value={totalDays} label="Days" color="#0d9488" />
          </div>
        </header>

        {/* ── Google Photos Sync ───────────────────────── */}
        <section className="glass" style={{ marginBottom: '56px', overflow: 'hidden', borderRadius: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div style={{
              flex: '1 1 260px', padding: '32px',
              borderRight: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center',
            }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '14px',
                background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa',
              }}>
                <ImageIcon size={22} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Google Photos Sync</h3>
                <p style={{ color: 'var(--text-2)', fontSize: '0.84rem', lineHeight: 1.7 }}>
                  Upload your travel photos to organised albums in Google Photos — great for keeping each trip neatly sorted.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Albums', 'Organised', 'Instant'].map(t => <span key={t} className="badge badge-blue">{t}</span>)}
              </div>
            </div>
            <div style={{ flex: '1 1 260px', padding: '32px' }}>
              <GooglePhotosUploader />
            </div>
          </div>
        </section>

        {/* ── Timeline ────────────────────────────────── */}
        <section>
          {/* Header + filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1.7rem', fontWeight: 700 }}>Timeline</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '3px' }}>
                {filtered.length} {filtered.length === 1 ? 'memory' : 'memories'} {filterCat !== 'All' ? `in ${filterCat}` : 'total'}
              </p>
            </div>
            <div className="divider" />
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ flexShrink: 0 }}>
              <Plus size={13} /> New
            </button>
          </div>

          {/* Category filter pills */}
          {memories.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
              {categories.map(cat => {
                const active = filterCat === cat;
                const col = categoryColors[cat] || '#4f46e5';
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    style={{
                      padding: '6px 14px', borderRadius: '999px', border: '1px solid',
                      borderColor: active ? (cat === 'All' ? 'rgba(79,70,229,0.6)' : `${col}60`) : 'var(--border)',
                      background: active ? (cat === 'All' ? 'rgba(79,70,229,0.18)' : `${col}18`) : 'transparent',
                      color: active ? (cat === 'All' ? '#a5b4fc' : col) : 'var(--text-3)',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'Space Grotesk', transition: 'all 0.2s',
                    }}
                  >{cat}</button>
                );
              })}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid rgba(79,70,229,0.15)', borderTopColor: 'var(--indigo)' }} className="anim-spin" />
              <p style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>Loading your memories...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && memories.length === 0 && (
            <div className="glass" style={{ textAlign: 'center', padding: '72px 32px', borderRadius: '24px' }}>
              <div className="anim-float" style={{
                width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 24px',
                background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Mountain size={36} color="#a5b4fc" />
              </div>
              <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px' }}>
                The adventure starts here 🌍
              </h3>
              <p style={{ color: 'var(--text-2)', maxWidth: '320px', margin: '0 auto 28px', fontSize: '0.9rem', lineHeight: 1.7 }}>
                Start adding your travel memories — every trip, every place, every story.
              </p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Log First Memory
              </button>
            </div>
          )}

          {/* Memory list */}
          {!loading && filtered.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute', left: '19px', top: '28px', bottom: '28px', width: '2px',
                background: 'linear-gradient(to bottom, var(--violet), rgba(79,70,229,0.2) 85%, transparent)',
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
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)', fontSize: '0.88rem' }}>
              No memories in "{filterCat}" yet. <button onClick={() => setFilterCat('All')} style={{ color: '#a5b4fc', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Show all</button>
            </div>
          )}
        </section>
      </div>

      {/* ── Modal ─────────────────────────────────────── */}
      {showForm && (
        <AddMemoryForm onClose={() => setShowForm(false)} onMemoryAdded={() => setShowForm(false)} />
      )}

      <style jsx global>{`
        @keyframes pulse-dot {
          0%,100%{ box-shadow:0 0 0 0 rgba(239,68,68,.7); }
          50%     { box-shadow:0 0 0 6px rgba(239,68,68,0); }
        }
        @keyframes pulse-ring {
          0%  { transform:scale(1);   opacity:0.6; }
          100% { transform:scale(2.6); opacity:0;   }
        }
      `}</style>
    </>
  );
}
