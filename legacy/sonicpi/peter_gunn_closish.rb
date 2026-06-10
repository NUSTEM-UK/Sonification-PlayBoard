# Peter Gunn -- live-controlled by sensor data over OSC.
#
# Run the Python bridge (see ../README.md) which sends OSC to 127.0.0.1:4560.
# Incoming OSC becomes Sonic Pi time-state, which we poll here with `get`.
# Edit ../bridge/config/mapping.example.yaml to change which sensor drives
# which parameter -- this sketch never needs to change.
#
# Control addresses this sketch listens for:
#   /play/cutoff      bass low-pass filter cutoff (MIDI note, ~30..130)
#   /play/reverb      reverb mix on bass + lead    (0.0..1.0)
#   /play/lead_amp    lead/brass stab volume       (0.0..1.5)  -- 0 = silent
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

# The actual Peter Gunn ostinato: low E string, frets 0-0-2-0-3-0-5-3,
# i.e. E E F# E G E A G as relentless straight eighth notes.
bassline = (ring :e2, :e2, :fs2, :e2, :g2, :e2, :a2, :g2)

# --- bass: the driving riff, with a live filter sweep ------------------------
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

# --- lead: the brass "shout" -- silent until a controller raises lead_amp ----
# In Peter Gunn the riff IS the tune; the horn section doesn't carry a separate
# melody. What it actually plays (see the Murtha big-band chart) is a dramatic
# "shout": a long swelling chord marked fp < f, answered by short stabs. Voiced
# here as section chords over the E-minor vamp. The rhythm follows the chart;
# the voicings sit on the tonic with a chromatic upper-neighbour for the noir
# "sigh". 8 beats (two bass bars) so it stays locked to sync: :bass.
#   [chord, beats, :swell|:stab] -- a rest is :r.
brass = [
  [chord(:e4, :minor7), 4.0, :swell],            # the long fp < f crescendo
  [chord(:f4, :major),  0.5, :stab], [:r, 0.5],  # chromatic stab up...
  [chord(:e4, :minor7), 0.5, :stab], [:r, 0.5],  # ...sighing back to Em
  [chord(:e4, :minor7), 1.0, :stab], [:r, 1.0]
]
live_loop :lead, sync: :bass do
  with_fx :reverb, mix: clamp(ctl(:reverb, 0.3), 0, 1) do
    use_synth :prophet
    amp = clamp(ctl(:lead_amp, 0.0), 0, 2)
    brass.each do |notes, dur, kind|
      next if notes == :r
      if kind == :swell
        # fp < f: soft, slow swell up over most of the note, brief tail.
        play notes, attack: dur * 0.7, sustain: dur * 0.15, release: dur * 0.15,
          amp: amp, cutoff: 100
      else
        # punchy section stab.
        play notes, attack: 0.01, release: 0.18, amp: amp, cutoff: 100
      end
      sleep dur
    end
  end
end
