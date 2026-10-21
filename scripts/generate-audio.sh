#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_FILE="$PROJECT_DIR/content/characters.json"
OUTPUT_DIR="$PROJECT_DIR/assets/audio/syllables"
AUDIO_VOICE="${AUDIO_VOICE:-Tingting (中文（中国大陆）)}"
AUDIO_JOBS="${AUDIO_JOBS:-6}"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

command -v say >/dev/null || { echo "generate-audio.sh requires macOS say" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "generate-audio.sh requires ffmpeg" >&2; exit 1; }
mkdir -p "$OUTPUT_DIR"

generate_one() {
  local key="$1"
  local hanzi="$2"
  local output="$OUTPUT_DIR/$key.mp3"
  if [[ -s "$output" && "${AUDIO_OVERWRITE:-0}" != "1" ]]; then
    return
  fi

  say -v "$AUDIO_VOICE" -r 145 -o "$TEMP_DIR/$key.aiff" -- "$hanzi"
  ffmpeg -hide_banner -loglevel error -y -i "$TEMP_DIR/$key.aiff" -af "volume=4.0" -ac 1 -ar 22050 -codec:a libmp3lame -b:a 32k "$output"
}
export -f generate_one
export AUDIO_OVERWRITE AUDIO_VOICE OUTPUT_DIR TEMP_DIR

node -e '
  const source = require(process.argv[1]);
  const seen = new Set();
  for (const entry of source.characters) {
    for (const reading of entry.readings) {
      if (seen.has(reading.key)) continue;
      seen.add(reading.key);
      process.stdout.write(`${reading.key}\t${entry.hanzi}\n`);
    }
  }
' "$SOURCE_FILE" | xargs -n 2 -P "$AUDIO_JOBS" bash -c 'generate_one "$1" "$2"' _

echo "Generated $(find "$OUTPUT_DIR" -name '*.mp3' | wc -l | tr -d ' ') offline syllable files."
