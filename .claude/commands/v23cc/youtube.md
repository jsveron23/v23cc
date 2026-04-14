---
name: v23cc:youtube
description: Summarize a YouTube video using local LLM
allowed-tools: Bash
model: haiku
---

Summarize a YouTube video using subtitles (or Whisper fallback) and the local LLM.

**Usage:** `/v23cc:youtube <URL> [--lang ko] [--percent 20]`

Arguments: $ARGUMENTS

Parse the arguments: first token is the URL, then optional `--lang <code>` (default: `ko`) and `--percent <number>` (default: `20`).

Run the following bash script via the Bash tool:

```bash
#!/bin/bash
set -euo pipefail

URL="$1"
shift

LANG="ko"
PERCENT="20"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lang) LANG="$2"; shift 2 ;;
    --percent) PERCENT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMPDIR_YT="${TMPDIR:-/tmp}/youtube_summary_$$"
mkdir -p "$TMPDIR_YT"

lang_name() {
  case "$1" in
    ko) echo "Korean" ;;
    en) echo "English" ;;
    ja) echo "Japanese" ;;
    zh) echo "Chinese" ;;
    es) echo "Spanish" ;;
    fr) echo "French" ;;
    de) echo "German" ;;
    *)  echo "$1" ;;
  esac
}

LANG_NAME=$(lang_name "$LANG")

cleanup() { rm -rf "$TMPDIR_YT"; }
trap cleanup EXIT

if ! command -v yt-dlp &>/dev/null; then
  echo "Error: yt-dlp is not installed. Run: brew install yt-dlp"
  exit 1
fi

echo "Fetching video info..."
TITLE=$(yt-dlp --get-title "$URL" 2>/dev/null)
if [ -z "$TITLE" ]; then
  echo "Error: Could not fetch video title. Check the URL."
  exit 1
fi
echo "Title: $TITLE"

TRANSCRIPT=""
echo "Trying subtitles ($LANG)..."
yt-dlp --write-auto-sub --sub-lang "$LANG" --skip-download --sub-format vtt --no-progress \
  -o "$TMPDIR_YT/sub" "$URL" 2>/dev/null

SUB_FILE=$(find "$TMPDIR_YT" -name "*.vtt" 2>/dev/null | head -1)

if [ -n "$SUB_FILE" ] && [ -f "$SUB_FILE" ]; then
  echo "Subtitles found. Extracting text..."
  TRANSCRIPT=$(sed '1,/^$/d' "$SUB_FILE" \
    | grep -v '^\s*$' \
    | grep -v '^[0-9]' \
    | grep -v '^\-\->' \
    | sed 's/<[^>]*>//g' \
    | awk '!seen[$0]++' \
    | tr -d '\000-\010\013\014\016-\037')
fi

if [ -z "$TRANSCRIPT" ] && [ "$LANG" != "en" ]; then
  echo "No $LANG subtitles. Trying English..."
  yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format vtt --no-progress \
    -o "$TMPDIR_YT/sub_en" "$URL" 2>/dev/null
  SUB_FILE=$(find "$TMPDIR_YT" -name "*.vtt" 2>/dev/null | head -1)
  if [ -n "$SUB_FILE" ] && [ -f "$SUB_FILE" ]; then
    echo "English subtitles found. Will translate to $LANG_NAME via LLM."
    TRANSCRIPT=$(sed '1,/^$/d' "$SUB_FILE" \
      | grep -v '^\s*$' | grep -v '^[0-9]' | grep -v '^\-\->' \
      | sed 's/<[^>]*>//g' | awk '!seen[$0]++' \
      | tr -d '\000-\010\013\014\016-\037')
  fi
fi

if [ -z "$TRANSCRIPT" ]; then
  echo "No subtitles available. Downloading audio for Whisper transcription..."
  if ! command -v mlx_whisper &>/dev/null; then
    echo "Error: mlx_whisper is not installed."
    exit 1
  fi
  yt-dlp -x --audio-format wav --no-progress -o "$TMPDIR_YT/audio.%(ext)s" "$URL" 2>/dev/null
  WAV_FILE=$(find "$TMPDIR_YT" -name "*.wav" 2>/dev/null | head -1)
  if [ -z "$WAV_FILE" ] || [ ! -f "$WAV_FILE" ]; then
    echo "Error: Failed to download audio."
    exit 1
  fi
  echo "Transcribing with Whisper (this may take a while)..."
  mlx_whisper "$WAV_FILE" --language "$LANG" --output-format txt --output-dir "$TMPDIR_YT" 2>/dev/null
  TXT_FILE=$(find "$TMPDIR_YT" -name "*.txt" 2>/dev/null | head -1)
  if [ -z "$TXT_FILE" ] || [ ! -f "$TXT_FILE" ]; then
    echo "Error: Whisper transcription failed."
    exit 1
  fi
  TRANSCRIPT=$(cat "$TXT_FILE")
fi

if [ -z "$TRANSCRIPT" ]; then
  echo "Error: Could not extract any text from the video."
  exit 1
fi

CHAR_COUNT=${#TRANSCRIPT}
if [ "$CHAR_COUNT" -gt 12000 ]; then
  echo "Transcript is long ($CHAR_COUNT chars). Truncating to fit context window..."
  TRANSCRIPT=$(echo "$TRANSCRIPT" | head -c 12000 2>/dev/null)
fi

echo "Summarizing with LLM..."
echo ""

RESULT=$(printf '%s' "You are a content summarizer. Summarize the following YouTube video transcript in $LANG_NAME.

=== Video: $TITLE ===
$TRANSCRIPT

Instructions:
- Lead with the core topic and conclusion
- Organize key points as a structured list with headers
- Include notable quotes or figures if present
- Keep summary under ${PERCENT}%% of original length
- Write entirely in $LANG_NAME
- No preamble." | MAX_TOKENS=4000 ~/.local/bin/call_local_llm.py)

echo "$RESULT"

RESEARCH_DIR="$REPO_ROOT/research"
mkdir -p "$RESEARCH_DIR"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//' | cut -c1-60)
OUTFILE="$RESEARCH_DIR/${TIMESTAMP}-youtube-${SLUG}.md"

printf '# %s\n\n> Source: %s\n> Language: %s\n> Mode: youtube\n\n%s\n' \
  "$TITLE" "$URL" "$LANG_NAME" "$RESULT" > "$OUTFILE"

echo ""
echo "Saved: research/${TIMESTAMP}-youtube-${SLUG}.md"
```

Pass the URL as `$1` and remaining flags as subsequent args when running the script.
