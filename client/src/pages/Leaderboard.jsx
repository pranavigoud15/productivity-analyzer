import { useState, useEffect } from 'react';
import { Trophy, Medal, AlertTriangle } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

function getRankStyle(rank) {
  if (rank === 1) return 'text-[var(--pa-accent-warning)] font-bold';
  if (rank === 2) return 'text-muted font-bold';
  if (rank === 3) return 'text-[var(--pa-accent-warning)]/80 font-bold';
  return 'text-secondary';
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
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-default border-t-[var(--pa-accent-violet)]" />
        Loading leaderboard…
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description={`Top ${leaderboard.length} students ranked by average score`}
      />

      {loadError && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 p-4 text-sm text-[var(--pa-accent-danger)]">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {loadError}
          </span>
          <button type="button" onClick={fetchLeaderboard} className="pa-btn-secondary px-3 py-1.5 text-xs font-semibold">
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
            <div key={label} className="pa-card p-4 text-center">
              <p className="text-xl font-bold accent-violet">{value}</p>
              <p className="mt-0.5 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      )}

      {leaderboard.length === 0 && !loadError && (
        <EmptyState
          icon={Trophy}
          title="No attempts yet"
          description="Complete a mock test to appear on the leaderboard."
        />
      )}

      {leaderboard.length > 0 && (
        <div className="pa-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default bg-surface-secondary text-left text-xs font-semibold uppercase tracking-wide text-muted">
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
                    className={`border-b border-subtle transition-colors last:border-0 ${
                      isMe ? 'bg-accent-violet-soft' : 'hover:bg-hover'
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
                      <span className={`font-medium ${isMe ? 'accent-violet' : 'text-primary'}`}>
                        {entry.name}
                        {isMe && (
                          <span className="ml-2 rounded-full bg-accent-violet-soft px-2 py-0.5 text-xs font-semibold accent-violet">
                            You
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[var(--pa-accent-blue)]">
                      {entry.averagePercentage}%
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[var(--pa-accent-success)]">
                      {entry.bestPercentage}%
                    </td>
                    <td className="px-5 py-3.5 text-right text-secondary">
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
