import { useState, useEffect } from 'react';
import { Trophy, Medal, AlertTriangle } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';

function getRankStyle(rank) {
  if (rank === 1) return 'text-amber-500 font-bold';
  if (rank === 2) return 'text-slate-400 font-bold';
  if (rank === 3) return 'text-amber-700 font-bold';
  return 'text-slate-500';
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await API.get('/leaderboard', { headers: getAuthHeaders() });
      setLeaderboard(Array.isArray(res.data.leaderboard) ? res.data.leaderboard : []);
      setMyEntry(res.data.myEntry || null);
    } catch (err) {
      if (err.response?.status === 401) { clearAuthAndRedirect(); return; }
      setLoadError('Could not load leaderboard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) { clearAuthAndRedirect(); return; }
    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
        Loading leaderboard…
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Leaderboard</h1>
        <p className="mt-1 text-slate-500">Top {leaderboard.length} students ranked by average score</p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {loadError}
          </span>
          <button
            onClick={fetchLeaderboard}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {myEntry && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'My Rank', value: `#${myEntry.rank}` },
            { label: 'My Average', value: `${myEntry.averagePercentage}%` },
            { label: 'My Best', value: `${myEntry.bestPercentage}%` },
            { label: 'Tests Completed', value: myEntry.testsCompleted },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-center shadow-sm">
              <p className="text-xl font-bold text-violet-700">{value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {leaderboard.length === 0 && !loadError && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">No attempts yet.</p>
          <p className="mt-1 text-xs text-slate-400">Complete a mock test to appear on the leaderboard.</p>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Rank</th>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3 text-right">Avg %</th>
                <th className="px-5 py-3 text-right">Best %</th>
                <th className="px-5 py-3 text-right">Tests Done</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => {
                const isMe = myEntry && entry.userId === myEntry.userId;
                return (
                  <tr
                    key={entry.userId}
                    className={`border-b border-slate-50 transition-colors last:border-0 ${
                      isMe ? 'bg-violet-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className={`px-5 py-3.5 ${getRankStyle(entry.rank)}`}>
                      {entry.rank <= 3 ? (
                        <span className="flex items-center gap-1.5">
                          <Medal className="h-4 w-4" />
                          #{entry.rank}
                        </span>
                      ) : (
                        `#${entry.rank}`
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`font-medium ${isMe ? 'text-violet-700' : 'text-slate-700'}`}>
                        {entry.name}
                        {isMe && (
                          <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-600">
                            You
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-sky-600">
                      {entry.averagePercentage}%
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">
                      {entry.bestPercentage}%
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-600">
                      {entry.testsCompleted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}