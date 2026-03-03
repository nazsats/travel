'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, X, Trophy, Flame, Leaf, CheckCircle, Clock, Trash2, Zap } from 'lucide-react';

// ── Reward Modal ─────────────────────────────────────────────
function RewardModal({ challenge, onClose }) {
    return (
        <div onClick={e => e.target === e.currentTarget && onClose()} style={{
            position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
            <div style={{
                width: '100%', maxWidth: '420px', background: '#13131c',
                border: '2px solid #d4a017', borderRadius: '24px',
                boxShadow: '0 0 60px rgba(212,160,23,0.3)', padding: '32px 28px',
                textAlign: 'center', animation: 'modal-in .4s cubic-bezier(.16,1,.3,1)',
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '12px', animation: 'anim-float 2s ease-in-out infinite' }}>🎖️</div>
                <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '2rem', color: '#f5d56e', marginBottom: '6px' }}>Challenge Complete!</p>
                <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.2rem', color: '#b388ff', marginBottom: '16px' }}>{challenge.badge}</p>
                <div style={{
                    padding: '16px', borderRadius: '14px', background: 'rgba(212,160,23,0.1)',
                    border: '1.5px solid rgba(212,160,23,0.3)', marginBottom: '20px',
                }}>
                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.5rem', color: '#f0e6d0' }}>+{challenge.xp} XP Earned!</p>
                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.88rem', color: '#7a6f5a', marginTop: '4px' }}>
                        {challenge.difficulty === 'Hard' ? '🔥 Hardcore traveler! You crushed it.' : '🌱 Great start! Keep exploring.'}
                    </p>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(179,136,255,0.08)', border: '1px solid rgba(179,136,255,0.2)', marginBottom: '20px' }}>
                    <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.05rem', color: '#ce93d8', fontStyle: 'italic' }}>
                        &ldquo;Every journey begins with a single step, and yours just got a lot more epic.&rdquo;
                    </p>
                </div>
                <button type="button" onClick={onClose} style={{
                    width: '100%', padding: '13px', borderRadius: '999px',
                    border: '2px solid #d4a017', background: 'linear-gradient(135deg,rgba(212,160,23,.25),rgba(184,134,11,.15))',
                    color: '#f5d56e', fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer',
                }}>🎯 Accept Next Challenge!</button>
            </div>
        </div>
    );
}

