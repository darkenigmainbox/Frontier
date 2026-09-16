#!/usr/bin/env python3
"""
================================================================================
 GenerateAudio.py — Frontier Experimental Audio Bank (procedural source)
================================================================================
 Generates every WAV under Content/Audio/ from deterministic DSP recipes
 (seeded RNG, no samples, no downloads — everything is synthesized, so the
 bank is royalty-free and bit-stable: re-running this script reproduces the
 same files).

   python3 GenerateAudio.py            # write wavs + audio-bank.json manifest

 Layout (mirrors the future Project-Zero home; copy Content/Audio/ there):
   Content/Audio/audio-bank.json       manifest: categories, sounds, defaults, scenes
   Content/Audio/Ambience/*.wav        sky / weather beds
   Content/Audio/Wind/*.wav            wind voices (breeze -> gale -> whistle)
   Content/Audio/Vegetation/*.wav      trees, grass sway, grass shuffle
   Content/Audio/Surfaces/*.wav        tyre rolling loops (speed-linkable)
   Content/Audio/Tyres/*.wav           skids + gravel spray
   Content/Audio/Impacts/*.wav         crash / hit / scrape one-shots

 Format: 44100 Hz, mono, 16-bit PCM. Mono on purpose — the engine's mixer
 (Project-Zero) owns panning / spatialisation / reverb; the bank ships dry
 centre sources. The companion editor (Audio.html) previews runtime params
 (pitch, gain, filters, fades) non-destructively and can bounce them to WAV.

 Conventions (Slate): this is Experimental/ — HTML-first prototype. Nothing
 here is an Engine proof; names use Audio/Bank/Scene, never "test/suite".
================================================================================
"""

import json
import os
import wave

import numpy as np

SR = 44100
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Content", "Audio")

# --------------------------------------------------------------------------------
# DSP helpers (numpy only, deterministic)
# --------------------------------------------------------------------------------

def white(n, rng):
    return rng.standard_normal(int(n))


def raised_cos(w):
    w = max(3, int(w))
    if w % 2 == 0:
        w += 1
    t = np.arange(w) / w
    h = 0.5 - 0.5 * np.cos(2.0 * np.pi * t)
    return h / h.sum()


def smooth_control(n, rng, step_s, lo=0.0, hi=1.0, power=1.0, smooth_s=0.2):
    """Slow random curve in [lo, hi]: sparse control points + interp + smooth."""
    n = int(n)
    k = max(2, int(round((n / SR) / step_s)) + 1)
    pts = rng.uniform(0.0, 1.0, k)
    v = np.interp(np.linspace(0.0, 1.0, n), np.linspace(0.0, 1.0, k), pts)
    v = np.convolve(v, raised_cos(smooth_s * SR), mode="same")
    v = (v - v.min()) / (v.max() - v.min() + 1e-12)
    return lo + (hi - lo) * np.power(v, power)


def _freqs(n):
    return np.fft.rfftfreq(n, 1.0 / SR)


def _response(n, specs):
    """Magnitude response from a list of ('lp'|'hp', fc, order) / ('bp', fc, oct)
    / ('peak', fc, oct, db) / ('calm', f0) [1/f below f0 -> brownish]."""
    f = _freqs(n)
    h = np.ones_like(f)
    for spec in specs:
        kind = spec[0]
        if kind == "lp":
            _, fc, order = spec
            h *= 1.0 / np.sqrt(1.0 + np.power(np.maximum(f, 1e-9) / fc, 2.0 * order))
        elif kind == "hp":
            _, fc, order = spec
            h *= 1.0 / np.sqrt(1.0 + np.power(fc / np.maximum(f, 1e-9), 2.0 * order))
        elif kind == "bp":
            _, fc, octv = spec
            with np.errstate(divide="ignore"):
                d = np.log2(np.maximum(f, 1e-9) / fc) / max(octv / 2.0, 1e-6)
            g = np.exp(-0.5 * d * d)
            g[f <= 1.0] = 0.0
            h *= g
        elif kind == "peak":
            _, fc, octv, db = spec
            with np.errstate(divide="ignore"):
                d = np.log2(np.maximum(f, 1e-9) / fc) / max(octv / 2.0, 1e-6)
            g = np.exp(-0.5 * d * d)
            h *= 1.0 + (10.0 ** (db / 20.0) - 1.0) * g
        elif kind == "calm":
            _, f0 = spec
            h *= 1.0 / np.sqrt(1.0 + np.maximum(f, 1e-9) / f0)
    h[0] = 0.0  # never any DC
    return h


def shape(x, *specs):
    n = len(x)
    return np.fft.irfft(np.fft.rfft(x) * _response(n, specs), n=n)


