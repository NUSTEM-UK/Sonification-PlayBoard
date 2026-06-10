# Peter Gunn -- live-controlled by sensor data over OSC.
#
# Run the Python bridge (see ../README.md) which sends OSC to 127.0.0.1:4560.
# Incoming OSC becomes Sonic Pi time-state, which we poll here with `get`.
# Edit ../bridge/config/mapping.example.yaml to change which sensor drives
# which parameter -- this sketch never needs to change.
#
# Arranged as a "guitar quartet" (plus a drum kit), four interlocking parts:
#   Guitar 1  bass     -- the driving low-E riff
#   Guitar 2  rhythm   -- punchy off-beat power-chord stabs
#   Guitar 3  counter  -- a bluesy walking counter-line under the riff
#   Guitar 4  lead     -- the horn hook on top
#
# Control addresses this sketch listens for:
#   /play/cutoff      bass low-pass filter cutoff (MIDI note, ~30..130)
#   /play/reverb      reverb mix on bass + lead    (0.0..1.0)
#   /play/lead_amp    horn lead volume             (0.0..1.5)  -- 0 = silent
#   /play/drums_amp   drum kit volume              (0.0..1.2)
#
# Each control falls back to a sensible default until the first message
# arrives, so this plays fine with no bridge running. Note: each instrument is
# self-contained (its own with_fx) -- do NOT nest these live_loops inside a
# shared with_fx block; the fx node gets torn down and the loops then error.

use_bpm 130

# Clamp a value into [lo, hi] -- defends against out-of-range sensor data.
# (Written as one expression: `return` inside a Sonic Pi `define` is unreliable.)
define :clamp do |v, lo, hi|
  [[v, hi].min, lo].max
end

# Read an OSC control value (latest), falling back to a default.
# `/osc*` matches regardless of the sender's ephemeral port.
# Sonic Pi delivers OSC args as a list, so unwrap the first element.
define :ctl do |name, default|
  v = get("/osc*/play/#{name}")
  v = v[0] if v.is_a?(Array)
  v.nil? ? default : v
end

# --- Guitar 1: the driving bass riff ----------------------------------------
# Low-E string, frets 0-0-2-0-3-0-5-4 -> E E F# E G E A G# as straight eighths.
bassline = (ring :e2, :e2, :fs2, :e2, :g2, :e2, :a2, :gs2)
live_loop :bass do
  with_fx :reverb, mix: clamp(ctl(:reverb, 0.3), 0, 1) do
    use_synth :saw
    bassline.each do |n|
      play n,
        release: 0.18,
        cutoff: clamp(ctl(:cutoff, 80), 30, 130),
        res: 0.2,
        amp: 0.9
      sleep 0.5    # eighth notes; 8 x 0.5 = one 4-beat bar
    end
  end
end

# --- Guitar 2: rhythm stabs -- punchy off-beat power chords ------------------
# Frets 7-7-9-9-7-7 -> an E5(add9): B E B E F# B. Hit on the off-beats (the
# "and" of each beat) and kept staccato so the riff keeps driving underneath.
stab = [:b2, :e3, :b3, :e4, :fs4, :b4]   # explicit notes -> play as a chord
live_loop :rhythm, sync: :bass do
  use_synth :pluck
  8.times do |i|
    play stab, amp: 0.5, release: 0.12 if i.odd?   # odd eighths = the off-beats
    sleep 0.5
  end
end

# --- Guitar 3: counter-melody / walking line --------------------------------
# Low-E string, frets 0-0-3-0-5-0-6-5 -> E E G E A E Bb A. A bluesy walking
# variant of the riff (note the Bb blue note); rounder tone, low in the mix.
counterline = (ring :e2, :e2, :g2, :e2, :a2, :e2, :bb2, :a2)
live_loop :counter, sync: :bass do
  use_synth :tri
  counterline.each do |n|
    play n, release: 0.2, amp: 0.35, cutoff: 75
    sleep 0.5
  end
end

# --- the horn lead: a brass section, played legato --------------------------
# The descending D-B-A hook (G-string fret 7 = D4, D-string frets 9/7 = B3/A3),
# but bridged rather than stabbed: each note swells and rings into the next for
# a connected horn-section line. The brass character comes from a filter that
# opens on the attack (cutoff_attack) and a long release that overlaps the next
# note. Silent until a controller raises lead_amp.
#   [note, beats] -- a two-bar (8-beat) phrase, locked to sync: :bass.
horn = [
  [:d4, 1.5], [:b3, 1.0], [:a3, 1.5],              # bar 1: D --- B -- A ---
  [:d4, 1.0], [:b3, 1.0], [:a3, 1.0], [:b3, 1.0]   # bar 2: D  B  A  B
]
live_loop :lead, sync: :bass do
  with_fx :reverb, mix: clamp(ctl(:reverb, 0.3), 0, 1) do
    use_synth :prophet
    amp = clamp(ctl(:lead_amp, 0.0), 0, 2)
    horn.each do |n, dur|
      # brass swell: soft attack with the filter opening, long release bridges
      # legato into the following note.
      play n, amp: amp,
        attack: 0.05, sustain: dur, release: 0.6,
        cutoff: 105, cutoff_attack: 0.07
      sleep dur
    end
  end
end

# --- drums: noir backbeat, dry, volume under live control --------------------
live_loop :drums, sync: :bass do
  amp = clamp(ctl(:drums_amp, 0.9), 0, 2)
  8.times do |i|
    sample :drum_cymbal_closed, amp: 0.35 * amp, rate: 1.1, finish: 0.4
    sample :drum_bass_hard, amp: 1.0 * amp if i == 0 || i == 4
    sample :drum_snare_hard, amp: 0.8 * amp if i == 2 || i == 6
    sleep 0.5
  end
end
