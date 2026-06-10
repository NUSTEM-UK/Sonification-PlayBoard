##############################################################################
# Peter Gunn Theme — Sonic Pi arrangement
# Source: MuseScore transcription by leopoldk / Kenton Franklin
# Parts: Bass (P8), Drums (P9), Brass upper (P4), Brass lower (P5)
#
# OSC CONTROL
# Send OSC messages to Sonic Pi's default listener (port 4560) on /peter_gunn/*
#
# Controllable parameters (set via OSC or edit defaults below):
#
#   /peter_gunn/bpm          float   Tempo (default 120)
#   /peter_gunn/bass_amp     float   Bass volume 0.0–2.0 (default 0.9)
#   /peter_gunn/brass_amp    float   Brass volume 0.0–2.0 (default 0.85)
#   /peter_gunn/drums_amp    float   Drums volume 0.0–2.0 (default 0.8)
#   /peter_gunn/bass_synth   string  Synth name for bass, e.g. "bass_foundation" (default)
#   /peter_gunn/brass_synth  string  Synth name for brass, e.g. "blade" (default)
#   /peter_gunn/reverb_room  float   Reverb room size 0.0–1.0 (default 0.3)
#   /peter_gunn/playing      int     1 = playing, 0 = stop (default 1)
#
# Example (from Python / python-osc):
#   client.send_message('/peter_gunn/bpm', 140.0)
#   client.send_message('/peter_gunn/brass_amp', 1.2)
##############################################################################

##############################################################################
# SHARED STATE — OSC handlers write here, loops read here each iteration
##############################################################################

set :bpm,         120.0
set :bass_amp,    0.9
set :brass_amp,   0.85
set :drums_amp,   0.8
set :bass_synth,  :bass_foundation
set :brass_synth, :blade
set :reverb_room, 0.3
set :playing,     1

# OSC handlers — one per parameter
live_loop :osc_bpm do
  use_real_time
  b = sync "/osc*/peter_gunn/bpm"
  set :bpm, b[0].to_f
end

live_loop :osc_bass_amp do
  use_real_time
  v = sync "/osc*/peter_gunn/bass_amp"
  set :bass_amp, v[0].to_f
end

live_loop :osc_brass_amp do
  use_real_time
  v = sync "/osc*/peter_gunn/brass_amp"
  set :brass_amp, v[0].to_f
end

live_loop :osc_drums_amp do
  use_real_time
  v = sync "/osc*/peter_gunn/drums_amp"
  set :drums_amp, v[0].to_f
end

live_loop :osc_bass_synth do
  use_real_time
  v = sync "/osc*/peter_gunn/bass_synth"
  set :bass_synth, v[0].to_sym
end

live_loop :osc_brass_synth do
  use_real_time
  v = sync "/osc*/peter_gunn/brass_synth"
  set :brass_synth, v[0].to_sym
end

live_loop :osc_reverb_room do
  use_real_time
  v = sync "/osc*/peter_gunn/reverb_room"
  set :reverb_room, v[0].to_f
end

live_loop :osc_playing do
  use_real_time
  v = sync "/osc*/peter_gunn/playing"
  set :playing, v[0].to_i
end

##############################################################################
# HELPER — convert beats to seconds at current BPM (one beat = one quarter note)
##############################################################################

define :b do |beats|
  60.0 / get[:bpm] * beats
end

##############################################################################
# BASS — P8
# The main ostinato (measures 1–20, 24–44) repeats on a short riff.
# Measures 21–23 are a sparse transitional figure.
# Measures 45–47 are the final held cadence.
# In the MXL the ostinato is written once in M1 and implied to repeat;
# we encode the two distinct cells as arrays and loop them.
##############################################################################

# The 4-bar ostinato cell (M1) — note, dur_in_beats
BASS_OSTINATO = [
  [:e2, 0.5], [:e2, 0.5], [:fs2, 0.5], [:e2, 0.5],
  [:g2, 0.25], [:ab2, 0.25], [:e2, 0.5],
  [:a2, 0.5], [:ab2, 0.5]
]

