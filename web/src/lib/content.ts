export function sortByOrder<T extends { data: { order: number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.data.order - b.data.order);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
