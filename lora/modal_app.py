"""Modal route (recommended of Fireworks/Baseten/Modal for Glimmer QLoRA):
Fireworks fine-tuning only supports its catalog bases (Glimmer not listed);
Baseten works but adds platform lock-in. Modal = your Axolotl code + your vLLM
serve, one account, GPUs on demand (H100).

YOUR steps:
  pip install modal && modal setup
  modal run modal_app.py::smoke      # 2-step QLoRA smoke on H100
  modal run modal_app.py::train      # full run after smoke passes
  modal deploy modal_app.py          # serves /v1 chat completions endpoint
Then set backend .env: LOCAL_BASE_URL=<modal serve url>/v1  LOCAL_MODEL=glimmer-lora
"""
import modal

app = modal.App("byline-glimmer-lora")
vol = modal.Volume.from_name("byline-lora", create_if_missing=True)
image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("torch==2.12.1", "axolotl==0.19.0", "transformers", "peft", "trl", "vllm")
    .add_local_file("muse-glimmer-30b-qlora.yaml", "/root/muse-glimmer-30b-qlora.yaml")
    .add_local_file("train.jsonl", "/root/train.jsonl")
)

@app.function(gpu="H100", image=image, volumes={"/data": vol}, timeout=60 * 60 * 4)
def train(max_steps: int = 0):
    import subprocess
    cmd = ["axolotl", "train", "/root/muse-glimmer-30b-qlora.yaml", "--launcher", "torchrun", "--", "--nproc_per_node=1"]
    if max_steps:
        cmd[2:2] = ["--max-steps", str(max_steps), "--eval-strategy", "no"]
    subprocess.run(cmd, check=True, cwd="/root")
    vol.commit()

@app.function(gpu="H100", image=image, volumes={"/data": vol}, timeout=60 * 60)
@modal.web_server(9000, startup_timeout=600)
def serve():
    import subprocess
    subprocess.Popen(["python3", "-m", "vllm.entrypoints.openai.api_server", "--model", "/data/out-qlora", "--port", "9000", "--max-model-len", "4096"])

@app.local_entrypoint()
def smoke():
    train.remote(max_steps=2)
    print("Smoke done. Check adapter output, then: modal run modal_app.py::train")
