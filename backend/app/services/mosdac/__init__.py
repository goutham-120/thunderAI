"""
MOSDAC Satellite Data Ingestion Package (Step 3)
Connects to ISRO MOSDAC portal to ingest GSMaP ISRO Rain 0.1° satellite precipitation.
"""
from app.services.mosdac.client import mosdac_client
from app.services.mosdac.validation import validate_mosdac_response
from app.services.mosdac.parser import parse_gsmap_data

__all__ = ["mosdac_client", "validate_mosdac_response", "parse_gsmap_data"]
