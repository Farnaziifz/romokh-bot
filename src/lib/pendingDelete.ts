const pending = new Map<number, NodeJS.Timeout>();
const UNDO_WINDOW_MS = 10_000;

export function scheduleDelete(taskId: number, onDelete: () => Promise<void>) {
  const timer = setTimeout(async () => {
    pending.delete(taskId);
    await onDelete();
  }, UNDO_WINDOW_MS);
  pending.set(taskId, timer);
}

export function cancelDelete(taskId: number): boolean {
  const timer = pending.get(taskId);
  if (!timer) return false;
  clearTimeout(timer);
  pending.delete(taskId);
  return true;
}
