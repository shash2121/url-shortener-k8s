import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAnalytics } from '../api/analytics';
import GlassCard from '../components/GlassCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  totalClicks: number;
  todayClicks: number;
  clicksByDay: { day: string; clicks: number }[];
  topReferrers: { referrer: string; count: number }[];
  countries: { country: string; count: number }[];
}

export default function AnalyticsPage() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getAnalytics(code!);
        setData(result);
      } catch {
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <GlassCard key={i}>
                <div className="skeleton h-8 w-20 mb-2" />
                <div className="skeleton h-4 w-16" />
              </GlassCard>
            ))}
          </div>
          <GlassCard>
            <div className="skeleton h-64 w-full" />
          </GlassCard>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <GlassCard>
          <p className="text-red-400">{error}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="orb orb-indigo w-96 h-96 top-40 right-0 animate-float" />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <span className="font-mono bg-white/8 border border-white/10 text-indigo-300 px-2 py-0.5 rounded-md text-sm">
            {code}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-semibold">{data?.totalClicks || 0}</p>
                <p className="text-white/35 text-xs">Total Clicks</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-semibold">{data?.todayClicks || 0}</p>
                <p className="text-white/35 text-xs">Today</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold truncate">
                  {data?.countries[0]?.country || 'N/A'}
                </p>
                <p className="text-white/35 text-xs">Top Country</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold truncate">
                  {data?.topReferrers[0]?.referrer ? new URL(data.topReferrers[0].referrer).hostname : 'Direct'}
                </p>
                <p className="text-white/35 text-xs">Top Referrer</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard>
          <h3 className="text-sm font-semibold mb-4 text-white/60 uppercase tracking-widest">Clicks Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data?.clicksByDay || []}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Area type="monotone" dataKey="clicks" stroke="#818cf8" fill="rgba(129,140,248,0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4 text-white/60 uppercase tracking-widest">Top Referrers</h3>
            {data?.topReferrers.length === 0 ? (
              <p className="text-white/35 text-sm">No referrer data</p>
            ) : (
              <div className="space-y-2">
                {data?.topReferrers.map((r, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-white/60 text-sm truncate max-w-[200px]">{r.referrer}</span>
                    <span className="text-white/35 text-sm">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <h3 className="text-sm font-semibold mb-4 text-white/60 uppercase tracking-widest">Countries</h3>
            {data?.countries.length === 0 ? (
              <p className="text-white/35 text-sm">No country data</p>
            ) : (
              <div className="space-y-2">
                {data?.countries.map((c, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-white/60 text-sm">{c.country}</span>
                    <span className="text-white/35 text-sm">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
