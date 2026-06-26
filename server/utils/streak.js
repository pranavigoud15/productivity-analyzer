// Consecutive days (today, or yesterday if nothing happened yet today)
// with at least one event on that date. Shared by task-completion streak
// and journal streak — same algorithm, different source dates.
function calculateStreakFromDates(dates) {
  const dateStrings = new Set(dates.filter(Boolean).map((d) => new Date(d).toDateString()));

  if (dateStrings.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();

  if (!dateStrings.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dateStrings.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

module.exports = { calculateStreakFromDates };