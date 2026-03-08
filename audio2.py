import os, sys, re, tempfile, argparse, subprocess, shutil, time, glob
from urllib.parse import urlparse, parse_qs
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
from pydub import AudioSegment

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TTS_DIR = os.path.join(SCRIPT_DIR, "..", "sarvam_tts_audio")
# SRT is auto-discovered at runtime from the video_id; no hardcoded default.

# Directories to search for .tts.srt files (relative to SCRIPT_DIR/..)
SRT_SEARCH_DIRS = [
    "",          # ai4bharat root
    "original",  # ai4bharat/original
]

def extract_video_id(url):
    """
    Extract the YouTube video ID from a variety of URL forms.
    Handles normal URLs, short URLs, and cases where shell escaping
    has introduced backslashes.
    """
    # First, try standard query parameter parsing.
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    vid_list = qs.get("v")
    if vid_list and vid_list[0]:
        return vid_list[0]

    # Fallback: regex scan for a 11-char video id in the URL path/string.
    # Also tolerate stray backslashes from shell escaping.
    cleaned = url.replace("\\", "")
    match = re.search(r"(?:v=|/)([0-9A-Za-z_-]{11})", cleaned)
    if match:
        return match.group(1)

    raise ValueError(f"Invalid YouTube URL: {url}")

def find_srt_for_video(video_id: str) -> str | None:
    """
    Auto-discover the cleaned .tts.srt file for the given video_id.
    Searches SRT_SEARCH_DIRS for files whose name contains '[<video_id>]'
    and ends with '.tts.srt'.
    Returns the first match, or None.

    NOTE: we cannot use glob patterns here because '[...]' is a glob character
    class — we use os.listdir + substring matching instead.
    """
    needle = f"[{video_id}]"
    base = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
    for sub in SRT_SEARCH_DIRS:
        search_dir = os.path.normpath(os.path.join(base, sub))
        if not os.path.isdir(search_dir):
            continue
        for fname in os.listdir(search_dir):
            if needle in fname and fname.endswith(".tts.srt"):
                return os.path.join(search_dir, fname)
    return None


def format_time(seconds):
    return f"{int(seconds)//60:02d}:{seconds%60:05.2f}"

def download_audio(video_url, temp_dir):
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(temp_dir, '%(id)s.%(ext)s'),
        'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'wav'}],
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=True)
        return ydl.prepare_filename(info).rsplit('.', 1)[0] + '.wav'

def separate(audio_file, output_dir):
    cmd = [sys.executable, '-m', 'demucs.separate',
           '--two-stems=vocals', '-n', 'htdemucs', '-d', 'cpu',
           '-o', output_dir, audio_file]
    print(f"\nCMD: {' '.join(cmd)}\n")
    subprocess.run(cmd, check=True)
    base = os.path.splitext(os.path.basename(audio_file))[0]
    out = os.path.join(output_dir, 'htdemucs', base)
    return os.path.join(out, 'vocals.wav'), os.path.join(out, 'no_vocals.wav')


def parse_ts_label(label):
    """
    Parse a timestamp label of the form HH-MM-SS-mmm__HH-MM-SS-mmm
    back into (start_ms, end_ms).
    """
    def to_ms(part):
        hh, mm, ss, ms = part.split("-")
        return (int(hh) * 3600 + int(mm) * 60 + int(ss)) * 1000 + int(ms)

    start_str, end_str = label.split("__")
    return to_ms(start_str), to_ms(end_str)


def srt_time_to_ms(ts: str) -> int:
    """Parse SRT timestamp HH:MM:SS,mmm → milliseconds."""
    hh, mm, rest = ts.strip().split(":")
    ss, ms = rest.split(",")
    return (int(hh) * 3600 + int(mm) * 60 + int(ss)) * 1000 + int(ms)


def ms_to_filename_label(start_ms: int, end_ms: int) -> str:
    """Produce the HH-MM-SS-mmm__HH-MM-SS-mmm label used by the WAV files."""
    def fmt(ms):
        total_s, milli = divmod(ms, 1000)
        hh, rem = divmod(total_s, 3600)
        mm, ss = divmod(rem, 60)
        return f"{hh:02d}-{mm:02d}-{ss:02d}-{milli:03d}"
    return f"{fmt(start_ms)}__{fmt(end_ms)}"


