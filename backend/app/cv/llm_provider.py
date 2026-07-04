"""
CubeVision AI — LLM Configuration

Separate, pluggable LLM integration for vision-based cube analysis.
Supports Gemini, OpenAI, and local GPU-based models.
"""

import os
import json
import io
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

from app.core.config import settings


class BaseLLMProvider(ABC):
    """Abstract LLM provider interface."""

    @abstractmethod
    def analyze_cube_images(
        self, images_bytes: Dict[str, bytes]
    ) -> Dict[str, Any]:
        """
        Analyze cube face images and return structured result.

        Args:
            images_bytes: Dict of face_letter -> image bytes

        Returns:
            {"faces": {...}, "palette": {...}}
        """
        ...

    @abstractmethod
    def analyze_single_face(
        self, image_bytes: bytes, palette_hex: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Analyze a single cube face image.
        Returns: {"stickers": [...], "grid": [...], "method": "llm"}
        """
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        ...


class GeminiProvider(BaseLLMProvider):
    """Google Gemini-based cube analysis."""

    @property
    def name(self) -> str:
        return "Gemini"

    def analyze_cube_images(
        self, images_bytes: Dict[str, bytes]
    ) -> Dict[str, Any]:
        import google.generativeai as genai
        from PIL import Image

        api_key = settings.gemini_api_key
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = """
        You are an expert Rubik's Cube Vision Agent.
        Analyze SIX images of a Rubik's Cube, each corresponding to a face: U, R, F, D, L, B.

        PHASE 1: COLOR CALIBRATION
        - Identify the CENTER sticker of each face.
        - Map detected center color to: White, Yellow, Green, Blue, Red, Orange.
        - Use EXACT HEX CODES:
          White: #FFFFFF, Yellow: #FFFF00, Green: #00FF00,
          Blue: #0000FF, Red: #FF0000, Orange: #FFA500

        PHASE 2: GRID EXTRACTION
        - For each image, extract the 3x3 grid.
        - Classify each cell into face labels (U, R, F, D, L, B) based on Phase 1.
        - Center cell MUST match the face label.

        CONSTRAINTS:
        - Exactly 9 stickers of each color (54 total).
        - Be robust to lighting, glare, shadows.

        OUTPUT (valid JSON only):
        {
          "palette": {"U": "#HEX", "R": "#HEX", "F": "#HEX", "D": "#HEX", "L": "#HEX", "B": "#HEX"},
          "faces": {"U": [["U","U","U"], ...], "R": [...], "F": [...], "D": [...], "L": [...], "B": [...]}
        }
        """

        content = [prompt]
        face_order = ["U", "R", "F", "D", "L", "B"]

        for face in face_order:
            if face in images_bytes:
                img = Image.open(io.BytesIO(images_bytes[face]))
                content.append(f"Image for Face {face}:")
                content.append(img)

        response = model.generate_content(content)
        text = response.text.strip()

        # Clean JSON
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        return json.loads(text.strip())


    def analyze_single_face(
        self, image_bytes: bytes, palette_hex: Dict[str, str]
    ) -> Dict[str, Any]:
        import google.generativeai as genai
        from PIL import Image

        api_key = settings.gemini_api_key
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        palette_str = json.dumps(palette_hex)
        prompt = f"""
        You are an expert Rubik's Cube Vision Agent.
        Analyze this SINGLE image of a Rubik's Cube face.
        
        The user has provided this color palette:
        {palette_str}
        
        Extract the 3x3 grid of colors.
        For each cell, identify the face label (U, D, F, B, R, L) that corresponds to the color.
        
        OUTPUT (valid JSON only):
        {{
          "grid": [["U","U","U"], ["R","F","L"], ["D","D","D"]],
          "stickers": [
            {{"label": "U", "confidence": 0.99}},
            {{"label": "U", "confidence": 0.99}}
          ] // (List all 9 stickers in reading order)
        }}
        """

        content = [prompt]
        img = Image.open(io.BytesIO(image_bytes))
        content.append(img)

        response = model.generate_content(content)
        text = response.text.strip()

        # Clean JSON
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        result = json.loads(text.strip())
        result["method"] = "llm"
        result["success"] = True
        return result


class LocalLLMProvider(BaseLLMProvider):
    """
    Local GPU-based model provider.
    Supports any model that accepts image input via OpenAI-compatible API.
    """

    @property
    def name(self) -> str:
        return "Local GPU Model"

    def analyze_cube_images(
        self, images_bytes: Dict[str, bytes]
    ) -> Dict[str, Any]:
        import base64
        import requests

        endpoint = settings.local_llm_endpoint
        if not endpoint:
            raise ValueError("LOCAL_LLM_ENDPOINT not configured")

        # Build messages with base64 images
        face_order = ["U", "R", "F", "D", "L", "B"]
        image_parts = []

        for face in face_order:
            if face in images_bytes:
                b64 = base64.b64encode(images_bytes[face]).decode("utf-8")
                image_parts.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{b64}",
                    },
                })
                image_parts.append({
                    "type": "text",
                    "text": f"Face {face}",
                })

        prompt_text = (
            "Analyze these 6 Rubik's Cube face images (U,R,F,D,L,B). "
            "Return JSON with 'palette' (face->hex) and 'faces' (face->3x3 grid). "
            "Each cell is a face letter (U/R/F/D/L/B). Exactly 9 of each letter."
        )

        payload = {
            "model": "default",
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    *image_parts,
                ],
            }],
            "max_tokens": 2000,
        }

        resp = requests.post(
            f"{endpoint}/v1/chat/completions",
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()

        text = resp.json()["choices"][0]["message"]["content"]
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]

        return json.loads(text.strip())


# ─── Provider Factory ─────────────────────────────────────────────

_PROVIDERS = {
    "gemini": GeminiProvider,
    "local": LocalLLMProvider,
}


def get_llm_provider(provider_id: Optional[str] = None) -> Optional[BaseLLMProvider]:
    """
    Get an LLM provider by ID.
    Returns None if the provider is not configured.
    """
    pid = provider_id or settings.llm_provider
    provider_class = _PROVIDERS.get(pid)

    if provider_class is None:
        return None

    return provider_class()


def is_llm_available() -> bool:
    """Check if any LLM provider is properly configured."""
    if settings.llm_provider == "gemini" and settings.gemini_api_key:
        return True
    if settings.llm_provider == "local" and settings.local_llm_endpoint:
        return True
    return False
