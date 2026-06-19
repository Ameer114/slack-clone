import { useState } from 'react';
import { Hash, Lock, Plus, Info } from 'lucide-react';
import { api } from '../services/api';

export function ChannelSidebar({
  workspace,
  channels,
  activeChannel,
  username,
  isWorkspaceOwner,
  pendingRequests,
  onApproveRequest,
  onRejectRequest,
  onChannelSelect,
  onChannelCreated,
  onOpenChannelInfo
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Normalize name to be lower-case with hyphens, similar to slack
      const formattedName = channelName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '');

      const data = await api.createChannel(workspace.id, formattedName, channelDesc, isPrivate);
      console.log('Created channel:', data);
      onChannelCreated(data);
      setChannelName('');
      setChannelDesc('');
      setIsPrivate(false);
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create channel. Note: Only workspace owners can create channels.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="channels-sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="workspace-name" title={workspace?.name}>
          {workspace?.name || 'Loading Workspace...'}
        </div>
        <div className="user-profile">
          <div className="user-status-dot"></div>
          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username}
          </span>
        </div>
      </div>

      {/* Channels List Section */}
      <div className="channels-list-container">
        {/* Access Requests Section (For private channels where current user is admin/owner) */}
        {pendingRequests && pendingRequests.length > 0 && (
          <div className="sidebar-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div className="sidebar-section-header" style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>
              <span>Access Requests ({pendingRequests.length})</span>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingRequests.map((req) => (
                <div
                  key={req.requestId}
                  style={{
                    padding: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ color: 'var(--text-primary)', lineHeight: '1.3' }}>
                    <strong>@{req.username}</strong> wants to join <strong>#{req.channelName}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => onApproveRequest(req.requestId)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--accent-green)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onRejectRequest(req.requestId)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--accent-red)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span>Channels</span>
            {isWorkspaceOwner && (
              <button
                className="add-channel-icon-btn"
                title="Create Channel"
                onClick={() => { setShowCreateModal(true); setError(''); }}
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {channels.map((chan) => {
              const isSelected = activeChannel?.id === chan.id;
              const hasJoined = chan.joined !== false; // handle case where joined flag isn't returned
              
              const isPriv = chan.isPrivate ?? chan.private;
              return (
                <div
                  key={chan.id}
                  className={`sidebar-item ${isSelected ? 'active' : ''}`}
                  onClick={() => onChannelSelect(chan)}
                  style={!hasJoined ? { 
                    opacity: 0.65, 
                    fontStyle: isPriv ? 'italic' : 'normal'
                  } : {}}
                >
                  <div className="sidebar-item-label">
                    {isPriv ? (
                      <Lock size={15} style={{ 
                        color: isSelected ? 'var(--text-primary)' : (!hasJoined ? 'var(--accent-red)' : 'var(--text-secondary)')
                      }} />
                    ) : (
                      <Hash size={15} style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }} />
                    )}
                    <span>
                      {chan.name}
                    </span>
                  </div>

                  {/* Badges for status */}
                  {!hasJoined && (
                    <span className="sidebar-item-badge" style={isPriv ? {
                      backgroundColor: 'rgba(224, 30, 90, 0.1)',
                      color: 'var(--accent-red)',
                      fontWeight: 600
                    } : {}}>
                      {isPriv ? 'Private' : 'Join'}
                    </span>
                  )}

                  {/* Show info button for active joined channel */}
                  {isSelected && hasJoined && (
                    <button
                      className="add-channel-icon-btn"
                      title="Channel Info & Members"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChannelInfo();
                      }}
                      style={{ padding: '2px', marginLeft: '4px' }}
                    >
                      <Info size={14} />
                    </button>
                  )}
                </div>
              );
            })}

            {channels.length === 0 && (
              <div style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No channels found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info indicator footer */}
      <div className="logout-btn-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>
          Workspace ID:
          <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.7rem', marginTop: '2px', userSelect: 'all' }}>
            {workspace?.id}
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create a Channel</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateChannel}>
              <div className="modal-body">
                {error && <div className="error-banner">{error}</div>}
                
                <div className="auth-form-group">
                  <label htmlFor="chan-name">Channel Name</label>
                  <input
                    id="chan-name"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. marketing-plan"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Names must be lowercase, without spaces or special characters.
                  </span>
                </div>

                <div className="auth-form-group">
                  <label htmlFor="chan-desc">Description</label>
                  <input
                    id="chan-desc"
                    type="text"
                    className="auth-input"
                    placeholder="What is this channel about?"
                    value={channelDesc}
                    onChange={(e) => setChannelDesc(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="auth-form-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '16px', gap: '10px' }}>
                  <label htmlFor="chan-private" className="toggle-switch">
                    <input
                      id="chan-private"
                      type="checkbox"
                      style={{ display: 'none' }}
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      disabled={loading}
                    />
                    <div className="toggle-slider"></div>
                    <span style={{ textTransform: 'none', fontWeight: 600 }}>Make this channel private</span>
                  </label>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 50px' }}>
                  When a channel is private, it can only be viewed or joined by request and approval.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
