import argparse
import base64
import json
import os
import unicodedata
from typing import List, Optional
from urllib import error, request

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

from clean_srt_for_tts import Segment, parse_srt, format_ms


def load_api_key() -> str:
    if load_dotenv is not None:
        # Load environment from .env if available
        load_dotenv()

    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        raise RuntimeError(
            "SARVAM_API_KEY not found in environment. "
            "Set it in your shell or in a .env file."
        )
    return api_key


def strip_metadata_lines(lines: List[str]) -> List[str]:
    """Remove lines that are only metadata like [இசை], [music], [SFX], etc."""
    cleaned: List[str] = []
    for ln in lines:
        stripped = ln.strip()
        if not stripped:
            continue
        # Skip bracket-only tags (e.g. [இசை], [Music], [SFX])
        if stripped.startswith("[") and stripped.endswith("]"):
            continue
        cleaned.append(ln)
    return cleaned


def sentence_from_segment(seg: Segment) -> Optional[str]:
    # Drop non-spoken metadata lines
    spoken_lines = strip_metadata_lines(seg.lines)
    if not spoken_lines:
        return None
    parts = [ln.strip() for ln in spoken_lines if ln.strip()]
    if not parts:
        return None
    return " ".join(parts)


def has_speakable_text(text: str) -> bool:
    """Return True if text has at least one letter. Sarvam TTS requires at least one character from allowed languages (punctuation-only fails)."""
    for ch in text:
        if unicodedata.category(ch).startswith("L"):
            return True
    return False


def safe_timestamp_label(start_ms: int, end_ms: int) -> str:
    """Create a filesystem-safe label based on the time range."""
    start = format_ms(start_ms)
    end = format_ms(end_ms)
    for ch in [":", ","]:
        start = start.replace(ch, "-")
        end = end.replace(ch, "-")
    return f"{start}__{end}"


def call_sarvam_tts(
    api_key: str,
    text: str,
    *,
    target_language_code: str = "ta-IN",
    speaker: str = "Anand",
    model: str = "bulbul:v3",
    pace: float = 1.0,
    sample_rate: int = 24000,
) -> bytes:
    """Call Sarvam TTS REST API and return audio bytes."""
    url = "https://api.sarvam.ai/text-to-speech"
    payload = {
        "text": text,
        "target_language_code": target_language_code,
        "speaker": speaker,
        "model": model,
        "pace": pace,
        "speech_sample_rate": sample_rate,
    }
    data = json.dumps(payload).encode("utf-8")

    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json",
    }

    req = request.Request(url, data=data, headers=headers, method="POST")

    try:
        with request.urlopen(req, timeout=60) as resp:
            resp_data = resp.read()
    except error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"Sarvam TTS HTTPError {e.code}: {detail}"
        ) from e
    except error.URLError as e:
        raise RuntimeError(f"Sarvam TTS URLError: {e}") from e

    try:
        parsed = json.loads(resp_data.decode("utf-8"))
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Failed to decode Sarvam TTS response: {e}") from e

    if "audios" not in parsed or not parsed["audios"]:
        raise RuntimeError(f"Unexpected Sarvam TTS response: {parsed}")

    combined_b64 = "".join(parsed["audios"])
    try:
        audio_bytes = base64.b64decode(combined_b64)
    except Exception as e:
        raise RuntimeError(f"Failed to decode base64 audio: {e}") from e

    return audio_bytes


def load_checkpoint(path: str) -> int:
    """Return last processed subtitle index, or 0 if no checkpoint yet."""
    if not os.path.exists(path):
        return 0
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return int(data.get("last_index", 0))
    except Exception:
        return 0


def save_checkpoint(path: str, last_index: int) -> None:
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump({"last_index": last_index}, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, path)


def process_srt(
    srt_path: str,
    output_dir: str,
    *,
    target_language_code: str = "ta-IN",
    speaker: str = "Anand",
) -> None:
    api_key = load_api_key()

    segments = parse_srt(srt_path)
    if not segments:
        print("No segments found in SRT.")
        return

    os.makedirs(output_dir, exist_ok=True)

    checkpoint_path = srt_path + ".tts.progress.json"
    last_index = load_checkpoint(checkpoint_path)

    print(
        f"Total segments: {len(segments)}. "
        f"Resuming from index > {last_index}."
    )

    try:
        for seg in segments:
            if seg.index <= last_index:
                continue

            sentence = sentence_from_segment(seg)
            # Skip pure-metadata segments such as [இசை] (including your 103–104 case)
            if not sentence:
                last_index = seg.index
                save_checkpoint(checkpoint_path, last_index)
                continue
            # Skip punctuation-only segments (e.g. "."); Sarvam requires at least one letter
            if not has_speakable_text(sentence):
                print(f"[SKIP] idx={seg.index} punctuation-only: {repr(sentence)}")
                last_index = seg.index
                save_checkpoint(checkpoint_path, last_index)
                continue

            ts_label = safe_timestamp_label(seg.start_ms, seg.end_ms)
            out_path = os.path.join(output_dir, f"{ts_label}.wav")

            # Idempotency: if file already exists, treat as done and move on.
            if os.path.exists(out_path):
                print(f"[SKIP] {seg.index} already exists: {out_path}")
                last_index = seg.index
                save_checkpoint(checkpoint_path, last_index)
                continue

            print(f"[TTS] idx={seg.index} ts={ts_label} text={sentence}")

            try:
                audio_bytes = call_sarvam_tts(
                    api_key,
                    sentence,
                    target_language_code=target_language_code,
                    speaker=speaker,
                )
            except Exception as e:
                print(
                    f"Error generating audio for index {seg.index}: {e}"
                )
                # Save checkpoint before exiting so we can resume later.
                save_checkpoint(checkpoint_path, last_index)
                return

            with open(out_path, "wb") as f:
                f.write(audio_bytes)

            last_index = seg.index
            save_checkpoint(checkpoint_path, last_index)

        print("Done. All segments processed.")
    except KeyboardInterrupt:
        print("\nInterrupted by user. Saving checkpoint...")
        save_checkpoint(checkpoint_path, last_index)
        print(f"Checkpoint saved at index {last_index}.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Generate Sarvam TTS audio files for each sentence "
            "in an SRT file. Audio files are named by timestamp range."
        )
    )
    parser.add_argument(
        "srt_path",
        help="Input .srt file (e.g. the *.ta.tts.srt you generated).",
    )
    parser.add_argument(
        "--output-dir",
        default="sarvam_tts_audio",
        help="Directory to write audio files (default: sarvam_tts_audio).",
    )
    parser.add_argument(
        "--speaker",
        default="kavitha",
        help="Sarvam TTS speaker name (default: kavitha).",
    )
    parser.add_argument(
        "--language-code",
        default="ta-IN",
        help="Sarvam TTS target_language_code (default: ta-IN for Tamil).",
    )

    args = parser.parse_args()

    process_srt(
        args.srt_path,
        args.output_dir,
        target_language_code=args.language_code,
        speaker=args.speaker,
    )


if __name__ == "__main__":
    main()

