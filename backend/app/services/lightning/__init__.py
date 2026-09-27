"""
IITM / IMD Lightning Data Ingestion Package (Step 4)
Ingests, validates, filters, and bins lightning strike detection events into model Channel 4 (Lightning Flash Density).
"""
from app.services.lightning.client import lightning_client
from app.services.lightning.validation import validate_lightning_response
from app.services.lightning.processor import process_lightning_strikes

__all__ = ["lightning_client", "validate_lightning_response", "process_lightning_strikes"]
