#!/bin/bash
# Ocula content bank: fresh PNG + MP4 posts from the live state. Usage: ./make-now.sh
set -e; cd "$(dirname "$0")"
R=$(python3 build_now.py)
OUT=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['out'])")
SC=$(echo "$R" | python3 -c "import sys,json;print(' '.join(json.load(sys.stdin)['scenes']))")
node render_now.mjs "$OUT" $SC
echo "done: $OUT"
