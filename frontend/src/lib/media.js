/** Audio src without #fragment; fragment time is ignored by Audio(). */
export function audioSrcFromPlaybackUrl(playbackUrl) {
  if (!playbackUrl) return "";
  return String(playbackUrl).split("#")[0];
}