// ── Single challenge card ────────────────────────────────────
function ChallengeCard({ ch, onStatusChange, onDelete }) {
    const deadline = ch.acceptedAt?.toDate?.() || (ch.acceptedAt ? new Date(ch.acceptedAt) : null);
    const daysLimit = ch.difficulty === 'Hard' ? 7 : 30;
    const daysLeft = deadline ? Math.ceil((deadline.getTime() + daysLimit * 86400000 - Date.now()) / 86400000) : null;
    const urgent = daysLeft !== null && daysLeft <= 3 && ch.status !== 'completed';
    const overdue = daysLeft !== null && daysLeft < 0 && ch.status !== 'completed';

    const statusColors = { active: '#d4a017', completed: '#4caf50', abandoned: '#7a6f5a' };
    const statusLabel = { active: '⚡ Active', completed: '✅ Completed', abandoned: '🚫 Abandoned' };

    return (
        <div style={{
            background: '#13131c', borderRadius: '16px', overflow: 'hidden',
            border: `2px solid ${urgent ? '#ff7043' : overdue ? '#ff5252' : ch.status === 'completed' ? '#4caf50' : '#2a2a38'}`,
            boxShadow: ch.status === 'completed' ? '0 0 18px rgba(76,175,80,0.15)' : urgent ? '0 0 18px rgba(255,112,67,0.15)' : '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'all .2s',
        }}>
            {/* Difficulty bar */}
            <div style={{ height: '3px', background: ch.difficulty === 'Hard' ? 'linear-gradient(90deg,#ff5252,#ff7043)' : 'linear-gradient(90deg,#4caf50,#81c784)' }} />

            <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                                padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem',
                                fontFamily: 'Caveat, cursive', fontWeight: 700,
                                background: ch.difficulty === 'Hard' ? 'rgba(255,82,82,0.15)' : 'rgba(76,175,80,0.15)',
                                color: ch.difficulty === 'Hard' ? '#ff5252' : '#4caf50',
                                border: `1px solid ${ch.difficulty === 'Hard' ? '#ff5252' : '#4caf50'}`,
                            }}>
                                {ch.difficulty === 'Hard' ? '🔥 Hard' : '🌱 Easy'} • {ch.xp} XP
                            </span>
                            <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontFamily: 'Patrick Hand, sans-serif', background: `${statusColors[ch.status] || '#7a6f5a'}18`, color: statusColors[ch.status] || '#7a6f5a', border: `1px solid ${statusColors[ch.status] || '#7a6f5a'}` }}>
                                {statusLabel[ch.status] || '⚡ Active'}
                            </span>
                        </div>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.1rem', color: '#f0e6d0', lineHeight: 1.3, marginBottom: '4px' }}>{ch.title}</p>
                        <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.85rem', color: '#b8a88a', lineHeight: 1.55 }}>{ch.description}</p>
                        {ch.hint && <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.8rem', color: '#7a6f5a', marginTop: '6px' }}>💡 {ch.hint}</p>}
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.8rem', fontWeight: 700, color: overdue ? '#ff5252' : urgent ? '#ff7043' : '#f0e6d0', lineHeight: 1 }}>
                            {ch.status === 'completed' ? '🏆' : daysLeft !== null ? (overdue ? 'Overdue!' : `${daysLeft}d`) : '—'}
                        </p>
                        {daysLeft !== null && ch.status !== 'completed' && (
                            <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.7rem', color: overdue ? '#ff5252' : '#7a6f5a' }}>
                                {overdue ? 'Challenge failed' : 'remaining'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {ch.status !== 'completed' && ch.status !== 'abandoned' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => onStatusChange(ch.id, 'completed')} style={{
                            flex: 1, padding: '8px', borderRadius: '10px', cursor: 'pointer',
                            border: '1.5px solid #4caf50', background: 'rgba(76,175,80,0.1)',
                            color: '#4caf50', fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all .2s',
                        }}>✅ Mark Complete</button>
                        <button type="button" onClick={() => onDelete(ch.id)} style={{
                            padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                            border: '1.5px solid #2a2a38', background: 'transparent',
                            color: '#7a6f5a', transition: 'all .2s',
                        }} title="Abandon challenge">🚫</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main ChallengeTracker ────────────────────────────────────
export function ChallengeTracker({ totalXP, onXPChange }) {
    const [challenges, setChallenges] = useState([]);
    const [rewardCh, setRewardCh] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'challenges'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => {
                if (a.status === 'completed') return 1;
                const da = a.acceptedAt?.toDate?.() || 0;
                const db2 = b.acceptedAt?.toDate?.() || 0;
                return db2 - da;
            });
            setChallenges(data);
        });
        return () => unsub();
    }, []);

    const handleStatusChange = async (id, newStatus) => {
        const ch = challenges.find(c => c.id === id);
        if (!ch) return;
        await updateDoc(doc(db, 'challenges', id), {
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
        });
        if (newStatus === 'completed') {
            setRewardCh(ch);
            onXPChange((totalXP || 0) + (ch.xp || 100));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Abandon this challenge? You\'ll lose your progress! 😬')) return;
        await deleteDoc(doc(db, 'challenges', id));
    };

    const active = challenges.filter(c => c.status !== 'completed' && c.status !== 'abandoned');
    const done = challenges.filter(c => c.status === 'completed');
    const urgentChallenges = active.filter(c => {
        const d = c.acceptedAt?.toDate?.() || (c.acceptedAt ? new Date(c.acceptedAt) : null);
        if (!d) return false;
        const daysLimit = c.difficulty === 'Hard' ? 7 : 30;
        const daysLeft = Math.ceil((d.getTime() + daysLimit * 86400000 - Date.now()) / 86400000);
        return daysLeft <= 3;
    });

    if (challenges.length === 0) return null;

    return (
        <>
            {/* Notification bar */}
            {urgentChallenges.length > 0 && (
                <div style={{
                    padding: '10px 20px', background: 'linear-gradient(90deg,rgba(255,112,67,0.15),rgba(255,82,82,0.1))',
                    border: '1.5px solid rgba(255,112,67,0.4)', borderRadius: '12px', marginBottom: '20px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                    <span style={{ fontSize: '1.2rem' }}>⏰</span>
                    <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.98rem', color: '#ff7043' }}>
                        {urgentChallenges.length === 1
                            ? `"${urgentChallenges[0].title}" expires soon! Don't give up!`
                            : `${urgentChallenges.length} challenges expiring soon — stay on track!`}
                    </p>
                </div>
            )}

            <div style={{ marginBottom: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.8rem', color: '#f0e6d0' }}>🏆 My Challenges</h2>
                        <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.88rem', color: '#7a6f5a', marginTop: '2px' }}>
                            {active.length} active • {done.length} completed • {totalXP || 0} XP
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '999px', background: 'rgba(212,160,23,0.1)', border: '1.5px solid rgba(212,160,23,0.3)' }}>
                        <Zap size={14} color="#d4a017" />
                        <span style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.1rem', color: '#f5d56e' }}>{totalXP || 0} XP</span>
                    </div>
                </div>

                {active.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '14px', marginBottom: '20px' }}>
                        {active.map(ch => <ChallengeCard key={ch.id} ch={ch} onStatusChange={handleStatusChange} onDelete={handleDelete} />)}
                    </div>
                )}

                {done.length > 0 && (
                    <details>
                        <summary style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1rem', color: '#4caf50', cursor: 'pointer', marginBottom: '12px', listStyle: 'none' }}>
                            ✅ Show {done.length} completed challenge{done.length !== 1 ? 's' : ''}
                        </summary>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '14px', opacity: 0.7 }}>
                            {done.map(ch => <ChallengeCard key={ch.id} ch={ch} onStatusChange={handleStatusChange} onDelete={handleDelete} />)}
                        </div>
                    </details>
                )}
            </div>

            {rewardCh && <RewardModal challenge={rewardCh} onClose={() => setRewardCh(null)} />}
        </>
    );
}