def load_srt_timings(srt_path: str):
    """
    Parse a cleaned .srt file and return a list of
    (start_ms, end_ms, wav_label) tuples, one per subtitle segment.
    """
    if not os.path.exists(srt_path):
        raise FileNotFoundError(f"SRT file not found: {srt_path}")

    entries = []
    with open(srt_path, "r", encoding="utf-8") as f:
        lines = [ln.rstrip("\n") for ln in f]

    i = 0
    while i < len(lines):
        if not lines[i].strip():
            i += 1
            continue
        # index line
        try:
            int(lines[i].strip())
        except ValueError:
            i += 1
            continue
        i += 1
        if i >= len(lines):
            break
        # time line
        time_line = lines[i].strip()
        if "-->" not in time_line:
            i += 1
            continue
        start_str, end_str = [p.strip() for p in time_line.split("-->")]
        start_ms = srt_time_to_ms(start_str)
        end_ms = srt_time_to_ms(end_str)
        label = ms_to_filename_label(start_ms, end_ms)
        entries.append((start_ms, end_ms, label))
        # skip text lines
        i += 1
        while i < len(lines) and lines[i].strip():
            i += 1

    return entries


# Natural speech tempo limits — beyond these it sounds robotic.
MAX_SPEED_RATIO = 1.30   # max 30% speed-up
MIN_SPEED_RATIO = 0.85   # max 15% slow-down (rarely needed; TTS is usually too long)
FADE_MS         = 180    # fade-out length when trimming hard


def probe_duration_ms(wav_path: str) -> float:
    """Return duration of a WAV file in milliseconds via ffprobe."""
    r = subprocess.run(
        ["ffprobe", "-v", "error",
         "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1",
         wav_path],
        capture_output=True, text=True,
    )
    if r.returncode != 0 or not r.stdout.strip():
        return 0.0
    return float(r.stdout.strip()) * 1000


def apply_atempo(input_wav: str, output_wav: str, ratio: float) -> None:
    """
    Apply ffmpeg atempo filter to speed up (ratio > 1) or slow down (ratio < 1).
    Chains multiple atempo stages when ratio is outside [0.5, 2.0].
    """
    MAX_STAGE = 2.0
    MIN_STAGE = 0.5
    filters = []
    r = ratio
    if r > 1.0:
        while r > MAX_STAGE + 1e-6:
            filters.append(f"atempo={MAX_STAGE}")
            r /= MAX_STAGE
        if r > 1.0 + 1e-6:
            filters.append(f"atempo={r:.6f}")
    elif r < 1.0:
        while r < MIN_STAGE - 1e-6:
            filters.append(f"atempo={MIN_STAGE}")
            r /= MIN_STAGE
        if r < 1.0 - 1e-6:
            filters.append(f"atempo={r:.6f}")

    if not filters:
        shutil.copy2(input_wav, output_wav)
        return

    af = ",".join(filters)
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_wav, "-filter:a", af, output_wav],
        check=True, capture_output=True,
    )


