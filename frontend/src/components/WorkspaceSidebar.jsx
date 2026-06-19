import { useState } from 'react';
import { Plus, UserPlus, LogOut } from 'lucide-react';
import { api } from '../services/api';

export function WorkspaceSidebar({
  workspaces,
  activeWorkspace,
  onWorkspaceSelect,
  onWorkspaceCreated,
  onWorkspaceJoined,
  onLogout,
  username
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to get initials of workspace name
  const getInitials = (name) => {
    if (!name) return 'W';
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setLoading(true);
    setError('');

    try {
      const data = await api.createWorkspace(workspaceName, workspaceDesc);
      console.log('Created workspace:', data);
      onWorkspaceCreated(data);
      setWorkspaceName('');
      setWorkspaceDesc('');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    setLoading(true);
    setError('');

    try {
      await api.joinWorkspace(joinId.trim());
      console.log('Joined workspace ID:', joinId);
      onWorkspaceJoined(joinId.trim());
      setJoinId('');
      setShowJoinModal(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to join workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspaces-sidebar">
      {/* Workspace List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className={`workspace-badge ${activeWorkspace?.id === ws.id ? 'active' : ''}`}
            title={ws.name}
            onClick={() => onWorkspaceSelect(ws)}
          >
            {getInitials(ws.name)}
          </div>
        ))}

        {/* Action Buttons */}
        <button
          className="workspace-action-btn"
          title="Create Workspace"
          onClick={() => { setShowCreateModal(true); setError(''); }}
        >
          <Plus size={20} />
        </button>

        <button
          className="workspace-action-btn"
          title="Join Workspace by ID"
          onClick={() => { setShowJoinModal(true); setError(''); }}
        >
          <UserPlus size={20} />
        </button>
      </div>

      {/* User profile avatar & logout at bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginTop: 'auto' }}>
        <div 
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--accent-purple-light)',
            color: 'var(--accent-purple)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'default',
            border: '1px solid var(--border-color)',
            textTransform: 'uppercase'
          }}
          title={`Logged in as: ${username}`}
        >
          {username ? username.substring(0, 2).toUpperCase() : 'U'}
        </div>

        <button
          className="workspace-action-btn"
          style={{ borderStyle: 'solid', color: 'var(--accent-red)' }}
          title="Logout"
          onClick={onLogout}
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create a Workspace</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateWorkspace}>
              <div className="modal-body">
                {error && <div className="error-banner">{error}</div>}
                <div className="auth-form-group">
                  <label htmlFor="ws-name">Workspace Name</label>
                  <input
                    id="ws-name"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Acme Corp"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="auth-form-group">
                  <label htmlFor="ws-desc">Description</label>
                  <input
                    id="ws-desc"
                    type="text"
                    className="auth-input"
                    placeholder="What is this workspace for?"
                    value={workspaceDesc}
                    onChange={(e) => setWorkspaceDesc(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Join a Workspace</h2>
              <button className="modal-close-btn" onClick={() => setShowJoinModal(false)}>×</button>
            </div>
            <form onSubmit={handleJoinWorkspace}>
              <div className="modal-body">
                {error && <div className="error-banner">{error}</div>}
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Enter the UUID of the workspace you would like to join.
                </p>
                <div className="auth-form-group">
                  <label htmlFor="ws-id">Workspace ID (UUID)</label>
                  <input
                    id="ws-id"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
