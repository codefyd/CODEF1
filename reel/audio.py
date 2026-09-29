"""«نقطة» — الصوت مولَّد من جدول الأحداث نفسه (timeline.json) بـ numpy و scipy فقط.

لا ملفات صوتية جاهزة. كل حدث في الجدول يصير صوتًا في موضعه بالعيّنة،
فيستحيل أن ينحرف التزامن عن الحركة.

الاستخدام: python reel/audio.py  ← reel/audio/reel.wav (48kHz ستيريو 16-bit)
"""
import json
import os
import wave

import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000

with open(os.path.join(HERE, "timeline.json"), encoding="utf-8") as f:
    TL = json.load(f)
BEAT = TL["beat"]
N = int(round(TL["duration"] * SR))  # 1,440,000 عيّنة = 30.000 ث
rng = np.random.default_rng(128)


def env(n, attack, decay, curve=1.0):
    """غلاف: صعود خطي ثم هبوط أُسّي."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.exp(-np.maximum(t - attack, 0) / max(decay, 1e-4)) ** curve
    return a * d


def noise(n):
    return rng.standard_normal(n)


def sweep_filter(x, f0, f1, kind="lowpass", q_blocks=48):
    """مرشح يتحرك تردده من f0 إلى f1 (أُسّيًا) على كتل مع حمل الحالة بينها."""
    n = len(x)
    out = np.zeros_like(x)
    edges = np.linspace(0, n, q_blocks + 1).astype(int)
    zi = None
    for i in range(q_blocks):
        a, b = edges[i], edges[i + 1]
        if b <= a:
            continue
        p = (i + 0.5) / q_blocks
        fc = f0 * (f1 / f0) ** p
        fc = float(np.clip(fc, 30, SR / 2 * 0.95))
        if kind == "bandpass":
            lo, hi = fc / 1.6, min(fc * 1.6, SR / 2 * 0.98)
            sos = signal.butter(2, [lo, hi], btype="bandpass", fs=SR, output="sos")
        else:
            sos = signal.butter(2, fc, btype=kind, fs=SR, output="sos")
        if zi is None or zi.shape[0] != sos.shape[0]:
            zi = signal.sosfilt_zi(sos) * x[a]
        out[a:b], zi = signal.sosfilt(sos, x[a:b], zi=zi)
    return out


def sine_sweep(n, f0, f1, curve="exp"):
    t = np.arange(n) / SR
    dur = max(n / SR, 1e-4)
    if curve == "exp":
        f = f0 * (f1 / f0) ** (t / dur)
    else:
        f = f0 + (f1 - f0) * (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ───────────── قاموس الصوت ─────────────
def s_whoosh(e):
    dur = e.get("dur", 1.0) * BEAT * 1.0
    n = int(dur * SR)
    up = e.get("dir", "up") == "up"
    x = noise(n)
    x = sweep_filter(x, 300 if up else 6000, 7000 if up else 250, "bandpass")
    t = np.linspace(0, 1, n)
    shape = np.sin(np.pi * t ** (0.6 if up else 1.4)) ** 1.5
    return x * shape * 0.35 * e.get("gain", 0.5)


def s_pop(e):
    n = int(0.12 * SR)
    f = e.get("freq", 800)
    x = sine_sweep(n, f * 1.8, f * 0.5)
    return x * env(n, 0.002, 0.03) * e.get("gain", 0.4)


def s_key(e):
    n = int(0.015 * SR)
    i = e.get("i", 0)
    fc = 2600 + ((i * 37) % 11) * 180  # طبقة تتغير قليلًا مع كل حرف
    x = noise(n)
    sos = signal.butter(2, [fc * 0.7, min(fc * 1.5, 20000)], btype="bandpass", fs=SR, output="sos")
    x = signal.sosfilt(sos, x) * env(n, 0.0005, 0.004)
    click = np.zeros(n); click[:24] = np.hanning(24) * 0.6
    return (x * 1.4 + click) * e.get("gain", 0.4)


def s_blip(e):
    d = e.get("dur", 0.18) * BEAT if e.get("dur", 0.18) < 2 else e["dur"]
    n = max(int(d * SR), int(0.04 * SR))
    f = e.get("freq", 1000)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)
    return x * env(n, 0.002, d * 0.35) * e.get("gain", 0.3)


def s_impact(e):
    g = e.get("gain", 1.0)
    low = e.get("low", False)
    n = int((1.6 if low else 1.0) * SR)
    body = sine_sweep(n, 110 if low else 140, 38 if low else 55) * env(n, 0.001, 0.45 if low else 0.28)
    nz = noise(n)
    nz = signal.sosfilt(signal.butter(2, 3500, "lowpass", fs=SR, output="sos"), nz)
    nz = np.clip(nz * 3, -1, 1) * env(n, 0.0005, 0.06)  # ضجيج مقصوص
    x = body * 1.1 + nz * 0.5
    return np.tanh(x * 1.8) * 0.8 * g


def s_riser(e):
    dur = e.get("dur", 3) * BEAT
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = sweep_filter(noise(n), 400, 11000, "bandpass", 64) * 0.5
    tone = sine_sweep(n, 180, 1400) * 0.25 + sine_sweep(n, 181.5, 1405) * 0.2
    amp = t ** 2.2
    return (x + tone) * amp * 0.8


def s_kick(e):
    n = int(0.42 * SR)
    x = sine_sweep(n, 160, 44) * env(n, 0.001, 0.16)
    click = noise(n) * env(n, 0.0002, 0.003) * 0.3
    return np.tanh((x + click) * 2.2) * 0.85


def s_clap(e):
    n = int(0.3 * SR)
    x = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        a = int(off * SR)
        m = n - a
        x[a:] += noise(m) * env(m, 0.0003, 0.008 if k < 2 else 0.07)
    x = signal.sosfilt(signal.butter(2, [900, 5000], "bandpass", fs=SR, output="sos"), x)
    return x * 0.9


def s_hat(e):
    open_ = e.get("open", False)
    n = int((0.16 if open_ else 0.05) * SR)
    x = signal.sosfilt(signal.butter(4, 7500, "highpass", fs=SR, output="sos"), noise(n))
    return x * env(n, 0.0003, 0.05 if open_ else 0.012) * (0.22 if open_ else 0.28)


def s_kashida(e):
    dur = e.get("dur", 1.5) * BEAT
    n = int(dur * SR)
    f0, f1 = e.get("f0", 220), e.get("f1", 880)
    t = np.linspace(0, 1, n)
    # الطبقة تصعد بنسبة طول التمطيط (نفس منحنى الحركة تقريبًا: ناعم في البداية والنهاية)
    p = 0.5 - 0.5 * np.cos(np.pi * t)
    f = f0 * (f1 / f0) ** p
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    amp = np.clip(t * 8, 0, 1) * (1 - t ** 6)
    return x * amp * 0.22


SYNTH = {"whoosh": s_whoosh, "pop": s_pop, "key": s_key, "blip": s_blip, "impact": s_impact,
         "riser": s_riser, "kick": s_kick, "clap": s_clap, "hat": s_hat, "kashida": s_kashida}
PAN = {"hat": 0.25, "clap": -0.1, "kashida": 0.0, "riser": 0.0, "kick": 0.0, "impact": 0.0}


def main():
    L = np.zeros(N)
    R = np.zeros(N)
    counts = {}
    for i, e in enumerate(TL["events"]):
        fn = SYNTH.get(e["type"])
        if not fn:
            continue
        x = fn(e).astype(np.float64)
        start = int(round(e["beat"] * BEAT * SR))
        pan = PAN.get(e["type"], None)
        if pan is None:
            pan = ((i * 7919) % 100) / 100 * 0.6 - 0.3  # انتشار خفيف ثابت
        gl, gr = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
        # حلقة: الذيل الذي يتجاوز نهاية الملف يعود إلى أوله
        idx = (start + np.arange(len(x))) % N
        np.add.at(L, idx, x * gl)
        np.add.at(R, idx, x * gr)
        counts[e["type"]] = counts.get(e["type"], 0) + 1

    mix = np.stack([L, R], axis=1)
    # محدّد بسيط: ضغط ناعم ثم تطبيع إلى -1 dBFS
    peak = np.max(np.abs(mix)) or 1.0
    mix = mix / peak * 1.6
    mix = np.tanh(mix) / np.tanh(1.6)
    target = 10 ** (-1 / 20)
    mix = mix / np.max(np.abs(mix)) * target
    # أطراف الملف تتلاشى حتى تدور الحلقة بلا طقّة
    fi, fo = int(0.004 * SR), int(0.012 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None]

    os.makedirs(os.path.join(HERE, "audio"), exist_ok=True)
    out = os.path.join(HERE, "audio", "reel.wav")
    pcm = (mix * 32767).astype("<i2")
    with wave.open(out, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"{out}: {N / SR:.3f}s, {N} samples, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS")
    print("events:", counts)


if __name__ == "__main__":
    main()
