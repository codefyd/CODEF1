// يصدّر جدول الأحداث نفسه الذي تقرأ منه الحركة إلى reel/timeline.json ليقرأه audio.py
const fs = require("fs");
const path = require("path");
const TL = require("./timeline.js");

const out = {
  bpm: TL.BPM, beat: TL.BEAT, fps: TL.FPS, beats: TL.BEATS, duration: TL.DURATION, frames: TL.FRAMES,
  events: TL.events(),
};
fs.writeFileSync(path.join(__dirname, "timeline.json"), JSON.stringify(out, null, 1));
console.log(`timeline.json: ${out.events.length} events, ${out.duration}s`);
