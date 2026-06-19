/**
 * Transport state for recorded-source nodes.
 *
 * Keyed by NODE id (not dataset id): each recorded node drives its own
 * playhead through the dataset it references, so two nodes pointing at the same
 * CSV can run at different speeds or directions. All series (columns) within a
 * single node share one playhead, since they are time-aligned rows.
 *
 * `position` is fractional so playback speed can be < 1; consumers floor it when
 * indexing samples.
 */

export interface PlaybackState {
  /** Fractional playhead, 0 .. rowCount-1. */
  position: number;
  /** Whether the playhead advances on each tick. */
  playing: boolean;
  /** Wrap back to the start at the end (vs. stop). */
  loop: boolean;
  /** Rows advanced per tick. 1 == one sample per tick. */
  speed: number;
}

const DEFAULTS: Omit<PlaybackState, "position"> = {
  playing: true,
  loop: true,
  speed: 1,
};

class PlaybackStore {
  states = $state<Record<string, PlaybackState>>({});

  get(nodeId: string): PlaybackState | null {
    return this.states[nodeId] ?? null;
  }

  ensure(nodeId: string): PlaybackState {
    let state = this.states[nodeId];
    if (!state) {
      state = { position: 0, ...DEFAULTS };
      this.states[nodeId] = state;
    }
    return state;
  }

  /** Advance one tick, honouring play/pause, speed and loop. */
  advance(nodeId: string, rowCount: number): PlaybackState {
    const state = this.ensure(nodeId);
    if (!state.playing) return state;
    const count = Math.max(1, rowCount);
    let next = state.position + state.speed;
    if (next >= count || next < 0) {
      if (state.loop) {
        next = ((next % count) + count) % count;
      } else {
        next = next < 0 ? 0 : count - 1;
        state.playing = false;
      }
    }
    state.position = next;
    return state;
  }

  togglePlay(nodeId: string): void {
    this.ensure(nodeId).playing = !this.states[nodeId].playing;
  }

  /** Reset to the start and pause. */
  stop(nodeId: string): void {
    const state = this.ensure(nodeId);
    state.position = 0;
    state.playing = false;
  }

  toggleLoop(nodeId: string): void {
    this.ensure(nodeId).loop = !this.states[nodeId].loop;
  }

  setSpeed(nodeId: string, speed: number): void {
    this.ensure(nodeId).speed = speed;
  }

  remove(nodeId: string): void {
    if (this.states[nodeId]) {
      const { [nodeId]: _drop, ...rest } = this.states;
      this.states = rest;
    }
  }
}

export const playback = new PlaybackStore();
