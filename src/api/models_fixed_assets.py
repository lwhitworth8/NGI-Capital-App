"""
Fixed Assets Models - ASC 360 Property, Plant & Equipment
Handles asset tracking, depreciation, and disposal
"""

from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from src.api.database import Base
from src.api.utils.datetime_utils import get_pst_now


class FixedAsset(Base):
    """
    Fixed Asset Register - ASC 360 Compliance
    Tracks all capitalized assets with depreciation calculations
    """
    __tablename__ = "fixed_assets"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False, index=True)
    
    # Asset identification
    asset_number = Column(String(50), unique=True, nullable=False, index=True)
    asset_name = Column(String(255), nullable=False)
    asset_category = Column(String(50), nullable=False)  # Computer Equipment, Furniture, Software, Leasehold Improvements, Machinery
    asset_description = Column(Text)
    
    # Acquisition details
    acquisition_date = Column(Date, nullable=False, index=True)
    acquisition_cost = Column(Numeric(15, 2), nullable=False)
    salvage_value = Column(Numeric(15, 2), default=0)
    placed_in_service_date = Column(Date)
    
    # Depreciation configuration
    useful_life_years = Column(Integer, nullable=False)
    useful_life_months = Column(Integer)  # Calculated from years
    depreciation_method = Column(String(50), default="Straight-Line")  # Straight-Line, Double-Declining, Units-of-Production
    
    # Depreciation tracking
    accumulated_depreciation = Column(Numeric(15, 2), default=0)
    net_book_value = Column(Numeric(15, 2))
    current_year_depreciation = Column(Numeric(15, 2), default=0)
    
    # Monthly depreciation tracking
    last_depreciation_date = Column(Date)
    months_depreciated = Column(Integer, default=0)
    
    # Asset status
    status = Column(String(50), default="In Service", index=True)  # In Service, Fully Depreciated, Disposed, Under Construction
    is_fully_depreciated = Column(Boolean, default=False)
    
    # Disposal information
    disposal_date = Column(Date)
    disposal_amount = Column(Numeric(15, 2))
    disposal_gain_loss = Column(Numeric(15, 2))
    disposal_notes = Column(Text)
    
    # Location and ownership
    location = Column(String(255))
    serial_number = Column(String(100))
    responsible_party = Column(String(255))
    
    # Document links
    purchase_document_id = Column(Integer, ForeignKey("accounting_documents.id"))
    purchase_journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"))
    
    # Auto-detection metadata
    auto_detected = Column(Boolean, default=False)
    detection_confidence = Column(Numeric(5, 2))  # 0-100%
    detection_metadata = Column(JSON)  # Keywords matched, vendor info, etc.
    
    # Audit trail
    created_at = Column(DateTime, default=get_pst_now, nullable=False)
    updated_at = Column(DateTime, default=get_pst_now, onupdate=get_pst_now, nullable=False)
    created_by_email = Column(String(255))
    
    # Relationships
    entity = relationship("AccountingEntity", backref="fixed_assets")
    purchase_document = relationship("AccountingDocument", foreign_keys=[purchase_document_id])
    depreciation_entries = relationship("DepreciationEntry", back_populates="asset", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<FixedAsset {self.asset_number}: {self.asset_name}>"


class DepreciationEntry(Base):
    """
    Monthly depreciation entry tracking
    Links to journal entries for each depreciation period
    """
    __tablename__ = "depreciation_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("fixed_assets.id"), nullable=False, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False)
    
    # Period information
    period_date = Column(Date, nullable=False, index=True)  # Last day of depreciation month
    period_month = Column(Integer, nullable=False)
    period_year = Column(Integer, nullable=False)
    
    # Depreciation amounts
    depreciation_amount = Column(Numeric(15, 2), nullable=False)
    accumulated_depreciation_before = Column(Numeric(15, 2))
    accumulated_depreciation_after = Column(Numeric(15, 2))
    net_book_value_after = Column(Numeric(15, 2))
    
    # Journal entry link
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"))
    
    # Status
    status = Column(String(50), default="draft")  # draft, approved, posted
    
    # Audit trail
    created_at = Column(DateTime, default=get_pst_now, nullable=False)
    created_by_email = Column(String(255))
    
    # Relationships
    asset = relationship("FixedAsset", back_populates="depreciation_entries")
    journal_entry = relationship("JournalEntry")
    
    def __repr__(self):
        return f"<DepreciationEntry Asset:{self.asset_id} Period:{self.period_year}-{self.period_month:02d}>"


class AssetDisposal(Base):
    """
    Asset disposal tracking
    Records when assets are sold, scrapped, or retired
    """
    __tablename__ = "asset_disposals"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("fixed_assets.id"), nullable=False, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False)
    
    # Disposal details
    disposal_date = Column(Date, nullable=False, index=True)
    disposal_type = Column(String(50), nullable=False)  # Sale, Scrap, Trade-In, Donation, Loss/Theft
    disposal_amount = Column(Numeric(15, 2), default=0)
    
    # Gain/Loss calculation
    original_cost = Column(Numeric(15, 2), nullable=False)
    accumulated_depreciation = Column(Numeric(15, 2), nullable=False)
    net_book_value = Column(Numeric(15, 2), nullable=False)
    gain_loss = Column(Numeric(15, 2))  # Positive = gain, Negative = loss
    
    # Buyer/recipient information
    buyer_name = Column(String(255))
    buyer_contact = Column(String(255))
    
    # Documentation
    disposal_notes = Column(Text)
    disposal_document_id = Column(Integer, ForeignKey("accounting_documents.id"))
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"))
    
    # Audit trail
    created_at = Column(DateTime, default=get_pst_now, nullable=False)
    created_by_email = Column(String(255))
    
    def __repr__(self):
        return f"<AssetDisposal Asset:{self.asset_id} Date:{self.disposal_date}>"


class AuditPackage(Base):
    """
    Generated audit packages for external auditors
    Tracks Big 4 audit package generation history
    """
    __tablename__ = "audit_packages"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("accounting_entities.id"), nullable=False, index=True)
    
    # Package details
    package_type = Column(String(50), nullable=False)  # Fixed Assets, Full Audit, Specific Period
    period_year = Column(Integer, nullable=False)
    period_start = Column(Date)
    period_end = Column(Date, nullable=False)
    
    # File information
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer)
    
    # Package contents metadata
    includes_asset_register = Column(Boolean, default=True)
    includes_depreciation_schedule = Column(Boolean, default=True)
    includes_roll_forward = Column(Boolean, default=True)
    includes_additions_schedule = Column(Boolean, default=True)
    includes_disposals_schedule = Column(Boolean, default=True)
    includes_supporting_docs = Column(Boolean, default=False)
    
    # Statistics
    total_assets_count = Column(Integer)
    total_original_cost = Column(Numeric(15, 2))
    total_accumulated_depreciation = Column(Numeric(15, 2))
    total_net_book_value = Column(Numeric(15, 2))
    
    # Audit trail
    generated_at = Column(DateTime, default=get_pst_now, nullable=False)
    generated_by_email = Column(String(255))
    notes = Column(Text)
    
    def __repr__(self):
        return f"<AuditPackage {self.package_type} {self.period_year}>"

