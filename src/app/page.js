'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Globe, MapPin, Camera, Zap } from 'lucide-react';
import AddMemoryForm from '@/components/AddMemoryForm';
import { MemoryCard } from '@/components/MemoryCard';
import { ChallengeTracker, ChallengeModal } from '@/components/ChallengeTracker';
import { GooglePhotosUploader } from '@/components/GooglePhotosUploader';
import { GooglePhotosGallery } from '@/components/GooglePhotosGallery';

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

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ icon, value, label, color, border }) {
  return (
    <div style={{
      padding: '22px 16px', textAlign: 'center', borderRadius: '16px',
      background: color, border: `2px solid ${border}`,
      boxShadow: `0 4px 20px rgba(0,0,0,0.3),0 0 15px ${border}33`,
      position: 'relative', transform: 'rotate(-0.8deg)', transition: 'transform .2s',
    }}
      onMouseOver={e => e.currentTarget.style.transform = 'rotate(0) scale(1.03)'}
      onMouseOut={e => e.currentTarget.style.transform = 'rotate(-0.8deg)'}>
      <div style={{ position: 'absolute', top: '-7px', left: '50%', transform: 'translateX(-50%)', width: '13px', height: '13px', borderRadius: '50%', background: border, boxShadow: `0 0 8px ${border}88` }} />
      <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontFamily: 'Caveat, cursive', fontSize: '2.4rem', fontWeight: 700, color: '#f0e6d0', lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#b8a88a', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterCat, setFilterCat] = useState('All');
  const [activeTab, setActiveTab] = useState('memories');
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'memories'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, snap => {
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

  const categories = ['All', ...Object.keys(categoryConfig)];
  const filtered = filterCat === 'All' ? memories : memories.filter(m => m.category === filterCat);
  const countries = [...new Set(memories.map(m => m.country).filter(Boolean))];

  return (
    <>
      <style>{`
        @keyframes overlay-in{from{opacity:0}to{opacity:1}}
        @keyframes modal-in{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes anim-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes challenge-pulse{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.5),0 8px 32px rgba(0,0,0,.4)}50%{box-shadow:0 0 0 12px rgba(212,160,23,.0),0 8px 32px rgba(0,0,0,.4)}}
        .anim-fade-up{animation:fadeIn .5s ease-out both}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0a0a10;color:#f0e6d0;font-family:'Patrick Hand',sans-serif}
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#0a0a10} ::-webkit-scrollbar-thumb{background:#2a2a38;border-radius:3px}
      `}</style>

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,16,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(212,160,23,0.15)',
        padding: '0 20px', height: '58px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>✈️</span>
          <span style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.3rem', color: '#f0e6d0' }}>TravelMemories</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {totalXP > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)' }}>
              <Zap size={12} color="#d4a017" />
              <span style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.95rem', color: '#f5d56e' }}>{totalXP} XP</span>
            </div>
          )}
          <button type="button" onClick={() => setShowForm(true)} style={{
            padding: '7px 18px', borderRadius: '999px', border: '2px solid #d4a017',
            background: 'rgba(212,160,23,0.12)', color: '#f5d56e', cursor: 'pointer',
            fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .2s',
          }}>
            <Plus size={13} /> New Memory
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px 60px' }}>

        {/* ── Hero ─────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: '52px 0 40px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '12px', animation: 'anim-float 3s ease-in-out infinite' }}>🌍</div>
          <h1 style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.2rem)', color: '#f0e6d0', marginBottom: '10px', lineHeight: 1.2 }}>
            Your Travel Journal
          </h1>
          <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '1.05rem', color: '#7a6f5a', marginBottom: '28px', maxWidth: '500px', margin: '0 auto 28px' }}>
            Capture memories, get AI insights, and challenge yourself to explore more.
          </p>

          {/* 🎯 Challenge CTA */}
          <button type="button" onClick={() => setShowChallenge(true)} style={{
            padding: '16px 36px', borderRadius: '999px', cursor: 'pointer',
            border: '2px solid #d4a017',
            background: 'linear-gradient(135deg, rgba(212,160,23,0.2), rgba(179,136,255,0.1))',
            color: '#f5d56e', fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.25rem',
            animation: 'challenge-pulse 2.5s ease-in-out infinite',
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            transition: 'transform .2s',
          }}
            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.animationPlayState = 'paused'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.animationPlayState = 'running'; }}>
            🎯 Generate My Travel Challenge
          </button>
          <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#5a4a30', marginTop: '10px' }}>
            AI-powered • Based on your travels • Location-aware
          </p>
        </div>

        {/* ── Stats ─────────────────────────────────────────── */}
        {memories.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '14px', marginBottom: '40px' }}>
            <StatCard icon="📖" value={memories.length} label="Memories" color="rgba(212,160,23,0.1)" border="#d4a017" />
            <StatCard icon="🌍" value={countries.length} label="Countries" color="rgba(92,138,255,0.1)" border="#5c8aff" />
            <StatCard icon="⭐" value={memories.length ? (memories.reduce((s, m) => s + (m.rating || 0), 0) / memories.length).toFixed(1) : '—'} label="Avg Rating" color="rgba(76,175,80,0.1)" border="#4caf50" />
            <StatCard icon="🏆" value={totalXP} label="XP Earned" color="rgba(179,136,255,0.1)" border="#b388ff" />
          </div>
        )}

        {/* ── Tab bar ───────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', padding: '4px', borderRadius: '14px', background: '#111118', border: '1px solid #2a2a38' }}>
          {[
            { key: 'memories', label: '📖 Memories' },
            { key: 'challenges', label: '🏆 Challenges' },
            { key: 'photos', label: '📷 Photos' },
          ].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: '9px', borderRadius: '10px', cursor: 'pointer',
              border: 'none',
              background: activeTab === tab.key ? 'rgba(212,160,23,0.15)' : 'transparent',
              color: activeTab === tab.key ? '#f5d56e' : '#7a6f5a',
              fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.98rem',
              transition: 'all .18s',
              boxShadow: activeTab === tab.key ? '0 0 12px rgba(212,160,23,0.15)' : 'none',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── Challenges Tab ────────────────────────────────── */}
        {activeTab === 'challenges' && (
          <div>
            <ChallengeTracker totalXP={totalXP} onXPChange={setTotalXP} />
            {/* Generate more challenges */}
            <div style={{ textAlign: 'center', padding: '32px', borderRadius: '20px', border: '2px dashed rgba(212,160,23,0.2)', background: 'rgba(212,160,23,0.03)' }}>
              <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.2rem', color: '#7a6f5a', marginBottom: '16px' }}>Ready for more adventures?</p>
              <button type="button" onClick={() => setShowChallenge(true)} style={{
                padding: '12px 28px', borderRadius: '999px', cursor: 'pointer',
                border: '2px solid #d4a017', background: 'rgba(212,160,23,0.1)',
                color: '#f5d56e', fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.05rem',
              }}>🎯 Generate New Challenges</button>
            </div>
          </div>
        )}

        {/* ── Memories Tab ─────────────────────────────────── */}
        {activeTab === 'memories' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.6rem', color: '#f0e6d0' }}>
                Journey Timeline
                <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.85rem', color: '#7a6f5a', fontWeight: 400, marginLeft: '10px' }}>
                  {filtered.length} memor{filtered.length !== 1 ? 'ies' : 'y'}
                </span>
              </h2>
              <button type="button" onClick={() => setShowForm(true)} style={{
                padding: '8px 18px', borderRadius: '999px', border: '2px solid #d4a017',
                background: 'rgba(212,160,23,0.1)', color: '#f5d56e', cursor: 'pointer',
                fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.95rem',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}><Plus size={13} /> New</button>
            </div>

            {/* Category filter */}
            {memories.length > 0 && (
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {categories.map(cat => {
                  const active = filterCat === cat;
                  const cfg = categoryConfig[cat];
                  return (
                    <button key={cat} type="button" onClick={() => setFilterCat(cat)} style={{
                      padding: '5px 14px', borderRadius: '999px', cursor: 'pointer',
                      border: `2px solid ${active ? (cfg?.color || '#d4a017') : '#2a2a38'}`,
                      background: active ? `${cfg?.color || '#d4a017'}18` : '#13131c',
                      color: active ? (cfg?.color || '#d4a017') : '#b8a88a',
                      fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem',
                      transition: 'all .15s',
                    }}>
                      {cfg ? `${cfg.emoji} ` : ''}{cat}
                    </button>
                  );
                })}
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite' }}>✈️</div>
              </div>
            )}

            {!loading && memories.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 28px', borderRadius: '20px', background: '#13131c', border: '2px solid rgba(212,160,23,0.15)' }}>
                <div style={{ fontSize: '4rem', marginBottom: '14px', animation: 'anim-float 2s ease-in-out infinite' }}>🏕️</div>
                <h3 style={{ fontFamily: 'Caveat, cursive', fontSize: '1.8rem', fontWeight: 700, color: '#f0e6d0', marginBottom: '8px' }}>Start your journey! 🌍</h3>
                <p style={{ fontFamily: 'Patrick Hand, sans-serif', color: '#7a6f5a', marginBottom: '20px' }}>Add your first memory to get started.</p>
                <button type="button" onClick={() => setShowForm(true)} style={{
                  padding: '12px 28px', borderRadius: '999px', border: '2px solid #d4a017',
                  background: 'rgba(212,160,23,0.15)', color: '#f5d56e', cursor: 'pointer',
                  fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.05rem',
                }}>✏️ Add First Memory</button>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div style={{ position: 'relative' }}>
                {/* Timeline dashed line */}
                <div style={{ position: 'absolute', left: '20px', top: '40px', bottom: '40px', width: '2px', background: 'repeating-linear-gradient(to bottom,rgba(212,160,23,0.3) 0,rgba(212,160,23,0.3) 8px,transparent 8px,transparent 14px)', borderRadius: '2px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                      expanded={expandedId === memory.id}
                      onToggleExpand={() => setExpandedId(expandedId === memory.id ? null : memory.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && memories.length > 0 && filtered.length === 0 && (
              <p style={{ textAlign: 'center', fontFamily: 'Caveat, cursive', color: '#7a6f5a', fontSize: '1.1rem', padding: '30px' }}>
                No memories in &ldquo;{filterCat}&rdquo; yet.{' '}
                <button type="button" onClick={() => setFilterCat('All')} style={{ background: 'none', border: 'none', color: '#d4a017', cursor: 'pointer', fontWeight: 700, fontFamily: 'Caveat, cursive', fontSize: '1.1rem', textDecoration: 'underline' }}>Show all</button>
              </p>
            )}
          </div>
        )}

        {/* ── Photos Tab ────────────────────────────────────── */}
        {activeTab === 'photos' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            <div style={{ background: '#13131c', border: '2px solid #2a2a38', borderRadius: '18px', padding: '20px' }}>
              <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.2rem', color: '#f0e6d0', marginBottom: '16px' }}>☁️ Upload Photos</p>
              <GooglePhotosUploader onUploadComplete={() => { }} />
            </div>
            <div style={{ background: '#13131c', border: '2px solid #2a2a38', borderRadius: '18px', padding: '20px' }}>
              <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.2rem', color: '#f0e6d0', marginBottom: '16px' }}>🖼️ My Gallery</p>
              <GooglePhotosGallery />
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {showForm && <AddMemoryForm onClose={() => setShowForm(false)} onMemoryAdded={() => setShowForm(false)} />}
      {showChallenge && <ChallengeModal memories={memories} onClose={() => setShowChallenge(false)} />}
    </>
  );
}
