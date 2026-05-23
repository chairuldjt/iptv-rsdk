#!/usr/bin/env bash
set -euo pipefail

M3U_URL="${M3U_URL:-http://10.0.0.1/iptv/iptv_rsdk.m3u}"
LOCALADDR="${LOCALADDR:-10.0.0.199}"
OUTPUT_ROOT="${OUTPUT_ROOT:-/var/www/html/landingpage/relay}"
FFMPEG_BIN="${FFMPEG_BIN:-/usr/bin/ffmpeg}"
HLS_TIME="${HLS_TIME:-2}"
HLS_LIST_SIZE="${HLS_LIST_SIZE:-6}"
FIFO_SIZE="${FIFO_SIZE:-10000000}"
LOGLEVEL="${LOGLEVEL:-warning}"

declare -a CHILD_PIDS=()
declare -A USED_SLUGS=()

usage() {
  cat <<EOF
Usage: $0 [run|list]

Environment:
  M3U_URL      Playlist URL. Default: ${M3U_URL}
  LOCALADDR   IPTV NIC address. Default: ${LOCALADDR}
  OUTPUT_ROOT HLS output root. Default: ${OUTPUT_ROOT}
EOF
}

cleanup() {
  local pid
  for pid in "${CHILD_PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  wait >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

main() {
  local command="${1:-run}"

  case "$command" in
    run)
      require_bins
      mkdir -p "$OUTPUT_ROOT"
      while IFS=$'\t' read -r name url slug; do
        start_channel "$name" "$url" "$slug"
      done < <(load_channels)

      if [ "${#CHILD_PIDS[@]}" -eq 0 ]; then
        echo "No UDP channels found in ${M3U_URL}" >&2
        exit 1
      fi

      echo "Started ${#CHILD_PIDS[@]} IPTV relay process(es)."
      wait -n
      echo "A relay process stopped; exiting so systemd can restart the group." >&2
      exit 1
      ;;
    list)
      require_bins
      load_channels
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
}

require_bins() {
  command -v curl >/dev/null 2>&1 || {
    echo "curl is required." >&2
    exit 1
  }

  [ -x "$FFMPEG_BIN" ] || {
    echo "ffmpeg binary not found at ${FFMPEG_BIN}." >&2
    exit 1
  }
}

load_channels() {
  local current_name=""
  local line

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"

    if [[ "$line" == \#EXTINF:* ]]; then
      current_name="${line##*,}"
      current_name="$(trim "$current_name")"
      [ -n "$current_name" ] || current_name="Channel"
      continue
    fi

    if [[ "$line" == udp://* && -n "$current_name" ]]; then
      local slug
      slug="$(unique_slug "$(slugify "$current_name")")"
      printf '%s\t%s\t%s\n' "$current_name" "$line" "$slug"
      current_name=""
    fi
  done < <(curl -fsSL "$M3U_URL")
}

start_channel() {
  local name="$1"
  local url="$2"
  local slug="$3"
  local output_dir="${OUTPUT_ROOT}/${slug}"
  local output_file="${output_dir}/index.m3u8"

  mkdir -p "$output_dir"
  rm -f "${output_dir}/"*.ts "$output_file" 2>/dev/null || true

  echo "Starting ${name} -> ${output_file}"
  local separator="?"
  [[ "$url" == *\?* ]] && separator="&"

  "$FFMPEG_BIN" -hide_banner -loglevel "$LOGLEVEL" -y \
    -i "${url}${separator}localaddr=${LOCALADDR}&reuse=1&overrun_nonfatal=1&fifo_size=${FIFO_SIZE}" \
    -c copy \
    -f hls -hls_time "$HLS_TIME" -hls_list_size "$HLS_LIST_SIZE" \
    -hls_flags delete_segments+append_list+omit_endlist \
    "$output_file" &

  CHILD_PIDS+=("$!")
}

slugify() {
  local value="$1"
  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  if command -v iconv >/dev/null 2>&1; then
    value="$(printf '%s' "$value" | iconv -f UTF-8 -t ASCII//TRANSLIT 2>/dev/null || printf '%s' "$value")"
  fi
  value="${value//&/ and }"
  value="$(printf '%s' "$value" | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')"
  [ -n "$value" ] || value="channel"
  printf '%s' "$value"
}

unique_slug() {
  local base="$1"
  local slug="$base"
  local index=2

  while [[ -n "${USED_SLUGS[$slug]+x}" ]]; do
    slug="${base}-${index}"
    index=$((index + 1))
  done

  USED_SLUGS["$slug"]=1
  printf '%s' "$slug"
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

main "$@"
