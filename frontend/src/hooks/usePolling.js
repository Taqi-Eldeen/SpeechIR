import { useEffect, useRef } from "react";
import { pollStatus } from "../api/status.js";

/**
 * Polls GET /status/{file_id} until status is done or error.
 * @param {number|null} fileId
 * @param {(data: object) => void} onUpdate - called on every poll with status payload
 * @param {(data: object) => void} onDone - called once when terminal status reached
 * @param {number} interval
 */
export function usePolling(fileId, onUpdate, onDone, interval = 2000) {
  const onUpdateRef = useRef(onUpdate);
  const onDoneRef = useRef(onDone);
  onUpdateRef.current = onUpdate;
  onDoneRef.current = onDone;

  useEffect(() => {
    if (fileId == null) return undefined;

    let cancelled = false;

    const tick = async () => {
      try {
        const data = await pollStatus(fileId);
        if (cancelled) return;
        onUpdateRef.current?.(data);
        if (data.status === "done" || data.status === "error") {
          onDoneRef.current?.(data);
          return true;
        }
      } catch {
        if (!cancelled) {
          onDoneRef.current?.({ status: "error", error_message: "poll failed" });
        }
        return true;
      }
      return false;
    };

    let timer = null;
    const loop = async () => {
      const stop = await tick();
      if (stop || cancelled) return;
      timer = setTimeout(loop, interval);
    };

    void loop();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fileId, interval]);
}
