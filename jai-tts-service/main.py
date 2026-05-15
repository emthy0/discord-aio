import io
import os

import soundfile as sf
from f5_tts.api import F5TTS
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from huggingface_hub import hf_hub_download
from pydantic import BaseModel

app = FastAPI(title="JaiTTS Service")

REF_AUDIO = os.environ["JAI_TTS_REF_AUDIO"]
REF_TEXT = os.environ["JAI_TTS_REF_TEXT"]
MODEL = os.environ.get("JAI_TTS_MODEL", "hf://JTS-AI/JaiTTS-F5TTS/model.safetensors")
VOCAB = os.environ.get("JAI_TTS_VOCAB", "hf://JTS-AI/JaiTTS-F5TTS/vocab.txt")


def resolve_hf_path(path: str) -> str:
    if not path.startswith("hf://"):
        return path
    # hf://repo_id/filename  or  hf://repo_id/subfolder/filename
    parts = path[5:].split("/", 1)
    if len(parts) != 2:
        raise ValueError(f"Invalid hf:// path: {path}")
    repo_id, filename = parts
    return hf_hub_download(repo_id=repo_id, filename=filename)


# Load model once at startup — inference is called per request
tts = F5TTS(ckpt_file=resolve_hf_path(MODEL), vocab_file=resolve_hf_path(VOCAB))


class SynthesizeRequest(BaseModel):
    text: str


@app.post("/synthesize")
async def synthesize(req: SynthesizeRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")

    wav, sr, _ = tts.infer(
        ref_file=REF_AUDIO,
        ref_text=REF_TEXT,
        gen_text=req.text,
        seed=-1,
    )

    buf = io.BytesIO()
    sf.write(buf, wav, sr, format="WAV")
    buf.seek(0)
    return StreamingResponse(buf, media_type="audio/wav")


@app.get("/health")
def health():
    return {"status": "ok"}
