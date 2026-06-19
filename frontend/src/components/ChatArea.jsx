import { useState, useEffect, useRef } from 'react';
import { Send, Hash, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';

export function ChatArea({
  workspaceId,
  channel,
  username,
  onChannelJoined,
  onOpenChannelInfo
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  const hasJoined = channel && channel.joined !== false;

  // Load message history and setup websocket subscription
  useEffect(() => {
    if (!channel || !hasJoined) {
      setMessages([]);
      return;
    }

    // 1. Fetch message history
    const loadMessages = async () => {
      setLoading(true);
      setError('');
      try {
        const history = await api.getMessages(channel.id);
        setMessages(history);
      } catch (err) {
        console.error('Failed to load message history:', err);
        setError('Could not retrieve messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
    setRequestSent(false);

    // 2. Subscribe to WebSocket topic
    console.log(`Subscribing to WebSocket for channel: ${channel.name} (${channel.id})`);
    
    // Unsubscribe from previous first if any
    if (subscriptionRef.current) {
      subscriptionRef.current();
    }

    // Subscribe and append new messages to state
    subscriptionRef.current = wsClient.subscribe(
      `/topic/channels/${channel.id}`,
      (message) => {
        console.log('Received WebSocket message:', message);
        setMessages((prev) => {
          // Prevent duplicates by checking messageId
          if (prev.some((m) => m.messageId === message.messageId)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    );

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [channel?.id, hasJoined]);

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Synchronize pending requests list from local storage when active channel changes
  useEffect(() => {
    if (channel && channel.joined === false) {
      const key = 'slack_pending_requests';
      const pending = JSON.parse(localStorage.getItem(key) || '[]');
      setRequestSent(pending.includes(channel.id));
    } else {
      setRequestSent(false);
    }
  }, [channel?.id]);

  // Clean up pending requests from local storage if user successfully joins the channel
  useEffect(() => {
    if (channel && hasJoined) {
      const key = 'slack_pending_requests';
      const pending = JSON.parse(localStorage.getItem(key) || '[]');
      if (pending.includes(channel.id)) {
        const filtered = pending.filter(id => id !== channel.id);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  }, [channel?.id, hasJoined]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !channel) return;

    console.log('Sending message over WS:', newMessage);
    const sent = wsClient.sendMessage('/app/chat.send', {
      channelId: channel.id,
      content: newMessage.trim()
    });

    if (sent) {
      setNewMessage('');
    } else {
      setError('WebSocket not connected. Retrying message...');
    }
  };

  const handleJoin = async () => {
    if (!channel) return;
    setLoading(true);
    setError('');
    try {
      await api.joinChannel(workspaceId, channel.id);
      console.log('Joined public channel:', channel.name);
      onChannelJoined(channel.id);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to join channel');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!channel) return;
    setSubmittingRequest(true);
    setError('');
    try {
      await api.requestAccess(workspaceId, channel.id);
      console.log('Requested access to private channel:', channel.name);
      
      const key = 'slack_pending_requests';
      const pending = JSON.parse(localStorage.getItem(key) || '[]');
      if (!pending.includes(channel.id)) {
        pending.push(channel.id);
        localStorage.setItem(key, JSON.stringify(pending));
      }
      
      setRequestSent(true);
      if (onChannelJoined) {
        onChannelJoined(channel.id);
      }
    } catch (err) {
      console.error(err);
      if (err.message && err.message.toLowerCase().includes('already exists')) {
        const key = 'slack_pending_requests';
        const pending = JSON.parse(localStorage.getItem(key) || '[]');
        if (!pending.includes(channel.id)) {
          pending.push(channel.id);
          localStorage.setItem(key, JSON.stringify(pending));
        }
        setRequestSent(true);
      } else {
        setError(err.message || 'Failed to submit access request');
      }
    } finally {
      setSubmittingRequest(false);
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getAvatarChar = (name) => {
    return name ? name.substring(0, 2).toUpperCase() : 'U';
  };

  // If no channel is selected
  if (!channel) {
    return (
      <div className="empty-state">
        <Hash size={48} className="empty-state-icon" />
        <h2>Welcome to SlackClone!</h2>
        <p>Choose a channel from the sidebar or create a new one to begin messaging.</p>
      </div>
    );
  }

  const isPriv = channel && (channel.isPrivate ?? channel.private);

  return (
    <div className="chat-container">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-title" onClick={hasJoined ? onOpenChannelInfo : null} style={{ cursor: hasJoined ? 'pointer' : 'default' }}>
            {isPriv ? <Lock size={16} /> : <Hash size={16} />}
            <span>{channel.name}</span>
          </div>
          <div className="chat-header-description">
            {channel.description || 'No description provided.'}
          </div>
        </div>
        
        {hasJoined && (
          <div className="chat-header-actions">
            <button className="secondary-action-btn" onClick={onOpenChannelInfo}>
              View Members & Settings
            </button>
          </div>
        )}
      </div>

      {/* Main Viewport */}
      {!hasJoined ? (
        // Non-Member Empty Screen
        <div className="empty-state">
          {isPriv ? (
            <>
              <Lock size={48} className="empty-state-icon" />
              <h2>Private Channel</h2>
              <p>This channel is private. You must be added by an admin or request access to view messages.</p>
              {error && <div className="error-banner" style={{ width: '100%', maxWidth: '340px' }}>{error}</div>}
              {requestSent ? (
                <div className="flex-row" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                  <CheckCircle2 size={20} />
                  <span>Access Request Pending Approval</span>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleRequestAccess}
                  disabled={submittingRequest}
                >
                  {submittingRequest ? 'Submitting Request...' : 'Request Access'}
                </button>
              )}
            </>
          ) : (
            <>
              <Hash size={48} className="empty-state-icon" />
              <h2>Join Channel</h2>
              <p>You are viewing <strong>#{channel.name}</strong>. Join the channel to read history and send messages.</p>
              {error && <div className="error-banner" style={{ width: '100%', maxWidth: '340px' }}>{error}</div>}
              <button
                className="btn btn-primary"
                onClick={handleJoin}
                disabled={loading}
              >
                {loading ? 'Joining...' : 'Join Channel'}
              </button>
            </>
          )}
        </div>
      ) : (
        // Chat messaging history and input viewport
        <>
          <div className="chat-messages">
            {loading && messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading conversation history...
              </div>
            )}
            
            {error && (
              <div className="error-banner">
                <AlertCircle size={16} style={{ marginRight: '6px' }} />
                {error}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.messageId || Math.random()} className="message-card">
                <div className="message-avatar">
                  {getAvatarChar(msg.username)}
                </div>
                <div className="message-body">
                  <div className="message-meta">
                    <span className="message-sender">{msg.username}</span>
                    <span className="message-time">{formatTimestamp(msg.createdAt)}</span>
                  </div>
                  <div className="message-content">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {messages.length === 0 && !loading && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '40px 0' }}>
                This is the start of the #{channel.name} channel.
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Message Input */}
          <div className="chat-input-area">
            <form onSubmit={handleSend} className="chat-input-box">
              <textarea
                className="chat-textarea"
                placeholder={`Message #${channel.name}`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <div className="chat-input-actions">
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!newMessage.trim()}
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