def fit_audio_to_slot(input_wav: str, output_wav: str, slot_ms: int) -> str:
    """
    Fit TTS audio into a time slot with these rules:
      1. If audio fits naturally (≤ slot_ms) → use as-is (no slow-down).
      2. If audio is longer but within MAX_SPEED_RATIO → speed it up to fit.
      3. If audio is too long even at MAX_SPEED_RATIO → speed up by MAX_SPEED_RATIO,
         then hard-trim at slot_ms with a fade-out.  Better to cut than distort.
    Returns the path to the processed file.
    """
    actual_ms = probe_duration_ms(input_wav)

    if actual_ms <= 0 or slot_ms <= 0:
        shutil.copy2(input_wav, output_wav)
        return output_wav

    if actual_ms <= slot_ms:
        # Audio already fits — no processing needed.
        shutil.copy2(input_wav, output_wav)
        return output_wav

    ratio = actual_ms / slot_ms   # > 1.0: need to speed up

    if ratio <= MAX_SPEED_RATIO:
        # Speed up within natural range → perfectly fits.
        apply_atempo(input_wav, output_wav, ratio)
        action = f"sped up ×{ratio:.2f}"
    else:
        # Too long even at max speed-up.
        # Step 1: speed up by MAX_SPEED_RATIO (best natural speed).
        sped_tmp = output_wav + "_sped.wav"
        apply_atempo(input_wav, sped_tmp, MAX_SPEED_RATIO)
        sped_ms = probe_duration_ms(sped_tmp)

        # Step 2: trim to slot_ms and apply fade-out.
        fade_start = max(0, slot_ms - FADE_MS)
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", sped_tmp,
                "-filter:a",
                f"atrim=end={slot_ms / 1000:.3f},"
                f"afade=t=out:st={fade_start / 1000:.3f}:d={FADE_MS / 1000:.3f}",
                output_wav,
            ],
            check=True, capture_output=True,
        )
        os.remove(sped_tmp)
        action = (
            f"sped up ×{MAX_SPEED_RATIO} + trimmed "
            f"({actual_ms:.0f}ms → {slot_ms}ms slot)"
        )

    return output_wav


def build_tts_background_mix(music_path, tts_dir, out_path, srt_path=None):
    """
    Overlay Sarvam TTS chunks onto the background-only track from Demucs.

    Rules per chunk:
      - Timing (start/end ms) comes from SRT when available, else from filename.
      - Audio is fitted to its slot: gentle speed-up if needed, trim+fade if
        the slot is too short even at max natural speed.
      - Each chunk ends with a short fade-out so hard cuts never happen.
      - No chunk is allowed to bleed past its slot into the next one.
    """
    if not os.path.exists(music_path):
        raise FileNotFoundError(f"Background track not found: {music_path}")
    if not os.path.isdir(tts_dir):
        raise FileNotFoundError(f"TTS directory not found: {tts_dir}")

    tts_files = sorted(glob.glob(os.path.join(tts_dir, "*.wav")))
    if not tts_files:
        raise RuntimeError(f"No TTS .wav files found in {tts_dir}")

    # Build label → (start_ms, end_ms) from SRT
    srt_timing: dict = {}
    if srt_path:
        print(f"\nLoading SRT timings from: {srt_path}")
        for s_ms, e_ms, label in load_srt_timings(srt_path):
            srt_timing[label] = (s_ms, e_ms)
        print(f"  {len(srt_timing)} SRT entries loaded.")

    print(f"\nBuilding TTS+background mix from {len(tts_files)} chunks...")

    base = AudioSegment.from_file(music_path)
    final = base

    timed_files = []
    for path in tts_files:
        name = os.path.splitext(os.path.basename(path))[0]
        try:
            fname_start_ms, fname_end_ms = parse_ts_label(name)
        except Exception:
            print(f"  Skipping file with unexpected name format: {path}")
            continue

        if name in srt_timing:
            start_ms, end_ms = srt_timing[name]
            source = "SRT"
        else:
            start_ms, end_ms = fname_start_ms, fname_end_ms
            source = "filename"

        timed_files.append((start_ms, end_ms, name, path, source))

    timed_files.sort(key=lambda x: x[0])

    stretch_dir = out_path + "_stretch_tmp"
    os.makedirs(stretch_dir, exist_ok=True)

    try:
        for i, (start_ms, end_ms, name, path, source) in enumerate(timed_files):
            slot_ms = end_ms - start_ms
            actual_ms = probe_duration_ms(path)
            rel = os.path.basename(path)

            # Hard boundary: never allow audio to bleed past the next segment start.
            if i + 1 < len(timed_files):
                next_start = timed_files[i + 1][0]
                # If next segment starts before this audio would end, clamp.
                max_allowed_ms = next_start - start_ms
                # Give a small 50 ms grace to avoid cutting good audio.
                if actual_ms > max_allowed_ms + 50:
                    slot_ms = min(slot_ms, max_allowed_ms)

            processed_path = os.path.join(stretch_dir, rel)
            fit_audio_to_slot(path, processed_path, slot_ms)
            final_ms = probe_duration_ms(processed_path)

            ratio = (actual_ms / final_ms) if final_ms > 0 else 1.0
            if abs(actual_ms - final_ms) > 50:
                action = (
                    f"×{ratio:.2f} speed-up → {final_ms:.0f}ms"
                    if ratio > 1 else
                    f"trimmed → {final_ms:.0f}ms"
                )
                print(f"  [{source}] {rel}: {actual_ms:.0f}ms raw, {slot_ms}ms slot → {action} @ {start_ms}ms")
            else:
                print(f"  [{source}] {rel}: {actual_ms:.0f}ms fits slot {slot_ms}ms @ {start_ms}ms")

            tts_seg = AudioSegment.from_file(processed_path)
            final = final.overlay(tts_seg, position=start_ms)

    finally:
        shutil.rmtree(stretch_dir, ignore_errors=True)

    final.export(out_path, format="wav")
    print(f"\nTTS+background mix written to: {out_path}")


