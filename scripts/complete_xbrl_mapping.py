#!/usr/bin/env python3
"""
Complete XBRL Mapping for All Parent Accounts
Maps all 42 parent accounts to appropriate XBRL elements per US GAAP Taxonomy 2025
"""
import sys
import os
sys.path.insert(0, os.path.abspath('.'))
sys.stdout.reconfigure(encoding='utf-8')

import sqlite3

def map_xbrl_to_all_accounts():
    """Add XBRL mappings to all parent accounts across all entities"""

    # XBRL mappings for parent accounts (account_number -> (xbrl_element, asc_topic))
    parent_xbrl_mappings = {
        # CURRENT ASSETS
        '10000': ('AssetsCurrent', 'ASC 210-10'),
        '10100': ('CashAndCashEquivalentsAtCarryingValue', 'ASC 210-10'),
        '10300': ('AccountsReceivableNetCurrent', 'ASC 310-10'),
        '10400': ('ContractWithCustomerAssetNetCurrent', 'ASC 606-10'),
        '10500': ('PrepaidExpenseCurrent', 'ASC 210-10'),
        '10900': ('OtherAssetsCurrent', 'ASC 210-10'),

        # NON-CURRENT ASSETS
        '15000': ('AssetsNoncurrent', 'ASC 210-10'),
        '15100': ('PropertyPlantAndEquipmentNet', 'ASC 360-10'),
        '15200': ('IntangibleAssetsNetExcludingGoodwill', 'ASC 350-30'),
        '15300': ('OperatingLeaseRightOfUseAsset', 'ASC 842-20'),
        '15400': ('InvestmentsAndOtherNoncurrentAssets', 'ASC 320-10'),
        '15900': ('OtherAssetsNoncurrent', 'ASC 210-10'),

        # CURRENT LIABILITIES
        '20000': ('LiabilitiesCurrent', 'ASC 210-10'),
        '20100': ('AccountsPayableCurrent', 'ASC 210-10'),
        '20200': ('AccruedLiabilitiesCurrent', 'ASC 210-10'),
        '20300': ('ContractWithCustomerLiabilityCurrent', 'ASC 606-10'),
        '20400': ('ShortTermBorrowings', 'ASC 470-10'),
        '20500': ('OperatingLeaseLiabilityCurrent', 'ASC 842-20'),
        '20600': ('EmployeeRelatedLiabilitiesCurrent', 'ASC 710-10'),

        # NON-CURRENT LIABILITIES
        '25000': ('LiabilitiesNoncurrent', 'ASC 210-10'),
        '25100': ('LongTermDebtNoncurrent', 'ASC 470-10'),
        '25200': ('OperatingLeaseLiabilityNoncurrent', 'ASC 842-20'),

        # EQUITY
        '30000': ('StockholdersEquity', 'ASC 505-10'),
        '30100': ('CommonStockValue', 'ASC 505-10'),
        '30200': ('AdditionalPaidInCapitalCommonStock', 'ASC 505-10'),
        '30300': ('RetainedEarningsAccumulatedDeficit', 'ASC 505-10'),
        '30400': ('AccumulatedOtherComprehensiveIncomeLossNetOfTax', 'ASC 220-10'),
        '30500': ('PartnersCapital', 'ASC 272-10'),

        # REVENUE
        '40000': ('Revenues', 'ASC 606-10'),
        '40100': ('RevenueFromContractWithCustomerExcludingAssessedTax', 'ASC 606-10'),
        '40200': ('InvestmentIncomeInterestAndDividend', 'ASC 320-10'),

        # COST OF REVENUE
        '50000': ('CostOfRevenue', 'ASC 606-10'),

        # OPERATING EXPENSES
        '60000': ('OperatingExpenses', 'ASC 720-10'),
        '60100': ('LaborAndRelatedExpense', 'ASC 710-10'),
        '60200': ('GeneralAndAdministrativeExpense', 'ASC 720-10'),
        '60300': ('OccupancyNet', 'ASC 720-10'),
        '60400': ('ProfessionalFees', 'ASC 720-10'),
        '60500': ('SellingAndMarketingExpense', 'ASC 720-10'),
        '60600': ('GeneralAndAdministrativeExpense', 'ASC 720-10'),
        '60700': ('DepreciationDepletionAndAmortization', 'ASC 360-10'),

        # OTHER INCOME/EXPENSE
        '70000': ('NonoperatingIncomeExpense', 'ASC 225-10'),

        # INCOME TAX
        '80000': ('IncomeTaxExpenseBenefit', 'ASC 740-10')
    }

    conn = sqlite3.connect('./data/ngi_capital.db')
    cursor = conn.cursor()

    try:
        # Get all entities
        cursor.execute('SELECT id, entity_name FROM accounting_entities ORDER BY id')
        entities = cursor.fetchall()

        print('=' * 100)
        print('COMPLETING XBRL MAPPINGS FOR ALL ENTITIES')
        print('=' * 100)

        total_updated = 0

        for entity_id, entity_name in entities:
            print(f'\n[{entity_name}] Entity {entity_id}')
            print('-' * 100)

            entity_updated = 0

            for account_number, (xbrl_element, asc_topic) in parent_xbrl_mappings.items():
                # Check if account exists
                cursor.execute('''
                    SELECT id, account_name, xbrl_element_name
                    FROM chart_of_accounts
                    WHERE entity_id = ? AND account_number = ?
                ''', (entity_id, account_number))

                result = cursor.fetchone()
                if not result:
                    continue

                account_id, account_name, existing_xbrl = result

                # Skip if already has XBRL mapping
                if existing_xbrl:
                    continue

                # Update XBRL mapping
                cursor.execute('''
                    UPDATE chart_of_accounts
                    SET xbrl_element_name = ?,
                        primary_asc_topic = ?
                    WHERE id = ?
                ''', (xbrl_element, asc_topic, account_id))

                if cursor.rowcount > 0:
                    print(f'   [OK] {account_number} {account_name:45} -> {xbrl_element}')
                    entity_updated += 1

            total_updated += entity_updated
            print(f'   [{entity_name}] Updated: {entity_updated} accounts')

        conn.commit()

        # VERIFICATION
        print('\n' + '=' * 100)
        print('VERIFICATION - XBRL COVERAGE BY ENTITY')
        print('=' * 100)

        for entity_id, entity_name in entities:
            # Total accounts
            cursor.execute('''
                SELECT COUNT(*) FROM chart_of_accounts WHERE entity_id = ?
            ''', (entity_id,))
            total = cursor.fetchone()[0]

            # Accounts with XBRL
            cursor.execute('''
                SELECT COUNT(*) FROM chart_of_accounts
                WHERE entity_id = ? AND xbrl_element_name IS NOT NULL AND xbrl_element_name != ''
            ''', (entity_id,))
            with_xbrl = cursor.fetchone()[0]

            coverage = (with_xbrl / total * 100) if total > 0 else 0

            print(f'\n[{entity_name}]')
            print(f'   Total Accounts:     {total}')
            print(f'   With XBRL:          {with_xbrl}')
            print(f'   Coverage:           {coverage:.1f}%')

            if coverage < 100:
                # List remaining unmapped accounts
                cursor.execute('''
                    SELECT account_number, account_name
                    FROM chart_of_accounts
                    WHERE entity_id = ? AND (xbrl_element_name IS NULL OR xbrl_element_name = '')
                    ORDER BY account_number
                ''', (entity_id,))
                unmapped = cursor.fetchall()

                if unmapped:
                    print(f'   [WARNING] {len(unmapped)} accounts still unmapped:')
                    for acc in unmapped[:5]:  # Show first 5
                        print(f'      - {acc[0]} {acc[1]}')
                    if len(unmapped) > 5:
                        print(f'      ... and {len(unmapped) - 5} more')

        print('\n' + '=' * 100)
        if total_updated > 0:
            print(f'[SUCCESS] Updated {total_updated} parent accounts with XBRL mappings')
        else:
            print('[INFO] All accounts already have XBRL mappings')
        print('=' * 100)

        return True

    except Exception as e:
        print(f'\n[ERROR] {e}')
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = map_xbrl_to_all_accounts()
    if not success:
        sys.exit(1)
