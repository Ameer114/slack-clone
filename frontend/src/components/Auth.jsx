import { useState } from 'react';
import { api } from '../services/api';

export function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) {
          throw new Error('Please fill in all fields');
        }
        console.log('Logging in user:', email);
        const data = await api.login(email, password);
        // Successful login
        let userDisplayName = email.split('@')[0];
        try {
          // Attempt to get user identity from test endpoint
          const currentUsername = await api.testAuth();
          if (currentUsername) {
            userDisplayName = currentUsername;
          }
        } catch (err) {
          console.warn('Failed to retrieve username from test controller, fallback to email prefix', err);
        }
        
        onAuthSuccess(userDisplayName);
      } else {
        if (!username || !email || !password) {
          throw new Error('Please fill in all fields');
        }
        console.log('Registering user:', username, email);
        await api.register(username, email, password);
        setSuccessMsg('Registration successful! Please log in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1>SlackClone</h1>
          <p>{isLogin ? 'Welcome back! Sign in to your workspaces.' : 'Get started with SlackClone today.'}</p>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {successMsg && (
          <div className="error-banner" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="auth-form-group">
              <label htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                className="auth-input"
                placeholder="e.g. johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="auth-form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="auth-input"
              placeholder="name@work-email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="auth-input"
              placeholder="Your secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? (
            <>
              New to SlackClone?{' '}
              <span className="auth-link" onClick={() => { setIsLogin(false); setError(''); }}>
                Create an account
              </span>
            </>
          ) : (
            <>
              Already using SlackClone?{' '}
              <span className="auth-link" onClick={() => { setIsLogin(true); setError(''); }}>
                Sign in to your account
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
