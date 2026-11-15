try:
    from backend.nlp.schema import ExtractedObligationItem
    from backend.nlp.extractor import extract_obligations
except ImportError:
    from nlp.schema import ExtractedObligationItem
    from nlp.extractor import extract_obligations

__all__ = ["ExtractedObligationItem", "extract_obligations"]
