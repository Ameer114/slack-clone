const API_BASE = '';

// Helper to get headers with optional Authorization
function getHeaders(extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  const token = localStorage.getItem('slack_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to handle fetch responses
async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    } catch (e) {
      // ignore
    }
    throw new Error(errorMessage);
  }
  
  // Some endpoints return empty bodies (like POST /join or approve/reject)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
}

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    if (data && data.token) {
      localStorage.setItem('slack_token', data.token);
    }
    return data;
  },

  async register(username, email, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    return await handleResponse(res);
  },

  logout() {
    localStorage.removeItem('slack_token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('slack_token');
  },

  // Workspaces
  async getWorkspaces() {
    const res = await fetch(`${API_BASE}/api/workspaces`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  async createWorkspace(name, description) {
    const res = await fetch(`${API_BASE}/api/workspaces`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description }),
    });
    return await handleResponse(res);
  },

  async joinWorkspace(workspaceId) {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/join`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  // Channels
  async getChannels(workspaceId) {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/channels`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  async createChannel(workspaceId, name, description, isPrivate) {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/channels`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description, isPrivate }),
    });
    return await handleResponse(res);
  },

  async joinChannel(workspaceId, channelId) {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/channels/${channelId}/join`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  // Channel Members & Access Controls
  async getChannelMembers(workspaceId, channelId) {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/channels/${channelId}/members`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  async requestAccess(workspaceId, channelId) {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/channels/${channelId}/request-access`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  async getChannelRequests(workspaceId, channelId) {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/channels/${channelId}/requests`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  async approveRequest(workspaceId, requestId) {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/channels/requests/${requestId}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  async rejectRequest(workspaceId, requestId) {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/channels/requests/${requestId}/reject`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  async promoteToAdmin(workspaceId, channelId, userId) {
    const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/channels/${channelId}/members/${userId}/promote`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  // Messages History
  async getMessages(channelId) {
    const res = await fetch(`${API_BASE}/api/channels/${channelId}/messages`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  },

  // Test token validation / Retrieve username
  async testAuth() {
    const res = await fetch(`${API_BASE}/api/test`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return await handleResponse(res);
  }
};
