import os, sys, re, tempfile, argparse, subprocess, shutil, time
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi

def extract_video_id(url):
    match = re.search(r'(?:v=|\\/)([0-9A-Za-z_-]{11}).*', url)
    if match: return match.group(1)
    raise ValueError("Invalid YouTube URL")

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

def main():
    t0 = time.time()
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--output", "-o", default="output")
    args = parser.parse_args()
    os.makedirs(args.output, exist_ok=True)

    # No tempfile — download directly into output dir, clean up manually after
    work_dir = os.path.join(args.output, "_working")
    os.makedirs(work_dir, exist_ok=True)

    try:
        url = args.url
        video_id = extract_video_id(url)

        # Transcript
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(video_id)
        transcript = next(iter(transcript_list), None)
        if not transcript: raise ValueError("No transcripts found")
        fetched = transcript.fetch()

        print(f"\nTranscript: {url}")
        print(f"Language : {transcript.language} [{transcript.language_code}]")
        print(f"Generated: {transcript.is_generated} | Snippets: {len(fetched)}\n")
        print(f"{'Timestamp':<12} {'Duration':<10} Text")
        print("-" * 70)
        for s in fetched:
            print(f"{format_time(s.start):<12} {s.duration:<10.2f} {s.text}")

        # Download into work_dir (persistent, not temp)
        t1 = time.time()
        print("\nDownloading audio...")
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(work_dir, '%(id)s.%(ext)s'),
            'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'wav'}],
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            audio_file = ydl.prepare_filename(info).rsplit('.', 1)[0] + '.wav'

        print(f"Downloaded: {audio_file} [{time.time()-t1:.1f}s]")
        print(f"File exists: {os.path.exists(audio_file)} | Size: {os.path.getsize(audio_file)//1024}KB")

        # Separate — file is still alive here
        t2 = time.time()
        print("\nSeparating (first run downloads ~80MB model)...")
        vocals, music = separate(audio_file, args.output)
        print(f"Done [{time.time()-t2:.1f}s]")

        print(f"\n✅ Speech : {vocals}")
        print(f"✅ Music  : {music}")

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
