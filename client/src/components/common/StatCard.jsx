const COLOR_STYLES = {
  violet: { border: 'border-violet-100', bg: 'bg-violet-50', iconBg: 'bg-violet-100', text: 'text-violet-600' },
  emerald: { border: 'border-emerald-100', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', text: 'text-emerald-600' },
  sky: { border: 'border-sky-100', bg: 'bg-sky-50', iconBg: 'bg-sky-100', text: 'text-sky-600' },
  orange: { border: 'border-orange-100', bg: 'bg-orange-50', iconBg: 'bg-orange-100', text: 'text-orange-600' },
  indigo: { border: 'border-indigo-100', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', text: 'text-indigo-600' },
  teal: { border: 'border-teal-100', bg: 'bg-teal-50', iconBg: 'bg-teal-100', text: 'text-teal-600' },
};

export default function StatCard({ icon: Icon, label, value, color }) {
  const styles = COLOR_STYLES[color];
  return (
    <div className={`rounded-2xl border ${styles.border} ${styles.bg} p-5 shadow-sm transition-shadow hover:shadow-md`}>
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${styles.iconBg}`}>
        <Icon className={`h-5 w-5 ${styles.text}`} />
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}