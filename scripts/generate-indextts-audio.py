#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import traceback
from pathlib import Path
from gradio_client import Client, handle_file

ROOT = Path(__file__).resolve().parent.parent
CHARACTERS_JSON = ROOT / "content" / "characters.json"
DEFAULT_OUTPUT_DIR = ROOT / "assets" / "audio" / "syllables-indextts-normalized"
DEFAULT_PROMPT_WAV = os.environ.get("INDEXTTS_PROMPT_WAV", "")
DEFAULT_API_URL = os.environ.get("INDEXTTS_API_URL", "http://127.0.0.1:7860/")


def load_syllables(source_file):
    with open(source_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    syllables = {}
    for entry in data.get("characters", []):
        hanzi = entry["hanzi"]
        for reading in entry.get("readings", []):
            key = reading["key"]
            if key not in syllables:
                syllables[key] = {
                    "key": key,
                    "hanzi": hanzi,
                    "pinyin": reading.get("pinyin", ""),
                }
    return syllables


def synthesize_and_process(client, prompt_wav_path, key, hanzi, output_path, overwrite=False, num_beams=1):
    if output_path.exists() and output_path.stat().st_size > 500 and not overwrite:
        return "skipped"

    text_prompt = f"<{hanzi}|{key.upper()}>"

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            prompt_obj1 = handle_file(prompt_wav_path)
            prompt_obj2 = handle_file(prompt_wav_path)

            result = client.predict(
                "Same as the voice reference",  # 0: emo_control_method
                prompt_obj1,  # 1: prompt
                text_prompt,  # 2: text
                "ZH",  # 3: lang_choice
                prompt_obj2,  # 4: emo_ref_path
                1.0,  # 5: emo_weight
                0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,  # 6-13: vec1-vec8
                "",  # 14: emo_text
                False,  # 15: emo_random
                120,  # 16: max_text_tokens_per_segment
                1.0,  # 17: duration_factor
                True,  # 18: do_sample (param_18)
                0.8,  # 19: top_p (param_19)
                30,  # 20: top_k (param_20)
                0.8,  # 21: temperature (param_21)
                0.0,  # 22: length_penalty (param_22)
                int(num_beams),  # 23: num_beams (param_23)
                10.0,  # 24: repetition_penalty (param_24)
                1500,  # 25: max_mel_tokens (param_25)
                api_name="/gen_single",
            )

            wav_path = None
            if isinstance(result, dict):
                wav_path = result.get("value") or result.get("path")
            elif isinstance(result, (list, tuple)) and len(result) > 0:
                wav_path = result[0]
            elif isinstance(result, str):
                wav_path = result

            if not wav_path or not os.path.exists(str(wav_path)) or os.path.getsize(str(wav_path)) < 100:
                raise RuntimeError(f"Empty output from TTS for {key} (result: {result})")

            with tempfile.NamedTemporaryFile(suffix=".mp3", dir=str(output_path.parent), delete=False) as tmp:
                tmp_path = tmp.name

            ffmpeg_cmd = [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(wav_path),
                "-af",
                "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-30dB:detection=peak,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-30dB:detection=peak,areverse,volume=4.0,acompressor=threshold=0.05:ratio=6:attack=5:release=60:makeup=10:knee=2.828:detection=rms,alimiter=limit=0.75:attack=5:release=50:level=0:latency=1",
                "-ac",
                "1",
                "-ar",
                "22050",
                "-codec:a",
                "libmp3lame",
                "-b:a",
                "64k",
                tmp_path,
            ]
            subprocess.run(ffmpeg_cmd, check=True)

            if os.path.getsize(tmp_path) < 200:
                raise RuntimeError(f"ffmpeg output too small for {key}")

            shutil.move(tmp_path, str(output_path))
            return "generated"

        except Exception as e:
            traceback.print_exc()
            if attempt == max_retries:
                raise RuntimeError(f"Failed {key} ({hanzi}) after {max_retries} attempts: {e}")
            time.sleep(1.0)


def main():
    parser = argparse.ArgumentParser(description="Generate syllable audio using IndexTTS-2.5 rabbit-0 preset")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="IndexTTS Gradio API URL")
    parser.add_argument("--prompt-wav", default=DEFAULT_PROMPT_WAV, help="Prompt reference WAV path")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Output directory for generated audio")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing audio files")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of items for test")
    parser.add_argument("--start", type=int, default=0, help="Start index")
    parser.add_argument("--num-beams", type=int, default=1, help="Beam size (default: 1 for fast accurate sampling)")
    args = parser.parse_args()
    if not args.prompt_wav:
        parser.error("--prompt-wav or INDEXTTS_PROMPT_WAV environment variable is required")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    syllables = load_syllables(CHARACTERS_JSON)
    items = list(syllables.values())
    if args.limit:
        items = items[args.start : args.start + args.limit]
    elif args.start > 0:
        items = items[args.start :]

    print(f"Connecting to IndexTTS at {args.api_url} ...", flush=True)
    client = Client(args.api_url, verbose=False)

    total = len(items)
    print(f"Target output directory: {output_dir}", flush=True)
    print(f"Processing {total} syllable audio items (overwrite={args.overwrite}, num_beams={args.num_beams})...", flush=True)

    success_count = 0
    skipped_count = 0
    start_time = time.time()

    for idx, item in enumerate(items, 1):
        key = item["key"]
        hanzi = item["hanzi"]
        output_file = output_dir / f"{key}.mp3"

        item_start = time.time()
        try:
            status = synthesize_and_process(
                client=client,
                prompt_wav_path=args.prompt_wav,
                key=key,
                hanzi=hanzi,
                output_path=output_file,
                overwrite=args.overwrite,
                num_beams=args.num_beams,
            )
            item_dur = time.time() - item_start
            if status == "generated":
                success_count += 1
                elapsed = time.time() - start_time
                avg_time = elapsed / idx
                eta = avg_time * (total - idx)
                print(
                    f"[{idx}/{total}] Generated {key}.mp3 ({hanzi}, {item['pinyin']}) in {item_dur:.2f}s | Elapsed: {elapsed:.0f}s | ETA: {eta:.0f}s",
                    flush=True,
                )
            else:
                skipped_count += 1
                print(f"[{idx}/{total}] Skipped existing {key}.mp3 ({hanzi})", flush=True)
        except Exception as err:
            print(f"[{idx}/{total}] ERROR {key}.mp3: {err}", file=sys.stderr, flush=True)
            sys.exit(1)

    total_time = time.time() - start_time
    print(
        f"\nDone! Total: {total}, Generated: {success_count}, Skipped: {skipped_count}, Total Time: {total_time:.2f}s",
        flush=True,
    )


if __name__ == "__main__":
    main()
