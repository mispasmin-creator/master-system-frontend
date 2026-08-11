export const formatDelayDuration = (days?: number | null) => {
  const delay = Number(days) || 0;
  const totalHours = Math.round(delay * 24);
  const wholeDays = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (totalHours <= 0) return "0h";
  if (wholeDays > 0) return `${wholeDays}d ${hours}h`;
  return `${hours}h`;
};
