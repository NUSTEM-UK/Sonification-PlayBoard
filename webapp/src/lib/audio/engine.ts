/**
 * The audio engine: turns the visual graph into actual sound with Tone.js.
 *
 * Each generator / filter / output node on the canvas owns one "unit" — a small
 * bundle of Tone nodes with an audio `input` and/or `output`. The engine keeps
 * the Tone graph in sync with the visual graph: it creates units as nodes are
 * dropped, disposes them on delete, and rewires audio connections whenever the
 * audio edges change. Parameters are applied live (from sliders and from
 * signal-modulation in the tick loop).
 */

// Tone is imported for TYPES ONLY here (this is erased at build time). The
// runtime module is loaded lazily in start() — importing it eagerly would make
// Tone create its global AudioContext at page load, which Chrome flags with the
// "AudioContext was not allowed to start" warning before any user gesture.
import type * as Tone from "tone";
import { specFor } from "../graph/specs";
import type { AppEdge, AppNode } from "../graph/graph.svelte";
import { edgeKind } from "../graph/graph.svelte";
import { audioState } from "./audioState.svelte";

/** The runtime Tone.js module, populated by start() after a user gesture. */
let T: typeof import("tone");

interface AudioUnit {
  /** Where audio enters (filters, output). Null for pure generators. */
  input: Tone.ToneAudioNode | null;
  /** Where audio leaves (generators, filters). Null for the master output. */
  output: Tone.ToneAudioNode | null;
  setParam(key: string, value: number): void;
  dispose(): void;
}

function ramp(target: Tone.Signal<any> | Tone.Param<any>, value: number): void {
  target.rampTo(value, 0.03);
}

function createUnit(type: string): AudioUnit {
  switch (type) {
    case "drone": {
      const osc = new T.Oscillator(110, "sawtooth").start();
      const out = new T.Gain(0.4);
      osc.connect(out);
      return {
        input: null,
        output: out,
        setParam(key, v) {
          if (key === "freq") ramp(osc.frequency, v);
          else if (key === "level") ramp(out.gain, v);
        },
        dispose() {
          osc.dispose();
          out.dispose();
        },
      };
    }
    case "pad": {
      const fat = new T.FatOscillator(220, "sawtooth", 14).start();
      fat.count = 3;
      const out = new T.Gain(0.3);
      fat.connect(out);
      return {
        input: null,
        output: out,
        setParam(key, v) {
          if (key === "freq") ramp(fat.frequency, v);
          else if (key === "detune") fat.spread = v;
          else if (key === "level") ramp(out.gain, v);
        },
        dispose() {
          fat.dispose();
          out.dispose();
        },
      };
    }
    case "noise": {
      const noise = new T.Noise("pink").start();
      const out = new T.Gain(0.25);
      noise.connect(out);
      return {
        input: null,
        output: out,
        setParam(key, v) {
          if (key === "level") ramp(out.gain, v);
        },
        dispose() {
          noise.dispose();
          out.dispose();
        },
      };
    }
    case "lowpass": {
      const filter = new T.Filter(1200, "lowpass");
      return {
        input: filter,
        output: filter,
        setParam(key, v) {
          if (key === "cutoff") ramp(filter.frequency, v);
          else if (key === "resonance") ramp(filter.Q, v);
        },
        dispose() {
          filter.dispose();
        },
      };
    }
    case "reverb": {
      const reverb = new T.Reverb(4);
      reverb.generate();
      let pending: ReturnType<typeof setTimeout> | null = null;
      return {
        input: reverb,
        output: reverb,
        setParam(key, v) {
          if (key === "wet") ramp(reverb.wet, v);
          else if (key === "decay") {
            reverb.decay = v;
            // Regenerating the impulse is costly; debounce while a slider drags.
            if (pending) clearTimeout(pending);
            pending = setTimeout(() => reverb.generate(), 120);
          }
        },
        dispose() {
          if (pending) clearTimeout(pending);
          reverb.dispose();
        },
      };
    }
    case "delay": {
      const delay = new T.FeedbackDelay(0.3, 0.4);
      return {
        input: delay,
        output: delay,
        setParam(key, v) {
          if (key === "time") ramp(delay.delayTime, v);
          else if (key === "feedback") ramp(delay.feedback, v);
          else if (key === "wet") ramp(delay.wet, v);
        },
        dispose() {
          delay.dispose();
        },
      };
    }
    case "master": {
      const gain = new T.Gain(0.8).toDestination();
      return {
        input: gain,
        output: null,
        setParam(key, v) {
          if (key === "level") ramp(gain.gain, v);
        },
        dispose() {
          gain.dispose();
        },
      };
    }
    default:
      throw new Error(`no audio unit for node type: ${type}`);
  }
}

class AudioEngine {
  #units = new Map<string, AudioUnit>();
  // Remember the latest graph so we can build it the moment audio is allowed.
  #lastNodes: AppNode[] = [];
  #lastEdges: AppEdge[] = [];

  get started(): boolean {
    return audioState.started;
  }

  /**
   * Resume the AudioContext — must be called from a user gesture — then build
   * any audio units the graph already has (sync() is a no-op before this).
   */
  async start(): Promise<void> {
    if (audioState.started) return;
    // Load Tone here, inside the gesture: this is when its AudioContext is
    // created, so it's created *after* the gesture and Chrome stays quiet.
    T = await import("tone");
    await T.start();
    audioState.started = true;
    this.sync(this.#lastNodes, this.#lastEdges);
  }

  setParam(nodeId: string, key: string, value: number): void {
    this.#units.get(nodeId)?.setParam(key, value);
  }

  /** Reconcile the Tone graph with the current visual graph. */
  sync(nodes: AppNode[], edges: AppEdge[]): void {
    // Always remember the graph, but don't touch Tone (which would force the
    // AudioContext to start) until a user gesture has resumed it.
    this.#lastNodes = nodes;
    this.#lastEdges = edges;
    if (!audioState.started) return;

    const audioNodes = nodes.filter((n) => {
      const spec = specFor(n.data.specType);
      return spec.kind === "generator" || spec.kind === "filter" || spec.kind === "output";
    });
    const wanted = new Set(audioNodes.map((n) => n.id));

    // Dispose units whose node is gone.
    for (const [id, unit] of this.#units) {
      if (!wanted.has(id)) {
        unit.dispose();
        this.#units.delete(id);
      }
    }

    // Create units for new nodes and push their current parameter values.
    for (const node of audioNodes) {
      if (!this.#units.has(node.id)) {
        const unit = createUnit(node.data.specType);
        this.#units.set(node.id, unit);
        for (const [key, value] of Object.entries(node.data.params)) {
          unit.setParam(key, value);
        }
      }
    }

    this.#reconcileConnections(edges);
  }

  #reconcileConnections(edges: AppEdge[]): void {
    // Clear every outgoing audio connection, then rebuild from the edges.
    // (Master's internal gain→destination link is untouched: its output is null.)
    for (const unit of this.#units.values()) {
      unit.output?.disconnect();
    }
    for (const edge of edges) {
      if (edgeKind(edge) !== "audio") continue;
      const from = this.#units.get(edge.source);
      const to = this.#units.get(edge.target);
      if (from?.output && to?.input) {
        from.output.connect(to.input);
      }
    }
  }
}

export const audioEngine = new AudioEngine();
