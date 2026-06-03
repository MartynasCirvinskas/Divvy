export type DownloadState = 'live' | 'coming-soon';

export function downloadState(url: string | undefined | null): DownloadState {
  return url && url.trim().length > 0 ? 'live' : 'coming-soon';
}
