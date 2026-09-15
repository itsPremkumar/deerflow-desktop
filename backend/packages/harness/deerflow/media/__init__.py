"""Local speech-to-text (offline optional worker)."""

from deerflow.media.stt import Transcription, stt_available, transcribe_file

__all__ = ["Transcription", "stt_available", "transcribe_file"]