# Transitional fill (M21–M23)
BASS_TRANSITION = [
  # M21: E on beat 1, rest, rest, E on beat 4
  [:e2, 0.5], [:r, 0.5], [:r, 1.0], [:r, 1.0], [:e2, 1.0],
  # M22: rest 2, B, B, rest
  [:r, 2.0], [:r, 0.5], [:b2, 0.5], [:b2, 0.5], [:r, 0.5],
  # M23: full rest
  [:r, 4.0]
]

# Final cadence (M45–47)
BASS_ENDING = [
  [:f2, 1.0], [:f2, 1.0], [:f2, 1.0], [:f2, 1.0],   # M45
  [:f2, 1.0], [:f2, 1.0], [:f2, 1.0], [:f2, 0.5], [:e2, 0.5],  # M46
  [:e2, 4.0]                                          # M47 (tied whole)
]

define :play_bass_sequence do |seq|
  seq.each do |note, dur|
    break if get[:playing] == 0
    if note == :r
      sleep b(dur)
    else
      use_synth get[:bass_synth]
      play note, amp: get[:bass_amp], sustain: b(dur) * 0.9, release: b(dur) * 0.1
      sleep b(dur)
    end
  end
end

live_loop :bass do
  stop if get[:playing] == 0

  with_fx :reverb, room: get[:reverb_room], mix: 0.2 do
    # Intro: ostinato repeats for measures 1–20 (20 measures; each ostinato cell
    # sums to 4.0 beats = 1 measure, so 20 repetitions)
    20.times { play_bass_sequence(BASS_OSTINATO) }

    # Transition M21–23
    play_bass_sequence(BASS_TRANSITION)

    # Repeat section M24–44: M24 is a pickup bar (7 eighth-note Es)
    # followed by the ostinato for M25–32, transition M33–35 shape,
    # then another ostinato block M36–44.
    # Simplified: M24 pickup + ostinato × 8 + ending ostinato × 9
    # M24 pickup: 0.5 rest then 7 × E2 eighth
    sleep b(0.5)
    7.times { use_synth get[:bass_synth]; play :e2, amp: get[:bass_amp], sustain: b(0.4); sleep b(0.5) }
    # M25–32: ostinato × 8
    8.times { play_bass_sequence(BASS_OSTINATO) }
    # M33–44: ostinato × 12 (covers repeat section + return)
    12.times { play_bass_sequence(BASS_OSTINATO) }

    # Final cadence M45–47
    play_bass_sequence(BASS_ENDING)
  end
end

##############################################################################
# BRASS — P4 (upper voice) and P5 (lower voice) played together
# Each entry is [note_p4, note_p5, dur_beats] — :r = rest, :tie = held (skip play)
# Tied notes: we accumulate duration and play once at start of tie chain.
##############################################################################

# Convenience: MIDI note number → Sonic Pi symbol mapping is handled natively.
# We use Sonic Pi note symbols directly.

# Encoded from the MXL dump above.
# Format per event: [p4_note, p5_note, dur_beats]
# :r = rest, :_ = chord member (played simultaneously with prior, no sleep)
# Ties are pre-resolved to combined durations.

