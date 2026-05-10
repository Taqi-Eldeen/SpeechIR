import { useCallback, useRef, useState } from "react";

/**
 * Ensures only one HTMLAudioElement plays at a time.
 */
export function useAudioManager() {
  const ref = useRef(null);
  const [playingKey, setPlayingKey] = useState(null);

  const stop = useCallback(() => {
    ref.current?.pause();
    ref.current = null;
    setPlayingKey(null);
  }, []);

  const play = useCallback((src, start_s = 0) => {
    ref.current?.pause();
    const audio = new Audio(src);
    audio.preload = "metadata";
    const start = Number(start_s) || 0;
    audio.addEventListener(
      "loadedmetadata",
      () => {
        audio.currentTime = start;
      },
      { once: true }
    );
    audio.currentTime = start;

    const key = `${src}@${start.toFixed(1)}`;
    setPlayingKey(key);

    const clearIfCurrent = () => {
      if (ref.current === audio) {
        ref.current = null;
        setPlayingKey(null);
      }
    };

    audio.addEventListener("ended", clearIfCurrent);
    ref.current = audio;
    audio.play().catch(() => {
      clearIfCurrent();
    });

    return audio;
  }, []);

  return { play, stop, playingKey };
}
