"""
Test timesheet workflow for approval process
Creates test data for anurmamade@ngicapitaladvisory.com
"""

import pytest
import requests
import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Test configuration
EMPLOYEE_EMAIL = "anurmamade@ngicapitaladvisory.com"
ENTITY_ID = 1
API_BASE_URL = "http://backend:8001"

class TestTimesheetWorkflow:
    """Test timesheet creation and approval workflow"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Setup test data before each test"""
        self.employee_email = EMPLOYEE_EMAIL
        self.entity_id = ENTITY_ID
        self.week_start = "2025-10-06"  # Monday 10/6/2025
        self.week_end = "2025-10-10"    # Friday 10/10/2025
        
    def generate_realistic_time_blocks(self, total_hours: float = 40.0) -> List[Dict[str, Any]]:
        """Generate realistic time blocks for a work week"""
        time_blocks = []
        
        # Start with Monday (10/6/2025)
        start_date = datetime(2025, 10, 6)
        
        # Distribute hours across 5 work days
        hours_per_day = total_hours / 5
        
        for day in range(5):
            current_date = start_date + timedelta(days=day)
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Generate 1-3 time blocks per day
            num_blocks = random.randint(1, 3)
            remaining_hours = hours_per_day
            
            day_blocks = []
            
            for block_num in range(num_blocks):
                if remaining_hours <= 0:
                    break
                    
                # Calculate hours for this block
                if block_num == num_blocks - 1:
                    block_hours = round(remaining_hours, 1)
                else:
                    max_hours = min(6, remaining_hours - (num_blocks - block_num - 1))
                    block_hours = round(random.uniform(1, max_hours), 1)
                
                remaining_hours -= block_hours
                
                # Generate realistic start times
                if block_num == 0:
                    start_hour = random.randint(8, 10)
                    start_minute = random.choice([0, 15, 30, 45])
                else:
                    start_hour = random.randint(10, 16)
                    start_minute = random.choice([0, 15, 30, 45])
                
                start_time = f"{start_hour:02d}:{start_minute:02d}"
                
                # Calculate end time
                end_hour = start_hour + int(block_hours)
                end_minute = start_minute + int((block_hours % 1) * 60)
                if end_minute >= 60:
                    end_hour += 1
                    end_minute -= 60
                
                end_time = f"{end_hour:02d}:{end_minute:02d}"
                
                # Random project assignments
                projects = [
                    "NGI Capital Advisory - Client Work",
                    "NGI Capital Advisory - Internal Development", 
                    "NGI Capital Advisory - Research",
                    "NGI Capital Advisory - Training"
                ]
                
                descriptions = [
                    "Client consultation and project planning",
                    "Software development and coding",
                    "Data analysis and reporting",
                    "Team meetings and collaboration",
                    "Research and documentation",
                    "Code review and testing",
                    "System maintenance and updates"
                ]
                
                time_block = {
                    "id": f"test-{date_str}-{block_num}",
                    "startTime": start_time,
                    "endTime": end_time,
                    "project_team_id": f"proj-{random.randint(1, 4)}" if random.random() > 0.2 else "",
                    "task_description": random.choice(descriptions),
                    "hours": block_hours
                }
                
                day_blocks.append(time_block)
            
            time_blocks.append({
                "date": date_str,
                "timeBlocks": day_blocks
            })
        
        return time_blocks
    
    def test_create_employee_timesheet(self):
        """Test creating a timesheet for anurmamade@ngicapitaladvisory.com"""
        
        # Step 1: Get employee data
        response = requests.get(f"{API_BASE_URL}/api/employees")
        assert response.status_code == 200, f"Failed to fetch employees: {response.status_code}"
        
        employees = response.json()
        employee = next((emp for emp in employees if emp.get("email") == self.employee_email), None)
        
        assert employee is not None, f"Employee {self.employee_email} not found!"
        print(f"✅ Found employee: {employee['first_name']} {employee['last_name']} (ID: {employee['id']})")
        
        # Step 2: Generate time blocks
        time_blocks_data = self.generate_realistic_time_blocks(40.0)
        
        # Calculate total hours
        total_hours = sum(
            sum(block["hours"] for block in day["timeBlocks"]) 
            for day in time_blocks_data
        )
        
        worked_days = len([day for day in time_blocks_data if day["timeBlocks"]])
        
        print(f"📊 Generated {len(time_blocks_data)} days with {total_hours} total hours")
        
        # Step 3: Create timesheet
        timesheet_data = {
            "entity_id": self.entity_id,
            "employee_id": employee['id'],
            "pay_period_start": self.week_start,
            "pay_period_end": self.week_end,
            "total_hours": total_hours,
            "status": "draft",
            "entries_count": worked_days
        }
        
        response = requests.post(
            f"{API_BASE_URL}/api/timesheets",
            json=timesheet_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Failed to create timesheet: {response.status_code} - {response.text}"
        
        timesheet = response.json()
        timesheet_id = timesheet['id']
        print(f"✅ Created timesheet ID: {timesheet_id}")
        
        # Step 4: Add time block entries
        for day_data in time_blocks_data:
            date = day_data["date"]
            blocks = day_data["timeBlocks"]
            
            if not blocks:
                continue
                
            entry_data = {
                "entry_date": date,
                "hours": sum(block["hours"] for block in blocks),
                "notes": f"Test timesheet data - {len(blocks)} time blocks",
                "project_team_id": blocks[0]["project_team_id"] if blocks else "",
                "timeBlocks": blocks
            }
            
            response = requests.post(
                f"{API_BASE_URL}/api/timesheets/{timesheet_id}/entries",
                json={"entries": [entry_data]},
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 200, f"Failed to add entry for {date}: {response.status_code} - {response.text}"
            print(f"  ✅ Added entry for {date}: {entry_data['hours']} hours")
        
        # Step 5: Submit timesheet for approval
        response = requests.post(
            f"{API_BASE_URL}/api/timesheets/{timesheet_id}/submit",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Failed to submit timesheet: {response.status_code} - {response.text}"
        print("✅ Timesheet submitted for approval!")
        
        # Step 6: Verify timesheet is in pending status
        response = requests.get(f"{API_BASE_URL}/api/timesheets/{timesheet_id}")
        assert response.status_code == 200, f"Failed to fetch timesheet: {response.status_code}"
        
        submitted_timesheet = response.json()
        assert submitted_timesheet['status'] == 'pending', f"Expected status 'pending', got '{submitted_timesheet['status']}'"
        
        print(f"🎉 Test completed successfully!")
        print(f"📊 Timesheet ID: {timesheet_id}")
        print(f"📅 Period: {self.week_start} to {self.week_end}")
        print(f"👤 Employee: {self.employee_email}")
        print(f"⏰ Total Hours: {total_hours}")
        print(f"📋 Status: {submitted_timesheet['status']}")
        print()
        print("🔍 You can now test the approval process in the UI:")
        print("   1. Go to Employees > Timesheets > History")
        print("   2. Look for Anur's timesheet for the week of 10/6/2025")
        print("   3. Test the approval workflow as a team member")
        
        return timesheet_id

    def test_timesheet_approval_workflow(self):
        """Test the timesheet approval workflow"""
        
        # First create a timesheet
        timesheet_id = self.test_create_employee_timesheet()
        
        # Test fetching timesheets for approval
        response = requests.get(f"{API_BASE_URL}/api/timesheets?status=pending")
        assert response.status_code == 200, f"Failed to fetch pending timesheets: {response.status_code}"
        
        pending_timesheets = response.json()
        assert len(pending_timesheets) > 0, "No pending timesheets found"
        
        # Find our test timesheet
        test_timesheet = next((ts for ts in pending_timesheets if ts['id'] == timesheet_id), None)
        assert test_timesheet is not None, "Test timesheet not found in pending list"
        
        print(f"✅ Found pending timesheet: {test_timesheet['employee_name']} - {test_timesheet['pay_period_start']}")
        
        # Test approval (this would normally be done by a team member)
        # For testing purposes, we'll just verify the timesheet exists and is pending
        assert test_timesheet['status'] == 'pending', f"Expected status 'pending', got '{test_timesheet['status']}'"
        
        print("✅ Timesheet approval workflow test completed!")
        print("   The timesheet is ready for manual approval testing in the UI")

if __name__ == "__main__":
    # Run the test directly
    test_instance = TestTimesheetWorkflow()
    test_instance.setup_test_data()
    test_instance.test_create_employee_timesheet()
