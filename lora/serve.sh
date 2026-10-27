#!/usr/bin/env bash
# Serve merged/adapter Glimmer locally (OpenAI-compatible). Then set in backend .env:
#   LOCAL_BASE_URL=http://localhost:9000/v1
set -euo pipefail
MODEL_DIR="${1:-./out-qlora}"
python3 -m vllm.entrypoints.openai.api_server --model "$MODEL_DIR" --port 9000 --max-model-len 4096
