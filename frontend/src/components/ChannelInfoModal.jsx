import { useState, useEffect } from 'react';
import { User, Check, X, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export function ChannelInfoModal({
  workspaceId,
  channel,
  currentUserUsername,
  isWorkspaceOwner,
  onClose,
  onMemberPromoted
}) {
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'requests'
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [canPromoteUser, setCanPromoteUser] = useState(false);
  
  const isPriv = channel && (channel.isPrivate ?? channel.private);

  // Fetch members and requests
  const loadChannelDetails = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch channel members
      const membersList = await api.getChannelMembers(workspaceId, channel.id);
      setMembers(membersList);

      // 2. Check if current user is admin/owner
      const myMembership = membersList.find(m => m.username === currentUserUsername);
      const userIsAdmin = isWorkspaceOwner || (myMembership && (myMembership.role === 'OWNER' || myMembership.role === 'ADMIN'));
      setIsAdmin(!!userIsAdmin);

      // Workspace owner or channel owner (role === 'OWNER') is allowed to promote
      const canPromote = isWorkspaceOwner || (myMembership && myMembership.role === 'OWNER');
      setCanPromoteUser(!!canPromote);

      // 3. If user is admin and channel is private, fetch pending requests
      if (userIsAdmin && isPriv) {
        try {
          const reqList = await api.getChannelRequests(workspaceId, channel.id);
          setRequests(reqList);
        } catch (reqErr) {
          // Silently handle - user may not have sufficient permissions
          console.log('Cannot fetch channel requests:', reqErr.message);
          setRequests([]);
        }
      }
    } catch (err) {
      console.error('Failed to load channel details:', err);
      setError(err.message || 'Failed to retrieve members or requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (channel) {
      loadChannelDetails();
    }
  }, [channel?.id]);

  const handlePromote = async (userId) => {
    setError('');
    try {
      await api.promoteToAdmin(workspaceId, channel.id, userId);
      console.log('Promoted user ID:', userId);
      await loadChannelDetails();
      if (onMemberPromoted) onMemberPromoted();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to promote member');
    }
  };

  const handleApprove = async (requestId) => {
    setError('');
    try {
      await api.approveRequest(workspaceId, requestId);
      console.log('Approved request ID:', requestId);
      await loadChannelDetails();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId) => {
    setError('');
    try {
      await api.rejectRequest(workspaceId, requestId);
      console.log('Rejected request ID:', requestId);
      await loadChannelDetails();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to reject request');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">About #{channel.name}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Tab Headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'members' ? '3px solid var(--accent-purple)' : '3px solid transparent',
              fontWeight: activeTab === 'members' ? 600 : 400,
              color: activeTab === 'members' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('members')}
          >
            Members ({members.length})
          </button>
          
          {isPriv && isAdmin && (
            <button
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'requests' ? '3px solid var(--accent-purple)' : '3px solid transparent',
                fontWeight: activeTab === 'requests' ? 600 : 400,
                color: activeTab === 'requests' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('requests')}
            >
              Access Requests ({requests.length})
            </button>
          )}
        </div>

        <div className="modal-body" style={{ minHeight: '240px', maxHeight: '360px', overflowY: 'auto' }}>
          {error && <div className="error-banner">{error}</div>}
          
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              Loading details...
            </div>
          ) : activeTab === 'members' ? (
            /* Members Tab View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {channel.description || 'No description provided.'}
              </div>
              
              {members.map((member) => (
                <div key={member.userId} className="member-item">
                  <div className="member-info">
                    <div className="member-username">
                      <User size={14} />
                      <span>{member.username}</span>
                      {member.role === 'OWNER' && <span className="member-role-tag">Owner</span>}
                      {member.role === 'ADMIN' && <span className="member-role-tag" style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>Admin</span>}
                    </div>
                    <span className="member-email">{member.email}</span>
                  </div>

                  {/* Promote to Admin Option if workspace owner or channel owner and target is a member */}
                  {canPromoteUser && member.role === 'MEMBER' && (
                    <button
                      onClick={() => handlePromote(member.userId)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--accent-purple)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = 'var(--accent-purple-light)';
                        e.target.style.borderColor = 'var(--accent-purple)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      Make Admin
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Requests Tab View */
            <div className="requests-list">
              {requests.map((req) => (
                <div key={req.requestId} className="request-item">
                  <div className="request-user-info">
                    <span className="request-username">{req.username}</span>
                    <span className="request-email">{req.email}</span>
                  </div>
                  <div className="request-actions">
                    <button
                      className="btn-action-success"
                      title="Approve"
                      onClick={() => handleApprove(req.requestId)}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="btn-action-danger"
                      title="Reject"
                      onClick={() => handleReject(req.requestId)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {requests.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  No pending requests found.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default ChannelInfoModal;
