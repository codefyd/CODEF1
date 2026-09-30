# «نقطة» — بناء الريل كاملًا على Windows: الصوت ← الالتقاط ← ffmpeg ← الفحص
# الاستخدام (من جذر المستودع):  powershell -ExecutionPolicy Bypass -File reel/build.ps1  [-SkipCapture]
param([switch]$SkipCapture, [int]$Workers = 6)
$ErrorActionPreference = "Stop"
$reel = $PSScriptRoot
$root = Split-Path $reel -Parent
$out = Join-Path $root "assets\video"
New-Item -ItemType Directory -Force $out | Out-Null

function Find-Tool($name, [string[]]$fallbacks) {
  $c = Get-Command $name -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($f in $fallbacks) { if ($f -and (Test-Path $f)) { return $f } }
  throw "لم أجد $name. ثبّته: winget install Gyan.FFmpeg / winget install Python.Python.3.12 ثم pip install numpy scipy"
}
# ffmpeg: من PATH، أو من متغير FFMPEG، أو النسخة المرفقة مع Remotion
$remotion = Join-Path $env:USERPROFILE "Documents\remotion\node_modules\@remotion\compositor-win32-x64-msvc"
$ffmpeg  = Find-Tool "ffmpeg"  @($env:FFMPEG,  (Join-Path $remotion "ffmpeg.exe"))
$ffprobe = Find-Tool "ffprobe" @($env:FFPROBE, (Join-Path $remotion "ffprobe.exe"))
$python  = Find-Tool "python"  @($env:PYTHON, (Join-Path $env:LOCALAPPDATA "codef-tools\py\tools\python.exe"))
Find-Tool "node" @() | Out-Null
Write-Host "ffmpeg : $ffmpeg`npython : $python"

Push-Location $root
try {
  if (-not (Test-Path (Join-Path $reel "node_modules\playwright"))) { Push-Location $reel; npm install; npx playwright install chromium; Pop-Location }

  Write-Host "`n[1/4] جدول الأحداث والصوت"
  node reel/export-timeline.js
  & $python reel/audio.py
  if ($LASTEXITCODE) { throw "audio.py فشل" }

  if (-not $SkipCapture) {
    Write-Host "`n[2/4] الالتقاط"
    Remove-Item -Recurse -Force (Join-Path $reel "frames-1080x1080"), (Join-Path $reel "frames-1920x720") -ErrorAction SilentlyContinue
    node reel/capture.js 1080x1080 1920x720 --workers $Workers
    if ($LASTEXITCODE) { throw "capture.js فشل" }
  }

  Write-Host "`n[3/4] ffmpeg"
  $wav = "reel/audio/reel.wav"
  $jobs = @(
    @{ size = "1080x1080"; mp4 = "reel-1080.mp4";         webm = "reel-1080.webm";         jpg = "poster.jpg" },
    @{ size = "1920x720";  mp4 = "banner-1920x720.mp4";   webm = "banner-1920x720.webm";   jpg = "poster-banner.jpg" }
  )
  foreach ($j in $jobs) {
    $in = "reel/frames-$($j.size)/f_%05d.png"
    & $ffmpeg -hide_banner -loglevel error -y -framerate 60 -i $in -i $wav `
      -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 60 `
      -c:a aac -b:a 192k -movflags +faststart -t 30 "assets/video/$($j.mp4)"
    & $ffmpeg -hide_banner -loglevel error -y -framerate 60 -i $in -i $wav `
      -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -r 60 `
      -c:a libopus -b:a 160k -t 30 "assets/video/$($j.webm)"
    & $ffmpeg -hide_banner -loglevel error -y -i "reel/frames-$($j.size)/f_00000.png" -q:v 2 "assets/video/$($j.jpg)"
  }

  Write-Host "`n[4/4] الفحص"
  foreach ($f in Get-ChildItem "assets/video/*.mp4", "assets/video/*.webm") {
    $info = & $ffprobe -v error -count_frames -select_streams v:0 `
      -show_entries stream=nb_read_frames,r_frame_rate:format=duration -of default=nw=1 $f.FullName
    Write-Host ("{0,-24} {1,6:N1} MB  {2}" -f $f.Name, ($f.Length / 1MB), ($info -join "  "))
  }
} finally { Pop-Location }
