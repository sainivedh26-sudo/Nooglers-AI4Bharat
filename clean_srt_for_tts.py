import argparse
from dataclasses import dataclass
from typing import List


@dataclass
class Segment:
    index: int
    start_ms: int
    end_ms: int
    lines: List[str]

    @property
    def duration_ms(self) -> int:
        return self.end_ms - self.start_ms


def parse_time_to_ms(ts: str) -> int:
    # Format: HH:MM:SS,mmm
    hh, mm, rest = ts.split(":")
    ss, ms = rest.split(",")
    return (
        int(hh) * 3600 * 1000
        + int(mm) * 60 * 1000
        + int(ss) * 1000
        + int(ms)
    )


def format_ms(ms: int) -> str:
    if ms < 0:
        ms = 0
    total_seconds, milli = divmod(ms, 1000)
    hh, rem = divmod(total_seconds, 3600)
    mm, ss = divmod(rem, 60)
    return f"{hh:02d}:{mm:02d}:{ss:02d},{milli:03d}"


def strip_music_tags(lines: List[str]) -> List[str]:
    """
    Remove lines that are only metadata like [இசை], [music], [SFX], etc.
    These should not appear in the cleaned transcript.
    """
    cleaned: List[str] = []
    for ln in lines:
        stripped = ln.strip()
        if not stripped:
            continue
        if stripped.startswith("[") and stripped.endswith("]"):
            # pure metadata line
            continue
        cleaned.append(ln)
    return cleaned


def normalize_text(lines: List[str]) -> str:
    """
    Join lines, strip extra spaces and blank lines for comparison.
    Music / SFX tags are removed before normalization.
    """
    spoken = strip_music_tags(lines)
    parts = [ln.strip() for ln in spoken if ln.strip()]
    return " ".join(parts)


def parse_srt(path: str) -> List[Segment]:
    with open(path, "r", encoding="utf-8") as f:
        raw_lines = [ln.rstrip("\n") for ln in f]

    segments: List[Segment] = []
    i = 0
    n = len(raw_lines)

    while i < n:
        # Skip empty lines
        if not raw_lines[i].strip():
            i += 1
            continue

        # Index line
        index_line = raw_lines[i].strip()
        try:
            idx = int(index_line)
        except ValueError:
            # If index is malformed, just move on
            i += 1
            continue
        i += 1

        if i >= n:
            break

        # Time line
        time_line = raw_lines[i].strip()
        if "-->" not in time_line:
            # Malformed, skip this block
            i += 1
            continue
        start_str, end_str = [part.strip() for part in time_line.split("-->")]
        start_ms = parse_time_to_ms(start_str)
        end_ms = parse_time_to_ms(end_str)
        i += 1

        # Text lines until blank
        text_lines: List[str] = []
        while i < n and raw_lines[i].strip():
            text_lines.append(raw_lines[i])
            i += 1

        segments.append(Segment(idx, start_ms, end_ms, text_lines))

        # Skip the blank separator line (if any)
        while i < n and not raw_lines[i].strip():
            i += 1

    return segments


