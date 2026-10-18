"""
A small VoxCPM2 speech server with the same request shape as vLLM-Omni's OpenAI-style endpoint,
so the app's TTS (server/tts.ts, VOXCPM_URL) can use either one.

    pip install voxcpm soundfile              # plus PyTorch for your GPU (or CPU, which is slow)
    python scripts/voxcpm_server.py --port 8000 [--device cuda]
    VOXCPM_URL=http://localhost:8000 npm run server

POST /v1/audio/speech  {"input": "...", "ref_audio": "data:audio/wav;base64,..." | "https://..." | "/path.wav",
                        "response_format": "wav"}  ->  audio/wav (VoxCPM2 output, 48 kHz mono)
GET  /health           ->  {"ok": true, "model": "...", "device": "..."}

Requests are handled one at a time: the model is not thread-safe and a GPU runs one generation anyway.
"""

import argparse
import base64
import io
import json
import os
import tempfile
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import soundfile as sf
from voxcpm import VoxCPM

MAX_CHARS = 600
LOCK = threading.Lock()


def ref_to_file(ref: str) -> str | None:
    """A reference clip from a data URI, a URL or a local path, written to a temp .wav when needed."""
    if not ref:
        return None
    if ref.startswith("data:"):
        data = base64.b64decode(ref.split(",", 1)[1])
    elif ref.startswith(("http://", "https://")):
        with urllib.request.urlopen(ref, timeout=15) as r:
            data = r.read()
    elif os.path.exists(ref):
        return ref
    else:
        raise ValueError("ref_audio must be a data: URI, an http(s) URL or an existing path")
    f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    f.write(data)
    f.close()
    return f.name


def make_handler(model: VoxCPM, model_name: str, device: str, steps: int):
    sample_rate = model.tts_model.sample_rate

    class Handler(BaseHTTPRequestHandler):
        def _send(self, code: int, body: bytes, kind: str) -> None:
            self.send_response(code)
            self.send_header("Content-Type", kind)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _error(self, code: int, message: str) -> None:
            self._send(code, json.dumps({"error": message}).encode(), "application/json")

        def do_GET(self) -> None:  # noqa: N802
            if self.path == "/health":
                self._send(200, json.dumps({"ok": True, "model": model_name, "device": device}).encode(), "application/json")
            else:
                self._error(404, "not found")

        def do_POST(self) -> None:  # noqa: N802
            if self.path != "/v1/audio/speech":
                return self._error(404, "not found")
            try:
                req = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))) or b"{}")
            except json.JSONDecodeError:
                return self._error(400, "invalid json")
            text = str(req.get("input", "")).strip()
            if not text or len(text) > MAX_CHARS:
                return self._error(400, f"input must be 1-{MAX_CHARS} characters")
            if req.get("response_format", "wav") != "wav":
                return self._error(400, "only response_format=wav is supported")
            ref_path = None
            try:
                ref_path = ref_to_file(str(req.get("ref_audio") or ""))
                started = time.time()
                with LOCK:
                    wav = model.generate(text=text, reference_wav_path=ref_path, inference_timesteps=steps, cfg_value=2.0)
                buf = io.BytesIO()
                sf.write(buf, wav, sample_rate, format="WAV", subtype="PCM_16")
                seconds = len(wav) / sample_rate
                print(f"[voxcpm] {len(text)} chars -> {seconds:.1f}s audio in {time.time() - started:.1f}s", flush=True)
                self._send(200, buf.getvalue(), "audio/wav")
            except ValueError as e:
                self._error(400, str(e))
            except Exception as e:  # keep serving after a bad request
                self._error(500, f"generation failed: {e}")
            finally:
                if ref_path and ref_path.startswith(tempfile.gettempdir()):
                    os.unlink(ref_path)

        def log_message(self, *_args) -> None:
            pass

    return Handler


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--model", default="openbmb/VoxCPM2")
    p.add_argument("--device", default="auto", help="auto, cuda, mps or cpu")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--steps", type=int, default=10, help="inference timesteps (fewer is faster, rougher)")
    args = p.parse_args()
    model = VoxCPM.from_pretrained(args.model, load_denoiser=False, optimize=False, device=None if args.device == "auto" else args.device)
    server = ThreadingHTTPServer((args.host, args.port), make_handler(model, args.model, args.device, args.steps))
    print(f"[voxcpm] serving {args.model} on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
