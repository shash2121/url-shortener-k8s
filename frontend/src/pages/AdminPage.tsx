import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GlassCard from '../components/GlassCard';

interface CleanupRun {
  runAt: string;
  deletedCount: number;
  durationMs: number;
}

export default function AdminPage() {
  const [runs, setRuns] = useState<CleanupRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [lastRun, setLastRun] = useState<CleanupRun | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const data = await axios.get('/admin/runs');
      setRuns(data.data);
      if (data.data.length > 0) {
        setLastRun(data.data[0]);
      }
    } catch {
      setError('Failed to load cleanup runs');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCleanup = async () => {
    setRunning(true);
    setError('');
    try {
      const result = await axios.post('/admin/cleanup');
      setToast(`Cleaned up ${result.data.deletedCount} URLs in ${result.data.durationMs}ms`);
      setTimeout(() => setToast(''), 3000);
      await loadRuns();
    } catch {
      setError('Failed to run cleanup');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="orb orb-teal w-96 h-96 top-40 left-1/4 animate-float-slow" />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/15 text-white text-sm">
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <button
            onClick={handleRunCleanup}
            className="btn-primary px-6 py-3 font-medium"
            disabled={running}
          >
            {running ? 'Running...' : 'Run Cleanup'}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {lastRun ? new Date(lastRun.runAt).toLocaleString() : 'Never'}
                </p>
                <p className="text-white/35 text-xs">Last Run</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-semibold">{lastRun?.deletedCount || 0}</p>
                <p className="text-white/35 text-xs">Deleted Last Run</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-semibold">{runs.length}</p>
                <p className="text-white/35 text-xs">Total Runs</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard>
          <h3 className="text-sm font-semibold mb-4 text-white/60 uppercase tracking-widest">Cleanup History</h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-20">🧹</div>
              <p className="text-white/35 text-sm">No cleanup runs yet. Trigger one manually!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-white/40 text-xs uppercase tracking-widest py-3 pr-4">Run At</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-widest py-3 pr-4">Deleted</th>
                    <th className="text-left text-white/40 text-xs uppercase tracking-widest py-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                      <td className="py-3 pr-4 text-white/60 text-sm">
                        {new Date(run.runAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-white/60 text-sm">{run.deletedCount}</td>
                      <td className="py-3 text-white/35 text-sm">{run.durationMs}ms</td>
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
