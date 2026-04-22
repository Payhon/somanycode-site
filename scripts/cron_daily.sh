#!/bin/bash
# 多码网每日维护脚本
# 由 crontab 调用，负责发现新项目、补全 README

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# 加载 .env 环境变量
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

LOG_FILE="logs/cron-$(date +%Y-%m-%d).log"

exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "=== Daily Maintenance Start: $(date) ==="
echo "Working dir: $(pwd)"
echo "GITHUB_TOKEN: ${GITHUB_TOKEN:+set (ends with ...${GITHUB_TOKEN: -8})}"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "WARNING: GITHUB_TOKEN not set. Rate limit will be very restrictive."
    echo "Please create .env file with GITHUB_TOKEN=ghp_xxx"
fi

# 每日维护：发现 trending + 补全 README
python3 scripts/run_maintenance.py --daily

echo "=== Daily Maintenance End: $(date) ==="
