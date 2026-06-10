##############################################################################
# Peter Gunn Theme — Sonic Pi  (looping 36-second version, M1–18)
# Two complete brass phrases over bass ostinato + drums.
#
# Live-controlled by sensor data over OSC, via the project bridge (see
# ../README.md and ../bridge/config/mapping.example.yaml). The bridge sends to
# 127.0.0.1:4560; we poll the latest value with `get "/osc*/play/<name>"`.
#
# Control addresses this sketch listens for (these are the four the mapping
# config actually emits -- nothing else is wired):
#   /play/cutoff      bass low-pass filter cutoff (MIDI note, ~60..130)
#   /play/reverb      reverb mix on bass + brass    (0.0..1.0)
#   /play/lead_amp    brass section volume          (0.0..1.5)
#   /play/drums_amp   drum kit volume               (0.0..1.2)
#
# Each control falls back to a sensible default until the first message
# arrives, so this plays fine with no bridge running. Note: each instrument is
# self-contained (its own with_fx) -- do NOT nest these live_loops inside a
# shared with_fx block; the fx node gets torn down and the loops then error.
##############################################################################

# --- DATA ---
# BRASS_DATA: flat triples [midi_p4, midi_p5, dur_12ths]
#   0 = rest; dur in 12ths of a beat (6=eighth, 8=triplet-quarter, 48=whole)
BRASS_DATA = [
  0,0,48,0,0,48,0,0,48,0,0,48,62,62,42,59,59,6,0,0,48,62,62,48,
  71,71,6,65,65,6,0,0,36,0,0,6,59,59,6,62,62,6,64,64,6,65,65,8,
  65,65,8,65,65,8,65,65,8,64,64,8,62,62,8,59,59,8,57,57,8,59,59,8,
  55,55,6,56,56,6,0,0,36,0,0,48,62,59,42,59,56,6,0,0,48,62,59,48,
  71,59,6,65,53,6,0,0,36,0,0,6,71,59,6,74,62,6,76,64,6,77,65,8,
  77,65,8,77,65,8,77,65,8,76,64,8,74,62,8,71,59,8,69,57,8,71,59,8
].freeze

# BASS_OSTINATO_D: flat pairs [midi, dur_12ths]  (0 = rest)
BASS_D = [40,6,40,6,42,6,40,6,43,3,44,3,40,6,45,6,44,6].freeze

# DRUM_*_D: flat triples [offset_12ths, sample_idx, amp×100]
# idx: 0=cymbal_closed 1=cymbal_open 2=bass_hard 3=snare_hard 4=cymbal_hard
DRUM_SAMPLES = [:drum_cymbal_closed,:drum_cymbal_open,:drum_bass_hard,
                :drum_snare_hard,:drum_cymbal_hard].freeze
DRUM_INTRO1 = [0,0,70,0,2,100,6,0,70,12,0,70,12,2,100,18,0,70,
               24,0,70,24,2,100,30,0,70,36,0,70,36,2,100,42,0,70].freeze
DRUM_INTRO2 = [0,0,70,0,2,100,6,0,70,12,0,70,12,2,100,18,0,70,
               24,0,70,24,2,100,30,3,90,36,3,90,36,2,100,42,3,90].freeze
DRUM_CRASH  = [0,4,100,0,2,100,6,0,70,12,3,90,18,0,70,
               24,0,70,24,2,100,30,0,70,36,3,90,42,0,70,42,2,80].freeze
DRUM_HIHAT  = [0,0,70,0,2,100,6,0,70,12,3,90,18,0,70,
               24,0,70,24,2,100,30,0,70,36,3,90,42,0,70,42,2,80].freeze

# --- HELPERS ---
# This arrangement is timed in real seconds via t12 (NOT Sonic Pi beats), so
# there is deliberately no `use_bpm` -- adding one would scale `sleep` a second
# time and run the whole thing fast. To change the tempo, edit BPM here.
BPM = 120.0
# Beat-fraction (12ths of a beat) -> seconds.  (quarter = t12(12) = 0.5s @ 120)
define :t12 do |u| (60.0 / BPM) * u / 12.0 end

# Clamp a value into [lo, hi] -- defends against out-of-range sensor data.
define :clamp do |v, lo, hi| [[v, hi].min, lo].max end

# Read an OSC control value (latest), falling back to a default.
# `/osc*` matches regardless of the sender's ephemeral port; Sonic Pi delivers
# OSC args as a list, so unwrap the first element.
define :ctl do |name, default|
  v = get("/osc*/play/#{name}")
  v = v[0] if v.is_a?(Array)
  v.nil? ? default : v
end

define :play_drum_data do |data|
  a = clamp(ctl(:drums_amp, 0.8), 0, 2)
  i = 0
  while i < data.length
    o = data[i]; s = data[i+1]; r = data[i+2] / 100.0; i += 3
    time_warp t12(o) do sample DRUM_SAMPLES[s], amp: a * r end
  end
  sleep t12(48)
end

# --- BASS (18× ostinato = 18 measures) --------------------------------------
# Gritty saw through a resonant low-pass; the filter cutoff is the live
# sensor-controlled parameter (light -> /play/cutoff). Fixed volume -- the bass
# is shaped by the filter, not the fader.
live_loop :bass do
  with_fx :reverb, room: 0.7, mix: clamp(ctl(:reverb, 0.3), 0, 1) do
    use_synth :saw
    18.times do
      i = 0
      while i < BASS_D.length
        midi = BASS_D[i]; dur = BASS_D[i+1]; i += 2
        if midi == 0
          sleep t12(dur)
        else
          play midi, amp: 0.9,
            cutoff: clamp(ctl(:cutoff, 90), 30, 130), res: 0.2,
            sustain: t12(dur)*0.9, release: t12(dur)*0.1
          sleep t12(dur)
        end
      end
    end
  end
end

# --- BRASS (M1–18, loops) ---------------------------------------------------
# Two-voice horn section on :prophet. The brass character comes from a filter
# that opens on the attack (cutoff_attack) -- the horn "blat". Volume is the
# lead control (pot -> /play/lead_amp); defaults audible so it plays standalone.
live_loop :brass do
  with_fx :reverb, room: 0.7, mix: clamp(ctl(:reverb, 0.3), 0, 1) do
    use_synth :prophet
    i = 0
    while i < BRASS_DATA.length
      m4 = BRASS_DATA[i]; m5 = BRASS_DATA[i+1]; dur = BRASS_DATA[i+2]; i += 3
      sd = t12(dur)
      if m4 == 0
        sleep sd
      else
        amp = clamp(ctl(:lead_amp, 0.9), 0, 2)
        play m4, amp: amp,     attack: 0.04, sustain: sd*0.8, release: sd*0.2,
          cutoff: 100, cutoff_attack: 0.06, pan: 0.2
        play m5, amp: amp*0.8, attack: 0.04, sustain: sd*0.8, release: sd*0.2,
          cutoff: 100, cutoff_attack: 0.06, pan: -0.2
        sleep sd
      end
    end
  end
end

# --- DRUMS (M1–18: 2 intro + 16 groove) -------------------------------------
live_loop :drums do
  play_drum_data(DRUM_INTRO1)
  play_drum_data(DRUM_INTRO2)
  16.times do |i|
    play_drum_data(i.even? ? DRUM_CRASH : DRUM_HIHAT)
  end
end