BRASS_SCORE = [
  # M1–4: both parts rest
  [:r, :r, 4.0], [:r, :r, 4.0], [:r, :r, 4.0], [:r, :r, 4.0],

  # M5: D4/D4 half (tied through to dotted quarter), resolve: D4 2.0+1.5=3.5b, then B3/B3 0.5b
  [:d4, :d4, 3.5], [:b3, :b3, 0.5],

  # M6: rest
  [:r, :r, 4.0],

  # M7: D4/D4 whole
  [:d4, :d4, 4.0],

  # M8: B4/B4 eighth, F4/F4 eighth, rest 1.5b
  [:b4, :b4, 0.5], [:f4, :f4, 0.5], [:r, :r, 3.0],

  # M9: rest eighth, then ascending run B3–F4 (P4) / B3–F4 (P5) in triplets
  [:r, :r, 0.5],
  [:b3, :b3, 0.5], [:d4, :d4, 0.5], [:e4, :e4, 0.5],
  [:f4, :f4, 0.667], [:f4, :f4, 0.667], [:f4, :f4, 0.667],

  # M10: descending triplet run F4→B3 (P4) / F4→B3 (P5)
  [:f4, :f4, 0.667], [:e4, :e4, 0.667], [:d4, :d4, 0.667],
  [:b3, :b3, 0.667], [:a3, :a3, 0.667], [:b3, :b3, 0.667],

  # M11: G3/G3 eighth, Ab3/Ab3 eighth, rest half
  [:g3, :g3, 0.5], [:ab3, :ab3, 0.5], [:r, :r, 3.0],

  # M12: rest
  [:r, :r, 4.0],

  # M13: P4=D4 tied (3.5b), P5=B3 tied (3.5b), then P4=B3/P5=Ab3
  [:d4, :b3, 3.5], [:b3, :ab3, 0.5],

  # M14: rest
  [:r, :r, 4.0],

  # M15: P4=D4 whole, P5=B3 whole
  [:d4, :b3, 4.0],

  # M16: P4=B4/P5=B3, P4=F4/P5=F3, rest
  [:b4, :b3, 0.5], [:f4, :f3, 0.5], [:r, :r, 3.0],

  # M17: rest eighth, ascending run (P4 upper octave, P5 lower)
  [:r, :r, 0.5],
  [:b4, :b3, 0.5], [:d5, :d4, 0.5], [:e5, :e4, 0.5],
  [:f5, :f4, 0.667], [:f5, :f4, 0.667], [:f5, :f4, 0.667],

  # M18: descending triplet run
  [:f5, :f4, 0.667], [:e5, :e4, 0.667], [:d5, :d4, 0.667],
  [:b4, :b3, 0.667], [:a4, :a3, 0.667], [:b4, :b3, 0.667],

  # M19: G4/G3, Ab4/Ab3, rest
  [:g4, :g3, 0.5], [:ab4, :ab3, 0.5], [:r, :r, 3.0],

  # M20: rest half, rest eighth, then 3× B4 (pickup)
  [:r, :r, 2.5], [:b4, :b4, 0.5], [:b4, :b4, 0.5], [:b4, :b4, 0.5],

  # M21: B4/B4, E5/E5, D5 triplet, B4/B4, G4/E4, rest
  [:b4, :b4, 0.5], [:e5, :e5, 0.5],
  [:d5, :d5, 0.167], [:e5, :e5, 0.167], [:d5, :d5, 0.167],
  [:b4, :b4, 0.5], [:g4, :g4, 0.5], [:e4, :e4, 0.5], [:r, :r, 1.0],

  # M22: same opening + D5 landing
  [:b4, :b4, 0.5], [:e5, :e5, 0.5],
  [:d5, :d5, 0.167], [:e5, :e5, 0.167], [:d5, :d5, 0.167],
  [:b4, :b4, 0.5], [:d5, :d5, 0.5], [:r, :r, 1.5],

  # M23: ascending scale + turnaround
  [:b4, :b4, 0.5], [:e5, :e5, 0.5],
  [:d5, :d5, 0.25], [:e5, :e5, 0.25], [:d5, :d5, 0.25], [:b4, :b4, 0.25],
  [:g4, :g4, 0.5], [:e4, :e4, 0.5], [:g4, :g4, 0.5], [:a4, :a4, 0.5],

  # M24: B4/B4 into E5 pattern
  [:b4, :b4, 0.5], [:e5, :e5, 0.5], [:e5, :e5, 0.5], [:e5, :e5, 0.5],
  [:e5, :e5, 0.5], [:e5, :e5, 0.5], [:e5, :e5, 0.5], [:e5, :e5, 0.5],

  # M25: E5 tied 3b, E5 0.5, D5 0.5, B4 0.5
  [:e5, :e5, 3.0], [:e5, :e5, 0.5], [:d5, :d5, 0.5], [:b4, :b4, 0.5],

  # M26: E5 E5 D5 B4(tie), B4(tie) B4 B4 B4
  [:e5, :e5, 0.5], [:e5, :e5, 0.5], [:d5, :d5, 0.5],
  [:b4, :b4, 1.5],  # tie resolved
  [:b4, :b4, 0.5], [:b4, :b4, 0.5], [:b4, :b4, 0.5],

  # M27: E5 D5 B4 | E5 D5 B4
  [:e5, :e5, 1.0], [:d5, :d5, 0.5], [:b4, :b4, 0.5],
  [:e5, :e5, 1.0], [:d5, :d5, 0.5], [:b4, :b4, 0.5],

  # M28: E5 E5 D5 B4 (tied into next bar 2b)
  [:e5, :e5, 0.5], [:e5, :e5, 0.5], [:d5, :d5, 0.5],
  [:b4, :b4, 2.5],  # tie b4 0.5 + 2.0 resolved

  # M29: Ab5 2b, Ab5 0.5, Ab5 0.5, F#5 0.5, D5 0.5
  [:ab5, :ab5, 2.0], [:ab5, :ab5, 0.5], [:ab5, :ab5, 0.5],
  [:fs5, :fs5, 0.5], [:d5, :d5, 0.5],

  # M30: Ab5 Ab5 F#5 D5(tie) D5(tie) D5 D5 D5
  [:ab5, :ab5, 0.5], [:ab5, :ab5, 0.5], [:fs5, :fs5, 0.5],
  [:d5, :d5, 1.5],  # tie resolved
  [:d5, :d5, 0.5], [:d5, :d5, 0.5], [:d5, :d5, 0.5],

  # M31: Ab5 F#5 D5 | Ab5 F#5 D5
  [:ab5, :ab5, 1.0], [:fs5, :fs5, 0.5], [:d5, :d5, 0.5],
  [:ab5, :ab5, 1.0], [:fs5, :fs5, 0.5], [:d5, :d5, 0.5],

  # M32: Ab5 Ab5 F#5 D5(tie) D5(tie) D5/B4 D5/B4 D5/B4
  # P4 stays on D5, P5 drops to B4 for last three
  [:ab5, :ab5, 0.5], [:ab5, :ab5, 0.5], [:fs5, :fs5, 0.5],
  [:d5, :d5, 1.5],  # tie resolved (P4), P5 also D5 tied
  [:d5, :b4, 0.5], [:d5, :b4, 0.5], [:d5, :b4, 0.5],

  # M33: D5/B4 tied 3.5b, B4/Ab4 0.5b
  [:d5, :b4, 3.5], [:b4, :ab4, 0.5],

  # M34: rest
  [:r, :r, 4.0],

  # M35: D5/B4 whole
  [:d5, :b4, 4.0],

  # M36: B5/B5, F5/F5, rest
  [:b5, :b5, 0.5], [:f5, :f5, 0.5], [:r, :r, 3.0],

  # M37–38: same ascending/descending triplet run as M17–18 (upper register)
  [:r, :r, 0.5],
  [:b4, :b4, 0.5], [:d5, :d5, 0.5], [:e5, :e5, 0.5],
  [:f5, :f5, 0.667], [:f5, :f5, 0.667], [:f5, :f5, 0.667],
  [:f5, :f5, 0.667], [:e5, :e5, 0.667], [:d5, :d5, 0.667],
  [:b4, :b4, 0.667], [:a4, :a4, 0.667], [:b4, :b4, 0.667],

  # M39: G4/G4, Ab4/Ab4, rest
  [:g4, :g4, 0.5], [:ab4, :ab4, 0.5], [:r, :r, 3.0],

  # M40: rest half+eighth, 3× D5/B4 pickup
  [:r, :r, 2.5], [:d5, :b4, 0.5], [:d5, :b4, 0.5], [:d5, :b4, 0.5],

  # M41–44: the staggered G/Ab jab pattern
  # M41: G4/F4, Ab4/F#4, rest, E5/E4
  [:g4, :f4, 0.5], [:ab4, :fs4, 0.5], [:r, :r, 2.5], [:e5, :e4, 0.5],
  # M42: same
  [:g4, :f4, 0.5], [:ab4, :fs4, 0.5], [:r, :r, 2.5], [:e5, :e5, 0.5],
  # M43: octave up
  [:g5, :f5, 0.5], [:ab5, :fs5, 0.5], [:r, :r, 2.5], [:e5, :e5, 0.5],
  # M44: jab + chromatic approach
  [:g5, :f5, 0.5], [:ab5, :fs5, 0.5], [:r, :r, 1.5],
  [:eb5, :eb4, 0.25], [:e5, :e4, 0.5],  # tie e5/e4 into Ab/B hit
  [:ab5, :ab4, 0.25], [:b5, :b4, 0.5],

  # M45–47: unison whole-note descent to final chord
  [:d5, :b4, 1.0], [:d5, :b4, 1.0], [:d5, :b4, 1.0], [:d5, :b4, 1.0],
  [:d5, :b4, 1.0], [:d5, :b4, 1.0], [:d5, :b4, 1.0],
  [:d5, :b4, 0.5], [:fs5, :cs5, 0.5],
  [:fs5, :cs5, 4.0]
]

