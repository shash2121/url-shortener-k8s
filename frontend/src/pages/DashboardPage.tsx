import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shortenUrl, getUserUrls, deleteUrl } from '../api/urls';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';

interface UrlItem {
  code: string;
  longUrl: string;
  clicks: number;
  expiresAt: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiresIn, setExpiresIn] = useState('');
  const [shortening, setShortening] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUrls();
  }, [token]);

  const loadUrls = async () => {
    try {
      const data = await getUserUrls(token!);
      setUrls(data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        logout();
        navigate('/login', { state: { expired: true } });
        return;
      }
      setError('Failed to load URLs');
    } finally {
      setLoading(false);
    }
  };

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setShortening(true);
    setError('');

    try {
      const result = await shortenUrl(url, alias || undefined, expiresIn || undefined, token!);
      setToast(`Short URL created: ${result.shortUrl}`);
      setUrl('');
      setAlias('');
      setExpiresIn('');
      await loadUrls();
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to shorten URL');
    } finally {
      setShortening(false);
    }
  };

  const handleDelete = async (code: string) => {
    try {
      await deleteUrl(code, token!);
      setUrls(urls.filter((u) => u.code !== code));
      setToast('URL deleted');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        logout();
        navigate('/login', { state: { expired: true } });
        return;
      }
      setError('Failed to delete URL');
    }
  };

  const handleCopy = (code: string) => {
    const text = `${window.location.origin}/s/${code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setToast('Copied to clipboard');
    setTimeout(() => setToast(''), 3000);
  };

  const handleAnalytics = (code: string) => {
    navigate(`/analytics/${code}`);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="orb orb-purple w-96 h-96 top-20 -left-20 animate-float" />
      <div className="orb orb-teal w-80 h-80 bottom-20 right-0 animate-float-delay" />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/15 text-white text-sm">
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4 tracking-tight">Shorten a URL</h2>
          <form onSubmit={handleShorten} className="space-y-4">
            <div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="glass-input w-full px-4 py-3"
                placeholder="https://example.com/very-long-url"
                required
              />
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="glass-input flex-1 px-4 py-3"
                placeholder="Custom alias (optional)"
              />
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="glass-input px-4 py-3"
              >
                <option value="">No expiry</option>
                <option value="1h">1 hour</option>
                <option value="1d">1 day</option>
                <option value="1w">1 week</option>
                <option value="1m">1 month</option>
              </select>
            </div>
            <button type="submit" className="btn-primary px-6 py-3 font-medium" disabled={shortening}>
              {shortening ? 'Shortening...' : 'Shorten URL'}
            </button>
          </form>
        </GlassCard>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <GlassCard>
          <h2 className="text-lg font-semibold mb-4 tracking-tight">Your URLs</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : urls.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-20">🔗</div>
              <p className="text-white/35 text-sm">No URLs yet. Shorten your first link above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-white/40 text-xs uppercase tracking-widest py-3 pr-4">Code</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-widest py-3 pr-4">Destination</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-widest py-3 pr-4">Clicks</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-widest py-3 pr-4">Expires</th>
                    <th className="text-right text-white/40 text-xs uppercase tracking-widest py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {urls.map((u) => (
                    <tr key={u.code} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="font-mono bg-white/8 border border-white/10 text-indigo-300 px-2 py-0.5 rounded-md text-sm">
                          {u.code}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-white/60 text-sm truncate max-w-xs block" title={u.longUrl}>
                          {u.longUrl}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white/60 text-sm">{u.clicks}</td>
                      <td className="py-3 pr-4 text-white/35 text-xs">
                        {u.expiresAt ? new Date(u.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAnalytics(u.code)}
                            className="btn-ghost px-3 py-1.5 text-xs"
                          >
                            Analytics
                          </button>
                          <button
                            onClick={() => handleCopy(u.code)}
                            className="btn-ghost px-3 py-1.5 text-xs"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => handleDelete(u.code)}
                            className="btn-danger px-3 py-1.5 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
