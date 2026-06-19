import { useState, useEffect } from 'react';
import { api } from './services/api';
import { wsClient } from './services/websocket';
import { Auth } from './components/Auth';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { ChannelSidebar } from './components/ChannelSidebar';
import { ChatArea } from './components/ChatArea';
import { ChannelInfoModal } from './components/ChannelInfoModal';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('User');
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isWorkspaceOwner, setIsWorkspaceOwner] = useState(false);
  
  // Modals
  const [showChannelInfo, setShowChannelInfo] = useState(false);

  // Load profile, connect WebSockets, and fetch workspaces if token exists
  useEffect(() => {
    const token = localStorage.getItem('slack_token');
    if (token) {
      setIsAuthenticated(true);
      setLoadingProfileAndData(token);
    }
  }, []);

  const setLoadingProfileAndData = async (token) => {
    try {
      // 1. Fetch current user username from backend test route
      const username = await api.testAuth();
      setCurrentUsername(username || 'User');
      
      // 2. Connect to WebSocket STOMP backend
      wsClient.connect(token);

      // 3. Load user workspaces
      await loadWorkspaces();
    } catch (err) {
      console.error('Session validation failed:', err);
      handleLogout();
    }
  };

  const loadWorkspaces = async (selectWorkspaceId = null) => {
    try {
      const wsList = await api.getWorkspaces();
      setWorkspaces(wsList);
      
      if (wsList.length > 0) {
        // If a specific ID is requested, select it, else retain active, else select first
        let selected = wsList[0];
        if (selectWorkspaceId) {
          const match = wsList.find(w => w.id === selectWorkspaceId);
          if (match) selected = match;
        } else if (activeWorkspace) {
          const match = wsList.find(w => w.id === activeWorkspace.id);
          if (match) selected = match;
        }
        setActiveWorkspace(selected);
      } else {
        setActiveWorkspace(null);
        setChannels([]);
        setActiveChannel(null);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  };

  // Whenever active workspace changes, reload channels
  useEffect(() => {
    if (!activeWorkspace) {
      setChannels([]);
      setActiveChannel(null);
      setIsWorkspaceOwner(false);
      return;
    }

    loadChannels();
  }, [activeWorkspace?.id]);

  const checkWorkspaceOwnership = async (workspaceId, channelsList) => {
    const email = getEmailFromToken();
    if (!email || !workspaceId) {
      setIsWorkspaceOwner(false);
      return;
    }
    // Check localStorage first (populated when user creates a workspace in this session)
    const ownedList = JSON.parse(localStorage.getItem(`slack_owned_workspaces_${email}`) || '[]');
    if (ownedList.includes(workspaceId)) {
      setIsWorkspaceOwner(true);
      return;
    }
    // Determine ownership by checking channel members — the channel OWNER
    // is always the workspace owner (only workspace owners can create channels)
    if (channelsList && channelsList.length > 0) {
      const joinedChannel = channelsList.find(c => c.joined !== false);
      if (joinedChannel) {
        try {
          const members = await api.getChannelMembers(workspaceId, joinedChannel.id);
          const channelOwner = members.find(m => m.role === 'OWNER');
          if (channelOwner && channelOwner.email === email) {
            setIsWorkspaceOwner(true);
            // Cache for faster future checks
            ownedList.push(workspaceId);
            localStorage.setItem(`slack_owned_workspaces_${email}`, JSON.stringify(ownedList));
            return;
          }
        } catch (e) {
          // Cannot verify ownership via channel members
        }
      }
    }
    setIsWorkspaceOwner(false);
  };

  const loadChannels = async (selectChannelId = null) => {
    if (!activeWorkspace) return;
    try {
      const chanList = await api.getChannels(activeWorkspace.id);
      setChannels(chanList);
      
      // Determine workspace ownership from channel members data
      await checkWorkspaceOwnership(activeWorkspace.id, chanList);

      // Load pending join requests for channel owner/admins
      loadPendingRequests(chanList);

      if (chanList.length > 0) {
        let selected = null;
        if (selectChannelId) {
          selected = chanList.find(c => c.id === selectChannelId);
        } else if (activeChannel) {
          // retain active channel if it exists in the new list
          selected = chanList.find(c => c.id === activeChannel.id);
        }
        
        // If we don't have a valid channel selection yet, select first joined public/private channel
        if (!selected) {
          selected = chanList.find(c => c.joined !== false) || chanList[0];
        }

        setActiveChannel(selected);
      } else {
        setActiveChannel(null);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const handleAuthSuccess = (username) => {
    setCurrentUsername(username);
    setIsAuthenticated(true);
    const token = localStorage.getItem('slack_token');
    setLoadingProfileAndData(token);
  };

  const handleLogout = () => {
    api.logout();
    wsClient.disconnect();
    setIsAuthenticated(false);
    setCurrentUsername('User');
    setWorkspaces([]);
    setActiveWorkspace(null);
    setChannels([]);
    setActiveChannel(null);
    setShowChannelInfo(false);
    setIsWorkspaceOwner(false);
  };

  const getEmailFromToken = () => {
    const token = localStorage.getItem('slack_token');
    if (!token) return '';
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      return payload.sub || '';
    } catch (e) {
      console.error('Error parsing token:', e);
      return '';
    }
  };

  const handleWorkspaceCreated = (newWorkspace) => {
    const email = getEmailFromToken();
    const key = `slack_owned_workspaces_${email}`;
    const owned = JSON.parse(localStorage.getItem(key) || '[]');
    if (!owned.includes(newWorkspace.id)) {
      owned.push(newWorkspace.id);
      localStorage.setItem(key, JSON.stringify(owned));
    }
    loadWorkspaces(newWorkspace.id);
  };

  const handleWorkspaceJoined = (workspaceId) => {
    if (workspaceId) {
      const email = getEmailFromToken();
      const key = `slack_joined_workspaces_${email}`;
      const joined = JSON.parse(localStorage.getItem(key) || '[]');
      if (!joined.includes(workspaceId)) {
        joined.push(workspaceId);
        localStorage.setItem(key, JSON.stringify(joined));
      }
    }
    loadWorkspaces(workspaceId);
  };

  const handleChannelCreated = (newChannel) => {
    loadChannels(newChannel.id);
  };

  const handleChannelJoined = (channelId) => {
    loadChannels(channelId);
  };

  const loadPendingRequests = async (currentChannelsList = channels) => {
    if (!activeWorkspace || !currentChannelsList || currentChannelsList.length === 0) {
      setPendingRequests([]);
      return;
    }
    
    let allReqs = [];
    for (const chan of currentChannelsList) {
      const isPriv = chan.isPrivate ?? chan.private;
      if (isPriv && chan.joined !== false) {
        try {
          const reqList = await api.getChannelRequests(activeWorkspace.id, chan.id);
          if (reqList && reqList.length > 0) {
            reqList.forEach(r => {
              allReqs.push({
                ...r,
                channelId: chan.id,
                channelName: chan.name
              });
            });
          }
        } catch (e) {
          // ignore, user is not admin/owner for this channel
        }
      }
    }
    setPendingRequests(allReqs);
  };

  const handleApproveRequest = async (requestId) => {
    if (!activeWorkspace) return;
    try {
      await api.approveRequest(activeWorkspace.id, requestId);
      console.log('Approved request:', requestId);
      await loadChannels(activeChannel?.id);
    } catch (err) {
      console.error('Failed to approve request:', err);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!activeWorkspace) return;
    try {
      await api.rejectRequest(activeWorkspace.id, requestId);
      console.log('Rejected request:', requestId);
      await loadChannels(activeChannel?.id);
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }


  return (
    <div className="app-container">
      {/* 1. Workspace Sidebar */}
      <WorkspaceSidebar
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onWorkspaceSelect={setActiveWorkspace}
        onWorkspaceCreated={handleWorkspaceCreated}
        onWorkspaceJoined={handleWorkspaceJoined}
        onLogout={handleLogout}
        username={currentUsername}
      />

      {/* 2. Channels Sidebar */}
      {activeWorkspace && (
        <ChannelSidebar
          workspace={activeWorkspace}
          channels={channels}
          activeChannel={activeChannel}
          username={currentUsername}
          isWorkspaceOwner={isWorkspaceOwner}
          pendingRequests={pendingRequests}
          onApproveRequest={handleApproveRequest}
          onRejectRequest={handleRejectRequest}
          onChannelSelect={setActiveChannel}
          onChannelCreated={handleChannelCreated}
          onOpenChannelInfo={() => setShowChannelInfo(true)}
        />
      )}

      {/* 3. Main Messaging Area */}
      <ChatArea
        workspaceId={activeWorkspace?.id}
        channel={activeChannel}
        username={currentUsername}
        onChannelJoined={handleChannelJoined}
        onOpenChannelInfo={() => setShowChannelInfo(true)}
      />

      {/* 4. Channel Details Modal */}
      {showChannelInfo && activeWorkspace && activeChannel && (
        <ChannelInfoModal
          workspaceId={activeWorkspace.id}
          channel={activeChannel}
          currentUserUsername={currentUsername}
          isWorkspaceOwner={isWorkspaceOwner}
          onClose={() => setShowChannelInfo(false)}
          onMemberPromoted={loadChannels}
        />
      )}
    </div>
  );
}

export default App;
