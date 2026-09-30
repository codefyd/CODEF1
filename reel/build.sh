#!/usr/bin/env bash
# «نقطة» — بناء الريل كاملًا (macOS/Linux/Git Bash): الصوت ← الالتقاط ← ffmpeg ← الفحص
# الاستخدام (من جذر المستودع):  bash reel/build.sh [--skip-capture]
set -euo pipefail
cd "$(dirname "$0")/.."
FFMPEG="${FFMPEG:-ffmpeg}"; FFPROBE="${FFPROBE:-ffprobe}"; PYTHON="${PYTHON:-python3}"
for t in node "$FFMPEG" "$FFPROBE" "$PYTHON"; do
  command -v "$t" >/dev/null || { echo "ناقص: $t  (brew install ffmpeg python / pip install numpy scipy)"; exit 1; }
done
[ -d reel/node_modules/playwright ] || (cd reel && npm install && npx playwright install chromium)
mkdir -p assets/video

echo "[1/4] جدول الأحداث والصوت"
node reel/export-timeline.js
"$PYTHON" reel/audio.py

if [ "${1:-}" != "--skip-capture" ]; then
  echo "[2/4] الالتقاط"
  rm -rf reel/frames-1080x1080 reel/frames-1920x720
  node reel/capture.js 1080x1080 1920x720 --workers "${WORKERS:-6}"
fi

echo "[3/4] ffmpeg"
enc() { # size mp4 webm jpg
  local in="reel/frames-$1/f_%05d.png"
  "$FFMPEG" -hide_banner -loglevel error -y -framerate 60 -i "$in" -i reel/audio/reel.wav \
    -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 60 -c:a aac -b:a 192k -movflags +faststart -t 30 "assets/video/$2"
  "$FFMPEG" -hide_banner -loglevel error -y -framerate 60 -i "$in" -i reel/audio/reel.wav \
    -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -r 60 -c:a libopus -b:a 160k -t 30 "assets/video/$3"
  "$FFMPEG" -hide_banner -loglevel error -y -i "reel/frames-$1/f_00000.png" -q:v 2 "assets/video/$4"
}
enc 1080x1080 reel-1080.mp4 reel-1080.webm poster.jpg
enc 1920x720 banner-1920x720.mp4 banner-1920x720.webm poster-banner.jpg

echo "[4/4] الفحص"
for f in assets/video/*.mp4 assets/video/*.webm; do
  echo "$f  $("$FFPROBE" -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,r_frame_rate:format=duration -of default=nw=1 "$f" | tr '\n' ' ')"
done
