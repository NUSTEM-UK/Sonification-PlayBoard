export interface PlaybackState {
  position: number;
}

class PlaybackStore {
  states = $state<Record<string, PlaybackState>>({});

  get(datasetId: string): PlaybackState | null {
    return this.states[datasetId] ?? null;
  }

  ensure(datasetId: string): PlaybackState {
    let state = this.states[datasetId];
    if (!state) {
      state = { position: -1 };
      this.states[datasetId] = state;
    }
    return state;
  }

  advance(datasetId: string, rowCount: number): PlaybackState {
    const state = this.ensure(datasetId);
    const count = Math.max(1, rowCount);
    state.position = (state.position + 1) % count;
    return state;
  }
}

export const playback = new PlaybackStore();