def fold_loop(x, xf_s):
    """Fold the tail over the head (equal-power) so the kept region loops seamlessly.

    Source x has n+xf samples; we keep n. The first xf output samples blend the
    source tail (which *follows* the last kept sample) into the source head, so
    the wrap y[-1] -> y[0] is a step between adjacent source samples: inaudible.
    """
    xf = int(xf_s * SR)
    n = len(x) - xf
    y = x[:n].copy()
    t = np.linspace(0.0, np.pi / 2.0, xf)
    y[:xf] = x[n:n + xf] * np.cos(t) ** 2 + x[:xf] * np.sin(t) ** 2
    return y


def peak_norm(x, peak=0.6):
    x = x - float(np.mean(x))  # no DC — cheap insurance for loop points
    m = float(np.max(np.abs(x)))
    return x * (peak / m) if m > 1e-9 else x


def fade_io(x, fi_s=0.01, fo_s=0.05):
    y = x.copy()
    fi = min(int(fi_s * SR), len(y) // 4)
    fo = min(int(fo_s * SR), len(y) // 4)
    if fi > 1:
        t = np.linspace(0.0, np.pi / 2.0, fi)
        y[:fi] *= np.sin(t) ** 2
    if fo > 1:
        t = np.linspace(0.0, np.pi / 2.0, fo)
        y[-fo:] *= np.cos(t) ** 2
    return y


def fm_tone(n, rng, f0, fdev, step_s=0.5, smooth_s=0.4, phase0=0.0):
    inst = f0 + fdev * (smooth_control(n, rng, step_s, -1.0, 1.0, 1.0, smooth_s))
    inst = np.maximum(inst, 5.0)
    return np.sin(phase0 + 2.0 * np.pi * np.cumsum(inst) / SR)


def pitch_drop(n, f0, f1, tau_s):
    t = np.arange(n) / SR
    inst = f1 + (f0 - f1) * np.exp(-t / tau_s)
    return np.sin(2.0 * np.pi * np.cumsum(inst) / SR)


def write_wav(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = np.clip(x, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return os.path.getsize(path)


# --------------------------------------------------------------------------------
# Recipes — Ambience
# --------------------------------------------------------------------------------

def s_cloud_drift(dur, rng):
    n = int((dur + 2.0) * SR)
    bed = shape(white(n, rng), ("lp", 420.0, 2), ("hp", 55.0, 1))
    swell = 0.55 + 0.45 * smooth_control(n, rng, 1.6, 0.0, 1.0, 1.2, 0.8)
    air = shape(white(n, rng), ("bp", 3800.0, 2.2))
    air *= 0.25 + 0.75 * smooth_control(n, rng, 2.3, 0.0, 1.0, 1.4, 1.0)
    y = 0.75 * bed * swell + 0.16 * air
    return peak_norm(fold_loop(y, 2.0), 0.45)


def s_distant_thunder(dur, rng):
    n = int(dur * SR)
    t = np.arange(n) / SR
    rumble = shape(white(n, rng), ("calm", 60.0), ("lp", 170.0, 3), ("hp", 24.0, 2))
    bumps = (np.exp(-((t - 1.1) / 0.7) ** 2) + 0.8 * np.exp(-((t - 2.6) / 0.9) ** 2)
             + 0.55 * np.exp(-((t - 3.9) / 1.2) ** 2))
    bumps *= 0.7 + 0.3 * smooth_control(n, rng, 0.25, 0.0, 1.0, 1.0, 0.12)
    sub = np.sin(2.0 * np.pi * 37.0 * t + 0.4 * np.sin(2.0 * np.pi * 0.4 * t))
    y = rumble * bumps + 0.35 * sub * bumps
    return peak_norm(fade_io(y, 0.05, 1.6), 0.8)


# --------------------------------------------------------------------------------
# Recipes — Wind
# --------------------------------------------------------------------------------

def _wind_base(n, rng, lp_fc, hp_fc, gust_step, gust_depth, gust_power=1.3):
    bed = shape(white(n, rng), ("lp", lp_fc, 2), ("hp", hp_fc, 1))
    g = smooth_control(n, rng, gust_step, 1.0 - gust_depth, 1.0, gust_power, gust_step * 0.45)
    return bed * g, g


def s_breeze_light(dur, rng):
    n = int((dur + 1.5) * SR)
    bed, _ = _wind_base(n, rng, 5200.0, 280.0, 1.4, 0.35)
    shimmer = shape(white(n, rng), ("hp", 6200.0, 2))
    shimmer *= 0.3 + 0.7 * smooth_control(n, rng, 0.5, 0.0, 1.0, 1.6, 0.2)
    y = 0.8 * bed + 0.12 * shimmer
    return peak_norm(fold_loop(y, 1.5), 0.5)


def s_gusty_meadow(dur, rng):
    n = int((dur + 2.0) * SR)
    bed, g = _wind_base(n, rng, 3800.0, 150.0, 0.55, 0.72, 1.1)
    low = shape(white(n, rng), ("lp", 150.0, 2))
    low *= 0.25 + 0.75 * g
    whistle = fm_tone(n, rng, 620.0, 260.0) * (0.05 + 0.10 * g)
    y = 0.75 * bed + 0.5 * low + whistle
    return peak_norm(fold_loop(y, 2.0), 0.6)


def s_gale_strong(dur, rng):
    n = int((dur + 1.5) * SR)
    bed, g = _wind_base(n, rng, 8000.0, 90.0, 0.32, 0.8, 1.0)
    howl1 = fm_tone(n, rng, 340.0, 150.0, 0.35, 0.3) * (0.10 + 0.22 * g)
    howl2 = fm_tone(n, rng, 690.0, 260.0, 0.28, 0.25, 1.7) * (0.06 + 0.14 * g)
    band = shape(white(n, rng), ("bp", 1400.0, 1.6)) * (0.15 + 0.5 * g)
    low = shape(white(n, rng), ("lp", 120.0, 2)) * (0.3 + 0.7 * g)
    y = 0.7 * bed + howl1 + howl2 + 0.5 * band + 0.6 * low
    return peak_norm(fold_loop(y, 1.5), 0.65)


def s_desert_dry(dur, rng):
    n = int((dur + 1.5) * SR)
    hiss = shape(white(n, rng), ("hp", 1500.0, 1), ("lp", 12000.0, 2))
    hiss *= 0.45 + 0.55 * smooth_control(n, rng, 0.6, 0.0, 1.0, 1.2, 0.3)
    bed, _ = _wind_base(n, rng, 320.0, 60.0, 1.1, 0.5)
    whistle = fm_tone(n, rng, 1150.0, 380.0, 0.7, 0.5) * 0.07
    whistle *= 0.4 + 0.6 * smooth_control(n, rng, 0.9, 0.0, 1.0, 1.5, 0.4)
    y = 0.62 * hiss + 0.55 * bed + whistle
    return peak_norm(fold_loop(y, 1.5), 0.55)


def s_night_calm(dur, rng):
    n = int((dur + 2.0) * SR)
    bed = shape(white(n, rng), ("lp", 480.0, 2), ("hp", 50.0, 1))
    bed *= 0.75 + 0.25 * smooth_control(n, rng, 2.0, 0.0, 1.0, 1.0, 1.0)
    air = shape(white(n, rng), ("hp", 8000.0, 1)) * 0.05
    t = np.arange(n) / SR
    chirp_gate = (0.5 + 0.5 * np.sin(2.0 * np.pi * 0.9 * t + 1.0)) ** 3
    chirps = np.sin(2.0 * np.pi * 4200.0 * t) * (0.5 + 0.5 * np.sin(2.0 * np.pi * 22.0 * t))
    chirps *= chirp_gate * 0.045
    y = bed + air + chirps
    return peak_norm(fold_loop(y, 2.0), 0.35)


def s_pass_whistle(dur, rng):
    n = int((dur + 1.5) * SR)
    bed, g = _wind_base(n, rng, 640.0, 70.0, 0.7, 0.6)
    w1 = fm_tone(n, rng, 520.0, 170.0, 0.5, 0.4) * (0.08 + 0.20 * g)
    w2 = fm_tone(n, rng, 930.0, 300.0, 0.4, 0.3, 2.1) * (0.05 + 0.13 * g)
    w3 = fm_tone(n, rng, 1450.0, 430.0, 0.33, 0.25, 4.2) * (0.03 + 0.08 * g)
    band = shape(white(n, rng), ("bp", 1750.0, 1.4)) * (0.1 + 0.3 * g)
    y = 0.55 * bed + w1 + w2 + w3 + 0.5 * band
    return peak_norm(fold_loop(y, 1.5), 0.6)


def s_cabin_buffet(dur, rng):
    n = int((dur + 1.0) * SR)
    t = np.arange(n) / SR
    cycles = int(round(11.0 * (dur + 1.0)))  # integer cycles -> loop-safe LFO
    lfo = 0.5 + 0.5 * np.sin(2.0 * np.pi * cycles * t / (dur + 1.0) + 0.6)
    lfo = lfo ** 1.5
    low = shape(white(n, rng), ("lp", 210.0, 2))
    low *= 0.35 + 0.65 * lfo
    mid = shape(white(n, rng), ("bp", 700.0, 1.8))
    mid *= 0.5 + 0.5 * smooth_control(n, rng, 0.3, 0.0, 1.0, 1.0, 0.15)
    y = 0.8 * low + 0.3 * mid
    return peak_norm(fold_loop(y, 1.0), 0.6)


# --------------------------------------------------------------------------------
# Recipes — Vegetation
# --------------------------------------------------------------------------------

def s_trees_rustle(dur, rng):
    n = int((dur + 1.5) * SR)
    leaves = shape(white(n, rng), ("hp", 2500.0, 1), ("lp", 11000.0, 2))
    gate = smooth_control(n, rng, 0.06, 0.0, 1.0, 2.2, 0.03)  # dense micro-bursts
    gust = 0.45 + 0.55 * smooth_control(n, rng, 1.1, 0.0, 1.0, 1.2, 0.5)
    leaves *= (0.25 + 0.75 * gate) * gust
    bed, _ = _wind_base(n, rng, 800.0, 90.0, 1.1, 0.5)
    y = 0.75 * leaves + 0.4 * bed * gust
    return peak_norm(fold_loop(y, 1.5), 0.55)


def s_grass_sway(dur, rng):
    n = int((dur + 1.5) * SR)
    grass = shape(white(n, rng), ("bp", 2300.0, 1.6))
    swish = 0.35 + 0.65 * smooth_control(n, rng, 0.45, 0.0, 1.0, 1.3, 0.2)
    grass *= swish
    soft = shape(white(n, rng), ("lp", 900.0, 1), ("hp", 200.0, 1))
    soft *= 0.5 + 0.5 * smooth_control(n, rng, 0.9, 0.0, 1.0, 1.0, 0.4)
    y = 0.7 * grass + 0.45 * soft
    return peak_norm(fold_loop(y, 1.5), 0.5)


def s_grass_shuffle(dur, rng):
    n = int((dur + 0.6) * SR)
    y = np.zeros(n)
    t_pos, step = 0.15, 0
    while t_pos < dur - 0.2:  # irregular walking steps
        m = int(0.34 * SR)
        pos = int(t_pos * SR)
        seg = white(m, rng)
        seg = shape(seg, ("bp", float(rng.uniform(900.0, 2400.0)), 1.2))
        env = np.exp(-np.arange(m) / (SR * float(rng.uniform(0.05, 0.11))))
        swish_tail = np.exp(-np.arange(m) / (SR * 0.22)) * 0.4
        y[pos:pos + m] += seg * (env + swish_tail) * float(rng.uniform(0.7, 1.0))
        t_pos += float(rng.uniform(0.55, 0.8))
        step += 1
    bed = shape(white(n, rng), ("bp", 2000.0, 1.8)) * 0.08
    bed *= 0.5 + 0.5 * smooth_control(n, rng, 0.4, 0.0, 1.0, 1.0, 0.2)
    y = y + bed
    return peak_norm(fold_loop(y, 0.6), 0.7)


# --------------------------------------------------------------------------------
# Recipes — Surfaces (tyre rolling loops)
# --------------------------------------------------------------------------------

def s_tarmac_roll(dur, rng):
    n = int((dur + 1.0) * SR)
    t = np.arange(n) / SR
    rumble = shape(white(n, rng), ("lp", 250.0, 2))
    hiss = shape(white(n, rng), ("bp", 1100.0, 1.6))
    hiss *= 0.85 + 0.15 * smooth_control(n, rng, 0.2, 0.0, 1.0, 1.0, 0.1)
    whine = (np.sin(2 * np.pi * 220.0 * t) * 0.5 + np.sin(2 * np.pi * 440.0 * t) * 0.25
             + np.sin(2 * np.pi * 660.0 * t) * 0.12) * 0.05
    y = 0.65 * rumble + 0.5 * hiss + whine
    return peak_norm(fold_loop(y, 1.0), 0.55)


def _pebbles(n, rng, count, f_lo, f_hi, dur_lo, dur_hi, amp):
    y = np.zeros(n)
    for _ in range(count):
        m = int(float(rng.uniform(dur_lo, dur_hi)) * SR)
        pos = int(rng.uniform(0, n - m))
        seg = white(m, rng)
        seg = shape(seg, ("bp", float(rng.uniform(f_lo, f_hi)), 1.0))
        seg *= np.exp(-np.arange(m) / (SR * float(rng.uniform(0.004, 0.02))))
        y[pos:pos + m] += seg * float(rng.uniform(0.4, 1.0)) * amp
    return y


def s_gravel_roll(dur, rng):
    n = int((dur + 1.0) * SR)
    base = shape(white(n, rng), ("lp", 900.0, 1), ("hp", 150.0, 1))
    base *= 0.8 + 0.2 * smooth_control(n, rng, 0.25, 0.0, 1.0, 1.0, 0.12)
    stones = _pebbles(n, rng, 130, 2000.0, 7000.0, 0.008, 0.035, 0.8)
    crunch = shape(white(n, rng), ("bp", 3200.0, 1.2))
    crunch *= 0.3 + 0.7 * smooth_control(n, rng, 0.09, 0.0, 1.0, 2.0, 0.04)
    y = 0.55 * base + 0.6 * stones + 0.35 * crunch
    return peak_norm(fold_loop(y, 1.0), 0.65)


def s_sand_roll(dur, rng):
    n = int((dur + 1.0) * SR)
    hiss = shape(white(n, rng), ("hp", 800.0, 1), ("lp", 6000.0, 2))
    hiss *= 0.7 + 0.3 * smooth_control(n, rng, 0.35, 0.0, 1.0, 1.0, 0.18)
    soft = shape(white(n, rng), ("lp", 300.0, 1)) * 0.4
    y = 0.75 * hiss + 0.4 * soft
    return peak_norm(fold_loop(y, 1.0), 0.5)


def s_dirt_roll(dur, rng):
    n = int((dur + 1.0) * SR)
    rumble = shape(white(n, rng), ("lp", 800.0, 1), ("hp", 80.0, 1))
    rumble *= 0.7 + 0.3 * smooth_control(n, rng, 0.22, 0.0, 1.0, 1.2, 0.1)
    tex = shape(white(n, rng), ("bp", 900.0, 1.4))
    tex *= 0.5 + 0.5 * smooth_control(n, rng, 0.15, 0.0, 1.0, 1.4, 0.07)
    stones = _pebbles(n, rng, 35, 1500.0, 4500.0, 0.01, 0.04, 0.5)
    y = 0.65 * rumble + 0.4 * tex + 0.45 * stones
    return peak_norm(fold_loop(y, 1.0), 0.6)


def s_wet_roll(dur, rng):
    n = int((dur + 1.0) * SR)
    spray = shape(white(n, rng), ("hp", 2000.0, 1), ("lp", 10500.0, 2))
    spray *= 0.6 + 0.4 * smooth_control(n, rng, 0.12, 0.0, 1.0, 1.3, 0.06)
    rumble = shape(white(n, rng), ("lp", 280.0, 2)) * 0.7
    sizzle = shape(white(n, rng), ("bp", 5500.0, 1.0))
    sizzle *= 0.4 + 0.6 * smooth_control(n, rng, 0.07, 0.0, 1.0, 1.8, 0.03)
    y = 0.6 * spray + 0.5 * rumble + 0.3 * sizzle
    return peak_norm(fold_loop(y, 1.0), 0.6)


def s_cobble_roll(dur, rng):
    n = int((dur + 1.0) * SR)
    y = np.zeros(n)
    period = (dur + 1.0) / 30.0  # 30 bumps, integer -> loop-safe rhythm
    for k in range(30):
        pos = int((k * period + float(rng.uniform(-0.008, 0.008))) * SR)
        m = int(0.09 * SR)
        th = pitch_drop(m, 95.0, 48.0, 0.03) * np.exp(-np.arange(m) / (SR * 0.035))
        click = shape(white(m, rng), ("bp", 2600.0, 1.0))
        click *= np.exp(-np.arange(m) / (SR * 0.008))
        seg = th * 0.8 + click * 0.35
        y[pos:pos + m] += seg * float(rng.uniform(0.75, 1.0))
    bed = shape(white(n, rng), ("lp", 700.0, 1), ("hp", 120.0, 1)) * 0.4
    y = y + bed
    return peak_norm(fold_loop(y, 1.0), 0.65)


# --------------------------------------------------------------------------------
# Recipes — Tyres
# --------------------------------------------------------------------------------

def _skid(n, rng, f0s, sustain, wander):
    t = np.arange(n) / SR
    y = np.zeros(n)
    for i, f0 in enumerate(f0s):
        f = fm_tone(n, rng, f0, f0 * wander, 0.4, 0.3, phase0=rng.uniform(0, 6.28))
        vib = 1.0 + 0.5 * np.sin(2 * np.pi * 6.0 * t + i) * 0.01  # shimmer, not FM
        y += f * vib / (1.0 + 0.7 * i)
    noise = shape(white(n, rng), ("bp", 3400.0, 1.0)) * 0.25
    y = y + noise
    atk = np.minimum(1.0, t / 0.08)
    sus = np.ones(n)
    tail = int(0.5 * SR)
    sus[-tail:] = np.cos(np.linspace(0, np.pi / 2, tail)) ** 2
    env = atk * sustain(t) * sus
    return y * env


def s_skid_short(dur, rng):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = _skid(n, rng, [950.0, 1430.0, 2110.0], lambda tt: np.exp(-tt / 0.9), 0.03)
    y *= 0.7 + 0.3 * smooth_control(n, rng, 0.1, 0.0, 1.0, 1.0, 0.05)
    return peak_norm(fade_io(y, 0.01, 0.4), 0.85)


def s_skid_long(dur, rng):
    n = int((dur + 0.8) * SR)
    t = np.arange(n) / SR
    y = _skid(n, rng, [880.0, 1320.0, 1975.0, 2640.0], lambda tt: np.ones_like(tt), 0.06)
    y *= 0.6 + 0.4 * smooth_control(n, rng, 0.35, 0.0, 1.0, 1.1, 0.15)
    return peak_norm(fold_loop(y, 0.8), 0.8)


def s_gravel_spray(dur, rng):
    n = int((dur + 0.5) * SR)
    t = np.arange(n) / SR
    stones = _pebbles(n, rng, 220, 2500.0, 8000.0, 0.006, 0.03, 1.0)
    hiss = shape(white(n, rng), ("hp", 3000.0, 1))
    hiss *= 0.4 + 0.6 * smooth_control(n, rng, 0.08, 0.0, 1.0, 1.6, 0.04)
    swell = np.minimum(1.0, t / 0.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * t) ** 2)
    y = (0.7 * stones + 0.4 * hiss) * (0.5 + 0.5 * swell)
    return peak_norm(fold_loop(y, 0.5), 0.7)


# --------------------------------------------------------------------------------
# Recipes — Impacts
# --------------------------------------------------------------------------------

def s_crash_heavy(dur, rng):
    n = int(dur * SR)
    t = np.arange(n) / SR
    burst = shape(white(n, rng), ("lp", 8000.0, 1), ("hp", 60.0, 1))
    burst *= np.exp(-t / 0.28)
    crunch = shape(white(n, rng), ("bp", 1800.0, 0.8))
    crunch *= np.exp(-t / 0.5) * (0.5 + 0.5 * smooth_control(n, rng, 0.05, 0.0, 1.0, 1.5, 0.02))
    metal = np.zeros(n)
    for f0, decay, amp in [(211.0, 1.1, 0.5), (344.0, 0.8, 0.4), (529.0, 0.6, 0.32),
                           (812.0, 0.45, 0.24), (1180.0, 0.3, 0.16)]:
        f = f0 * float(rng.uniform(0.98, 1.02))
        metal += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / decay) * amp
    sub = pitch_drop(n, 70.0, 30.0, 0.12) * np.exp(-t / 0.35)
    y = burst * 0.9 + crunch * 0.5 + metal * 0.55 + sub * 0.8
    return peak_norm(fade_io(y, 0.002, 0.8), 0.89)


def s_hit_body(dur, rng):
    n = int(dur * SR)
    t = np.arange(n) / SR
    thump = pitch_drop(n, 110.0, 45.0, 0.06) * np.exp(-t / 0.16)
    body = (np.sin(2 * np.pi * 300.0 * t) * np.exp(-t / 0.22) * 0.4
            + np.sin(2 * np.pi * 452.0 * t + 1.0) * np.exp(-t / 0.15) * 0.25)
    click = shape(white(n, rng), ("hp", 1200.0, 1)) * np.exp(-t / 0.012) * 0.5
    y = thump * 0.9 + body + click
    return peak_norm(fade_io(y, 0.002, 0.35), 0.85)


def s_scrape_metal(dur, rng):
    n = int(dur * SR)
    t = np.arange(n) / SR
    grit = shape(white(n, rng), ("hp", 700.0, 1), ("lp", 7000.0, 1))
    grit *= 0.5 + 0.5 * np.sin(2 * np.pi * 31.0 * t) ** 2  # judder
    ring = (np.sin(2 * np.pi * 2500.0 * t) * 0.25 + np.sin(2 * np.pi * 3700.0 * t + 0.7) * 0.15)
    ring *= 0.4 + 0.6 * smooth_control(n, rng, 0.12, 0.0, 1.0, 1.0, 0.06)
    env = np.minimum(1.0, t / 0.03) * np.exp(-t / 0.8)
    y = (grit * 0.8 + ring) * env
    return peak_norm(fade_io(y, 0.005, 0.5), 0.8)


# --------------------------------------------------------------------------------
# Bank registry: id, file, category, title, kind, seconds, seed, recipe, defaults
# --------------------------------------------------------------------------------

CATS = [
    ("ambience", "Ambience", "Ambience"),
    ("wind", "Wind", "Wind"),
    ("vegetation", "Vegetation", "Vegetation"),
    ("surfaces", "Surfaces", "Surfaces"),
    ("tyres", "Tyres", "Tyres"),
    ("impacts", "Impacts", "Impacts"),
]

_LOOP = {"loop": True, "fade_in_s": 0.05, "fade_out_s": 0.15, "speed_link": 0.0}
_ONE = {"loop": False, "fade_in_s": 0.005, "fade_out_s": 0.05, "speed_link": 0.0}
_ROLL = {"loop": True, "fade_in_s": 0.05, "fade_out_s": 0.1, "speed_link": 1.0}

SOUNDS = [
    # Ambience — the sky above the track
    ("amb_cloud", "Ambience/Ambience_CloudDrift.wav", "ambience", "Cloud Drift", "loop", 8.0,
     s_cloud_drift, "High, airy sky bed. Soft slow swells for calm weather.", _LOOP, -14.0),
    ("amb_thunder", "Ambience/Ambience_DistantThunder.wav", "ambience", "Distant Thunder", "oneshot", 6.0,
     s_distant_thunder, "Far storm rumble with sub weight. Trigger for drama.", _ONE, -8.0),
    # Wind — six characters + cabin buffet
    ("wind_breeze", "Wind/Wind_Breeze_Light.wav", "wind", "Light Breeze", "loop", 8.0,
     s_breeze_light, "Gentle airy breeze with a leafy shimmer.", _LOOP, -12.0),
    ("wind_gusty", "Wind/Wind_Gusty_Meadow.wav", "wind", "Gusty Meadow", "loop", 10.0,
     s_gusty_meadow, "Medium gusts rolling through; meadow / open field.", _LOOP, -12.0),
    ("wind_gale", "Wind/Wind_Gale_Strong.wav", "wind", "Strong Gale", "loop", 8.0,
     s_gale_strong, "Hard howling gale. Coastal / storm exposure.", _LOOP, -13.0),
    ("wind_desert", "Wind/Wind_Desert_Dry.wav", "wind", "Desert Dry", "loop", 8.0,
     s_desert_dry, "Dry sandy hiss with a thin whistle. Desert stages.", _LOOP, -13.0),
    ("wind_night", "Wind/Wind_Night_Calm.wav", "wind", "Night Calm", "loop", 10.0,
     s_night_calm, "Barely-there night air with faint crickets.", _LOOP, -16.0),
    ("wind_pass", "Wind/Wind_Pass_Whistle.wav", "wind", "Mountain Pass", "loop", 8.0,
     s_pass_whistle, "Resonant pass whistle. Ridge / altitude stages.", _LOOP, -13.0),
    ("wind_buffet", "Wind/Wind_Cabin_Buffet.wav", "wind", "Cabin Buffet", "loop", 4.0,
     s_cabin_buffet, "In-car high-speed buffeting. Speed-link it.", {"loop": True, "fade_in_s": 0.05,
     "fade_out_s": 0.1, "speed_link": 0.8}, -12.0),
    # Vegetation
    ("veg_trees", "Vegetation/Vegetation_Trees_Rustle.wav", "vegetation", "Trees Rustle", "loop", 8.0,
     s_trees_rustle, "Leaves working in the trees over a soft wind bed.", _LOOP, -13.0),
    ("veg_sway", "Vegetation/Vegetation_Grass_Sway.wav", "vegetation", "Grass Sway", "loop", 8.0,
     s_grass_sway, "A grass field breathing in the wind.", _LOOP, -14.0),
    ("veg_shuffle", "Vegetation/Vegetation_Grass_Shuffle.wav", "vegetation", "Grass Shuffle", "loop", 6.0,
     s_grass_shuffle, "Shuffling / walking through dry grass. Footsteps.", _LOOP, -10.0),
    # Surfaces — rolling loops, all speed-linked
    ("surf_tarmac", "Surfaces/Surface_Tarmac_Roll.wav", "surfaces", "Tarmac Roll", "loop", 4.0,
     s_tarmac_roll, "Smooth asphalt tyre roll with a faint whine.", _ROLL, -11.0),
    ("surf_gravel", "Surfaces/Surface_Gravel_Roll.wav", "surfaces", "Gravel Roll", "loop", 4.0,
     s_gravel_roll, "Loose gravel: roll bed + pebble chatter.", _ROLL, -11.0),
    ("surf_sand", "Surfaces/Surface_Sand_Roll.wav", "surfaces", "Sand Roll", "loop", 4.0,
     s_sand_roll, "Soft sand hiss under the tyres. Dunes.", _ROLL, -12.0),
    ("surf_dirt", "Surfaces/Surface_Dirt_Roll.wav", "surfaces", "Dirt Roll", "loop", 4.0,
     s_dirt_roll, "Packed dirt with texture and odd stones.", _ROLL, -11.0),
    ("surf_wet", "Surfaces/Surface_WetAsphalt_Roll.wav", "surfaces", "Wet Asphalt Roll", "loop", 4.0,
     s_wet_roll, "Wet asphalt spray and sizzle. Rain stages.", _ROLL, -12.0),
    ("surf_cobble", "Surfaces/Surface_Cobble_Roll.wav", "surfaces", "Cobble Roll", "loop", 4.0,
     s_cobble_roll, "Rhythmic cobble thumps. Old town / plaza.", _ROLL, -11.0),
    # Tyres
    ("tyre_skid_s", "Tyres/Tyre_Skid_Short.wav", "tyres", "Skid Short", "oneshot", 1.8,
     s_skid_short, "Single rubber screech. Corners, braking.", _ONE, -9.0),
    ("tyre_skid_l", "Tyres/Tyre_Skid_Long.wav", "tyres", "Skid Long", "loop", 3.5,
     s_skid_long, "Sustained screech; loops for drifts.", _LOOP, -10.0),
    ("tyre_spray", "Tyres/Tyre_Gravel_Spray.wav", "tyres", "Gravel Spray", "loop", 3.0,
     s_gravel_spray, "Stones thrown up behind the car.", _LOOP, -12.0),
    # Impacts
    ("imp_crash", "Impacts/Impact_Crash_Heavy.wav", "impacts", "Crash Heavy", "oneshot", 3.0,
     s_crash_heavy, "Full car crash: burst, crunch, metal, sub.", _ONE, -6.0),
    ("imp_hit", "Impacts/Impact_Hit_Body.wav", "impacts", "Body Hit", "oneshot", 1.2,
     s_hit_body, "Panel thump. Scrapes, bumps, contact.", _ONE, -8.0),
    ("imp_scrape", "Impacts/Impact_Scrape_Metal.wav", "impacts", "Metal Scrape", "oneshot", 2.0,
     s_scrape_metal, "Barrier / guardrail scrape with judder.", _ONE, -9.0),
]

SCENES = [
    {"id": "scene_desert", "title": "Desert Rally", "desc": "Desert wind + sand roll + buffet.",
     "layers": [{"sound": "wind_desert", "gain_db": 0.0}, {"sound": "surf_sand", "gain_db": 0.0},
                {"sound": "wind_buffet", "gain_db": -6.0}, {"sound": "tyre_spray", "gain_db": -10.0}]},
    {"id": "scene_forest", "title": "Forest Stage", "desc": "Trees + grass + dirt roll, day.",
     "layers": [{"sound": "veg_trees", "gain_db": 0.0}, {"sound": "wind_gusty", "gain_db": -6.0},
                {"sound": "veg_sway", "gain_db": -4.0}, {"sound": "surf_dirt", "gain_db": 0.0}]},
    {"id": "scene_night", "title": "Night Town", "desc": "Night calm + cobble + distant storm.",
     "layers": [{"sound": "wind_night", "gain_db": 0.0}, {"sound": "surf_cobble", "gain_db": -2.0},
                {"sound": "amb_cloud", "gain_db": -6.0}]},
    {"id": "scene_coast", "title": "Coastal Gale", "desc": "Gale + wet asphalt sprint.",
     "layers": [{"sound": "wind_gale", "gain_db": 0.0}, {"sound": "surf_wet", "gain_db": 0.0},
                {"sound": "wind_buffet", "gain_db": -8.0}, {"sound": "amb_thunder", "gain_db": -10.0}]},
    {"id": "scene_circuit", "title": "Circuit Hotlap", "desc": "Tarmac + breeze + buffet.",
     "layers": [{"sound": "surf_tarmac", "gain_db": 0.0}, {"sound": "wind_breeze", "gain_db": -4.0},
                {"sound": "wind_buffet", "gain_db": -10.0}, {"sound": "amb_cloud", "gain_db": -8.0}]},
]


def main():
    print("Frontier Experimental Audio Bank — synthesising %d sounds @ %d Hz mono" % (len(SOUNDS), SR))
    manifest = {
        "bank": "Frontier Experimental Audio",
        "version": 1,
        "sampleRate": SR,
        "channels": 1,
        "format": "wav16",
        "note": "Procedural, royalty-free. Regenerate with GenerateAudio.py (deterministic seeds).",
        "categories": [{"id": cid, "title": title, "folder": folder} for cid, title, folder in CATS],
        "sounds": [],
        "scenes": SCENES,
    }
    total = 0
    for i, (sid, rel, cat, title, kind, dur, fn, desc, base, gain_db) in enumerate(SOUNDS):
        rng = np.random.default_rng(1000 + i)
        y = fn(dur, rng)
        path = os.path.join(ROOT, rel)
        size = write_wav(path, y)
        total += size
        params = {"pitch_semi": 0.0, "gain_db": gain_db, "pan": 0.0, "lp_hz": 20000.0,
                  "hp_hz": 20.0, "rev_send": 0.0}
        params.update(base)
        manifest["sounds"].append({
            "id": sid, "file": rel.replace(os.sep, "/"), "title": title, "category": cat,
            "kind": kind, "seconds": round(len(y) / SR, 3), "seed": 1000 + i,
            "desc": desc, "params": params,
        })
        print("  %-42s %5.1fs %7d bytes" % (rel, len(y) / SR, size))
    with open(os.path.join(ROOT, "audio-bank.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("manifest: Content/Audio/audio-bank.json")
    print("TOTAL: %d files, %.1f MB" % (len(SOUNDS), total / 1e6))


if __name__ == "__main__":
    main()
