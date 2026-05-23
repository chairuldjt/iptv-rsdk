#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/html/iptv-rsdk}"
MANAGER_SOURCE="${MANAGER_SOURCE:-${APP_DIR}/scripts/iptv-relay-manager.sh}"
MANAGER_TARGET="${MANAGER_TARGET:-/usr/local/bin/iptv-relay-manager}"
ENV_FILE="${ENV_FILE:-/etc/iptv-relay.env}"
SERVICE_FILE="${SERVICE_FILE:-/etc/systemd/system/iptv-relay-all.service}"

M3U_URL="${M3U_URL:-http://10.0.0.1/iptv/iptv_rsdk.m3u}"
LOCALADDR="${LOCALADDR:-10.0.0.199}"
OUTPUT_ROOT="${OUTPUT_ROOT:-/var/www/html/landingpage/relay}"
FFMPEG_BIN="${FFMPEG_BIN:-/usr/bin/ffmpeg}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer with sudo." >&2
  exit 1
fi

if [ ! -f "$MANAGER_SOURCE" ]; then
  echo "Manager script not found: ${MANAGER_SOURCE}" >&2
  echo "Set APP_DIR to the deployed repo path if needed." >&2
  exit 1
fi

install -m 0755 "$MANAGER_SOURCE" "$MANAGER_TARGET"
mkdir -p "$OUTPUT_ROOT"
chown -R www-data:www-data "$OUTPUT_ROOT"

cat > "$ENV_FILE" <<EOF
M3U_URL=${M3U_URL}
LOCALADDR=${LOCALADDR}
OUTPUT_ROOT=${OUTPUT_ROOT}
FFMPEG_BIN=${FFMPEG_BIN}
HLS_TIME=2
HLS_LIST_SIZE=6
FIFO_SIZE=50000
LOGLEVEL=warning
EOF

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=IPTV HLS Relay - All UDP Channels
After=network-online.target apache2.service
Wants=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
EnvironmentFile=${ENV_FILE}
ExecStart=${MANAGER_TARGET} run
Restart=always
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable iptv-relay-all.service

cat <<EOF
Installed iptv-relay-all.service.

Start:
  sudo systemctl start iptv-relay-all

Logs:
  journalctl -u iptv-relay-all -f

List generated channel slugs before starting:
  set -a; source ${ENV_FILE}; set +a
  ${MANAGER_TARGET} list
EOF