define :play_brass_event do |p4, p5, dur|
  amp = get[:brass_amp]
  syn = get[:brass_synth]
  sleep_dur = b(dur)
  if p4 == :r
    sleep sleep_dur
  else
    use_synth syn
    # Play both voices; P5 slightly quieter to let P4 lead
    play p4, amp: amp,       sustain: sleep_dur * 0.85, release: sleep_dur * 0.15, pan: 0.2
    play p5, amp: amp * 0.8, sustain: sleep_dur * 0.85, release: sleep_dur * 0.15, pan: -0.2
    sleep sleep_dur
  end
end

live_loop :brass do
  stop if get[:playing] == 0

  with_fx :reverb, room: get[:reverb_room], mix: 0.35 do
    BRASS_SCORE.each do |p4, p5, dur|
      break if get[:playing] == 0
      play_brass_event(p4, p5, dur)
    end
  end
end

##############################################################################
# DRUMS — P9
# Two voices: v1 = hihat/snare/crash, v2 = kick
# We encode the repeating 2-measure pattern (M3–4 = standard groove)
# and special measures separately.
# The drum section in the MXL starts at M1 (hihat only intro),
# M2 (hihat + snare intro), then settles into the main groove from M3.
##############################################################################

# Each entry: [time_offset_in_measure_beats, sample_symbol, amp_multiplier]
# Measure duration = 4.0 beats

