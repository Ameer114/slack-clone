import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Hash, Lock, CheckCircle2, AlertCircle, X, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';

export function ChatArea({
  workspaceId,
  channel,
  username,
  onChannelJoined,
  onOpenChannelInfo,
  onToggleSidebar
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  
  // Mention popup state
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  
  // Onboarding tip state
  const [showBotTip, setShowBotTip] = useState(false);
  const [tipDismissing, setTipDismissing] = useState(false);
  
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const textareaRef = useRef(null);
  const tipTimerRef = useRef(null);

  const hasJoined = channel && channel.joined !== false;

  // Show onboarding bot tip once per user
  useEffect(() => {
    if (!channel || !hasJoined) return;
    const tipKey = 'slack_amiebot_tip_seen';
    if (localStorage.getItem(tipKey)) return;

    // Small delay so the chat loads first
    const showTimer = setTimeout(() => {
      setShowBotTip(true);
      localStorage.setItem(tipKey, 'true');

      // Auto-dismiss after 8 seconds
      tipTimerRef.current = setTimeout(() => {
        dismissTip();
      }, 8000);
    }, 1200);

    return () => {
      clearTimeout(showTimer);
      if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
    };
  }, [channel?.id, hasJoined]);

  const dismissTip = useCallback(() => {
    setTipDismissing(true);
    setTimeout(() => {
      setShowBotTip(false);
      setTipDismissing(false);
    }, 300);
    if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
  }, []);

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

  const isBot = (name) => {
    return name && name.toLowerCase() === 'amiebot';
  };

  // Handle textarea input for @ mention detection
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setNewMessage(value);

    const cursorPos = e.target.selectionStart;
    // Look backwards from cursor to find a standalone '@'
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      // Make sure the '@' is at the start or preceded by a space/newline
      const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || atIndex === 0) {
        const typed = textBeforeCursor.substring(atIndex + 1);
        // Only show popup if no space after the @ (still typing the mention)
        if (!typed.includes(' ')) {
          const botName = 'amiebot';
          if (botName.startsWith(typed.toLowerCase())) {
            setMentionFilter(typed);
            setMentionStartIndex(atIndex);
            setShowMentionPopup(true);
            return;
          }
        }
      }
    }
    setShowMentionPopup(false);
    setMentionStartIndex(-1);
  }, []);

  const handleMentionSelect = useCallback(() => {
    if (mentionStartIndex === -1) return;
    const before = newMessage.substring(0, mentionStartIndex);
    const cursorPos = textareaRef.current?.selectionStart || mentionStartIndex;
    const after = newMessage.substring(cursorPos);
    const updatedMessage = before + '@amiebot ' + after;
    setNewMessage(updatedMessage);
    setShowMentionPopup(false);
    setMentionStartIndex(-1);
    // Re-focus the textarea and place cursor after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = (before + '@amiebot ').length;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
      }
    }, 0);
  }, [mentionStartIndex, newMessage]);

  // If no channel is selected
  if (!channel) {
    return (
      <div className="empty-state">
        <button className="mobile-hamburger" onClick={onToggleSidebar} aria-label="Open sidebar">
          <ChevronRight size={22} />
        </button>
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
            <button className="mobile-hamburger" onClick={(e) => { e.stopPropagation(); onToggleSidebar(); }} aria-label="Open sidebar">
              <ChevronRight size={20} />
            </button>
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
              <div key={msg.messageId || Math.random()} className={`message-card${isBot(msg.username) ? ' message-card-bot' : ''}`}>
                <div className={`message-avatar${isBot(msg.username) ? ' message-avatar-bot' : ''}`}>
                  {isBot(msg.username) ? '🤖' : getAvatarChar(msg.username)}
                </div>
                <div className="message-body">
                  <div className="message-meta">
                    <span className="message-sender">
                      {msg.username}
                      {isBot(msg.username) && <span className="bot-badge">BOT</span>}
                    </span>
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
            {/* Onboarding bot tip bubble */}
            {showBotTip && (
              <div className={`bot-tip-bubble${tipDismissing ? ' bot-tip-dismissing' : ''}`}>
                <div className="bot-tip-content">
                  <span className="bot-tip-emoji">🤖</span>
                  <p className="bot-tip-text">
                    <strong>Meet amiebot!</strong> Type <code>@amiebot</code> in your message to get an AI-powered response.
                  </p>
                </div>
                <button className="bot-tip-close" onClick={dismissTip} aria-label="Dismiss tip">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* @mention popup */}
            {showMentionPopup && (
              <div className="mention-popup">
                <div className="mention-popup-header">Members</div>
                <button
                  className="mention-popup-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMentionSelect();
                  }}
                  type="button"
                >
                  <span className="mention-popup-avatar">🤖</span>
                  <div className="mention-popup-info">
                    <span className="mention-popup-name">amiebot</span>
                    <span className="mention-popup-badge">BOT</span>
                  </div>
                </button>
              </div>
            )}
            <form onSubmit={handleSend} className="chat-input-box">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder={`Message #${channel.name}`}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (showMentionPopup && e.key === 'Enter') {
                    e.preventDefault();
                    handleMentionSelect();
                    return;
                  }
                  if (showMentionPopup && e.key === 'Escape') {
                    e.preventDefault();
                    setShowMentionPopup(false);
                    return;
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on popup item
                  setTimeout(() => setShowMentionPopup(false), 200);
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
