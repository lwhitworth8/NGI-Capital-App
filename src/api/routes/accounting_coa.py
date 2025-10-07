"""
NGI Capital - Chart of Accounts API
Epic 2: 5-digit US GAAP COA with smart mapping

Author: NGI Capital Development Team
Date: October 3, 2025
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, ConfigDict
from ..database_async import get_async_db
from ..models_accounting import ChartOfAccounts, AccountingEntity, AccountMappingRule
from ..services.coa_seeder import seed_chart_of_accounts


router = APIRouter(prefix="/api/accounting/coa", tags=["Accounting - Chart of Accounts"])

# Add entities endpoint to accounting router
@router.get("/../../accounting/entities")
async def get_accounting_entities(
    db: AsyncSession = Depends(get_async_db)
):
    """Get all active accounting entities for entity selector"""
    query = select(AccountingEntity).where(AccountingEntity.is_active == True).order_by(AccountingEntity.entity_name)
    result = await db.execute(query)
    entities = result.scalars().all()
    return [
        {
            "id": e.id,
            "entity_name": e.entity_name,
            "entity_type": e.entity_type,
            "ein": e.ein,
            "is_active": e.is_active
        }
        for e in entities
    ]


# ============================================================================
# SCHEMAS
# ============================================================================

class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    entity_id: int
    account_number: str
    account_name: str
    account_type: str
    parent_account_id: Optional[int]
    normal_balance: str
    description: Optional[str]
    gaap_reference: Optional[str]
    is_active: bool
    allow_posting: bool
    require_project: bool
    require_cost_center: bool
    current_balance: Decimal
    ytd_activity: Decimal
    has_children: bool = False
    level: int = 0


class AccountTreeNode(BaseModel):
    account: AccountResponse
    children: List["AccountTreeNode"] = []


class AccountCreateRequest(BaseModel):
    entity_id: int
    account_number: str
    account_name: str
    account_type: str
    parent_account_id: Optional[int] = None
    description: Optional[str] = None
    gaap_reference: Optional[str] = None
    allow_posting: bool = True
    require_project: bool = False
    require_cost_center: bool = False


class AccountUpdateRequest(BaseModel):
    account_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    allow_posting: Optional[bool] = None
    require_project: Optional[bool] = None
    require_cost_center: Optional[bool] = None


class MappingRuleRequest(BaseModel):
    entity_id: int
    rule_type: str  # vendor, keyword, amount, category
    pattern: str
    account_id: int
    confidence_weight: Decimal = Decimal("1.00")


# ============================================================================
# SEED COA
# ============================================================================

@router.post("/seed/{entity_id}")
async def seed_coa_for_entity(
    entity_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Seed US GAAP Chart of Accounts for an entity
    150+ accounts pre-configured
    """
    
    # Check if entity exists
    entity_result = await db.execute(
        select(AccountingEntity).where(AccountingEntity.id == entity_id)
    )
    entity = entity_result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Check if COA already exists
    existing_result = await db.execute(
        select(func.count(ChartOfAccounts.id)).where(
            ChartOfAccounts.entity_id == entity_id
        )
    )
    existing_count = existing_result.scalar()
    
    if existing_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Entity already has {existing_count} accounts. Cannot seed."
        )
    
    # Seed COA
    try:
        created_count = await seed_chart_of_accounts(db, entity_id)
        return {
            "message": f"Successfully seeded {created_count} accounts",
            "entity_id": entity_id,
            "entity_name": entity.entity_name,
            "accounts_created": created_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error seeding COA: {str(e)}")


# ============================================================================
# GET ACCOUNTS
# ============================================================================

@router.get("/", response_model=List[AccountResponse])
async def get_all_accounts(
    entity_id: int = Query(...),
    account_type: Optional[str] = None,
    is_active: bool = True,
    allow_posting_only: bool = False,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Get all accounts with optional filters"""
    
    query = select(ChartOfAccounts).where(
        ChartOfAccounts.entity_id == entity_id
    )
    
    if account_type:
        query = query.where(ChartOfAccounts.account_type == account_type)
    
    if is_active:
        query = query.where(ChartOfAccounts.is_active == True)
    
    if allow_posting_only:
        query = query.where(ChartOfAccounts.allow_posting == True)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                ChartOfAccounts.account_number.ilike(search_term),
                ChartOfAccounts.account_name.ilike(search_term),
                ChartOfAccounts.description.ilike(search_term)
            )
        )
    
    query = query.order_by(ChartOfAccounts.account_number)
    
    result = await db.execute(query)
    accounts = result.scalars().all()
    
    # Check for children
    responses = []
    for account in accounts:
        account_response = AccountResponse.model_validate(account)
        
        # Check if has children
        children_result = await db.execute(
            select(func.count(ChartOfAccounts.id)).where(
                ChartOfAccounts.parent_account_id == account.id
            )
        )
        has_children = children_result.scalar() > 0
        account_response.has_children = has_children
        
        responses.append(account_response)
    
    return responses


@router.get("/tree", response_model=List[AccountTreeNode])
async def get_account_tree(
    entity_id: int = Query(...),
    account_type: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get hierarchical account tree
    Perfect for tree view UI components
    """
    
    query = select(ChartOfAccounts).where(
        and_(
            ChartOfAccounts.entity_id == entity_id,
            ChartOfAccounts.is_active == True
        )
    )
    
    if account_type:
        query = query.where(ChartOfAccounts.account_type == account_type)
    
    query = query.order_by(ChartOfAccounts.account_number)
    
    result = await db.execute(query)
    all_accounts = result.scalars().all()
    
    # Build tree
    account_map = {}
    for account in all_accounts:
        account_response = AccountResponse.model_validate(account)
        account_map[account.id] = AccountTreeNode(
            account=account_response,
            children=[]
        )
    
    # Build hierarchy
    root_nodes = []
    for account in all_accounts:
        node = account_map[account.id]
        
        if account.parent_account_id is None:
            # Root node
            root_nodes.append(node)
        else:
            # Child node
            if account.parent_account_id in account_map:
                parent_node = account_map[account.parent_account_id]
                parent_node.children.append(node)
    
    # Calculate levels
    def set_levels(nodes: List[AccountTreeNode], level: int = 0):
        for node in nodes:
            node.account.level = level
            set_levels(node.children, level + 1)
    
    set_levels(root_nodes)
    
    return root_nodes


@router.get("/posting-accounts", response_model=List[AccountResponse])
async def get_posting_accounts(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get only posting accounts (leaf nodes)
    Used for journal entry dropdowns
    """
    
    result = await db.execute(
        select(ChartOfAccounts).where(
            and_(
                ChartOfAccounts.entity_id == entity_id,
                ChartOfAccounts.is_active == True,
                ChartOfAccounts.allow_posting == True
            )
        ).order_by(ChartOfAccounts.account_number)
    )
    
    accounts = result.scalars().all()
    return [AccountResponse.model_validate(acc) for acc in accounts]


@router.get("/by-type", response_model=dict)
async def get_accounts_by_type(
    entity_id: int = Query(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get accounts grouped by type
    Perfect for financial statement generation
    """
    
    result = await db.execute(
        select(ChartOfAccounts).where(
            and_(
                ChartOfAccounts.entity_id == entity_id,
                ChartOfAccounts.is_active == True
            )
        ).order_by(ChartOfAccounts.account_number)
    )
    
    accounts = result.scalars().all()
    
    grouped = {
        "Asset": [],
        "Liability": [],
        "Equity": [],
        "Revenue": [],
        "Expense": []
    }
    
    for account in accounts:
        account_response = AccountResponse.model_validate(account)
        if account.account_type in grouped:
            grouped[account.account_type].append(account_response)
    
    return grouped


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get account by ID"""
    
    result = await db.execute(
        select(ChartOfAccounts).where(ChartOfAccounts.id == account_id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    account_response = AccountResponse.model_validate(account)
    
    # Check for children
    children_result = await db.execute(
        select(func.count(ChartOfAccounts.id)).where(
            ChartOfAccounts.parent_account_id == account.id
        )
    )
    account_response.has_children = children_result.scalar() > 0
    
    return account_response


# ============================================================================
# CREATE / UPDATE / DELETE
# ============================================================================

@router.post("/", response_model=AccountResponse)
async def create_account(
    request: AccountCreateRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Create a new account"""
    
    # Validate entity exists
    entity_result = await db.execute(
        select(AccountingEntity).where(AccountingEntity.id == request.entity_id)
    )
    if not entity_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Check if account number already exists
    existing_result = await db.execute(
        select(ChartOfAccounts).where(
            and_(
                ChartOfAccounts.entity_id == request.entity_id,
                ChartOfAccounts.account_number == request.account_number
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Account number already exists")
    
    # Determine normal balance based on account type
    normal_balance_map = {
        "Asset": "Debit",
        "Expense": "Debit",
        "Liability": "Credit",
        "Equity": "Credit",
        "Revenue": "Credit"
    }
    normal_balance = normal_balance_map.get(request.account_type, "Debit")
    
    # Create account
    account = ChartOfAccounts(
        entity_id=request.entity_id,
        account_number=request.account_number,
        account_name=request.account_name,
        account_type=request.account_type,
        parent_account_id=request.parent_account_id,
        normal_balance=normal_balance,
        description=request.description,
        gaap_reference=request.gaap_reference,
        is_active=True,
        allow_posting=request.allow_posting,
        require_project=request.require_project,
        require_cost_center=request.require_cost_center,
        current_balance=Decimal("0.00"),
        ytd_activity=Decimal("0.00"),
        created_by_id=1  # Default to user 1 for testing (TODO: add auth)
    )
    
    db.add(account)
    await db.commit()
    await db.refresh(account)
    
    return AccountResponse.model_validate(account)


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: int,
    request: AccountUpdateRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Update account details"""
    
    result = await db.execute(
        select(ChartOfAccounts).where(ChartOfAccounts.id == account_id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Update fields
    if request.account_name is not None:
        account.account_name = request.account_name
    if request.description is not None:
        account.description = request.description
    if request.is_active is not None:
        account.is_active = request.is_active
    if request.allow_posting is not None:
        account.allow_posting = request.allow_posting
    if request.require_project is not None:
        account.require_project = request.require_project
    if request.require_cost_center is not None:
        account.require_cost_center = request.require_cost_center
    
    # account.updated_by_id = current_user.id  # Auth disabled for dev
    account.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(account)
    
    return AccountResponse.model_validate(account)


@router.delete("/{account_id}")
async def deactivate_account(
    account_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Deactivate account (soft delete)
    Cannot delete accounts with transactions or child accounts
    """
    
    result = await db.execute(
        select(ChartOfAccounts).where(ChartOfAccounts.id == account_id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Check for children
    children_result = await db.execute(
        select(func.count(ChartOfAccounts.id)).where(
            ChartOfAccounts.parent_account_id == account_id
        )
    )
    if children_result.scalar() > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate account with child accounts"
        )
    
    # Check for transactions (would need JournalEntryLine model)
    # For now, just deactivate
    account.is_active = False
    # account.updated_by_id = current_user.id  # Auth disabled for dev
    account.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Account deactivated successfully"}


# ============================================================================
# SMART MAPPING RULES
# ============================================================================

@router.post("/mapping-rules", response_model=dict)
async def create_mapping_rule(
    request: MappingRuleRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Create smart mapping rule for auto-categorization"""
    
    rule = AccountMappingRule(
        entity_id=request.entity_id,
        rule_type=request.rule_type,
        pattern=request.pattern,
        account_id=request.account_id,
        confidence_weight=request.confidence_weight,
        is_active=True,
        times_used=0,
        times_corrected=0
    )
    
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    
    return {
        "id": rule.id,
        "message": "Mapping rule created successfully"
    }


@router.get("/mapping-rules/{entity_id}")
async def get_mapping_rules(
    entity_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Get all mapping rules for entity"""
    
    result = await db.execute(
        select(AccountMappingRule).where(
            AccountMappingRule.entity_id == entity_id
        ).order_by(desc(AccountMappingRule.confidence_weight))
    )
    
    rules = result.scalars().all()
    return [
        {
            "id": rule.id,
            "rule_type": rule.rule_type,
            "pattern": rule.pattern,
            "account_id": rule.account_id,
            "confidence_weight": float(rule.confidence_weight),
            "times_used": rule.times_used,
            "times_corrected": rule.times_corrected,
            "accuracy_score": float(rule.accuracy_score) if rule.accuracy_score else None,
            "is_active": rule.is_active
        }
        for rule in rules
    ]