DRUM_M1 = [
  # Intro: hi-hat on every eighth, kick on every beat
  [0.0, :drum_cymbal_closed, 0.7], [0.0, :drum_bass_hard, 1.0],
  [0.5, :drum_cymbal_closed, 0.7],
  [1.0, :drum_cymbal_closed, 0.7], [1.0, :drum_bass_hard, 1.0],
  [1.5, :drum_cymbal_closed, 0.7],
  [2.0, :drum_cymbal_closed, 0.7], [2.0, :drum_bass_hard, 1.0],
  [2.5, :drum_cymbal_closed, 0.7],
  [3.0, :drum_cymbal_closed, 0.7], [3.0, :drum_bass_hard, 1.0],
  [3.5, :drum_cymbal_closed, 0.7],
]

DRUM_M2 = [
  # Hihat + snare enters on 2 and 4
  [0.0, :drum_cymbal_closed, 0.7], [0.0, :drum_bass_hard, 1.0],
  [0.5, :drum_cymbal_closed, 0.7],
  [1.0, :drum_cymbal_closed, 0.7], [1.0, :drum_bass_hard, 1.0],
  [1.5, :drum_cymbal_closed, 0.7],
  [2.0, :drum_cymbal_closed, 0.7], [2.0, :drum_bass_hard, 1.0],
  [2.5, :drum_snare_hard,    0.9],
  [3.0, :drum_snare_hard,    0.9], [3.0, :drum_bass_hard, 1.0],
  [3.5, :drum_snare_hard,    0.9],
]

