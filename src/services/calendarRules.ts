// Local calendar arithmetic avoids UTC day shifts and daylight-saving offsets.
export function localDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftDay(date: string, offset: number): string {
  const value = localDay(date);
  value.setDate(value.getDate() + offset);
  return dayKey(value);
}
export function shiftMonth(date: string, offset: number): string {
  const value = localDay(date);
  return dayKey(
    new Date(value.getFullYear(), value.getMonth() + offset, 1, 12),
  );
}
export function monthDays(date: string): (string | null)[] {
  const value = localDay(date);
  const first = new Date(value.getFullYear(), value.getMonth(), 1, 12);
  const count = new Date(
    value.getFullYear(),
    value.getMonth() + 1,
    0,
    12,
  ).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let day = 1; day <= count; day++)
    cells.push(
      dayKey(new Date(value.getFullYear(), value.getMonth(), day, 12)),
    );
  while (cells.length % 7) cells.push(null);
  return cells;
}
