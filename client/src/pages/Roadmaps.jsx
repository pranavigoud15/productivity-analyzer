import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Loader2, Map, Trophy, Award } from 'lucide-react';
import API from '../services/api';
import { getAuthHeaders, clearAuthAndRedirect } from '../utils/auth';
import StatCard from '../components/common/StatCard';

function RoadmapCard({ roadmap, pendingMilestoneIds, onToggleMilestone }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const milestones = roadmap.milestones || [];
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const pendingMilestones = totalMilestones - completedMilestones;
  const progress = totalMilestones === 0 ? 0 : Math.round((completedMilestones / totalMilestones) * 100);

  return (
    <li className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-700">{roadmap.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {completedMilestones} completed · {pendingMilestones} pending
          </p>
        </div>
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200"
        >
          {isExpanded ? 'Hide Weeks' : 'View Weeks'}
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">{progress}% complete</p>
      </div>

      {isExpanded && (
        <ul className="mt-4 space-y-2 border-t border-slate-200 pt-3">
          {milestones.map((milestone) => {
            const isCompleted = milestone.status === 'completed';
            const isPending = pendingMilestoneIds.has(milestone._id);
            const range =
              milestone.startDate && milestone.endDate
                ? `${new Date(milestone.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${new Date(
                    milestone.endDate
                  ).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                : null;

            return (
              <li key={milestone._id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={() => onToggleMilestone(roadmap, milestone)}
                    disabled={isPending}
                    aria-label={isCompleted ? 'Mark week as pending' : 'Mark week as complete'}
                    className="shrink-0 disabled:opacity-50"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 hover:text-sky-400" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p
                      className={`truncate text-xs font-medium ${
                        isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'
                      }`}
                    >
                      {milestone.title}
                    </p>
                    {range && <p className="text-[11px] text-slate-400">{range}</p>}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isCompleted ? 'Done' : 'Pending'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export default function Roadmaps() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [pendingMilestoneIds, setPendingMilestoneIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchRoadmaps = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await API.get('/roadmaps', { headers: getAuthHeaders() });
      setRoadmaps(Array.isArray(res.data) ? res.data : res.data.roadmaps || []);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthAndRedirect();
        return;
      }
      setLoadError('Could not load your roadmaps. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      clearAuthAndRedirect();
      return;
    }
    fetchRoadmaps();
  }, [fetchRoadmaps]);

  const setMilestonePending = (id, isPending) => {
    setPendingMilestoneIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleMilestone = async (roadmap, milestone) => {
    const milestoneId = milestone._id;
    setMilestonePending(milestoneId, true);
    try {
      const res = await API.patch(
        `/roadmaps/${roadmap._id}/milestones/${milestoneId}/complete`,
        {},
        { headers: getAuthHeaders() }
      );
      const updated = res.data;
      setRoadmaps((prev) => prev.map((r) => ((r._id || r.id) === (updated._id || updated.id) ? updated : r)));
    } catch (err) {
      setLoadError('Could not update that milestone. Please try again.');
    } finally {
      setMilestonePending(milestoneId, false);
    }
  };

  const allMilestones = roadmaps.flatMap((r) => r.milestones || []);
  const totalRoadmaps = roadmaps.length;
  const totalMilestones = allMilestones.length;
  const completedMilestones = allMilestones.filter((m) => m.status === 'completed').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your roadmaps...
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Learning Roadmaps</h1>
        <p className="mt-1 text-slate-500">Auto-generated week-by-week plans for each of your goals.</p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          <span>{loadError}</span>
          <button
            onClick={fetchRoadmaps}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Roadmaps" value={totalRoadmaps} icon={Map} color="sky" />
        <StatCard label="Total Milestones" value={totalMilestones} icon={Trophy} color="indigo" />
        <StatCard label="Completed Milestones" value={completedMilestones} icon={Award} color="teal" />
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Your Roadmaps</h2>
            <p className="text-sm text-slate-400">
              {roadmaps.length} roadmap{roadmaps.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="mt-5">
          {roadmaps.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No roadmaps yet — creating a goal automatically generates one.
            </p>
          ) : (
            <ul className="space-y-3">
              {roadmaps.map((roadmap) => (
                <RoadmapCard
                  key={roadmap._id || roadmap.id}
                  roadmap={roadmap}
                  pendingMilestoneIds={pendingMilestoneIds}
                  onToggleMilestone={handleToggleMilestone}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
