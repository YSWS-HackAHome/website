import React, { useRef, useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { Reveal } from '../../components/Reveal';

export default function AccountSettings() {
    const { userData, updateAccount } = useUser();
    const { account } = userData;

    const [formData, setFormData] = useState({ ...account });
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        setFormData({ ...account });
        setHasChanges(false);
    }, [account]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setHasChanges(true);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, avatar: reader.result });
                setHasChanges(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/account', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    avatar: formData.avatar
                })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                updateAccount(updatedUser);
                setHasChanges(false);
            } else {
                const err = await response.json();
                alert(`Save failed: ${err.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Save failed", error);
            alert("Network error. Is the backend running?");
        } finally {
            setIsSaving(false);
        }
    };

    const labelStyle = {
        fontSize: '0.7rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: '0.5rem',
        color: 'var(--text-muted)'
    };

    return (
        <div style={{ maxWidth: '900px' }}>
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.5rem', fontWeight: 800 }}>
                        USER <span style={{ color: 'var(--accent-orange)' }}>SETTINGS</span>
                    </h2>
                    <div style={{ height: '4px', width: '60px', background: 'var(--text-main)', marginTop: '0.5rem' }}></div>
                </div>

                <button
                    className="btn-primary"
                    disabled={!hasChanges || isSaving}
                    onClick={handleSave}
                    style={{ opacity: hasChanges ? 1 : 0.5 }}
                >
                    <span>{isSaving ? 'SYNCING...' : 'SAVE_CHANGES'}</span>
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Reveal>
                        <div className="brutal-card">
                            <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Identity</h3>
                            <label style={labelStyle}>Display Name</label>
                            <input
                                name="name"
                                className="brutal-input"
                                value={formData.name || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </Reveal>

                    <Reveal delay={0.1}>
                        <div className="brutal-card" style={{ background: 'rgba(0,0,0,0.02)', borderStyle: 'dashed' }}>
                            <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1.5rem', fontSize: '1.2rem', opacity: 0.6 }}>OIDC Metadata 🔒</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div><label style={labelStyle}>HCA_SUB</label><p style={{ fontFamily: 'DM Mono', fontSize: '0.8rem' }}>{formData.sub}</p></div>
                                <div><label style={labelStyle}>EMAIL</label><p style={{ fontFamily: 'DM Mono', fontSize: '0.8rem' }}>{formData.email}</p></div>
                                <div><label style={labelStyle}>SLACK ID</label><p style={{ fontFamily: 'DM Mono', fontSize: '0.8rem' }}>{formData.slack_id}</p></div>
                                <div><label style={labelStyle}>STATUS</label><span className="brutal-badge" style={{ background: '#fff' }}>{formData.verification_status}</span></div>
                            </div>
                        </div>
                    </Reveal>
                </div>

                <Reveal delay={0.2}>
                    <div className="brutal-card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div
                            onClick={() => fileInputRef.current.click()}
                            style={{
                                width: '100%',
                                aspectRatio: '1/1',
                                border: 'var(--brutal-border)',
                                background: 'var(--bg-color)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '4rem',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {(formData.avatar && (formData.avatar.startsWith('data:image') || formData.avatar.startsWith('http'))) ? (
                                <img src={formData.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            ) : (
                                <span>{formData.avatar || '🧪'}</span>
                            )}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                width: '100%',
                                background: 'var(--text-main)',
                                color: '#fff',
                                fontSize: '0.6rem',
                                padding: '6px 0',
                                fontWeight: 800,
                                letterSpacing: '0.1em'
                            }}>
                                OVERWRITE_AVATAR
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
                    </div>
                </Reveal>
            </div>
        </div>
    );
}