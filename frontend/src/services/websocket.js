// Native STOMP over WebSocket Client implementation
class StompWebSocketClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.subscriptions = new Map(); // subId -> { destination, callback }
    this.subCounter = 0;
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.token = null;
    this.onStatusChange = null; // callback for connection status updates
  }

  connect(token, onStatusChange = null) {
    if (this.ws) {
      this.disconnect();
    }
    
    this.token = token;
    if (onStatusChange) {
      this.onStatusChange = onStatusChange;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/websocket?token=${encodeURIComponent(token)}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      this._updateStatus(false, 'connecting');

      this.ws.onopen = () => {
        console.log('WebSocket handshake open, sending STOMP CONNECT...');
        this._sendFrame('CONNECT', {
          'accept-version': '1.1,1.2',
          'heart-beat': '10000,10000',
          'host': 'localhost'
        });
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this._cleanup();
        this._updateStatus(false, 'disconnected');
        
        // Auto-reconnect after 3 seconds
        this.reconnectTimeout = setTimeout(() => {
          console.log('Attempting to reconnect...');
          this.connect(this.token);
        }, 3000);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      this._updateStatus(false, 'error');
    }
  }

  disconnect() {
    console.log('Disconnecting WebSocket...');
    this._cleanup();
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on explicit disconnect
      this.ws.close();
      this.ws = null;
    }
    this._updateStatus(false, 'disconnected');
  }

  subscribe(destination, callback) {
    const subId = `sub-${this.subCounter++}`;
    this.subscriptions.set(subId, { destination, callback });

    if (this.connected) {
      this._sendFrame('SUBSCRIBE', {
        id: subId,
        destination: destination
      });
    }

    // Return unsubscribe function
    return () => {
      console.log(`Unsubscribing from ${destination} (id: ${subId})`);
      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this._sendFrame('UNSUBSCRIBE', { id: subId });
      }
      this.subscriptions.delete(subId);
    };
  }

  sendMessage(destination, body = {}) {
    if (!this.connected) {
      console.error('Cannot send message, WebSocket is not connected.');
      return false;
    }
    this._sendFrame('SEND', {
      destination: destination,
      'content-type': 'application/json'
    }, JSON.stringify(body));
    return true;
  }

  _sendFrame(command, headers = {}, body = '') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    let frame = `${command}\n`;
    for (const [key, val] of Object.entries(headers)) {
      frame += `${key}:${val}\n`;
    }
    frame += `\n${body}\u0000`;
    
    this.ws.send(frame);
  }

  _handleMessage(data) {
    // Check for heartbeat frame
    if (data === '\n' || data === '\r\n') {
      // Respond to heartbeat or just ignore
      return;
    }

    const frame = this._parseFrame(data);
    if (!frame) return;

    // Connect acknowledgement
    if (frame.command === 'CONNECTED') {
      console.log('STOMP CONNECTED successfully');
      this.connected = true;
      this._updateStatus(true, 'connected');
      this._startHeartbeat();
      
      // Resubscribe to active subscriptions on reconnect
      this.subscriptions.forEach((sub, subId) => {
        console.log(`Resubscribing to ${sub.destination} (id: ${subId})`);
        this._sendFrame('SUBSCRIBE', {
          id: subId,
          destination: sub.destination
        });
      });
    } else if (frame.command === 'MESSAGE') {
      const subId = frame.headers['subscription'];
      const subscription = this.subscriptions.get(subId);
      if (subscription) {
        try {
          const parsedBody = JSON.parse(frame.body);
          subscription.callback(parsedBody);
        } catch (e) {
          // If not JSON, return raw body
          subscription.callback(frame.body);
        }
      }
    } else if (frame.command === 'ERROR') {
      console.error('STOMP protocol error received:', frame.headers['message'], frame.body);
    }
  }

  _parseFrame(data) {
    try {
      // Find divider between headers and body (double newline)
      const headerBodyDivider = data.indexOf('\n\n');
      if (headerBodyDivider === -1) return null;

      const headersPart = data.slice(0, headerBodyDivider);
      const bodyPart = data.slice(headerBodyDivider + 2);

      const lines = headersPart.split('\n');
      const command = lines[0].trim();
      const headers = {};

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const key = line.slice(0, colonIndex).trim();
          const val = line.slice(colonIndex + 1).trim();
          headers[key] = val;
        }
      }

      // Remove trailing null character (\u0000) from body
      let body = bodyPart;
      if (body.endsWith('\u0000')) {
        body = body.slice(0, -1);
      }

      return { command, headers, body };
    } catch (e) {
      console.error('Error parsing STOMP frame:', e, data);
      return null;
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('\n'); // send heartbeat character
      }
    }, 10000);
  }

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  _cleanup() {
    this._stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.connected = false;
  }

  _updateStatus(connected, status) {
    if (this.onStatusChange) {
      this.onStatusChange({ connected, status });
    }
  }
}

export const wsClient = new StompWebSocketClient();
export default wsClient;