def merge_segments(segments: List[Segment]) -> List[Segment]:
    """
    Clean an SRT for TTS with the following rules:

    - Remove pure music/SFX segments (e.g. only [இசை]).
    - Never keep repeated short splits (< 1s) of the same text:
      they are merged into the neighbouring segment.
    - For "progressively building" duplicates (same text repeated and
      then extended with more words), keep only the final, most-complete
      sentence (e.g. only the 00:00:39,040–00:00:43,389 segment for
      "இது எங்கள் வகுப்பில் மிகச் சிறந்தது. சிறப்பாகச் செயல்பட்ட ஒரு மாணவன்").
    """
    if not segments:
        return []

    MIN_DURATION_MS = 1000  # "within a second should not split"
    MAX_GAP_MS = 250        # if gap is bigger, treat as a harder boundary

    # 1) Remove pure-music segments and strip music tags from text
    base: List[Segment] = []
    for seg in segments:
        spoken_lines = strip_music_tags(seg.lines)
        if not normalize_text(spoken_lines):
            # No spoken text left -> drop this segment entirely
            continue
        base.append(Segment(seg.index, seg.start_ms, seg.end_ms, spoken_lines))

    if not base:
        return []

    # 2) First pass: absorb sub-1s duplicates into neighbours
    short_merged: List[Segment] = []
    i = 0
    while i < len(base):
        seg = base[i]
        curr_norm = normalize_text(seg.lines)

        merged_away = False

        if seg.duration_ms < MIN_DURATION_MS and curr_norm:
            # Prefer merging into the NEXT segment if it contains this text
            if i + 1 < len(base):
                nxt = base[i + 1]
                next_norm = normalize_text(nxt.lines)
                gap = nxt.start_ms - seg.end_ms
                if next_norm and curr_norm in next_norm and gap <= MAX_GAP_MS:
                    # Extend next segment backwards to cover this tiny split
                    nxt.start_ms = min(nxt.start_ms, seg.start_ms)
                    merged_away = True

            # Otherwise, try merging into the PREVIOUS segment
            if not merged_away and short_merged:
                prev = short_merged[-1]
                prev_norm = normalize_text(prev.lines)
                gap = seg.start_ms - prev.end_ms
                if prev_norm and curr_norm in prev_norm and gap <= MAX_GAP_MS:
                    prev.end_ms = max(prev.end_ms, seg.end_ms)
                    merged_away = True

        if merged_away:
            i += 1
            continue

        # Keep this segment as-is
        short_merged.append(
            Segment(
                len(short_merged) + 1,
                seg.start_ms,
                seg.end_ms,
                seg.lines,
            )
        )
        i += 1

    if not short_merged:
        return []

    # 3) Second pass: drop earlier "partial" sentences when the next one
    # is a strict extension of the previous text (progressive duplicates).
    progressive_clean: List[Segment] = []
    for seg in short_merged:
        curr_norm = normalize_text(seg.lines)
        if not progressive_clean:
            progressive_clean.append(seg)
            continue

        prev = progressive_clean[-1]
        prev_norm = normalize_text(prev.lines)

        # If the new sentence starts with the previous one (and adds more),
        # we keep only the new, more complete sentence.
        if (
            prev_norm
            and curr_norm
            and curr_norm != prev_norm
            and curr_norm.startswith(prev_norm)
            and seg.start_ms - prev.end_ms <= MAX_GAP_MS
        ):
            # Replace previous with current (do NOT move start earlier;
            # we want to align with the final, stable sentence timing).
            progressive_clean[-1] = seg
        else:
            progressive_clean.append(seg)

    if not progressive_clean:
        return []

    # 4) Third pass: drop near-duplicate repeats of exactly the same sentence.
    # Use a small time window so that genuine repetitions much later are kept.
    DUP_WINDOW_MS = 2000  # 2 seconds
    seen_by_text = {}
    deduped: List[Segment] = []

    for seg in progressive_clean:
        norm = normalize_text(seg.lines)
        if not norm:
            continue
        last_start = seen_by_text.get(norm)
        if last_start is not None and seg.start_ms - last_start <= DUP_WINDOW_MS:
            # Same sentence repeated again almost immediately -> drop this one
            continue
        seen_by_text[norm] = seg.start_ms
        deduped.append(seg)

    # 5) Remove carry-over "sliding window" first lines.
    # The original SRT format repeats the last line of segment N as the FIRST
    # line of segment N+1 (for subtitle display continuity). For TTS we must
    # drop that carry-over so each sentence is spoken exactly once.
    no_carryover: List[Segment] = []
    for seg in deduped:
        if not no_carryover:
            no_carryover.append(seg)
            continue

        prev = no_carryover[-1]
        # Compute the last *spoken* line of the previous segment
        prev_spoken = strip_music_tags(prev.lines)
        if not prev_spoken:
            no_carryover.append(seg)
            continue
        last_line_of_prev = prev_spoken[-1].strip()

        # Drop from this segment's lines every leading line that exactly
        # matches the last line of the previous segment.
        trimmed = list(seg.lines)
        while trimmed and trimmed[0].strip() == last_line_of_prev:
            trimmed.pop(0)

        if not normalize_text(trimmed):
            # Nothing left after trimming → drop whole segment
            continue

        seg.lines = trimmed
        no_carryover.append(seg)

    # 6) Re-index sequentially
    for i, seg in enumerate(no_carryover, start=1):
        seg.index = i

    return no_carryover


def write_srt(path: str, segments: List[Segment]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for seg in segments:
            f.write(f"{seg.index}\n")
            f.write(f"{format_ms(seg.start_ms)} --> {format_ms(seg.end_ms)}\n")
            for ln in seg.lines:
                f.write(f"{ln}\n")
            f.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Clean an SRT file for TTS: "
            "merge sub-1-second splits and consecutive duplicates."
        )
    )
    parser.add_argument("input", help="Input .srt file")
    parser.add_argument(
        "output",
        nargs="?",
        help="Output .srt file (default: <input>.tts.srt)",
    )
    args = parser.parse_args()

    input_path = args.input
    output_path = args.output or input_path.replace(".srt", ".tts.srt")

    segments = parse_srt(input_path)
    merged = merge_segments(segments)
    write_srt(output_path, merged)


if __name__ == "__main__":
    main()

