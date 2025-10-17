"""
XBRL Taxonomy Service
Direct access to 2025 US GAAP XBRL Taxonomy files

This service reads the FASB taxonomy XML files directly without parsing
the entire 18,000+ element set into the database. It provides on-demand
lookups with in-memory caching for performance.

Author: NGI Capital Development Team
Date: October 11, 2025
"""

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Optional, Any
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

# XBRL Taxonomy paths
TAXONOMY_BASE = Path(__file__).parent.parent.parent.parent / "xbrl_taxonomy" / "2025" / "us-gaap-2025"
SCHEMA_FILE = TAXONOMY_BASE / "elts" / "us-gaap-2025.xsd"
LABEL_FILE = TAXONOMY_BASE / "elts" / "us-gaap-lab-2025.xml"
REFERENCE_FILE = TAXONOMY_BASE / "elts" / "us-gaap-ref-2025.xml"
DOC_FILE = TAXONOMY_BASE / "elts" / "us-gaap-doc-2025.xml"
PRESENTATION_FILE = TAXONOMY_BASE / "elts" / "us-gaap-depcon-pre-2025.xml"

# XBRL Namespaces
NAMESPACES = {
    'xs': 'http://www.w3.org/2001/XMLSchema',
    'us-gaap': 'http://fasb.org/us-gaap/2025',
    'xbrli': 'http://www.xbrl.org/2003/instance',
    'link': 'http://www.xbrl.org/2003/linkbase',
    'xlink': 'http://www.w3.org/1999/xlink',
    'ref': 'http://www.xbrl.org/2006/ref',
}


