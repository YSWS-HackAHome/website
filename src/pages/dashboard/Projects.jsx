import React, { useState, useRef, memo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useUser } from './UserContext';
import { Reveal } from '../../components/Reveal';

// ─── Memoized thumbnail preview image ────────────────────────────────────────
// Defined at module level so React never sees it as a "new" component type.
// Only re-renders when src changes — not when the parent types in any field.
const ThumbPreview = memo(function ThumbPreview({ src, size }) {
    const isImage = src && (src.includes('data:image') || src.startsWith('http'));
    if (isImage) {
        return (
            <img
                src={src}
                alt="thumbnail"
                style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block'
                }}
            />
        );
    }
    return <span style={{ fontSize: size === 'large' ? '3.5rem' : '1.5rem' }}>{src || '🛠️'}</span>;
});

// ─── Memoized thumbnail upload field ─────────────────────────────────────────
// Also at module level. Receives stable callbacks via useCallback from parent.
const ThumbnailField = memo(function ThumbnailField({
    thumbData, editThumb, onTextChange, onUpload, onRemove, getInputStyle
}) {
    const fileRef = useRef(null);
    const hasImage = !!thumbData;
    return (
        <>
            <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>THUMBNAIL (EMOJI OR IMAGE URL)</label>
            {hasImage ? (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.8rem', marginBottom: '1rem',
                    border: 'var(--brutal-border)', background: '#f9f9f9'
                }}>
                    <img
                        src={thumbData}
                        alt="thumbnail preview"
                        style={{ width: '40px', height: '40px', objectFit: 'cover', border: '1px solid var(--text-muted)', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Image uploaded ✓</span>
                    <button className="btn-ghost" onClick={onRemove} style={{ fontSize: '0.7rem', marginLeft: 'auto' }}>
                        <span>Remove</span>
                    </button>
                </div>
            ) : (
                <input
                    style={getInputStyle(false)}
                    value={editThumb}
                    onChange={e => onTextChange(e.target.value)}
                    placeholder="🚀 or https://..."
                />
            )}
            <div style={{ marginTop: hasImage ? 0 : '-0.5rem', marginBottom: '1rem' }}>
                <input
                    type="file"
                    ref={fileRef}
                    onChange={e => { onUpload(e); fileRef.current.value = ''; }}
                    style={{ display: 'none' }}
                    accept="image/*"
                />
                <button className="btn-ghost" onClick={() => fileRef.current.click()} style={{ fontSize: '0.7rem' }}>
                    <span>{hasImage ? 'Replace Image' : 'Or Upload Image File'}</span>
                </button>
            </div>
        </>
    );
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function Projects() {
    const { userData, updateProject, addLog, addProject } = useUser();
    const { projects = [], devLogs = [] } = userData;

    const [selectedProject, setSelectedProject] = useState(null);
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editGithub, setEditGithub] = useState('');
    const [editWebsite, setEditWebsite] = useState('');
    const [editThumb, setEditThumb] = useState('');
    const [editHackatime, setEditHackatime] = useState('');

    // The base64/data-URI lives in a ref — changing it does NOT trigger re-renders,
    // so typing in name/desc/etc. never causes the GIF preview to repaint.
    const thumbDataRef = useRef(null);

    // A separate counter only bumped when an image is added/removed.
    // Used as the `key` prop on ThumbPreview and ThumbnailField so they
    // re-render with the new src exactly once, then stay frozen again.
    const [thumbKey, setThumbKey] = useState(0);

    const [projectErrors, setProjectErrors] = useState({});

    const [logTitle, setLogTitle] = useState('');
    const [logContent, setLogContent] = useState('');
    const [logTime, setLogTime] = useState('');
    const [logErrors, setLogErrors] = useState({});

    // ── thumb helpers ─────────────────────────────────────────────────────────

    const setThumbImage = (dataUri) => {
        thumbDataRef.current = dataUri;
        setThumbKey(k => k + 1);
    };

    const clearThumbImage = () => {
        thumbDataRef.current = null;
        setThumbKey(k => k + 1);
    };

    // ── form helpers ──────────────────────────────────────────────────────────

    const resetForm = () => {
        setEditName(''); setEditDesc(''); setEditGithub('');
        setEditWebsite(''); setEditThumb(''); setEditHackatime('');
        clearThumbImage();
        setProjectErrors({});
    };

    const handleEditClick = () => {
        setEditName(selectedProject.name || '');
        setEditDesc(selectedProject.desc || '');
        setEditGithub(selectedProject.github || '');
        setEditWebsite(selectedProject.website || '');
        setEditHackatime(selectedProject.hackatime || '');
        setProjectErrors({});

        const existingThumb = selectedProject.thumb || '';
        if (existingThumb.includes('data:image') || existingThumb.startsWith('http')) {
            setThumbImage(existingThumb);
            setEditThumb('');
        } else {
            clearThumbImage();
            setEditThumb(existingThumb);
        }

        setIsEditingProject(true);
    };

    // Stable callbacks — ThumbnailField won't re-render just because parent re-renders
    const handleImageUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setThumbImage(reader.result);
        reader.readAsDataURL(file);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleThumbTextChange = useCallback((val) => setEditThumb(val), []);

    const handleThumbRemove = useCallback(() => {
        clearThumbImage();
        setEditThumb('');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── other handlers ────────────────────────────────────────────────────────

    const handlePaste = async (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                const textarea = e.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const placeholder = "\n![Uploading...]()\n";
                setLogContent(prev => prev.substring(0, start) + placeholder + prev.substring(end));
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const response = await fetch('/api/upload', { method: 'POST', body: formData });
                    if (!response.ok) throw new Error('Upload failed');
                    const data = await response.json();
                    if (data.name) {
                        const imageTag = `\n<img src="/uploads/${data.name}" alt="upload" />\n`;
                        setLogContent(prev => prev.replace(placeholder, imageTag));
                    }
                } catch (err) {
                    console.error("Upload error:", err);
                    setLogContent(prev => prev.replace(placeholder, "\n> ❌ Image upload failed\n"));
                }
            }
        }
    };

    const handleSubmitForReview = async () => {
        if (!selectedProject) return;
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/projects/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: selectedProject.id })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to submit project');
            }
            const result = await response.json();
            const updatedProject = { ...selectedProject, status: 'submitted' };
            updateProject(selectedProject.id, updatedProject);
            setSelectedProject(updatedProject);
            if (result.devLog) addLog(result.devLog);
            alert('Project submitted for review successfully!');
        } catch (err) {
            console.error('Submit error:', err);
            alert(err.message || "Failed to submit project for review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const validateGithubFormat = (github) => {
        if (!github) return true;
        const cleaned = github.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
        return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(cleaned);
    };

    const validateHours = (hours) => {
        const time = parseFloat(hours);
        return !isNaN(time) && time >= 0 && time <= 1000;
    };

    const validate = () => {
        const errors = {};
        if (!editName.trim()) errors.name = true;
        if (!editDesc.trim()) errors.desc = true;
        if (editGithub && !validateGithubFormat(editGithub)) errors.github = true;
        setProjectErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const getCleanedData = () => {
        const github = editGithub
            ? editGithub.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '').trim()
            : '';
        return {
            name: editName.trim(),
            desc: editDesc.trim(),
            github,
            website: editWebsite ? editWebsite.trim() : '',
            thumb: thumbDataRef.current || editThumb || '🛠️',
            hackatime: editHackatime ? editHackatime.trim() : ''
        };
    };

    const handleCreateProject = async () => {
        if (!validate()) return;
        setIsSaving(true);
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getCleanedData())
            });
            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.detail) {
                    const apiErrors = {};
                    errorData.detail.forEach(err => { if (err.loc.includes('github')) apiErrors.github = true; });
                    setProjectErrors(prev => ({ ...prev, ...apiErrors }));
                    throw new Error('Validation failed');
                }
                throw new Error('Failed to create project');
            }
            const newProject = await response.json();
            addProject(newProject);
            setIsCreating(false);
            setSelectedProject(newProject);
            resetForm();
        } catch (err) {
            console.error('Create project error:', err);
            alert(err.message || "Failed to create project.");
        } finally {
            setIsSaving(false);
        }
    };

    const saveProjectDetails = async () => {
        if (!validate()) return;
        setIsSaving(true);
        try {
            const response = await fetch(`/api/projects/${selectedProject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getCleanedData())
            });
            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.detail) {
                    const apiErrors = {};
                    errorData.detail.forEach(err => { if (err.loc.includes('github')) apiErrors.github = true; });
                    setProjectErrors(prev => ({ ...prev, ...apiErrors }));
                    throw new Error('Validation failed');
                }
                throw new Error('Failed to update project');
            }
            const updated = await response.json();
            updateProject(selectedProject.id, updated);
            setSelectedProject(updated);
            setIsEditingProject(false);
            clearThumbImage();
        } catch (err) {
            console.error('Update error:', err);
            alert(err.message || "Failed to update project.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddLog = async () => {
        const time = parseFloat(logTime);
        if (!logTitle.trim() || !logContent.trim() || !validateHours(logTime)) {
            setLogErrors({
                title: !logTitle.trim(),
                content: !logContent.trim(),
                time: !validateHours(logTime)
            });
            return;
        }
        try {
            const response = await fetch('/api/devlogs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: selectedProject.id,
                    title: logTitle,
                    timeSpent: time,
                    content: logContent
                })
            });
            if (response.ok) {
                const newLog = await response.json();
                addLog(newLog);
                setLogTitle(''); setLogContent(''); setLogTime('');
                setLogErrors({});
            } else {
                const errorData = await response.json();
                console.error('Log creation error:', errorData);
                alert("Failed to post log");
            }
        } catch (err) {
            console.error('Log error:', err);
            alert("Failed to post log");
        }
    };

    // ── style helpers ─────────────────────────────────────────────────────────

    const getInputStyle = (error) => ({
        width: '100%', padding: '0.8rem', marginBottom: '1rem',
        border: error ? '3px solid #ff4444' : 'var(--brutal-border)',
        background: '#fff', fontFamily: 'inherit', outline: 'none',
        transition: 'border 0.2s ease-in-out'
    });

    // Stable reference passed to ThumbnailField so it doesn't think props changed
    const stableGetInputStyle = useCallback((error) => ({
        width: '100%', padding: '0.8rem', marginBottom: '1rem',
        border: error ? '3px solid #ff4444' : 'var(--brutal-border)',
        background: '#fff', fontFamily: 'inherit', outline: 'none',
        transition: 'border 0.2s ease-in-out'
    }), []);

    const getErrorHelperText = (error, field) => {
        if (!error) return null;
        return (
            <p style={{ color: '#ff4444', fontSize: '0.75rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                {field === 'github'
                    ? 'Invalid format. Please use "username/repo" (e.g., "facebook/react") or a full GitHub URL.'
                    : 'This field is required.'}
            </p>
        );
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { color: '#666', text: 'DRAFT', icon: '📝' },
            submitted: { color: '#ffa500', text: 'PENDING REVIEW', icon: '⏳' },
            approved: { color: '#00cc00', text: 'APPROVED', icon: '✅' },
            rejected: { color: '#ff4444', text: 'REJECTED', icon: '❌' }
        };
        const config = statusConfig[status] || statusConfig.draft;
        return (
            <div style={{
                background: config.color, color: '#fff', padding: '0.3rem 0.8rem',
                borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
            }}>
                <span>{config.icon}</span><span>{config.text}</span>
            </div>
        );
    };

    const badgeStyle = {
        display: 'inline-flex', padding: '0.4rem 0.8rem', border: '2px solid var(--text-main)',
        fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', color: 'var(--text-main)',
        boxShadow: '2px 2px 0 var(--text-main)', background: '#fff'
    };

    const markdownComponents = {
        code({ node, inline, className, children, ...props }) {
            return !inline ? (
                <pre style={{
                    background: '#f5f5f5', padding: '1rem', borderRadius: '4px',
                    overflowX: 'auto', border: '2px solid var(--text-main)', margin: '1rem 0'
                }}>
                    <code className={className} {...props} style={{ fontFamily: 'monospace' }}>{children}</code>
                </pre>
            ) : (
                <code {...props} style={{
                    background: '#f5f5f5', padding: '0.2rem 0.4rem',
                    borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.9em'
                }}>{children}</code>
            );
        },
        a({ node, children, href, ...props }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-orange)', textDecoration: 'underline', fontWeight: 'bold' }} {...props}>{children}</a>;
        },
        h1({ node, children, ...props }) { return <h1 style={{ fontSize: '2rem', marginTop: '1.5rem', marginBottom: '1rem' }} {...props}>{children}</h1>; },
        h2({ node, children, ...props }) { return <h2 style={{ fontSize: '1.5rem', marginTop: '1.25rem', marginBottom: '0.75rem' }} {...props}>{children}</h2>; },
        h3({ node, children, ...props }) { return <h3 style={{ fontSize: '1.25rem', marginTop: '1rem', marginBottom: '0.5rem' }} {...props}>{children}</h3>; },
        ul({ node, children, ...props }) { return <ul style={{ marginTop: '0.5rem', marginBottom: '0.5rem', paddingLeft: '2rem' }} {...props}>{children}</ul>; },
        ol({ node, children, ...props }) { return <ol style={{ marginTop: '0.5rem', marginBottom: '0.5rem', paddingLeft: '2rem' }} {...props}>{children}</ol>; },
        blockquote({ node, children, ...props }) {
            return <blockquote style={{ borderLeft: '4px solid var(--accent-orange)', margin: '1rem 0', padding: '0.5rem 1rem', background: '#f9f9f9', fontStyle: 'italic' }} {...props}>{children}</blockquote>;
        },
        table({ node, children, ...props }) { return <table style={{ borderCollapse: 'collapse', width: '100%', margin: '1rem 0' }} {...props}>{children}</table>; },
        th({ node, children, ...props }) { return <th style={{ border: '2px solid var(--text-main)', padding: '0.5rem', background: '#f0f0f0', fontWeight: 'bold' }} {...props}>{children}</th>; },
        td({ node, children, ...props }) { return <td style={{ border: '2px solid var(--text-main)', padding: '0.5rem' }} {...props}>{children}</td>; },
        img({ node, src, alt, ...props }) {
            return <img src={src} alt={alt} style={{ maxWidth: '100%', height: 'auto', border: '2px solid var(--text-main)', margin: '1rem 0', display: 'block' }} {...props} />;
        }
    };

    // ── views ─────────────────────────────────────────────────────────────────

    if (isCreating) {
        return (
            <div className="project-create-view">
                <button onClick={() => { setIsCreating(false); resetForm(); }} className="btn-ghost" style={{ marginBottom: '2rem' }}>
                    <span>← Cancel</span>
                </button>
                <Reveal>
                    <section className="brutal-card">
                        <h2 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1.5rem' }}>NEW PROJECT</h2>

                        <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>PROJECT TITLE *</label>
                        <input style={getInputStyle(projectErrors.name)} value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. My Awesome App" />
                        {getErrorHelperText(projectErrors.name, 'name')}

                        <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>DESCRIPTION *</label>
                        <textarea style={{ ...getInputStyle(projectErrors.desc), minHeight: '100px' }} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="What are you building?" />
                        {getErrorHelperText(projectErrors.desc, 'desc')}

                        <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>GITHUB (OPTIONAL)</label>
                        <input style={getInputStyle(projectErrors.github)} value={editGithub} onChange={e => setEditGithub(e.target.value)} placeholder="username/repo or full GitHub URL" />
                        {getErrorHelperText(projectErrors.github, 'github')}

                        <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>WEBSITE (OPTIONAL)</label>
                        <input style={getInputStyle()} value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="https://example.com" />

                        {/*
                            key={thumbKey} means ThumbnailField re-renders exactly once when
                            an image is uploaded or removed, then stays frozen during typing.
                        */}
                        <ThumbnailField
                            key={thumbKey}
                            thumbData={thumbDataRef.current}
                            editThumb={editThumb}
                            onTextChange={handleThumbTextChange}
                            onUpload={handleImageUpload}
                            onRemove={handleThumbRemove}
                            getInputStyle={stableGetInputStyle}
                        />

                        <button className="btn-primary" onClick={handleCreateProject} disabled={isSaving} style={{ width: '100%', marginTop: '1.5rem' }}>
                            <span>{isSaving ? 'Launching...' : 'Create Project →'}</span>
                        </button>

                        {Object.keys(projectErrors).length > 0 && (
                            <p style={{ color: '#ff4444', fontWeight: 800, fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center' }}>
                                Please fix the errors highlighted in red.
                            </p>
                        )}
                    </section>
                </Reveal>
            </div>
        );
    }

    if (selectedProject) {
        const thumbSrc = isEditingProject
            ? (thumbDataRef.current || editThumb || selectedProject.thumb)
            : selectedProject.thumb;

        return (
            <div className="project-detail-view">
                <button onClick={() => setSelectedProject(null)} className="btn-ghost" style={{ marginBottom: '2rem' }}>
                    <span>← Back to Projects</span>
                </button>

                <Reveal>
                    <section className="brutal-card" style={{ marginBottom: '3rem' }}>
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

                            {/*
                                Large thumbnail — key={thumbKey} so it only repaints when
                                the image actually changes, not on every keystroke.
                            */}
                            <div
                                onClick={() => isEditingProject && document.getElementById('detail-thumb-input').click()}
                                style={{
                                    width: '140px', height: '140px', border: 'var(--brutal-border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--bg-color)', overflow: 'hidden', flexShrink: 0,
                                    cursor: isEditingProject ? 'pointer' : 'default'
                                }}
                            >
                                <ThumbPreview key={thumbKey} src={thumbSrc} size="large" />
                            </div>
                            <input
                                id="detail-thumb-input"
                                type="file"
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                                accept="image/*"
                            />

                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    {isEditingProject ? (
                                        <input style={getInputStyle(projectErrors.name)} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Project Name *" />
                                    ) : (
                                        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.5rem', margin: 0 }}>{selectedProject.name}</h2>
                                    )}
                                    {!isEditingProject && getStatusBadge(selectedProject.status)}
                                </div>

                                {isEditingProject ? (
                                    <>
                                        <textarea style={getInputStyle(projectErrors.desc)} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description *" />
                                        {getErrorHelperText(projectErrors.desc, 'desc')}
                                        <input style={getInputStyle(projectErrors.github)} value={editGithub} onChange={e => setEditGithub(e.target.value)} placeholder="GitHub (username/repo or full URL)" />
                                        {getErrorHelperText(projectErrors.github, 'github')}
                                        <input style={getInputStyle()} value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="Website (Optional)" />
                                        <input style={getInputStyle()} value={editHackatime} onChange={e => setEditHackatime(e.target.value)} placeholder="Hackatime (Optional)" />

                                        {/* Plain text status — no image rendered here, zero repaint cost */}
                                        {thumbDataRef.current && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: 700 }}>
                                                <span>🖼 Image loaded — click thumbnail above to replace</span>
                                                <button className="btn-ghost" onClick={handleThumbRemove} style={{ fontSize: '0.7rem' }}>
                                                    <span>Remove</span>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p style={{ margin: '1rem 0', color: 'var(--text-muted)', lineHeight: '1.6' }}>{selectedProject.desc}</p>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                                            {selectedProject.github && <a href={`https://github.com/${selectedProject.github}`} target="_blank" rel="noreferrer" style={badgeStyle}>GITHUB ↗</a>}
                                            {selectedProject.website && <a href={selectedProject.website} target="_blank" rel="noreferrer" style={{ ...badgeStyle, borderColor: 'var(--accent-orange)' }}>WEB ↗</a>}
                                            {selectedProject.hackatime && <div style={{ ...badgeStyle, background: 'var(--text-main)', color: '#fff' }}>HACKATIME: {selectedProject.hackatime.toUpperCase()}</div>}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {selectedProject.status !== 'submitted' && (
                                    <button
                                        className="btn-primary"
                                        onClick={isEditingProject ? saveProjectDetails : handleEditClick}
                                        disabled={isSaving}
                                        style={{ background: isEditingProject ? 'var(--accent-orange)' : 'var(--text-main)' }}
                                    >
                                        <span>{isSaving ? 'Saving...' : (isEditingProject ? 'Save Changes' : 'Edit Details')}</span>
                                    </button>
                                )}
                                {isEditingProject && (
                                    <button className="btn-ghost" onClick={() => { setIsEditingProject(false); clearThumbImage(); }}>
                                        <span>Cancel</span>
                                    </button>
                                )}
                                {selectedProject.status === 'draft' && !isEditingProject && (
                                    <button className="btn-primary" onClick={handleSubmitForReview} disabled={isSubmitting} style={{ background: '#ffa500' }}>
                                        <span>{isSubmitting ? 'Submitting...' : 'Submit for Review →'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                </Reveal>

                {selectedProject.status !== 'submitted' && (
                    <section className="brutal-card" style={{ marginBottom: '3rem', borderStyle: 'dashed' }}>
                        <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1rem' }}>New Dev Log</h3>

                        <input style={getInputStyle(logErrors.title)} placeholder="Log Title..." value={logTitle} onChange={e => setLogTitle(e.target.value)} />
                        {logErrors.title && <p style={{ color: '#ff4444', fontSize: '0.75rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>Title is required</p>}

                        <textarea
                            style={{ ...getInputStyle(logErrors.content), minHeight: '120px', fontFamily: 'monospace' }}
                            onPaste={handlePaste}
                            placeholder={`What did you build today? (Markdown supported)\n\nExamples:\n**Bold text**\n*Italic text*\n- List items\n[Links](https://example.com)\n\`code snippets\``}
                            value={logContent}
                            onChange={e => setLogContent(e.target.value)}
                        />
                        {logErrors.content && <p style={{ color: '#ff4444', fontSize: '0.75rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>Content is required</p>}

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                style={{ ...getInputStyle(logErrors.time), flex: 1 }}
                                placeholder="Hours spent (0 - 1000)"
                                value={logTime}
                                onChange={e => {
                                    const value = e.target.value;
                                    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 1000)) {
                                        setLogTime(value);
                                    }
                                }}
                                type="number" min="0" max="1000" step="0.5"
                            />
                            <button className="btn-primary" onClick={handleAddLog} style={{ height: '54px' }}>
                                <span>Post Log</span>
                            </button>
                        </div>
                        {logErrors.time && <p style={{ color: '#ff4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>Please enter a valid number between 0 and 1000 hours.</p>}

                        {logContent.trim() && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px dashed var(--text-muted)' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>PREVIEW:</p>
                                <div style={{ background: '#f9f9f9', padding: '1rem', border: '1px solid var(--text-muted)', maxHeight: '300px', overflowY: 'auto' }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                                        {logContent}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {devLogs.filter(l => l.projectId === selectedProject.id).map(log => (
                        <Reveal key={log.id}>
                            <div className="brutal-card" style={{ boxShadow: '4px 4px 0 var(--text-main)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--text-main)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-orange)' }}>{log.date}</span>
                                        <h4 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: '1.4rem' }}>{log.title}</h4>
                                    </div>
                                    <div style={{ background: 'var(--text-main)', color: '#fff', padding: '0.4rem 0.8rem', fontWeight: 800, fontSize: '0.8rem', height: 'fit-content' }}>
                                        {log.timeSpent} HRS
                                    </div>
                                </div>
                                <div className="markdown-content" style={{ lineHeight: '1.6', wordBreak: 'break-word' }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                                        {log.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="projects-grid-view">
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '3rem', fontWeight: 800, margin: 0 }}>PROJECTS</h2>
                    <div style={{ height: '6px', width: '80px', background: 'var(--accent-orange)', marginTop: '0.5rem' }}></div>
                </div>
                <button className="btn-primary" onClick={() => { resetForm(); setIsCreating(true); }}>
                    <span>+ New Project</span>
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                {projects.map(proj => (
                    <Reveal key={proj.id}>
                        <div className="brutal-card project-card-hover" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '60px', height: '60px', border: 'var(--brutal-border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                                }}>
                                    <ThumbPreview src={proj.thumb} size="small" />
                                </div>
                                {getStatusBadge(proj.status)}
                            </div>
                            <h3 style={{ fontFamily: 'Syne, sans-serif', margin: '0 0 0.5rem 0' }}>{proj.name}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', flex: 1 }}>{proj.desc}</p>
                            <button className="btn-primary" onClick={() => setSelectedProject(proj)} style={{ width: '100%' }}>
                                <span>View Details →</span>
                            </button>
                        </div>
                    </Reveal>
                ))}
            </div>
        </div>
    );
}