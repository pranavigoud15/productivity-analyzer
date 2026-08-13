import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders } from '../utils/auth';
import PageHeader from '../components/ui/PageHeader';

export default function Admin() {
  const [data, setData] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await API.get('/admin/analytics', { headers: getAuthHeaders() });
      setData(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load analytics.');
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const selectUser = async (userId) => {
    try {
      const response = await API.get(`/admin/users/${userId}`, { headers: getAuthHeaders() });
      setSelectedUser(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load user summary.');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 p-4 text-sm text-[var(--pa-accent-danger)]">
        <span>{error}</span>
        <button type="button" onClick={load} className="pa-btn-secondary px-3 py-1.5 text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading admin analytics…
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Admin analytics"
        description="Database-backed, non-sensitive productivity activity."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Object.entries(data.totals).map(([label, value]) => (
          <div key={label} className="pa-card p-4">
            <p className="text-xs capitalize text-muted">{label.replace(/([A-Z])/g, ' $1')}</p>
            <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>

      <section className="pa-card p-5">
        <h2 className="font-bold text-primary">Users</h2>
        <div className="mt-3 space-y-2">
          {data.users.map((user) => (
            <button
              key={user._id}
              onClick={() => selectUser(user._id)}
              className="flex w-full justify-between border-b border-subtle py-2 text-left text-sm text-secondary transition hover:text-primary hover:accent-violet"
            >
              <span>
                {user.name} <span className="text-muted">{user.email}</span>
              </span>
              <span className="text-muted">View summary</span>
            </button>
          ))}
        </div>
      </section>

      <section className="pa-card p-5">
        <h2 className="font-bold text-primary">Recent activity</h2>
        {data.recentActivity.map((activity, index) => (
          <p key={`${activity.type}-${index}`} className="border-b border-subtle py-2 text-sm text-secondary">
            {activity.type.replace('_', ' ')} · {activity.detail}
          </p>
        ))}
      </section>

      {selectedUser && (
        <section className="pa-card-elevated border-default bg-accent-violet-soft p-5">
          <h2 className="font-bold text-primary">{selectedUser.user.name}&apos;s productivity summary</h2>
          <p className="mt-2 text-sm text-secondary">
            Tasks: {selectedUser.summary.completedTasks}/{selectedUser.summary.tasks} ({selectedUser.summary.taskCompletionRate}%) · Goals: {selectedUser.summary.goals} · Roadmaps: {selectedUser.summary.roadmaps} · Focus: {selectedUser.summary.focusSessions} sessions / {selectedUser.summary.focusMinutes} min · Leaderboard: {selectedUser.summary.leaderboardPosition || 'Unranked'}
          </p>
          <p className="mt-2 text-sm text-secondary">
            AI verification attempts: {selectedUser.verifications.length} · Mock Test attempts: {selectedUser.mockTests.length}
          </p>
        </section>
      )}
    </>
  );
}
