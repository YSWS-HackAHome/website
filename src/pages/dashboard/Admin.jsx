import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { Reveal } from '../../components/Reveal';

export default function Admin() {
    const { userData } = useUser();
    const { account } = userData;

    const [activeTab, setActiveTab] = useState('dashboard');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userProjects, setUserProjects] = useState([]);
    const [userDevLogs, setUserDevLogs] = useState([]);
    const [selectedProjectForLogs, setSelectedProjectForLogs] = useState(null);
    const [pendingReviews, setPendingReviews] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [reviewModal, setReviewModal] = useState(null);
    const [reviewAction, setReviewAction] = useState('');
    const [reviewNotes, setReviewNotes] = useState('');
    const [rewardAmount, setRewardAmount] = useState(0);
    const [devLogsLimit, setDevLogsLimit] = useState(50);
    const [viewingDevLogs, setViewingDevLogs] = useState(false);
    const [selectedDevLogUser, setSelectedDevLogUser] = useState(null);

    const [isAdmin, setIsAdmin] = useState(false);
    const [adminCheckLoading, setAdminCheckLoading] = useState(true);

    useEffect(() => {
        checkAdminStatus();
    }, []);

    const checkAdminStatus = async () => {
        try {
            // Try to access admin stats endpoint - if it works, user is admin
            const response = await fetch('/api/admin/stats');
            if (response.ok) {
                setIsAdmin(true);
                fetchStats();
                fetchPendingReviews();
                fetchUsers();
            } else if (response.status === 403) {
                setIsAdmin(false);
            }
        } catch (error) {
            console.error('Admin check failed:', error);
            setIsAdmin(false);
        } finally {
            setAdminCheckLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchPendingReviews = async (page = 1) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/pending-reviews?page=${page}&limit=10`);
            if (response.ok) {
                const data = await response.json();
                setPendingReviews(data.projects || []);
                setCurrentPage(data.page);
                setTotalPages(data.total_pages);
            }
        } catch (error) {
            console.error('Error fetching pending reviews:', error);
            setError('Failed to load pending reviews');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const url = search
                ? `/api/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`
                : `/api/admin/users?page=${page}&limit=20`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
                setCurrentPage(data.page);
                setTotalPages(data.total_pages);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProjects = async (userId) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}/projects`);
            if (response.ok) {
                const data = await response.json();
                setSelectedUser(data.user);
                setUserProjects(data.projects || []);
                setViewingDevLogs(false);
                setSelectedProjectForLogs(null);
                setUserDevLogs([]);
            }
        } catch (error) {
            console.error('Error fetching user projects:', error);
            setError('Failed to load user projects');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDevLogs = async (userId, projectId = null) => {
        setLoading(true);
        try {
            const url = projectId
                ? `/api/admin/users/${userId}/devlogs?project_id=${projectId}&limit=${devLogsLimit}`
                : `/api/admin/users/${userId}/devlogs?limit=${devLogsLimit}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setUserDevLogs(data.devlogs || []);
                setSelectedDevLogUser(data.user);
                setViewingDevLogs(true);
            }
        } catch (error) {
            console.error('Error fetching dev logs:', error);
            setError('Failed to load development logs');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);

        if (isNaN(date.getTime())) {
            console.warn('Invalid date received:', dateString);
            return 'Invalid Date';
        }

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleReviewProject = async () => {
        if (!reviewModal) return;

        setLoading(true);
        try {
            const payload = {
                projectId: reviewModal.id,
                action: reviewAction,
                reviewerNotes: reviewNotes
            };

            if (reviewAction === 'approve') {
                payload.rewardAmount = rewardAmount;
            }

            const response = await fetch('/api/admin/projects/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Project ${reviewAction === 'approve' ? 'approved' : 'sent for revision'} successfully!\n${reviewAction === 'approve' ? `Reward: $${rewardAmount}` : ''}`);

                // Refresh data
                fetchPendingReviews(currentPage);
                fetchStats();
                if (selectedUser) {
                    fetchUserProjects(selectedUser.id);
                }

                // Close modal
                setReviewModal(null);
                setReviewAction('');
                setReviewNotes('');
                setRewardAmount(0);
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail || 'Failed to review project'}`);
            }
        } catch (error) {
            console.error('Error reviewing project:', error);
            alert('Network error. Failed to review project.');
        } finally {
            setLoading(false);
        }
    };

    const openReviewModal = (project, action) => {
        setReviewModal(project);
        setReviewAction(action);
        setReviewNotes('');
        setRewardAmount(0);
    };

    const renderThumb = (thumb) => {
        if (!thumb) return <span style={{ fontSize: '2rem' }}>📦</span>;
        if (thumb.startsWith('data:image')) {
            return <img src={thumb} alt="thumbnail" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />;
        }
        if (thumb.length <= 2) {
            return <span style={{ fontSize: '2rem' }}>{thumb}</span>;
        }
        return <img src={thumb} alt="thumbnail" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'submitted':
                return <span className="brutal-badge" style={{ background: '#ffa500', color: '#000' }}>PENDING</span>;
            case 'approved':
                return <span className="brutal-badge" style={{ background: '#00ff00', color: '#000' }}>APPROVED</span>;
            case 'draft':
                return <span className="brutal-badge" style={{ background: '#999', color: '#fff' }}>DRAFT</span>;
            default:
                return <span className="brutal-badge">{status}</span>;
        }
    };

    const renderDevLogs = () => {
        if (!viewingDevLogs) return null;

        return (
            <div>
                <button
                    className="btn-secondary"
                    onClick={() => {
                        setViewingDevLogs(false);
                        setSelectedProjectForLogs(null);
                        setUserDevLogs([]);
                    }}
                    style={{ marginBottom: '1rem' }}
                >
                    ← Back to {selectedUser ? 'User Projects' : 'Users'}
                </button>

                <div className="brutal-card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1rem' }}>
                        📝 Development Logs
                        {selectedProjectForLogs && ` - ${selectedProjectForLogs.name}`}
                    </h3>
                    {selectedDevLogUser && (
                        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-muted)', borderRadius: '4px' }}>
                            <p><strong>User:</strong> {selectedDevLogUser.name}</p>
                            <p><strong>Email:</strong> {selectedDevLogUser.email}</p>
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <label>
                            Show last:
                            <select
                                value={devLogsLimit}
                                onChange={(e) => {
                                    setDevLogsLimit(parseInt(e.target.value));
                                    if (selectedUser) {
                                        fetchUserDevLogs(selectedUser.id, selectedProjectForLogs?.id);
                                    }
                                }}
                                style={{ marginLeft: '0.5rem', padding: '0.25rem', border: '2px solid var(--text-main)' }}
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                        </label>
                    </div>
                </div>

                {userDevLogs.length === 0 ? (
                    <div className="brutal-card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <div style={{ fontSize: '4rem' }}>📝</div>
                        <p>No development logs found for this user.</p>
                    </div>
                ) : (
                    userDevLogs.map((log, index) => (
                        <Reveal key={log.id || index}>
                            <div className="brutal-card" style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                    <div>
                                        <h4 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '0.25rem' }}>{log.title}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Project: {log.project_name} | Date: {log.log_date || formatDate(log.created_at)} | Time: {log.time_spent}h
                                        </p>
                                    </div>
                                    <span className="brutal-badge" style={{ background: '#3498db', color: '#fff' }}>
                                        {log.time_spent} hrs
                                    </span>
                                </div>
                                <div style={{
                                    marginTop: '0.5rem',
                                    padding: '0.75rem',
                                    background: 'var(--bg-muted)',
                                    borderRadius: '4px',
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '0.9rem'
                                }}>
                                    {log.content}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Logged: {formatDate(log.created_at)}
                                </div>
                            </div>
                        </Reveal>
                    ))
                )}
            </div>
        );
    };

    if (adminCheckLoading) {
        return (
            <div style={{ maxWidth: '1200px', textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '2rem' }}>🔐</div>
                <p>Checking admin access...</p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div style={{ maxWidth: '1200px', textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛔</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1rem' }}>Access Denied</h2>
                <p>You don't have permission to access the admin panel.</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1400px' }}>
            <header style={{ marginBottom: '4rem' }}>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '3.5rem', fontWeight: 800 }}>
                    ADMIN <span style={{ color: 'var(--accent-orange)' }}>PANEL</span>
                </h2>
                <div style={{ height: '6px', width: '80px', background: 'var(--accent-lime)', marginTop: '0.5rem' }}></div>
            </header>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--text-main)', paddingBottom: '1rem' }}>
                <button
                    className={activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => {
                        setActiveTab('dashboard');
                        fetchStats();
                    }}
                >
                    📊 Dashboard
                </button>
                <button
                    className={activeTab === 'reviews' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => {
                        setActiveTab('reviews');
                        fetchPendingReviews(1);
                    }}
                >
                    📋 Pending Reviews ({pendingReviews.length})
                </button>
                <button
                    className={activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => {
                        setActiveTab('users');
                        fetchUsers(1, searchTerm);
                    }}
                >
                    👥 Users
                </button>
            </div>

            {error && (
                <div className="brutal-card" style={{ marginBottom: '2rem', background: '#ff4444', color: 'white' }}>
                    <p>{error}</p>
                    <button onClick={() => setError(null)} style={{ marginLeft: '1rem', background: 'white', border: 'none', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>×</button>
                </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && stats && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                        <div className="brutal-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem' }}>👥</div>
                            <h3>Total Users</h3>
                            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_users || 0}</p>
                        </div>
                        <div className="brutal-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem' }}>📦</div>
                            <h3>Total Projects</h3>
                            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_projects || 0}</p>
                        </div>
                        <div className="brutal-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem' }}>⏳</div>
                            <h3>Pending Reviews</h3>
                            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-orange)' }}>{stats.pending_reviews || 0}</p>
                        </div>
                        <div className="brutal-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem' }}>✅</div>
                            <h3>Approved Projects</h3>
                            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.approved_projects || 0}</p>
                        </div>
                        <div className="brutal-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem' }}>💰</div>
                            <h3>Total Rewards Paid</h3>
                            <p style={{ fontSize: '2rem', fontWeight: 800 }}>${(stats.total_rewards_paid || 0).toFixed(2)}</p>
                        </div>
                        <div className="brutal-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem' }}>🛒</div>
                            <h3>Shop Revenue</h3>
                            <p style={{ fontSize: '2rem', fontWeight: 800 }}>${(stats.total_shop_revenue || 0).toFixed(2)}</p>
                        </div>
                        <div className="brutal-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem' }}>📝</div>
                            <h3>Total Dev Logs</h3>
                            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_dev_logs || 0}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Reviews Tab */}
            {activeTab === 'reviews' && (
                <div>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontFamily: 'Syne, sans-serif' }}>Projects Pending Review</h3>
                        <button className="btn-secondary" onClick={() => fetchPendingReviews(1)}>🔄 Refresh</button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>
                    ) : pendingReviews.length === 0 ? (
                        <div className="brutal-card" style={{ textAlign: 'center', padding: '4rem' }}>
                            <div style={{ fontSize: '4rem' }}>🎉</div>
                            <p>No pending reviews! All caught up.</p>
                        </div>
                    ) : (
                        <>
                            {pendingReviews.map(project => (
                                <Reveal key={project.id}>
                                    <div className="brutal-card" style={{ marginBottom: '2rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                            <div>
                                                <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '0.5rem' }}>{project.name}</h3>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    By: {project.user_name} | Submitted: {formatDate(project.submitted_at)}
                                                </p>
                                            </div>
                                            {getStatusBadge(project.status)}
                                        </div>

                                        <p style={{ marginBottom: '1rem' }}>{project.description?.substring(0, 200)}...</p>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                            {project.github && (
                                                <div>
                                                    <strong>GitHub:</strong> <a href={`https://github.com/${project.github}`} target="_blank">{project.github}</a>
                                                </div>
                                            )}
                                            {project.website && (
                                                <div>
                                                    <strong>Website:</strong> <a href={project.website} target="_blank">Link</a>
                                                </div>
                                            )}
                                            {project.hackatime && (
                                                <div>
                                                    <strong>Hackatime:</strong> {project.hackatime}
                                                </div>
                                            )}
                                            <div>
                                                <strong>Thumbnail:</strong> {renderThumb(project.thumb)}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                            <button
                                                className="btn-primary"
                                                style={{ background: '#00ff00', color: '#000' }}
                                                onClick={() => openReviewModal(project, 'approve')}
                                            >
                                                ✅ Approve
                                            </button>
                                            <button
                                                className="btn-primary"
                                                style={{ background: '#ffa500', color: '#000' }}
                                                onClick={() => openReviewModal(project, 'revision')}
                                            >
                                                🔄 Request Revision
                                            </button>
                                            <button
                                                className="btn-secondary"
                                                onClick={() => {
                                                    setSelectedUser({ id: project.user_id, name: project.user_name });
                                                    fetchUserDevLogs(project.user_id);
                                                    setActiveTab('users');
                                                }}
                                            >
                                                📝 View Dev Logs
                                            </button>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => fetchPendingReviews(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </button>
                                    <span style={{ padding: '0.5rem 1rem' }}>Page {currentPage} of {totalPages}</span>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => fetchPendingReviews(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div>
                    {viewingDevLogs ? (
                        renderDevLogs()
                    ) : (
                        <>
                            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder="Search users by name, email, or Slack ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && fetchUsers(1, searchTerm)}
                                    style={{ flex: 1, padding: '0.75rem', border: '2px solid var(--text-main)', fontFamily: 'inherit' }}
                                />
                                <button className="btn-primary" onClick={() => fetchUsers(1, searchTerm)}>Search</button>
                                <button className="btn-secondary" onClick={() => {
                                    setSearchTerm('');
                                    fetchUsers(1, '');
                                }}>Clear</button>
                            </div>

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>
                            ) : selectedUser ? (
                                <div>
                                    <button className="btn-secondary" onClick={() => setSelectedUser(null)} style={{ marginBottom: '1rem' }}>
                                        ← Back to Users
                                    </button>

                                    <div className="brutal-card" style={{ marginBottom: '2rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                            <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1rem' }}>User Details</h3>
                                            <button
                                                className="btn-primary"
                                                onClick={() => fetchUserDevLogs(selectedUser.id)}
                                                style={{ background: '#3498db' }}
                                            >
                                                📝 View All Dev Logs
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                            <div><strong>Name:</strong> {selectedUser.name}</div>
                                            <div><strong>Email:</strong> {selectedUser.email}</div>
                                            <div><strong>Slack ID:</strong> {selectedUser.slack_id}</div>
                                            <div><strong>Balance:</strong> ${(selectedUser.balance || 0).toFixed(2)}</div>
                                            <div><strong>Joined:</strong> {formatDate(selectedUser.created_at)}</div>
                                        </div>
                                    </div>

                                    <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1rem' }}>Projects ({userProjects.length})</h3>
                                    {userProjects.length === 0 ? (
                                        <div className="brutal-card" style={{ textAlign: 'center', padding: '2rem' }}>
                                            <p>No projects found for this user.</p>
                                        </div>
                                    ) : (
                                        userProjects.map(project => (
                                            <Reveal key={project.id}>
                                                <div className="brutal-card" style={{ marginBottom: '1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                                        <div>
                                                            <h4 style={{ fontFamily: 'Syne, sans-serif' }}>{project.name}</h4>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                Created: {formatDate(project.created_at)}
                                                                {project.submitted_at && ` | Submitted: ${formatDate(project.submitted_at)}`}
                                                            </p>
                                                        </div>
                                                        {getStatusBadge(project.status)}
                                                    </div>
                                                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{project.description?.substring(0, 150)}...</p>
                                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                                        {project.github && <span>🔗 GitHub</span>}
                                                        {project.website && <span>🌐 Website</span>}
                                                        {project.hackatime && <span>⏱️ {project.hackatime}</span>}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                        {project.status === 'submitted' && (
                                                            <>
                                                                <button
                                                                    className="btn-primary"
                                                                    style={{ background: '#00ff00', color: '#000', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                                                    onClick={() => openReviewModal(project, 'approve')}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    className="btn-primary"
                                                                    style={{ background: '#ffa500', color: '#000', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                                                    onClick={() => openReviewModal(project, 'revision')}
                                                                >
                                                                    Request Revision
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            className="btn-secondary"
                                                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                                            onClick={() => {
                                                                setSelectedProjectForLogs(project);
                                                                fetchUserDevLogs(selectedUser.id, project.id);
                                                            }}
                                                        >
                                                            📝 View Dev Logs
                                                        </button>
                                                    </div>
                                                </div>
                                            </Reveal>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {users.map(user => (
                                            <Reveal key={user.id}>
                                                <div className="brutal-card" style={{ cursor: 'pointer' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ flex: 1 }} onClick={() => fetchUserProjects(user.id)}>
                                                            <h4 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '0.25rem' }}>{user.name || 'Unnamed User'}</h4>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                {user.email} | Slack: {user.slack_id || 'N/A'} | Balance: ${(user.balance || 0).toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                className="btn-secondary"
                                                                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    fetchUserDevLogs(user.id);
                                                                }}
                                                            >
                                                                📝 Logs
                                                            </button>
                                                            <div style={{ fontSize: '1.5rem' }} onClick={() => fetchUserProjects(user.id)}>→</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Reveal>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                                            <button
                                                className="btn-secondary"
                                                onClick={() => fetchUsers(currentPage - 1, searchTerm)}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </button>
                                            <span style={{ padding: '0.5rem 1rem' }}>Page {currentPage} of {totalPages}</span>
                                            <button
                                                className="btn-secondary"
                                                onClick={() => fetchUsers(currentPage + 1, searchTerm)}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Review Modal */}
            {reviewModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setReviewModal(null)}>
                    <div className="brutal-card" style={{ maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1rem' }}>
                            {reviewAction === 'approve' ? '✅ Approve Project' : '🔄 Request Revision'}
                        </h3>

                        <p><strong>Project:</strong> {reviewModal.name}</p>
                        <p><strong>User:</strong> {reviewModal.user_name}</p>

                        {reviewAction === 'approve' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 800 }}>
                                    Reward Amount ($):
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="10"
                                    value={rewardAmount}
                                    onChange={(e) => setRewardAmount(parseFloat(e.target.value) || 0)}
                                    style={{ width: '100%', padding: '0.5rem', border: '2px solid var(--text-main)', fontFamily: 'inherit' }}
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 800 }}>
                                {reviewAction === 'approve' ? 'Reviewer Notes (optional):' : 'Revision Notes (required):'}
                            </label>
                            <textarea
                                rows="5"
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                placeholder={reviewAction === 'revision' ? "Please specify what changes are needed..." : "Optional notes for the user..."}
                                style={{ width: '100%', padding: '0.5rem', border: '2px solid var(--text-main)', fontFamily: 'inherit' }}
                                required={reviewAction === 'revision'}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setReviewModal(null)}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleReviewProject}
                                disabled={loading || (reviewAction === 'revision' && !reviewNotes.trim())}
                            >
                                {loading ? 'Processing...' : reviewAction === 'approve' ? 'Approve Project' : 'Request Revision'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}