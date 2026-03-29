import React, { useState, useRef, memo, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useUser } from './UserContext';
import { Reveal } from '../../components/Reveal';

// ─── Memoized thumbnail preview image ────────────────────────────────────────
const ThumbPreview = memo(function ThumbPreview({ src, size }) {
    const isImage = src && (src.includes('data:image') || src.startsWith('http'));
    if (isImage) {
        return (
            <img
                src={src}
                alt="thumbnail"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
        );
    }
    return <span style={{ fontSize: size === 'large' ? '3.5rem' : '1.5rem' }}>{src || '🛠️'}</span>;
});

// ─── Memoized thumbnail upload field ─────────────────────────────────────────
const ThumbnailField = memo(function ThumbnailField({
    thumbData, editThumb, onTextChange, onUpload, onRemove, getInputStyle
}) {
    const fileRef = useRef(null);
    const hasImage = !!thumbData;
    return (
        <div style={{ width: '100%' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>THUMBNAIL (EMOJI OR IMAGE URL)</label>
            {hasImage ? (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.8rem', marginBottom: '1rem',
                    border: 'var(--brutal-border)', background: '#f9f9f9', width: '100%', boxSizing: 'border-box'
                }}>
                    <img src={thumbData} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', border: '1px solid var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Image ready ✓</span>
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
                <input type="file" ref={fileRef} onChange={e => { onUpload(e); fileRef.current.value = ''; }} style={{ display: 'none' }} accept="image/*" />
                <button className="btn-ghost" onClick={() => fileRef.current.click()} style={{ fontSize: '0.7rem' }}>
                    <span>{hasImage ? 'Replace Image' : 'Or Upload Image File'}</span>
                </button>
            </div>
        </div>
    );
});

export default function Projects() {
    const { userData, updateProject, addLog, addProject } = useUser();
    const { projects = [], devLogs = [] } = userData;

    // ── Mobile Responsive Logic ──────────────────────────────────────────────
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const thumbDataRef = useRef(null);
    const [thumbKey, setThumbKey] = useState(0);
    const [projectErrors, setProjectErrors] = useState({});

    // Dev Log States
    const logTextAreaRef = useRef(null);
    const logFileRef = useRef(null);
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

    // ── image upload logic for dev logs ───────────────────────────────────────
    const insertImageIntoLog = async (file) => {
        const textarea = logTextAreaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const placeholder = "\n![Uploading...]()\n";

        // Update UI with placeholder
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
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                insertImageIntoLog(items[i].getAsFile());
            }
        }
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

    const handleImageUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setThumbImage(reader.result);
        reader.readAsDataURL(file);
    }, []);

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
                    if (Array.isArray(errorData.detail)) {
                        const apiErrors = {};
                        errorData.detail.forEach(err => { if (err.loc && err.loc.includes('github')) apiErrors.github = true; });
                        setProjectErrors(prev => ({ ...prev, ...apiErrors }));
                        throw new Error('Validation failed');
                    } else {
                        throw new Error(errorData.detail);
                    }
                }
                throw new Error('Failed to create project');
            }
            const newProject = await response.json();
            addProject(newProject);
            setIsCreating(false);
            setSelectedProject(newProject);
            resetForm();
        } catch (err) {
            alert(err.message);
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
                    if (Array.isArray(errorData.detail)) {
                        const apiErrors = {};
                        errorData.detail.forEach(err => { if (err.loc && err.loc.includes('github')) apiErrors.github = true; });
                        setProjectErrors(prev => ({ ...prev, ...apiErrors }));
                        throw new Error('Validation failed');
                    } else {
                        throw new Error(errorData.detail);
                    }
                }
                throw new Error('Failed to update project');
            }
            const updated = await response.json();
            updateProject(selectedProject.id, updated);
            setSelectedProject(updated);
            setIsEditingProject(false);
            clearThumbImage();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddLog = async () => {
        const time = parseFloat(logTime);
        if (!logTitle.trim() || !logContent.trim() || !validateHours(logTime)) {
            setLogErrors({ title: !logTitle.trim(), content: !logContent.trim(), time: !validateHours(logTime) });
            return;
        }
        try {
            const response = await fetch('/api/devlogs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: selectedProject.id, title: logTitle, timeSpent: time, content: logContent })
            });
            if (response.ok) {
                const newLog = await response.json();
                addLog(newLog);
                setLogTitle(''); setLogContent(''); setLogTime('');
                setLogErrors({});
            }
        } catch (err) {
            alert("Failed to post log");
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

    const getCleanedData = () => ({
        name: editName.trim(),
        desc: editDesc.trim(),
        github: editGithub.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '').trim(),
        website: editWebsite ? editWebsite.trim() : '',
        thumb: thumbDataRef.current || editThumb || '🛠️',
        hackatime: editHackatime ? editHackatime.trim() : ''
    });

    // ── style & badge helpers ──────────────────────────────────────────────────
    const getInputStyle = (error) => ({
        width: '100%', padding: '0.8rem', marginBottom: '1rem',
        border: error ? '3px solid #ff4444' : 'var(--brutal-border)',
        background: '#fff', fontFamily: 'inherit', outline: 'none',
        transition: 'border 0.2s ease-in-out', boxSizing: 'border-box'
    });

    const getStatusBadge = (status) => {
        const config = {
            draft: { color: '#666', text: 'DRAFT', icon: '📝' },
            submitted: { color: '#ffa500', text: 'PENDING', icon: '⏳' },
            approved: { color: '#00cc00', text: 'APPROVED', icon: '✅' },
            rejected: { color: '#ff4444', text: 'REJECTED', icon: '❌' }
        }[status] || { color: '#666', text: 'DRAFT', icon: '📝' };
        return (
            <div style={{
                background: config.color, color: '#fff', padding: '0.3rem 0.8rem',
                borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0
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
        code({ inline, className, children, ...props }) {
            return !inline ? (
                <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', overflowX: 'auto', border: '2px solid var(--text-main)', margin: '1rem 0' }}>
                    <code className={className} {...props} style={{ fontFamily: 'monospace' }}>{children}</code>
                </pre>
            ) : (
                <code {...props} style={{ background: '#f5f5f5', padding: '0.2rem 0.4rem', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.9em' }}>{children}</code>
            );
        },
        a({ children, href, ...props }) { return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-orange)', textDecoration: 'underline', fontWeight: 'bold' }} {...props}>{children}</a>; },
        h1({ children, ...props }) { return <h1 style={{ fontSize: '1.8rem', marginTop: '1.5rem', marginBottom: '1rem' }} {...props}>{children}</h1>; },
        h2({ children, ...props }) { return <h2 style={{ fontSize: '1.4rem', marginTop: '1.25rem', marginBottom: '0.75rem' }} {...props}>{children}</h2>; },
        img({ src, alt, ...props }) { return <img src={src} alt={alt} style={{ maxWidth: '100%', height: 'auto', border: '2px solid var(--text-main)', margin: '1rem 0', display: 'block' }} {...props} />; },
        blockquote({ children, ...props }) { return <blockquote style={{ borderLeft: '4px solid var(--accent-orange)', margin: '1rem 0', padding: '0.5rem 1rem', background: '#f9f9f9', fontStyle: 'italic' }} {...props}>{children}</blockquote>; },
        table({ children, ...props }) { return <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', width: '100%', margin: '1rem 0' }} {...props}>{children}</table></div>; },
        th({ children, ...props }) { return <th style={{ border: '2px solid var(--text-main)', padding: '0.5rem', background: '#f0f0f0' }} {...props}>{children}</th>; },
        td({ children, ...props }) { return <td style={{ border: '2px solid var(--text-main)', padding: '0.5rem' }} {...props}>{children}</td>; }
    };

    // ── views ─────────────────────────────────────────────────────────────────

    if (isCreating) {
        return (
            <div className="project-create-view" style={{ paddingBottom: '10vh' }}>
                <button onClick={() => { setIsCreating(false); resetForm(); }} className="btn-ghost" style={{ marginBottom: '2rem' }}>
                    <span>← Cancel</span>
                </button>
                <Reveal>
                    <section className="brutal-card" style={{ padding: isMobile ? '1.5rem' : '2.5rem' }}>
                        <h2 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1.5rem' }}>NEW PROJECT</h2>
                        <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>PROJECT TITLE *</label>
                        <input style={getInputStyle(projectErrors.name)} value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. My Awesome App" />
                        <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>DESCRIPTION *</label>
                        <textarea style={{ ...getInputStyle(projectErrors.desc), minHeight: '100px' }} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="What are you building?" />
                        <ThumbnailField
                            key={thumbKey}
                            thumbData={thumbDataRef.current}
                            editThumb={editThumb}
                            onTextChange={val => setEditThumb(val)}
                            onUpload={handleImageUpload}
                            onRemove={clearThumbImage}
                            getInputStyle={getInputStyle}
                        />
                        <button className="btn-primary" onClick={handleCreateProject} disabled={isSaving} style={{ width: '100%', marginTop: '1.5rem' }}>
                            <span>{isSaving ? 'Launching...' : 'Create Project →'}</span>
                        </button>
                    </section>
                </Reveal>
            </div>
        );
    }

    if (selectedProject) {
        const thumbSrc = isEditingProject ? (thumbDataRef.current || editThumb || selectedProject.thumb) : selectedProject.thumb;
        return (
            <div className="project-detail-view" style={{ paddingBottom: '15vh' }}>
                <button onClick={() => setSelectedProject(null)} className="btn-ghost" style={{ marginBottom: '2rem' }}>
                    <span>← Back to Projects</span>
                </button>
                <Reveal>
                    <section className="brutal-card" style={{ marginBottom: '3rem', padding: isMobile ? '1.2rem' : '2.5rem' }}>
                        <div style={{ display: 'flex', gap: '2rem', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start' }}>
                            <div
                                onClick={() => isEditingProject && document.getElementById('detail-thumb-input').click()}
                                style={{
                                    width: isMobile ? '120px' : '140px', height: isMobile ? '120px' : '140px', border: 'var(--brutal-border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--bg-color)', overflow: 'hidden', flexShrink: 0,
                                    cursor: isEditingProject ? 'pointer' : 'default'
                                }}
                            >
                                <ThumbPreview key={thumbKey} src={thumbSrc} size="large" />
                            </div>
                            <input id="detail-thumb-input" type="file" onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />

                            <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                                    {isEditingProject ? (
                                        <input style={getInputStyle(projectErrors.name)} value={editName} onChange={e => setEditName(e.target.value)} />
                                    ) : (
                                        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? '1.8rem' : '2.5rem', margin: 0 }}>{selectedProject.name}</h2>
                                    )}
                                    {!isEditingProject && getStatusBadge(selectedProject.status)}
                                </div>
                                {isEditingProject ? (
                                    <>
                                        <textarea style={getInputStyle(projectErrors.desc)} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                                        <input style={getInputStyle()} value={editGithub} onChange={e => setEditGithub(e.target.value)} placeholder="GitHub" />
                                        <input style={getInputStyle()} value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="Website" />
                                    </>
                                ) : (
                                    <>
                                        <p style={{ margin: '1rem 0', color: 'var(--text-muted)', lineHeight: '1.6' }}>{selectedProject.desc}</p>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            {selectedProject.github && <a href={`https://github.com/${selectedProject.github}`} target="_blank" rel="noreferrer" style={badgeStyle}>GITHUB ↗</a>}
                                            {selectedProject.website && <a href={selectedProject.website} target="_blank" rel="noreferrer" style={{ ...badgeStyle, borderColor: 'var(--accent-orange)' }}>WEB ↗</a>}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: isMobile ? '100%' : '200px' }}>
                                <button className="btn-primary" onClick={isEditingProject ? saveProjectDetails : handleEditClick} disabled={isSaving}>
                                    <span>{isSaving ? 'Saving...' : (isEditingProject ? 'Save Changes' : 'Edit Details')}</span>
                                </button>
                                {isEditingProject && <button className="btn-ghost" onClick={() => setIsEditingProject(false)}><span>Cancel</span></button>}
                            </div>
                        </div>
                    </section>
                </Reveal>

                {selectedProject.status !== 'submitted' && (
                    <section className="brutal-card" style={{ marginBottom: '3rem', borderStyle: 'dashed', padding: isMobile ? '1rem' : '2rem' }}>
                        <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1rem' }}>New Dev Log</h3>
                        <input style={getInputStyle(logErrors.title)} placeholder="Log Title..." value={logTitle} onChange={e => setLogTitle(e.target.value)} />

                        <div style={{ position: 'relative' }}>
                            <textarea
                                ref={logTextAreaRef}
                                style={{ ...getInputStyle(logErrors.content), minHeight: '150px', fontFamily: 'monospace', paddingBottom: '50px' }}
                                onPaste={handlePaste}
                                placeholder="What did you build? Markdown supported..."
                                value={logContent}
                                onChange={e => setLogContent(e.target.value)}
                            />
                            {/* MOBILE IMAGE UPLOAD BUTTON */}
                            <div style={{ position: 'absolute', right: '10px', bottom: '25px' }}>
                                <input type="file" ref={logFileRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => insertImageIntoLog(e.target.files[0])} />
                                <button className="btn-ghost" onClick={() => logFileRef.current.click()} style={{ padding: '0.4rem 0.8rem', background: '#fff', fontSize: '0.7rem' }}>
                                    <span>🖼️ Upload Image</span>
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
                            <input style={{ ...getInputStyle(logErrors.time), flex: 1 }} placeholder="Hours" value={logTime} onChange={e => setLogTime(e.target.value)} type="number" />
                            <button className="btn-primary" onClick={handleAddLog} style={{ height: '54px', width: isMobile ? '100%' : '150px' }}>
                                <span>Post Log</span>
                            </button>
                        </div>

                        {logContent.trim() && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px dashed var(--text-muted)' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>PREVIEW:</p>
                                <div style={{ background: '#f9f9f9', padding: '1rem', border: '1px solid var(--text-muted)', maxHeight: '300px', overflowY: 'auto' }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>{logContent}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {devLogs.filter(l => l.projectId === selectedProject.id).map(log => (
                        <Reveal key={log.id}>
                            <div className="brutal-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--text-main)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-orange)' }}>{log.date}</span>
                                        <h4 style={{ margin: 0, fontFamily: 'Syne, sans-serif' }}>{log.title}</h4>
                                    </div>
                                    <div style={{ background: 'var(--text-main)', color: '#fff', padding: '0.4rem 0.8rem', fontWeight: 800, fontSize: '0.8rem', height: 'fit-content' }}>{log.timeSpent} HRS</div>
                                </div>
                                <div className="markdown-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>{log.content}</ReactMarkdown>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="projects-grid-view" style={{ paddingBottom: '10vh' }}>
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', gap: '1.5rem' }}>
                <div>
                    <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: isMobile ? '2.2rem' : '3rem', fontWeight: 800, margin: 0 }}>PROJECTS</h2>
                    <div style={{ height: '6px', width: '80px', background: 'var(--accent-orange)', marginTop: '0.5rem' }}></div>
                </div>
                <button className="btn-primary" onClick={() => { resetForm(); setIsCreating(true); }} style={{ width: isMobile ? '100%' : 'auto' }}>
                    <span>+ New Project</span>
                </button>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                {projects.map(proj => (
                    <Reveal key={proj.id}>
                        <div className="brutal-card project-card-hover" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ width: '60px', height: '60px', border: 'var(--brutal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <ThumbPreview src={proj.thumb} size="small" />
                                </div>
                                {getStatusBadge(proj.status)}
                            </div>
                            <h3 style={{ fontFamily: 'Syne, sans-serif', margin: '0 0 0.5rem 0' }}>{proj.name}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', flex: 1 }}>{proj.desc}</p>
                            <button className="btn-primary" onClick={() => setSelectedProject(proj)} style={{ width: '100%' }}><span>View Details →</span></button>
                        </div>
                    </Reveal>
                ))}
            </div>
        </div>
    );
}