// ── Challenge generation modal ────────────────────────────────
export function ChallengeModal({ memories, onClose }) {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [accepted, setAccepted] = useState({});
    const [selectedDeadlines, setSelectedDeadlines] = useState({});

    useEffect(() => {
        const generate = async () => {
            try {
                let userCountry = 'Unknown';
                if ('geolocation' in navigator) {
                    try {
                        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
                        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
                        const d = await r.json();
                        userCountry = d.address?.country || 'Unknown';
                    } catch { /* fallback */ }
                }
                const res = await fetch('/api/ai-challenge', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ memories, userCountry }),
                });
                const data = await res.json();
                setChallenges(data.challenges || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        generate();
    }, []);

    const acceptChallenge = async (ch, idx) => {
        const deadline = selectedDeadlines[idx] || (ch.difficulty === 'Hard' ? 7 : 30);
        await addDoc(collection(db, 'challenges'), {
            ...ch,
            status: 'active',
            deadline,
            acceptedAt: serverTimestamp(),
            completedAt: null,
        });
        setAccepted(prev => ({ ...prev, [idx]: true }));
    };

    return (
        <div onClick={e => e.target === e.currentTarget && onClose()} style={{
            position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '16px', overflowY: 'auto',
        }}>
            <div style={{
                width: '100%', maxWidth: '640px', background: '#13131c',
                border: '2px solid rgba(212,160,23,0.3)', borderRadius: '24px',
                boxShadow: '0 24px 64px rgba(0,0,0,.7),0 0 50px rgba(212,160,23,.1)',
                maxHeight: '90vh', overflowY: 'auto',
                animation: 'modal-in .4s cubic-bezier(.16,1,.3,1)',
            }}>
                <div style={{ height: '4px', borderRadius: '22px 22px 0 0', background: 'linear-gradient(90deg,#ff5252,#d4a017,#4caf50)' }} />
                <div style={{ padding: '24px 26px 16px', borderBottom: '1px solid #2a2a38', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.6rem', color: '#f0e6d0' }}>🎯 Your Travel Challenges</p>
                        <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.85rem', color: '#7a6f5a', marginTop: '2px' }}>
                            {loading ? 'AI is crafting challenges just for you...' : 'Personalised based on your travel history & location'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid #2a2a38', background: '#1a1a24', color: '#7a6f5a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
                </div>

                <div style={{ padding: '20px 26px 26px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ fontSize: '3rem', animation: 'anim-float 1.5s ease-in-out infinite' }}>🌍</div>
                            <Loader2 size={24} color="#d4a017" style={{ animation: 'spin 1s linear infinite' }} />
                            <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.1rem', color: '#b8a88a' }}>Crafting personalised challenges...</p>
                        </div>
                    ) : challenges.map((ch, idx) => (
                        <div key={idx} style={{
                            background: '#0d0d14', borderRadius: '16px', overflow: 'hidden',
                            border: `1.5px solid ${accepted[idx] ? '#4caf50' : ch.difficulty === 'Hard' ? 'rgba(255,82,82,0.3)' : 'rgba(76,175,80,0.3)'}`,
                            transition: 'all .2s',
                        }}>
                            <div style={{ height: '3px', background: ch.difficulty === 'Hard' ? 'linear-gradient(90deg,#ff5252,#ff7043)' : 'linear-gradient(90deg,#4caf50,#81c784)' }} />
                            <div style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontFamily: 'Caveat, cursive', fontWeight: 700, background: ch.difficulty === 'Hard' ? 'rgba(255,82,82,0.15)' : 'rgba(76,175,80,0.15)', color: ch.difficulty === 'Hard' ? '#ff5252' : '#4caf50', border: `1px solid ${ch.difficulty === 'Hard' ? '#ff5252' : '#4caf50'}` }}>
                                        {ch.difficulty === 'Hard' ? '🔥 Hard' : '🌱 Easy'} • {ch.xp} XP
                                    </span>
                                    <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontFamily: 'Caveat, cursive', fontWeight: 700, background: 'rgba(179,136,255,0.1)', color: '#b388ff', border: '1px solid rgba(179,136,255,0.3)' }}>{ch.badge}</span>
                                </div>
                                <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1.1rem', color: '#f0e6d0', marginBottom: '4px' }}>{ch.title}</p>
                                <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.85rem', color: '#b8a88a', lineHeight: 1.55, marginBottom: '8px' }}>{ch.description}</p>
                                {ch.hint && <p style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.8rem', color: '#7a6f5a', marginBottom: '10px' }}>💡 Tip: {ch.hint}</p>}

                                {!accepted[idx] ? (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <select value={selectedDeadlines[idx] || (ch.difficulty === 'Hard' ? 7 : 30)}
                                            onChange={e => setSelectedDeadlines(p => ({ ...p, [idx]: Number(e.target.value) }))}
                                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #2a2a38', background: '#111118', color: '#b8a88a', fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                                            {ch.difficulty === 'Hard' ? (
                                                <><option value={3}>3 days 🔥</option><option value={7}>7 days</option></>
                                            ) : (
                                                <><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></>
                                            )}
                                        </select>
                                        <button type="button" onClick={() => acceptChallenge(ch, idx)} style={{
                                            flex: 1, padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                                            border: `1.5px solid ${ch.difficulty === 'Hard' ? '#ff5252' : '#4caf50'}`,
                                            background: ch.difficulty === 'Hard' ? 'rgba(255,82,82,0.12)' : 'rgba(76,175,80,0.12)',
                                            color: ch.difficulty === 'Hard' ? '#ff5252' : '#4caf50',
                                            fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.95rem', transition: 'all .2s',
                                        }}>Accept Challenge {ch.difficulty === 'Hard' ? '🔥' : '🌱'}</button>
                                    </div>
                                ) : (
                                    <div style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(76,175,80,0.12)', border: '1.5px solid #4caf50', textAlign: 'center' }}>
                                        <p style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.95rem', color: '#4caf50' }}>✅ Challenge Accepted! Track it below.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
