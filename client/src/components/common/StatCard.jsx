const COLOR_STYLES = {
  violet: { icon: 'accent-violet', soft: 'bg-accent-violet-soft' },
  emerald: { icon: 'text-[var(--pa-accent-success)]', soft: 'bg-[var(--pa-accent-success-soft)]' },
  sky: { icon: 'text-[var(--pa-accent-blue)]', soft: 'bg-[var(--pa-accent-blue-soft)]' },
  orange: { icon: 'text-[var(--pa-accent-warning)]', soft: 'bg-[var(--pa-accent-warning)]/10' },
  indigo: { icon: 'accent-violet', soft: 'bg-accent-violet-soft' },
  teal: { icon: 'text-[var(--pa-accent-success)]', soft: 'bg-[var(--pa-accent-success-soft)]' },
  cyan: { icon: 'text-[var(--pa-accent-blue)]', soft: 'bg-[var(--pa-accent-blue-soft)]' },
  amber: { icon: 'text-[var(--pa-accent-warning)]', soft: 'bg-[var(--pa-accent-warning)]/10' },
  rose: { icon: 'text-[var(--pa-accent-danger)]', soft: 'bg-[var(--pa-accent-danger)]/10' },
};

export default function StatCard({ icon: Icon, label, value, color = 'violet' }) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.violet;

  return (
    <div className="pa-card p-4 transition-shadow hover:shadow-pa-md sm:p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${styles.soft}`}>
        <Icon className={`h-5 w-5 ${styles.icon}`} />
      </div>
      <p className="mt-3 text-2xl font-bold text-primary">{value}</p>
      <p className="text-sm text-secondary">{label}</p>
    </div>
  );
}
