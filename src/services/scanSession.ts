/** One capture/picker/analysis at a time; cancelled tasks cannot update a newer scan. */
export function createScanSession() {
  let current: AbortController | null = null;
  return {
    begin() {
      if (current) return null;
      current = new AbortController();
      return current;
    },
    isCurrent(task: AbortController) {
      return current === task && !task.signal.aborted;
    },
    finish(task: AbortController) {
      if (current === task) current = null;
    },
    cancel() {
      current?.abort();
      current = null;
    },
  };
}
