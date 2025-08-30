from typing import List, Dict, Any

DOCUMENT_CATEGORIES: List[Dict[str, Any]] = [
    {"id": "formation", "label": "Formation"},
    {"id": "governance", "label": "Governance"},
    {"id": "equity", "label": "Equity"},
    {"id": "financial", "label": "Financial"},
    {"id": "intellectual-property", "label": "Intellectual Property"},
    {"id": "compliance", "label": "Compliance"},
    {"id": "policies", "label": "Policies"},
    {"id": "intercompany", "label": "Intercompany"},
    {"id": "conversion", "label": "Conversion"},
]

NGI_CAPITAL_LLC_DOCUMENTS: List[Dict[str, Any]] = [
    {"id": "llc-certificate-formation", "name": "Certificate of Formation", "category": "formation", "entityTypes": ["LLC"]},
    {"id": "llc-operating-agreement", "name": "Operating Agreement", "category": "governance", "entityTypes": ["LLC"]},
    {"id": "llc-initial-capital", "name": "Initial Capital Contributions", "category": "equity", "entityTypes": ["LLC"]},
    {"id": "llc-ein-letter", "name": "EIN Assignment Letter", "category": "compliance", "entityTypes": ["LLC"]},
    {"id": "llc-bank-resolution", "name": "Bank Resolution", "category": "governance", "entityTypes": ["LLC"]},
    {"id": "llc-ip-assignment", "name": "IP Assignment", "category": "intellectual-property", "entityTypes": ["LLC"]},
    {"id": "llc-internal-controls", "name": "Internal Controls Manual", "category": "policies", "entityTypes": ["LLC"]},
    {"id": "llc-accounting-policies", "name": "Accounting Policies", "category": "policies", "entityTypes": ["LLC"]},
]

ALL_DOCUMENT_TYPES: List[Dict[str, Any]] = [
    *NGI_CAPITAL_LLC_DOCUMENTS,
    {"id": "c-corp-bylaws", "name": "Bylaws", "category": "governance", "entityTypes": ["C-Corp"]},
    {"id": "conversion-plan", "name": "Plan of Conversion", "category": "conversion", "entityTypes": ["C-Corp"]},
]


def getDocumentsByEntity(entity_id: str) -> List[Dict[str, Any]]:
    if entity_id == 'ngi-capital-llc' or entity_id.endswith('llc'):
        return [d for d in ALL_DOCUMENT_TYPES if 'LLC' in d.get('entityTypes', []) or 'All' in d.get('entityTypes', [])]
    if entity_id == 'ngi-capital-inc' or entity_id.endswith('inc'):
        return [d for d in ALL_DOCUMENT_TYPES if 'C-Corp' in d.get('entityTypes', []) or 'All' in d.get('entityTypes', [])]
    # Fallback: return all that are generic
    return [d for d in ALL_DOCUMENT_TYPES if 'All' in d.get('entityTypes', [])] or NGI_CAPITAL_LLC_DOCUMENTS


def checkDocumentCompleteness(entity_id: str, uploaded_ids: List[str]) -> Dict[str, Any]:
    expected = getDocumentsByEntity(entity_id)
    expected_ids = {d['id'] for d in expected}
    uploaded_set = set(uploaded_ids)
    missing = sorted(list(expected_ids - uploaded_set))
    pct = int(round((len(expected_ids & uploaded_set) / max(len(expected_ids), 1)) * 100))
    return {"complete": pct == 100, "percentage": pct, "missing": missing}

