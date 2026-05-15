import io
import os

import soundfile as sf
from f5_tts.api import F5TTS
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="JaiTTS Service")

REF_AUDIO = os.environ["JAI_TTS_REF_AUDIO"]
REF_TEXT = os.environ["JAI_TTS_REF_TEXT"]
MODEL = os.environ.get("JAI_TTS_MODEL", "hf://JTS-AI/JaiTTS-F5TTS/model.safetensors")
VOCAB = os.environ.get("JAI_TTS_VOCAB", "hf://JTS-AI/JaiTTS-F5TTS/vocab.txt")

# Load model once at startup — inference is called per request
tts = F5TTS(ckpt_file=MODEL, vocab_file=VOCAB)


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