class XBRLTaxonomyService:
    """
    Service for querying XBRL US GAAP Taxonomy
    Reads XML files directly with caching for performance
    """

    def __init__(self):
        """Initialize service and verify taxonomy files exist"""
        if not SCHEMA_FILE.exists():
            raise FileNotFoundError(
                f"XBRL taxonomy not found at {TAXONOMY_BASE}. "
                f"Please download 2025 US GAAP taxonomy."
            )

        logger.info("XBRL Taxonomy Service initialized")
        logger.info(f"Taxonomy location: {TAXONOMY_BASE}")

    @lru_cache(maxsize=1000)
    def get_element(self, element_name: str) -> Optional[Dict]:
        """
        Get complete element information from taxonomy

        Args:
            element_name: XBRL element name (e.g., "CashAndCashEquivalents")

        Returns:
            Dict with element details or None if not found
        """
        element_data = {
            'element_name': element_name,
            'standard_label': None,
            'documentation': None,
            'data_type': None,
            'period_type': None,
            'balance_type': None,
            'asc_references': [],
            'primary_asc_topic': None,
        }

        # Get definition from schema
        schema_data = self._get_from_schema(element_name)
        if schema_data:
            element_data.update(schema_data)
        else:
            return None  # Element not found

        # Get label and documentation
        label = self._get_label(element_name)
        if label:
            element_data['standard_label'] = label
        doc = self._get_documentation(element_name)
        if doc:
            element_data['documentation'] = doc

        # Get ASC references
        asc_refs = self._get_asc_references(element_name)
        if asc_refs:
            element_data['asc_references'] = asc_refs
            element_data['primary_asc_topic'] = asc_refs[0] if asc_refs else None

        # Add presentation neighbors for context
        try:
            element_data['presentation_children'] = self.get_presentation_related(element_name, direction='children', limit=15)
            element_data['presentation_parents'] = self.get_presentation_related(element_name, direction='parents', limit=15)
        except Exception:
            element_data['presentation_children'] = []
            element_data['presentation_parents'] = []

        return element_data

    def get_gaap_description(self, element_name: str, context: Dict[str, Any] = None) -> str:
        """
        Generate US GAAP compliant description for journal entry lines
        
        Args:
            element_name: XBRL element name
            context: Additional context (vendor, transaction_type, etc.)
            
        Returns:
            US GAAP compliant description
        """
        element = self.get_element(element_name)
        if not element:
            return f"Transaction - {element_name}"
        
        # Get standard label
        standard_label = element.get('standard_label', element_name)
        
        # Build context-specific description
        if context:
            vendor = context.get('vendor', '')
            transaction_type = context.get('transaction_type', '')
            invoice_number = context.get('invoice_number', '')
            
            # Professional US GAAP description format
            if transaction_type == 'expense':
                if vendor and invoice_number:
                    return f"{standard_label} - {vendor} - Invoice {invoice_number}"
                elif vendor:
                    return f"{standard_label} - {vendor}"
                else:
                    return f"{standard_label} - Professional Services"
            elif transaction_type == 'revenue':
                return f"{standard_label} - Revenue Recognition"
            elif transaction_type == 'asset':
                return f"{standard_label} - Asset Acquisition"
            elif transaction_type == 'liability':
                return f"{standard_label} - Liability Recognition"
            else:
                return f"{standard_label} - {transaction_type.title()}"
        
        return standard_label

    def get_asc_topic_reference(self, element_name: str) -> str:
        """
        Get primary ASC topic reference for an element
        
        Args:
            element_name: XBRL element name
            
        Returns:
            ASC topic reference (e.g., "ASC 210-10")
        """
        element = self.get_element(element_name)
        if not element:
            return "ASC 000-00"
        
        asc_refs = element.get('asc_references', [])
        if asc_refs:
            # Return the first ASC reference
            return asc_refs[0]
        
        # Fallback based on element type
        if 'Cash' in element_name:
            return "ASC 210-10"  # Balance Sheet - Cash
        elif 'Revenue' in element_name:
            return "ASC 606-10"  # Revenue Recognition
        elif 'Expense' in element_name:
            return "ASC 720-10"  # Other Expenses
        elif 'Asset' in element_name:
            return "ASC 360-10"  # Property, Plant, and Equipment
        else:
            return "ASC 000-00"  # Unknown

    @lru_cache(maxsize=500)
    def _get_from_schema(self, element_name: str) -> Optional[Dict]:
        """Extract element definition from schema file"""
        try:
            tree = ET.parse(SCHEMA_FILE)
            root = tree.getroot()

            # Find element by name (using xs: namespace)
            for elem in root.findall('.//xs:element', NAMESPACES):
                if elem.get('name') == element_name:
                    return {
                        'data_type': self._extract_data_type(elem),
                        'period_type': elem.get('{http://www.xbrl.org/2003/instance}periodType'),
                        'balance_type': elem.get('{http://www.xbrl.org/2003/instance}balance'),
                        'is_abstract': elem.get('abstract') == 'true',
                    }

            return None
        except Exception as e:
            logger.error(f"Error reading schema for {element_name}: {e}")
            return None

    @lru_cache(maxsize=500)
    def _get_label(self, element_name: str) -> Optional[str]:
        """Get human-readable label from label linkbase"""
        try:
            tree = ET.parse(LABEL_FILE)
            root = tree.getroot()

            # Find label for element
            target_href = f"#us-gaap_{element_name}"

            for loc in root.findall('.//link:loc', NAMESPACES):
                href = loc.get('{http://www.w3.org/1999/xlink}href', '')
                if target_href in href:
                    loc_label = loc.get('{http://www.w3.org/1999/xlink}label', '')

                    # Find corresponding label text
                    for arc in root.findall('.//link:labelArc', NAMESPACES):
                        if arc.get('{http://www.w3.org/1999/xlink}from') == loc_label:
                            to_label = arc.get('{http://www.w3.org/1999/xlink}to')

                            for label in root.findall('.//link:label', NAMESPACES):
                                if label.get('{http://www.w3.org/1999/xlink}label') == to_label:
                                    return label.text.strip() if label.text else None

            return None
        except Exception as e:
            logger.error(f"Error reading label for {element_name}: {e}")
            return None

    @lru_cache(maxsize=500)
    def _get_documentation(self, element_name: str) -> Optional[str]:
        """Get documentation from documentation linkbase (preferred), fallback to label linkbase.

        Traverses loc -> labelArc/reference to capture documentation role labels.
        """
        try:
            # Prefer dedicated documentation linkbase when available
            file_path = DOC_FILE if DOC_FILE.exists() else LABEL_FILE
            tree = ET.parse(file_path)
            root = tree.getroot()

            target_suffix = f"#us-gaap_{element_name}"
            # Map of resource labels we want to collect
            doc_labels = set()

            for loc in root.findall('.//link:loc', NAMESPACES):
                href = loc.get('{http://www.w3.org/1999/xlink}href', '')
                if href.endswith(target_suffix) or target_suffix in href:
                    loc_label = loc.get('{http://www.w3.org/1999/xlink}label', '')
                    # Traverse label arcs from this loc
                    for arc in root.findall('.//link:labelArc', NAMESPACES):
                        if arc.get('{http://www.w3.org/1999/xlink}from') == loc_label:
                            to_label = arc.get('{http://www.w3.org/1999/xlink}to')
                            if to_label:
                                doc_labels.add(to_label)

            docs: list[str] = []
            # Extract text for documentation role labels
            for label in root.findall('.//link:label', NAMESPACES):
                if label.get('{http://www.w3.org/1999/xlink}label') in doc_labels:
                    role = label.get('{http://www.w3.org/1999/xlink}role', '')
                    text = (label.text or '').strip()
                    if text and ('documentation' in role.lower() or 'doc' in role.lower()):
                        docs.append(text)

            if docs:
                # Deduplicate and join
                uniq = []
                for t in docs:
                    if t and t not in uniq:
                        uniq.append(t)
                return '\n\n'.join(uniq)
            return None
        except Exception as e:
            logger.error(f"Error reading documentation for {element_name}: {e}")
            return None

    @lru_cache(maxsize=1000)
    def get_presentation_related(self, element_name: str, direction: str = 'children', limit: int = 20) -> List[str]:
        """Return neighboring elements from the presentation linkbase.

        direction: 'children' looks at arcs from element -> children; 'parents' looks at arcs parent -> element
        """
        results: List[str] = []
        try:
            if not PRESENTATION_FILE.exists():
                return results
            tree = ET.parse(PRESENTATION_FILE)
            root = tree.getroot()

            target_suffix = f"#us-gaap_{element_name}"

            # Iterate each presentationLink independently
            for link in root.findall('.//link:presentationLink', NAMESPACES):
                # Build map of loc labels -> href for this link
                locs = {}
                for loc in link.findall('.//link:loc', NAMESPACES):
                    href = loc.get('{http://www.w3.org/1999/xlink}href', '')
                    label = loc.get('{http://www.w3.org/1999/xlink}label', '')
                    if label:
                        locs[label] = href

                # Find the loc label for our target element in this link
                target_labels = [lbl for (lbl, href) in locs.items() if href.endswith(target_suffix) or target_suffix in href]
                if not target_labels:
                    continue
                target_label = target_labels[0]

                # Collect neighbor labels via arcs
                neighbor_labels: List[str] = []
                for arc in link.findall('.//link:presentationArc', NAMESPACES):
                    frm = arc.get('{http://www.w3.org/1999/xlink}from', '')
                    to = arc.get('{http://www.w3.org/1999/xlink}to', '')
                    if direction == 'children' and frm == target_label:
                        neighbor_labels.append(to)
                    elif direction == 'parents' and to == target_label:
                        neighbor_labels.append(frm)

                # Map neighbor labels -> element names
                for lbl in neighbor_labels:
                    href = locs.get(lbl, '')
                    name = self._extract_element_name_from_href(href)
                    if name and name not in results:
                        results.append(name)
                        if len(results) >= limit:
                            return results

            return results
        except Exception as e:
            logger.error(f"Error reading presentation neighbors for {element_name}: {e}")
            return []

    def _extract_element_name_from_href(self, href: str) -> Optional[str]:
        if not href:
            return None
        # Typical forms: 'us-gaap-2025.xsd#us-gaap_ElementName' or '#us-gaap_ElementName'
        if '#us-gaap_' in href:
            tail = href.split('#us-gaap_')[-1]
            # Strip any fragment endings
            return tail.split('#')[0].split('/')[-1]
        return None

    def search_elements_advanced(self, keyword: str, account_type: Optional[str] = None, balance_type: Optional[str] = None, period_type: Optional[str] = None, limit: int = 25) -> List[Dict]:
        """Search with optional filters; returns element dicts with key fields."""
        base = self.search_elements(keyword, limit=limit * 2)
        out: List[Dict] = []
        for el in base:
            if balance_type and (el.get('balance_type') or '') != balance_type:
                continue
            if period_type and (el.get('period_type') or '') != period_type:
                continue
            # Optional keyword based filter for account_type using heuristic keywords
            if account_type:
                names = self.get_elements_for_account_type(account_type)
                if el.get('element_name') not in names:
                    # Keep if keyword match already; we can relax when exact
                    pass
            out.append({
                'element_name': el.get('element_name'),
                'standard_label': el.get('standard_label'),
                'primary_asc_topic': el.get('primary_asc_topic'),
                'balance_type': el.get('balance_type'),
                'period_type': el.get('period_type'),
                'documentation_snippet': (el.get('documentation') or '')[:240] if el.get('documentation') else None,
            })
            if len(out) >= limit:
                break
        return out

    @lru_cache(maxsize=500)
    def _get_asc_references(self, element_name: str) -> List[str]:
        """Get ASC topic references from reference linkbase"""
        try:
            tree = ET.parse(REFERENCE_FILE)
            root = tree.getroot()

            asc_refs = []
            target_href = f"#us-gaap_{element_name}"

            for loc in root.findall('.//link:loc', NAMESPACES):
                href = loc.get('{http://www.w3.org/1999/xlink}href', '')
                if target_href in href:
                    loc_label = loc.get('{http://www.w3.org/1999/xlink}label', '')

                    # Find reference arcs
                    for arc in root.findall('.//link:referenceArc', NAMESPACES):
                        if arc.get('{http://www.w3.org/1999/xlink}from') == loc_label:
                            to_ref = arc.get('{http://www.w3.org/1999/xlink}to')

                            # Find reference element
                            for ref in root.findall('.//link:reference', NAMESPACES):
                                if ref.get('{http://www.w3.org/1999/xlink}label') == to_ref:
                                    asc_ref = self._extract_asc_from_reference(ref)
                                    if asc_ref and asc_ref not in asc_refs:
                                        asc_refs.append(asc_ref)

            return asc_refs
        except Exception as e:
            logger.error(f"Error reading ASC references for {element_name}: {e}")
            return []

    def _extract_data_type(self, elem) -> str:
        """Extract and normalize data type"""
        type_attr = elem.get('type', '')

        if 'monetary' in type_attr.lower():
            return 'monetary'
        elif 'shares' in type_attr.lower():
            return 'shares'
        elif 'percent' in type_attr.lower():
            return 'percent'
        elif 'string' in type_attr.lower() or 'text' in type_attr.lower():
            return 'string'
        elif 'date' in type_attr.lower():
            return 'date'
        elif 'boolean' in type_attr.lower():
            return 'boolean'
        else:
            return type_attr.split(':')[-1] if ':' in type_attr else type_attr

    def _extract_asc_from_reference(self, ref_elem) -> Optional[str]:
        """Extract ASC reference string from reference element"""
        topic = None
        subtopic = None
        section = None
        paragraph = None

        for child in ref_elem:
            tag = child.tag.split('}')[-1].lower()
            text = child.text.strip() if child.text else None

            if not text:
                continue

            if 'topic' in tag and not subtopic:
                topic = text
            elif 'subtopic' in tag:
                subtopic = text
            elif 'section' in tag:
                section = text
            elif 'paragraph' in tag:
                paragraph = text

        if topic:
            ref = f"ASC {topic}"
            if subtopic:
                ref += f"-{subtopic}"
            if section:
                ref += f"-{section}"
            if paragraph:
                ref += f"-{paragraph}"
            return ref

        return None

    @lru_cache(maxsize=500)
    def _search_by_label(self, keyword: str, max_hits: int = 50) -> List[str]:
        """Return element names whose standard labels contain keyword (case-insensitive)."""
        kw = (keyword or '').strip().lower()
        if not kw:
            return []
        try:
            tree = ET.parse(LABEL_FILE)
            root = tree.getroot()

            # Build maps for quick joins
            locs: Dict[str, str] = {}
            labels: Dict[str, str] = {}
            for loc in root.findall('.//link:loc', NAMESPACES):
                lbl = loc.get('{http://www.w3.org/1999/xlink}label') or ''
                href = loc.get('{http://www.w3.org/1999/xlink}href') or ''
                if lbl and href:
                    locs[lbl] = href
            for lab in root.findall('.//link:label', NAMESPACES):
                lbl = lab.get('{http://www.w3.org/1999/xlink}label') or ''
                txt = (lab.text or '').strip()
                if lbl and txt:
                    labels[lbl] = txt

            results: List[str] = []
            for arc in root.findall('.//link:labelArc', NAMESPACES):
                frm = arc.get('{http://www.w3.org/1999/xlink}from') or ''
                to = arc.get('{http://www.w3.org/1999/xlink}to') or ''
                if not frm or not to:
                    continue
                txt = labels.get(to, '')
                if not txt:
                    continue
                if kw in txt.lower():
                    href = locs.get(frm, '')
                    name = self._extract_element_name_from_href(href)
                    if name and name not in results:
                        results.append(name)
                        if len(results) >= max_hits:
                            break
            return results
        except Exception as e:
            logger.error(f"Error label-search '{keyword}': {e}")
            return []

    def search_elements(self, keyword: str, limit: int = 20) -> List[Dict]:
        """
        Search for elements by keyword in name or label

        Args:
            keyword: Search term
            limit: Max results to return

        Returns:
            List of matching element dicts
        """
        keyword_lower = keyword.lower()
        results = []

        try:
            tree = ET.parse(SCHEMA_FILE)
            root = tree.getroot()

            for elem in root.findall('.//xs:element', NAMESPACES):
                name = elem.get('name', '')
                if not name:
                    continue

                # Skip abstract elements
                if elem.get('abstract') == 'true':
                    continue

                if keyword_lower in name.lower():
                    element_data = self.get_element(name)
                    if element_data:
                        results.append(element_data)

                        if len(results) >= limit:
                            break

            # If we still have room, supplement with label matches
            if len(results) < limit:
                label_names = self._search_by_label(keyword, max_hits=limit * 3)
                for nm in label_names:
                    if any(r.get('element_name') == nm for r in results):
                        continue
                    el = self.get_element(nm)
                    if el:
                        results.append(el)
                        if len(results) >= limit:
                            break

            return results
        except Exception as e:
            logger.error(f"Error searching elements for '{keyword}': {e}")
            return []

    def get_elements_for_account_type(self, account_type: str, balance_type: str = None) -> List[str]:
        """
        Get suggested XBRL elements for a given account type

        Args:
            account_type: Asset, Liability, Equity, Revenue, or Expense
            balance_type: debit or credit (optional filter)

        Returns:
            List of element names
        """
        suggestions = []

        # Predefined mappings for common account types
        mappings = {
            'Asset': ['Cash', 'Asset', 'Receivable', 'Inventory', 'Prepaid', 'Property', 'Equipment'],
            'Liability': ['Payable', 'Liability', 'Accrued', 'Debt', 'Deferred', 'Lease'],
            'Equity': ['Equity', 'Capital', 'Stock', 'Retained', 'Earnings', 'Partners'],
            'Revenue': ['Revenue', 'Sales', 'Income', 'Fees'],
            'Expense': ['Expense', 'Cost', 'Depreciation', 'Amortization', 'Interest']
        }

        keywords = mappings.get(account_type, [])

        for keyword in keywords:
            results = self.search_elements(keyword, limit=5)
            for result in results:
                # Filter by balance type if specified
                if balance_type and result['balance_type'] != balance_type:
                    continue

                if result['element_name'] not in suggestions:
                    suggestions.append(result['element_name'])

        return suggestions[:20]  # Return top 20

    def get_related_links(self, element_name: str) -> List[Dict[str, str]]:
        """Return helpful outbound links for further reading (no scraping)."""
        q = element_name
        links = [
            {
                "label": "FASB US GAAP Taxonomy search",
                "url": f"https://www.google.com/search?q=site:xbrl.fasb.org+{q}",
            },
            {
                "label": "SEC EDGAR XBRL concept search",
                "url": f"https://www.google.com/search?q=site:sec.gov+US+GAAP+{q}",
            },
        ]
        try:
            # Direct XSD fragment reference for tooling
            links.append({
                "label": "XSD fragment",
                "url": f"https://xbrl.fasb.org/us-gaap/2025/elts/us-gaap-2025.xsd#us-gaap_{q}",
            })
        except Exception:
            pass
        return links


# Global service instance
_xbrl_service = None

def get_xbrl_service() -> XBRLTaxonomyService:
    """Get or create global XBRL service instance"""
    global _xbrl_service
    if _xbrl_service is None:
        _xbrl_service = XBRLTaxonomyService()
    return _xbrl_service