# Main groove (M3 pattern — odd measures from M3 onward start with crash)
DRUM_GROOVE_CRASH = [
  [0.0, :drum_cymbal_hard,  1.0], [0.0, :drum_bass_hard, 1.0],
  [0.5, :drum_cymbal_closed, 0.7],
  [1.0, :drum_snare_hard,   0.9],
  [1.5, :drum_cymbal_closed, 0.7],
  [2.0, :drum_cymbal_closed, 0.7], [2.0, :drum_bass_hard, 1.0],
  [2.5, :drum_cymbal_closed, 0.7],
  [3.0, :drum_snare_hard,   0.9],
  [3.5, :drum_cymbal_closed, 0.7], [3.5, :drum_bass_hard, 0.8],
]

# Even measures (M4, M6...): hihat on beat 1
DRUM_GROOVE_HIHAT = [
  [0.0, :drum_cymbal_closed, 0.7], [0.0, :drum_bass_hard, 1.0],
  [0.5, :drum_cymbal_closed, 0.7],
  [1.0, :drum_snare_hard,   0.9],
  [1.5, :drum_cymbal_closed, 0.7],
  [2.0, :drum_cymbal_closed, 0.7], [2.0, :drum_bass_hard, 1.0],
  [2.5, :drum_cymbal_closed, 0.7],
  [3.0, :drum_snare_hard,   0.9],
  [3.5, :drum_cymbal_closed, 0.7], [3.5, :drum_bass_hard, 0.8],
]

define :play_drum_measure do |pattern|
  amp_base = get[:drums_amp]
  # Schedule all hits relative to measure start using time_warp
  t0 = 0.0
  pattern.each do |offset, samp, rel_amp|
    time_warp b(offset) do
      sample samp, amp: amp_base * rel_amp
    end
  end
  sleep b(4.0)
end

live_loop :drums do
  stop if get[:playing] == 0

  # Intro M1–2
  play_drum_measure(DRUM_M1)
  play_drum_measure(DRUM_M2)

  # Main groove M3–20 (18 measures alternating crash/hihat)
  18.times do |i|
    break if get[:playing] == 0
    pattern = (i % 2 == 0) ? DRUM_GROOVE_CRASH : DRUM_GROOVE_HIHAT
    play_drum_measure(pattern)
  end

  # Middle section M21–23: sparser — just kick on 1 and 3, snare on 2 and 4
  3.times do
    break if get[:playing] == 0
    play_drum_measure([
      [0.0, :drum_bass_hard,  1.0],
      [1.0, :drum_snare_hard, 0.9],
      [2.0, :drum_bass_hard,  1.0],
      [3.0, :drum_snare_hard, 0.9],
    ])
  end

  # M24–44: main groove resumes (21 measures)
  21.times do |i|
    break if get[:playing] == 0
    pattern = (i % 2 == 0) ? DRUM_GROOVE_CRASH : DRUM_GROOVE_HIHAT
    play_drum_measure(pattern)
  end

  # M45–47: final 3 measures — full groove into held crash
  2.times { play_drum_measure(DRUM_GROOVE_HIHAT) }
  # M47: crash + kick, then silence
  play_drum_measure([
    [0.0, :drum_cymbal_hard, 1.2], [0.0, :drum_bass_hard, 1.2],
    [1.0, :drum_bass_hard, 0.8],
    [2.0, :drum_bass_hard, 0.8],
    [3.0, :drum_bass_hard, 0.8],
  ])

  set :playing, 0
end
