'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, MapPin, Calendar, Type } from 'lucide-react';

const styles = {
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modal: {
        width: '100%',
        maxWidth: '580px',
        padding: '32px',
        background: 'rgba(18, 18, 22, 0.92)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    modalHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
    },
    closeBtn: {
        background: 'transparent',
        border: 'none',
        color: 'rgba(255,255,255,0.5)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '4px',
        borderRadius: '6px',
        transition: 'color 0.2s',
    },
    formCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    iconInInput: {
        position: 'absolute',
        left: '14px',
        color: 'rgba(255,255,255,0.4)',
        pointerEvents: 'none',
        zIndex: 1,
    },
    input: {
        width: '100%',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '13px 14px 13px 42px',
        color: '#f8f9fa',
        fontFamily: 'inherit',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    textarea: {
        width: '100%',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '13px 14px',
        color: '#f8f9fa',
        fontFamily: 'inherit',
        fontSize: '0.95rem',
        outline: 'none',
        resize: 'vertical',
        minHeight: '100px',
        transition: 'border-color 0.2s',
    },
    row: {
        display: 'flex',
        gap: '12px',
    },
    btnRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '8px',
        gap: '12px',
    },
};

export default function AddMemoryForm({ onClose, onMemoryAdded }) {
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !location || !date) {
            setError('Title, location, and date are required.');
            return;
        }
        setError('');
        setIsSubmitting(true);

        try {
            const newMemory = {
                title,
                location,
                date: date, // keep as YYYY-MM-DD ISO string for easy sorting
                description,
                createdAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'memories'), newMemory);
            onMemoryAdded({ id: docRef.id, ...newMemory });
        } catch (err) {
            console.error('Error adding memory:', err);
            setError('Failed to save memory. Check your Firebase rules or connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={styles.modal}>
                <div style={styles.modalHeader}>
                    <h2 style={{ fontSize: '1.4rem', margin: 0 }}>💭 Add New Memory</h2>
                    <button style={styles.closeBtn} onClick={onClose} disabled={isSubmitting} aria-label="Close">
                        <X size={22} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={styles.formCol}>
                    {/* Title */}
                    <div style={styles.inputWrapper}>
                        <span style={styles.iconInInput}><Type size={16} /></span>
                        <input
                            type="text"
                            placeholder="What did you do? (e.g. Burj Khalifa Visit)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            disabled={isSubmitting}
                            style={styles.input}
                        />
                    </div>

                    {/* Location + Date */}
                    <div style={styles.row}>
                        <div style={{ ...styles.inputWrapper, flex: 1 }}>
                            <span style={styles.iconInInput}><MapPin size={16} /></span>
                            <input
                                type="text"
                                placeholder="Location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                required
                                disabled={isSubmitting}
                                style={styles.input}
                            />
                        </div>
                        <div style={{ ...styles.inputWrapper, flex: 1 }}>
                            <span style={styles.iconInInput}><Calendar size={16} /></span>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                disabled={isSubmitting}
                                style={{ ...styles.input, colorScheme: 'dark' }}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <textarea
                        placeholder="Write a few notes about this memory..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="3"
                        disabled={isSubmitting}
                        style={styles.textarea}
                    />

                    {error && (
                        <p style={{ color: '#f87171', fontSize: '0.85rem', margin: 0 }}>{error}</p>
                    )}

                    <div style={styles.btnRow}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : '✦ Add Memory'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