def mux_video_with_audio(video_file, audio_file, output_file):
    """
    Replace the original audio of the video with the provided audio track.
    Requires ffmpeg to be installed.
    """
    if not os.path.exists(video_file):
        raise FileNotFoundError(f"Video file not found: {video_file}")
    if not os.path.exists(audio_file):
        raise FileNotFoundError(f"Audio file not found: {audio_file}")

    cmd = [
        "ffmpeg",
        "-y",  # overwrite output
        "-i", video_file,
        "-i", audio_file,
        "-c:v", "copy",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        output_file,
    ]
    print(f"\nFFmpeg mux command: {' '.join(cmd)}\n")
    subprocess.run(cmd, check=True)
    print(f"Final video written to: {output_file}")

def main():
    t0 = time.time()
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--output", "-o", default="output")
    parser.add_argument(
        "--tts-dir",
        default=DEFAULT_TTS_DIR,
        help=(
            "Directory containing Sarvam TTS audio chunks named by timestamp "
            "range (default: ../sarvam_tts_audio relative to this script)."
        ),
    )
    parser.add_argument(
        "--srt",
        default=None,
        help=(
            "Path to the cleaned .tts.srt file for authoritative timing. "
            "If omitted, the script auto-discovers *[<video_id>]*.tts.srt "
            f"in: {SRT_SEARCH_DIRS} (relative to the ai4bharat root)."
        ),
    )
    args = parser.parse_args()
    os.makedirs(args.output, exist_ok=True)

    # No tempfile — download directly into output dir, clean up manually after
    work_dir = os.path.join(args.output, "_working")
    os.makedirs(work_dir, exist_ok=True)

    try:
        # Normalise the URL: strip any shell-escape backslashes and rebuild
        # as a clean https://www.youtube.com/watch?v=<id> URL so yt-dlp
        # always recognises it as a YouTube URL (not a generic redirect).
        raw_url = args.url
        clean_url = raw_url.replace("\\", "")
        # Extract video_id from the cleaned URL and construct canonical form.
        try:
            pre_id = extract_video_id(clean_url)
            url = f"https://www.youtube.com/watch?v={pre_id}"
        except ValueError:
            url = clean_url  # fall back to cleaned URL if parsing fails

        if url != raw_url:
            print(f"URL normalised: {raw_url!r}\n           → {url!r}")

        # Download audio into work_dir (persistent, not temp) and get canonical video_id from yt_dlp
        t1 = time.time()
        print("\nDownloading audio (and resolving video metadata)...")
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(work_dir, '%(id)s.%(ext)s'),
            'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'wav'}],
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            audio_file = ydl.prepare_filename(info).rsplit('.', 1)[0] + '.wav'

        video_id = info.get("id")
        title = info.get("title")
        webpage_url = info.get("webpage_url")
        print(f"\nResolved video_id: {video_id}")
        if title:
            print(f"Title          : {title}")
        if webpage_url:
            print(f"Canonical URL  : {webpage_url}")

        print(f"\nDownloaded audio: {audio_file} [{time.time()-t1:.1f}s]")
        print(f"File exists: {os.path.exists(audio_file)} | Size: {os.path.getsize(audio_file)//1024}KB")

        # Transcript (now using the video_id from yt_dlp, not our own parser)
        if video_id:
            try:
                ytt_api = YouTubeTranscriptApi()
                transcript_list = ytt_api.list(video_id)
                transcript = next(iter(transcript_list), None)
                if transcript:
                    fetched = transcript.fetch()
                    print(f"\nTranscript for: {webpage_url or url}")
                    print(f"Language : {transcript.language} [{transcript.language_code}]")
                    print(f"Generated: {transcript.is_generated} | Snippets: {len(fetched)}\n")
                    print(f"{'Timestamp':<12} {'Duration':<10} Text")
                    print("-" * 70)
                    for s in fetched:
                        print(f"{format_time(s.start):<12} {s.duration:<10.2f} {s.text}")
                else:
                    print(f"\nNo transcripts found for video_id={video_id}")
            except Exception as te:
                print(f"\nWarning: failed to fetch transcript for video_id={video_id}: {te}")

        # Also download the full video (mp4) so we can mux the new audio track.
        t1v = time.time()
        print("\nDownloading video...")
        video_outtmpl = os.path.join(work_dir, '%(id)s.%(ext)s')
        vdl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio/best/best',
            'outtmpl': video_outtmpl,
        }
        with yt_dlp.YoutubeDL(vdl_opts) as ydl_v:
            info_v = ydl_v.extract_info(url, download=True)
            video_file = ydl_v.prepare_filename(info_v)

        print(f"Downloaded video: {video_file} [{time.time()-t1v:.1f}s]")
        print(f"Video exists: {os.path.exists(video_file)} | Size: {os.path.getsize(video_file)//1024}KB")

        # Separate — file is still alive here
        t2 = time.time()
        print("\nSeparating (first run downloads ~80MB model)...")
        vocals, music = separate(audio_file, args.output)
        print(f"Done [{time.time()-t2:.1f}s]")

        print(f"\n✅ Speech : {vocals}")
        print(f"✅ Music  : {music}")

        # Build TTS + background mix and mux with video
        if args.tts_dir:
            t3 = time.time()
            tts_mix_path = os.path.join(args.output, f"{video_id}_tts_mix.wav")

            # Resolve SRT: explicit arg > auto-discover by video_id
            if args.srt and os.path.exists(args.srt):
                srt_path = args.srt
                print(f"\nUsing explicitly provided SRT: {srt_path}")
            else:
                srt_path = find_srt_for_video(video_id)
                if srt_path:
                    print(f"\nAuto-discovered SRT for {video_id}: {srt_path}")
                else:
                    print(
                        f"\nNo .tts.srt found for video_id={video_id} in "
                        f"{SRT_SEARCH_DIRS}. Falling back to filename-based timing."
                    )

            print(f"Creating TTS+background mix using TTS dir: {args.tts_dir}")
            build_tts_background_mix(music, args.tts_dir, tts_mix_path, srt_path=srt_path)
            print(f"TTS mix ready: {tts_mix_path} [{time.time()-t3:.1f}s]")

            final_video = os.path.join(args.output, f"{video_id}_sarvam_tts.mp4")
            print(f"\nMerging TTS audio with video into {final_video} ...")
            mux_video_with_audio(video_file, tts_mix_path, final_video)
        else:
            print("\nNo TTS directory specified; skipping TTS mix and video mux.")

    except Exception as e:
        import traceback; traceback.print_exc()
        return 1
    finally:
        # Cleanup work dir only AFTER separation is done
        shutil.rmtree(work_dir, ignore_errors=True)
        print("Cleaned up working files.")

    print(f"\n⏱️  Total: {time.time()-t0:.1f}s")
    return 0

if __name__ == "__main__":
    sys.exit(main())
