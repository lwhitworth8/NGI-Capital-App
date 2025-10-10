"""
Test 01: PST Timezone Handling
Tests that all datetime operations use PST timezone consistently
"""

import pytest
from datetime import datetime, date, timedelta
import pytz
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.api.utils.datetime_utils import (
    get_pst_now, convert_to_pst, pst_date_only, pst_to_string, PST
)
from src.api.models_accounting import JournalEntry, AccountingEntity

class TestPSTTimezone:
    """Test PST timezone implementation"""
    
    def test_pst_timezone_constant(self):
        """Test PST timezone constant is correctly defined"""
        assert PST == pytz.timezone('America/Los_Angeles')
        assert str(PST) == 'America/Los_Angeles'
    
    def test_get_pst_now(self):
        """Test get_pst_now returns current PST datetime"""
        now_pst = get_pst_now()
        
        # Should be timezone aware
        assert now_pst.tzinfo is not None
        assert now_pst.tzinfo.zone == 'America/Los_Angeles'
        
        # Should be close to current time (within 1 second)
        utc_now = datetime.now(pytz.UTC)
        pst_now_utc = now_pst.astimezone(pytz.UTC)
        time_diff = abs((utc_now - pst_now_utc).total_seconds())
        assert time_diff < 1.0
    
    def test_convert_to_pst_naive_datetime(self):
        """Test converting naive datetime to PST"""
        naive_dt = datetime(2025, 10, 10, 15, 30, 0)  # 3:30 PM naive
        pst_dt = convert_to_pst(naive_dt)
        
        assert pst_dt.tzinfo is not None
        assert pst_dt.tzinfo.zone == 'America/Los_Angeles'
        # Should be 8 hours behind UTC (PST) or 7 hours (PDT)
        assert pst_dt.hour == 8  # 3:30 PM - 7 hours = 8:30 AM PDT
        assert pst_dt.minute == 30
    
    def test_convert_to_pst_utc_datetime(self):
        """Test converting UTC datetime to PST"""
        utc_dt = datetime(2025, 10, 10, 23, 30, 0, tzinfo=pytz.UTC)  # 11:30 PM UTC
        pst_dt = convert_to_pst(utc_dt)
        
        assert pst_dt.tzinfo is not None
        assert pst_dt.tzinfo.zone == 'America/Los_Angeles'
        assert pst_dt.hour == 16  # 4:30 PM PDT
        assert pst_dt.minute == 30
    
    def test_pst_date_only(self):
        """Test pst_date_only returns correct date without time"""
        dt_utc = datetime(2025, 10, 11, 2, 0, 0, tzinfo=pytz.UTC)  # 2 AM UTC on Oct 11
        pst_date = pst_date_only(dt_utc)
        
        # 2 AM UTC on Oct 11 is 7 PM PST on Oct 10
        assert pst_date == date(2025, 10, 10)
    
    def test_pst_to_string_default_format(self):
        """Test pst_to_string with default format"""
        dt_utc = datetime(2025, 10, 10, 10, 0, 0, tzinfo=pytz.UTC)
        pst_str = pst_to_string(dt_utc)
        
        # 10 AM UTC is 3 AM PDT
        assert pst_str.startswith("2025-10-10 03:00:00")
    
    def test_pst_to_string_custom_format(self):
        """Test pst_to_string with custom format"""
        dt_naive = datetime(2025, 10, 10, 14, 0, 0) # 2 PM naive
        pst_str = pst_to_string(dt_naive, format='%Y/%m/%d %I:%M %p %Z%z')
        
        # 2 PM naive is 7 AM PDT
        assert "2025/10/10 07:00 AM PDT-0700" in pst_str
    
    def test_dst_handling(self):
        """Test that DST changes are handled correctly"""
        # Before DST ends (Nov 2, 2025)
        dt_before_dst_end_utc = datetime(2025, 11, 2, 1, 0, 0, tzinfo=pytz.UTC) # 1 AM UTC Nov 2
        pst_before_dst_end = convert_to_pst(dt_before_dst_end_utc)
        assert pst_before_dst_end.tzinfo.zone == 'America/Los_Angeles'
        assert pst_before_dst_end.strftime('%Z%z') == 'PDT-0700' # Still PDT
        
        # After DST ends (Nov 2, 2025, 2 AM PDT becomes 1 AM PST)
        dt_after_dst_end_utc = datetime(2025, 11, 2, 10, 0, 0, tzinfo=pytz.UTC) # 10 AM UTC Nov 2
        pst_after_dst_end = convert_to_pst(dt_after_dst_end_utc)
        assert pst_after_dst_end.tzinfo.zone == 'America/Los_Angeles'
        assert pst_after_dst_end.strftime('%Z%z') == 'PST-0800' # Now PST
    
    @pytest.mark.asyncio
    async def test_timezone_consistency_across_models(self, db_connection):
        """Test that model creation and retrieval respects PST"""
        cursor = db_connection.cursor()
        
        # Insert test entity directly into SQLite
        cursor.execute("""
            INSERT INTO accounting_entities 
            (entity_name, entity_type, ein, formation_date, entity_status, is_available, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, ("Test Entity for Timezone", "LLC", "99-9999998", "2025-01-01", "active", 1))
        
        entity_id = cursor.lastrowid
        
        # Insert test journal entry
        cursor.execute("""
            INSERT INTO journal_entries 
            (entity_id, entry_date, fiscal_year, fiscal_period, entry_type, memo, created_by_email, entry_number, status, workflow_stage, created_by_id, is_reversing, is_recurring, is_locked, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (entity_id, "2025-10-10", 2025, 10, "Test", "Timezone test JE", "test@example.com", "JE-001", "draft", 1, 1, 0, 0, 0))
        
        je_id = cursor.lastrowid
        db_connection.commit()
        
        # Test that we can retrieve the data
        cursor.execute("SELECT * FROM accounting_entities WHERE id = ?", (entity_id,))
        entity_data = cursor.fetchone()
        assert entity_data is not None
        
        cursor.execute("SELECT * FROM journal_entries WHERE id = ?", (je_id,))
        je_data = cursor.fetchone()
        assert je_data is not None
        
        # Test PST conversion
        pst_now = get_pst_now()
        assert pst_now.tzinfo is not None
        assert pst_now.tzinfo.zone == 'America/Los_Angeles'
        
        # Test that we can convert stored timestamps to PST
        if entity_data['created_at']:
            # Convert string timestamp to datetime and then to PST
            from datetime import datetime
            entity_created = datetime.fromisoformat(entity_data['created_at'].replace('Z', '+00:00'))
            pst_entity_created = convert_to_pst(entity_created)
            assert pst_entity_created.tzinfo is not None
            assert pst_entity_created.tzinfo.zone == 'America/Los_Angeles'
        
        # Clean up
        cursor.execute("DELETE FROM journal_entries WHERE id = ?", (je_id,))
        cursor.execute("DELETE FROM accounting_entities WHERE id = ?", (entity_id,))
        db_connection.commit()