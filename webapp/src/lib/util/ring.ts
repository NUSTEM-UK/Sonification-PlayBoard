/**
 * Fixed-size ring buffer of floats, used to back the scrolling sparklines.
 *
 * Deliberately NOT reactive: signals update tens of times per second, so the
 * sparklines redraw imperatively on their own animation frame rather than
 * pushing every sample through Svelte's reactivity.
 */
export class Ring {
  private buf: Float32Array;
  private head = 0;
  private filled = 0;

  constructor(public readonly capacity: number) {
    this.buf = new Float32Array(capacity);
  }

  push(value: number): void {
    this.buf[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.filled < this.capacity) this.filled++;
  }

  get length(): number {
    return this.filled;
  }

  /** Most recent value, or 0 if empty. */
  get last(): number {
    if (this.filled === 0) return 0;
    return this.buf[(this.head - 1 + this.capacity) % this.capacity];
  }

  /** Walk samples oldest → newest, calling `fn(value, index)`. */
  forEach(fn: (value: number, index: number) => void): void {
    const start = this.filled < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.filled; i++) {
      fn(this.buf[(start + i) % this.capacity], i);
    }
  }
}
