#!/usr/bin/env python3
"""
Test script to generate random timesheet data for anurmamade@ngicapitaladvisory.com
Week: 10/6/2025 to 10/10/2025 (40 hours total)
Run this in the Docker dev container to create test data for approval workflow testing
"""

import requests
import json
import random
from datetime import datetime, timedelta
import sys
import os

# Configuration
API_BASE_URL = "http://backend:8001"  # Internal container service name
EMPLOYEE_EMAIL = "anurmamade@ngicapitaladvisory.com"  # Test employee
ENTITY_ID = 1  # Adjust based on your entity setup

def generate_random_time_blocks(total_hours=40, days=5):
    """
    Generate random time blocks for a work week
    Distributes hours across Monday-Friday with realistic work patterns
    """
    hours_per_day = total_hours / days
    time_blocks = []
    
    # Start with Monday (10/6/2025)
    start_date = datetime(2025, 10, 6)
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        date_str = current_date.strftime("%Y-%m-%d")
        
        # Generate 1-3 time blocks per day
        num_blocks = random.randint(1, 3)
        remaining_hours = hours_per_day
        
        for block_num in range(num_blocks):
            if remaining_hours <= 0:
                break
                
            # Calculate hours for this block
            if block_num == num_blocks - 1:
                # Last block gets remaining hours
                block_hours = remaining_hours
            else:
                # Random hours between 1-6, but leave some for other blocks
                max_hours = min(6, remaining_hours - (num_blocks - block_num - 1))
                block_hours = round(random.uniform(1, max_hours), 1)
            
            remaining_hours -= block_hours
            
            # Generate realistic start times
            if block_num == 0:
                # First block starts between 8-10 AM
                start_hour = random.randint(8, 10)
                start_minute = random.choice([0, 15, 30, 45])
            else:
                # Subsequent blocks start after previous block + break
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
            
            # Random project/team assignments
            projects = [
                "NGI Capital Advisory - Client Work",
                "NGI Capital Advisory - Internal Development", 
                "NGI Capital Advisory - Research",
                "NGI Capital Advisory - Training",
                "General"
            ]
            
            descriptions = [
                "Client consultation and project planning",
                "Software development and coding",
                "Data analysis and reporting",
                "Team meetings and collaboration",
                "Research and documentation",
                "Code review and testing",
                "System maintenance and updates",
                "Training and skill development"
            ]
            
            time_block = {
                "id": f"test-{date_str}-{block_num}",
                "startTime": start_time,
                "endTime": end_time,
                "project_team_id": f"proj-{random.randint(1, 5)}" if random.random() > 0.2 else "",
                "task_description": random.choice(descriptions),
                "hours": block_hours
            }
            
            time_blocks.append({
                "date": date_str,
                "timeBlocks": [time_block]
            })
    
    return time_blocks

def create_timesheet_entry(employee_id, entity_id, week_start, time_blocks):
    """Create a timesheet entry with time blocks"""
    
    # Calculate total hours
    total_hours = sum(
        sum(block["hours"] for block in day["timeBlocks"]) 
        for day in time_blocks
    )
    
    # Count worked days
    worked_days = len([day for day in time_blocks if day["timeBlocks"]])
    
    timesheet_data = {
        "entity_id": entity_id,
        "employee_id": employee_id,
        "pay_period_start": week_start,
        "pay_period_end": (datetime.strptime(week_start, "%Y-%m-%d") + timedelta(days=6)).strftime("%Y-%m-%d"),
        "total_hours": total_hours,
        "status": "draft",
        "entries_count": worked_days
    }
    
    return timesheet_data, time_blocks

def main():
    print("🚀 Generating test timesheet data for Anur...")
    print(f"📅 Week: 10/6/2025 to 10/10/2025")
    print(f"👤 Employee: {EMPLOYEE_EMAIL}")
    print(f"🏢 Entity ID: {ENTITY_ID}")
    print()
    
    try:
        # Step 1: Get employee ID
        print("1️⃣ Fetching employee data...")
        response = requests.get(f"{API_BASE_URL}/api/employees?entity_id={ENTITY_ID}")
        if response.status_code != 200:
            print(f"❌ Failed to fetch employees: {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        employees = response.json()
        employee = next((emp for emp in employees if emp.get("email") == EMPLOYEE_EMAIL), None)
        
        if not employee:
            print(f"❌ Employee {EMPLOYEE_EMAIL} not found!")
            print("Available employees:")
            for emp in employees:
                print(f"  - {emp.get('email')} (ID: {emp.get('id')})")
            return
        
        print(f"✅ Found Anur: {employee['name']} (ID: {employee['id']})")
        
        # Step 2: Generate time blocks
        print("2️⃣ Generating random time blocks...")
        time_blocks_data = generate_random_time_blocks(40, 5)  # 40 hours over 5 days
        
        # Step 3: Create timesheet
        print("3️⃣ Creating timesheet entry...")
        week_start = "2025-10-06"  # Monday
        timesheet_data, entries_data = create_timesheet_entry(
            employee['id'], 
            ENTITY_ID, 
            week_start, 
            time_blocks_data
        )
        
        # Create the timesheet
        response = requests.post(
            f"{API_BASE_URL}/api/timesheets",
            json=timesheet_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to create timesheet: {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        timesheet = response.json()
        timesheet_id = timesheet['id']
        print(f"✅ Created timesheet ID: {timesheet_id}")
        
        # Step 4: Add time block entries
        print("4️⃣ Adding time block entries...")
        
        for day_data in entries_data:
            date = day_data["date"]
            blocks = day_data["timeBlocks"]
            
            # Create entry for this day
            entry_data = {
                "entry_date": date,
                "hours": sum(block["hours"] for block in blocks),
                "notes": f"Generated test data - {len(blocks)} time blocks",
                "project_team_id": blocks[0]["project_team_id"] if blocks else "",
                "timeBlocks": blocks
            }
            
            response = requests.post(
                f"{API_BASE_URL}/api/timesheets/{timesheet_id}/entries",
                json={"entries": [entry_data]},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                print(f"❌ Failed to add entry for {date}: {response.status_code}")
                print(f"Response: {response.text}")
            else:
                print(f"  ✅ Added entry for {date}: {entry_data['hours']} hours")
        
        # Step 5: Submit timesheet for approval
        print("5️⃣ Submitting timesheet for approval...")
        response = requests.post(
            f"{API_BASE_URL}/api/timesheets/{timesheet_id}/submit",
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to submit timesheet: {response.status_code}")
            print(f"Response: {response.text}")
        else:
            print("✅ Timesheet submitted for approval!")
        
        print()
        print("🎉 Test data generation complete!")
        print(f"📊 Total hours: {timesheet_data['total_hours']}")
        print(f"📅 Period: {timesheet_data['pay_period_start']} to {timesheet_data['pay_period_end']}")
        print(f"📋 Status: {timesheet_data['status']}")
        print()
        print("🔍 You can now test the approval process in the UI!")
        print("   - Go to Employees > Timesheets > History")
        print("   - Look for Anur's timesheet for the week of 10/6/2025")
        print("   - Test the approval workflow as a team member")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API. Make sure the dev container is running!")
        print("   Try: docker-compose -f docker-compose.dev.yml up")
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
