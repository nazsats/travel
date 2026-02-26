'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Plane, MapPin, Camera, Plus, Calendar, Sunset } from 'lucide-react';
import AddMemoryForm from '@/components/AddMemoryForm';

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener from Firebase Firestore
  useEffect(() => {
    const q = query(collection(db, 'memories'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMemories(data);
      setLoading(false);
    }, (error) => {
      console.error('Firestore error:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleMemoryAdded = () => {
    // Firestore real-time listener handles updating the list automatically
    setShowForm(false);
  };

  const uniquePlaces = new Set(memories.map((m) => m.location)).size;

  // Calculate day number from March 3rd, 2026
  const tripStart = new Date('2026-03-03');
  const today = new Date();
  const dayNum = Math.max(1, Math.floor((today - tripStart) / (1000 * 60 * 60 * 24)) + 1);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className="page-wrapper animate-fade-in">

        {/* Header */}
        <header className="header glass-panel">
          <div className="flex items-center gap-4">
            <div className="header-icon">
              <Plane size={24} />
            </div>
            <div>
              <h1 className="header-title">Dubai Trip <span className="text-gradient">2026</span></h1>
              <p className="header-subtitle">✈️ My personal memory book — March 3rd onwards</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> New Memory
          </button>
        </header>

        {/* Stats */}
        <div className="stats-grid">
          <div className="glass-panel stat-card">
            <div className="stat-label"><Calendar size={16} /> Day</div>
            <div className="stat-value">{dayNum}</div>
          </div>
          <div className="glass-panel stat-card">
            <div className="stat-label"><Camera size={16} /> Memories</div>
            <div className="stat-value">{memories.length}</div>
          </div>
          <div className="glass-panel stat-card">
            <div className="stat-label"><MapPin size={16} /> Places</div>
            <div className="stat-value">{uniquePlaces}</div>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="timeline-section">
          <h2 className="section-title">My Journey</h2>

          {loading && (
            <div className="empty-state">
              <div className="loading-spinner"></div>
              <p>Loading your memories...</p>
            </div>
          )}

          {!loading && memories.length === 0 && (
            <div className="empty-state glass-panel">
              <Sunset size={48} style={{ color: 'var(--accent-secondary)', marginBottom: '16px' }} />
              <h3>Your trip starts March 3rd!</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                Tap <strong>New Memory</strong> to log your first adventure in Dubai 🌆
              </p>
            </div>
          )}

          {!loading && memories.length > 0 && (
            <div className="timeline-container">
              <div className="timeline-line"></div>
              <div className="memories-list">
                {memories.map((memory, index) => (
                  <div key={memory.id} className="memory-card glass-panel animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="memory-body">
                      <div className="memory-header">
                        <h3 className="memory-title">{memory.title}</h3>
                        <span className="memory-date">{formatDate(memory.date)}</span>
                      </div>
                      <div className="memory-location">
                        <MapPin size={14} /> {memory.location}
                      </div>
                      {memory.description && (
                        <p className="memory-description">{memory.description}</p>
                      )}
                    </div>

                    {/* Timeline dot */}
                    <div className="timeline-dot"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <AddMemoryForm
          onClose={() => setShowForm(false)}
          onMemoryAdded={handleMemoryAdded}
        />
      )}

      <style jsx global>{`

        .page-wrapper {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding: 40px 0;
        }

        /* Header */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-icon {
          background: var(--accent-gradient);
          padding: 12px;
          border-radius: 12px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-title {
          font-size: 1.8rem;
          margin: 0;
        }

        .header-subtitle {
          color: var(--text-secondary);
          margin: 0;
          font-size: 0.9rem;
        }

        /* Stats */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .stat-card {
          padding: 20px 24px;
        }

        .stat-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 2.2rem;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Timeline */
        .timeline-section {
          position: relative;
        }

        .section-title {
          font-size: 1.6rem;
          margin-bottom: 28px;
        }

        .timeline-container {
          position: relative;
        }

        .memories-list {
          display: flex;
          flex-direction: column;
          gap: 28px;
          padding-left: 44px;
          position: relative;
          z-index: 1;
        }

        .memory-card {
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .memory-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
        }

        .memory-body {
          padding: 24px;
        }

        .memory-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        .memory-title {
          font-size: 1.2rem;
          margin: 0;
        }

        .memory-date {
          color: var(--accent-secondary);
          font-size: 0.85rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .memory-location {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 14px;
        }

        .memory-description {
          margin: 0;
          color: var(--text-primary);
          line-height: 1.7;
          font-size: 0.95rem;
        }

        .timeline-dot {
          position: absolute;
          left: -36px;
          top: 28px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent-primary);
          border: 3px solid var(--bg-primary);
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(139, 92, 246, 0.2);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}
