#!/usr/bin/env python3
"""Compose Still Waters, an original worship bed for Mind Soul & Body.

Additive synthesis only. No samples and no quotation of an existing melody.
D natural minor, 64 BPM, 16 bars (60 seconds). Sustained tones use an integer
number of cycles over those 60 seconds so the waveform meets itself at the loop.
"""

import math
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 64
BARS = 16
BEATS = BARS * 4
DUR = BEATS * 60 / BPM  # 60.0 seconds
N = int(round(SR * DUR))


def midi_freq(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def locked(freq):
    """Nearest frequency that completes a whole number of cycles in DUR."""
    cycles = max(1, int(round(freq * DUR)))
    return cycles / DUR


def timebase():
    return np.arange(N, dtype=np.float64) / SR


def sine(freq, phase=0.0):
    f = locked(freq)
    t = timebase()
    return np.sin(2 * math.pi * f * t + phase), f


def smooth_window(t0, t1, attack=1.4, release=1.8):
    t = timebase()
    rise = np.clip((t - t0) / attack, 0, 1)
    fall = np.clip((t1 - t) / release, 0, 1)
    env = np.minimum(rise, fall)
    env = env * env * (3 - 2 * env)
    env[(t < t0) | (t > t1)] = 0
    return env


def add_pad(buf, freq, amp, t0=None, t1=None, chorus=False):
    base = locked(freq)
    wave_s, _ = sine(base)
    harm2, _ = sine(base * 2)
    harm3, _ = sine(base * 3)
    tone = wave_s + 0.22 * harm2 + 0.08 * harm3
    if chorus:
        twin, _ = sine(base + 1 / DUR)
        tone = tone + 0.35 * twin
    if t0 is None:
        breathe = 0.86 + 0.14 * np.sin(2 * math.pi * timebase() / DUR)
        buf += amp * breathe * tone
    else:
        buf += amp * smooth_window(t0, t1) * tone


def add_piano(buf, start, beats, note, vel=0.11):
    """A soft hammered tone. Envelope is zero at the loop boundary."""
    freq = midi_freq(note)
    beat = 60 / BPM
    n0 = int(start * beat * SR)
    length = int((beats * beat + 3.2) * SR)
    n1 = min(N, n0 + length)
    if n1 <= n0:
        return
    t = np.arange(n1 - n0, dtype=np.float64) / SR
    env = np.exp(-t * 1.35) * (1 - np.exp(-t * 48))
    tone = np.sin(2 * math.pi * freq * t)
    tone += 0.28 * np.sin(2 * math.pi * freq * 2 * t) * np.exp(-t * 2.4)
    tone += 0.09 * np.sin(2 * math.pi * freq * 3 * t) * np.exp(-t * 3.6)
    tone += 0.04 * np.sin(2 * math.pi * freq * 4 * t) * np.exp(-t * 4.8)
    buf[n0:n1] += vel * env * tone


def compose():
    mid = np.zeros(N, dtype=np.float64)
    # Always-on D-minor colour so the loop point is the same chord.
    for freq, amp in (
        (midi_freq(38), 0.055),  # D2
        (midi_freq(45), 0.04),   # A2
        (midi_freq(50), 0.05),   # D3
        (midi_freq(53), 0.045),  # F3
        (midi_freq(57), 0.04),   # A3
        (midi_freq(60), 0.018),  # C4, the added ninth, very quiet
    ):
        add_pad(mid, freq, amp, chorus=True)

    # Inner swells. Each one is silent at the loop point.
    # Bars 3–4 Gm, 5–6 C, 7–8 F, 9–10 Bb, 11–12 Am, 13–14 Gm.
    bar = 4 * 60 / BPM
    swells = (
        (2.15 * bar, 4.2 * bar, ((midi_freq(55), 0.05), (midi_freq(58), 0.04))),  # G3 Bb3
        (4.15 * bar, 6.2 * bar, ((midi_freq(60), 0.04), (midi_freq(64), 0.028))),  # C4 E4
        (6.15 * bar, 8.2 * bar, ((midi_freq(65), 0.035), (midi_freq(69), 0.03))),  # F4 A4
        (8.15 * bar, 10.2 * bar, ((midi_freq(70), 0.032), (midi_freq(65), 0.028))),  # Bb4 F4
        (10.15 * bar, 12.2 * bar, ((midi_freq(67), 0.03), (midi_freq(64), 0.026))),  # G4 E4
        (12.15 * bar, 14.15 * bar, ((midi_freq(58), 0.03), (midi_freq(55), 0.028))),  # Bb3 G3
    )
    for t0, t1, partials in swells:
        for freq, amp in partials:
            add_pad(mid, freq, amp, t0, t1)

    # Sparse piano. An original stepwise line in D natural minor, not a chorus hook.
    # (start beat, length in beats, midi)
    melody = (
        (2, 3.2, 69),   # A4
        (8, 2.4, 67),   # G4
        (14, 3.0, 62),  # D4
        (20, 2.6, 65),  # F4
        (26, 3.0, 69),  # A4
        (32, 2.2, 70),  # Bb4
        (36, 2.8, 67),  # G4
        (42, 2.4, 65),  # F4
        (48, 2.8, 69),  # A4
        (54, 2.2, 65),  # F4
        (58, 2.6, 62),  # D4, finished well before the loop
    )
    for start, beats, note in melody:
        add_piano(mid, start, beats, note, 0.085)

    # Gentle stereo from a phase-locked slow difference, not a hard pan.
    side, _ = sine(midi_freq(50), phase=0.6)
    side *= 0.04 * (0.86 + 0.14 * np.sin(2 * math.pi * timebase() / DUR))
    left = mid + side
    right = mid - side
    peak = max(np.max(np.abs(left)), np.max(np.abs(right)), 1e-9)
    scale = 0.55 / peak
    left *= scale
    right *= scale
    stereo = np.column_stack((left, right))
    # Pull the last 20ms onto the first samples so the loop point is the same value.
    fade = int(0.02 * SR)
    ramp = np.linspace(0, 1, fade)[:, None]
    wrapped = np.vstack((stereo[-(fade - 1):], stereo[:1]))
    stereo[-fade:] = (1 - ramp) * stereo[-fade:] + ramp * wrapped
    return stereo.astype(np.float32)


def write_wav(path, stereo):
    pcm = np.clip(stereo, -1, 1)
    pcm = (pcm * 32767).astype(np.int16)
    with wave.open(str(path), 'w') as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())


def main():
    stereo = compose()
    root = Path(__file__).resolve().parent
    wav_path = root / 'still-waters.wav'
    write_wav(wav_path, stereo)
    join = float(np.max(np.abs(stereo[0] - stereo[-1])))
    print(f'wrote {wav_path} frames={len(stereo)} seconds={len(stereo)/SR:.3f} boundary={join:.6f}')


if __name__ == '__main__':
    main()
