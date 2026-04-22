#!/bin/bash
# 多码网每周完整维护脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

LOG_FILE="logs/cron-weekly-$(date +%Y-%m-%d).log"

exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "=== Weekly Maintenance Start: $(date) ==="

# 完整维护：所有数据源 + 所有任务
python3 scripts/run_maintenance.py --weekly

echo "=== Weekly Maintenance End: $(date) ==="
