// Foreground polling catches edits from other devices even when the outbox is empty.
export class SyncScheduler {
  private owner = 'guest';
  private nextPoll = 0;
  private retryAt = 0;
  private failures = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pendingEdit = false;
  private running = false;
  constructor(private now: () => number = Date.now,
    private schedule = setTimeout, private unschedule = clearTimeout) {}

  request(owner: string, active: boolean, edit: boolean, run: () => Promise<void>) {
    if (this.owner !== owner) {
      this.cancel();
      this.owner = owner;
      this.nextPoll = this.retryAt = this.failures = 0;
      this.pendingEdit = false;
    }
    this.pendingEdit ||= edit;
    if (!active || owner === 'guest') { this.cancel(); return; }
    if (this.running || this.now() < this.retryAt) return;
    if (!this.pendingEdit && this.now() < this.nextPoll) return;
    this.cancel();
    this.timer = this.schedule(() => {
      this.timer = undefined;
      this.running = true;
      this.pendingEdit = false;
      void run().then(() => {
        if (this.owner === owner) {
          this.failures = 0;
          this.retryAt = 0;
          this.nextPoll = this.now() + 300000;
        }
      }).catch(() => {
        if (this.owner === owner) {
          this.pendingEdit = true;
          this.retryAt = this.now() + Math.min(300000, 30000 * 2 ** this.failures++);
        }
      }).finally(() => { this.running = false; });
    }, this.pendingEdit ? 1500 : 0);
  }

  completed(owner: string) {
    this.cancel();
    if (this.owner !== owner) this.pendingEdit = false;
    this.owner = owner;
    this.nextPoll = this.now() + 300000;
    this.retryAt = this.failures = 0;
  }
  cancel() { if (this.timer !== undefined) this.unschedule(this.timer); this.timer = undefined; }
}
