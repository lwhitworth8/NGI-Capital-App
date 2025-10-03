"""
Create 4 test projects for the NGI Capital Advisory platform.
Run this script to populate the database with sample projects for testing.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.api.database import get_db
from sqlalchemy.sql import text
from datetime import datetime
import json

def create_test_projects():
    db = next(get_db())
    
    # Project 1: UC Investments FY 2025-2026 Annual Fiscal Report
    project1 = {
        'project_name': 'UC Investments FY 2025-2026 Annual Fiscal Report',
        'client_name': 'UC Investments',
        'summary': 'Collaborative systemwide fiscal reporting for UC Investments covering all campuses.',
        'description': """This project simulates UC Investments' annual fiscal reporting process for FY 2025-2026. Students across the UC system (1-2 per campus) form a collaborative analyst cohort led by a central Project Lead.

Each student team performs diligence on their campus foundation's investment performance and reconciles those findings into the systemwide annual report.

The final deliverable is an investor-grade annual fiscal report supplement, complete with attribution tables, governance recommendations, and a Regents-style slide deck.

Applications should remain open until one cohort is filled, with strong preference for finance, economics, accounting, and data science majors.""",
        'status': 'active',
        'location_text': 'San Francisco, CA',
        'mode': 'hybrid',
        'duration_weeks': 12,
        'commitment_hours_per_week': 10,
        'team_size': 10,
        'is_public': 1,
        'allow_applications': 1
    }
    
    result1 = db.execute(text("""
        INSERT INTO advisory_projects 
        (project_name, client_name, summary, description, status, location_text, mode, 
         duration_weeks, commitment_hours_per_week, team_size, is_public, allow_applications, created_at, updated_at)
        VALUES 
        (:project_name, :client_name, :summary, :description, :status, :location_text, :mode,
         :duration_weeks, :commitment_hours_per_week, :team_size, :is_public, :allow_applications, datetime('now'), datetime('now'))
    """), project1)
    project1_id = result1.lastrowid
    
    # Application questions for Project 1
    questions1 = [
        (project1_id, 1, "What is your major and expected graduation date?"),
        (project1_id, 2, "Which UC campus are you representing?"),
        (project1_id, 3, "Describe your experience with financial analysis, investment reporting, or similar analytical work. Include coursework, internships, or relevant projects."),
        (project1_id, 4, "This project requires collaboration across multiple campuses. Describe a time when you successfully worked on a team project with distributed members. What was your role and contribution?"),
        (project1_id, 5, "What specific skills or perspectives would you bring to this systemwide fiscal reporting project?"),
    ]
    
    for pid, idx, prompt in questions1:
        db.execute(text("""
            INSERT INTO advisory_project_questions (project_id, idx, prompt, qtype)
            VALUES (:pid, :idx, :prompt, 'text')
        """), {'pid': pid, 'idx': idx, 'prompt': prompt})
    
    # Project 2: Liverpool FC Data Analytics & Machine Learning
    project2 = {
        'project_name': 'Liverpool FC Data Analytics & Machine Learning (Scouting & Player Understanding)',
        'client_name': 'Liverpool FC, Fenway Sports Group',
        'summary': 'Build ML models for player scouting and performance analysis using professional sports data.',
        'description': """This project models a professional sports analytics engagement leveraging Liverpool FC data (owned by UC Investments through Fenway Sports Group).

Students design a data pipeline and machine learning model to evaluate player performance, tactical fit, and scouting insights.

The scope includes feature engineering, training predictive models, and producing an interpretable ranking of potential recruits.

Deliverables include the ML pipeline, top prospect analysis, and an 'action memo' simulating recommendations for a professional scouting team.

Applications are open, targeted to computer science, data science, statistics, and applied math majors with machine learning experience.""",
        'status': 'active',
        'location_text': 'Remote',
        'mode': 'remote',
        'duration_weeks': 10,
        'commitment_hours_per_week': 12,
        'team_size': 6,
        'is_public': 1,
        'allow_applications': 1
    }
    
    result2 = db.execute(text("""
        INSERT INTO advisory_projects 
        (project_name, client_name, summary, description, status, location_text, mode, 
         duration_weeks, commitment_hours_per_week, team_size, is_public, allow_applications, created_at, updated_at)
        VALUES 
        (:project_name, :client_name, :summary, :description, :status, :location_text, :mode,
         :duration_weeks, :commitment_hours_per_week, :team_size, :is_public, :allow_applications, datetime('now'), datetime('now'))
    """), project2)
    project2_id = result2.lastrowid
    
    # Application questions for Project 2
    questions2 = [
        (project2_id, 1, "What is your major, year, and relevant technical coursework (machine learning, data science, statistics)?"),
        (project2_id, 2, "Describe your experience with machine learning frameworks (scikit-learn, TensorFlow, PyTorch, etc.) and provide examples of projects or coursework where you applied ML techniques."),
        (project2_id, 3, "Have you worked with sports analytics or performance data before? If so, describe your experience. If not, what attracts you to this application area?"),
        (project2_id, 4, "This project requires feature engineering from raw performance data. Walk us through how you would approach transforming player statistics into features useful for predicting future performance."),
        (project2_id, 5, "What programming languages and data tools are you most comfortable with (Python, R, SQL, etc.)? Rate your proficiency (beginner/intermediate/advanced)."),
    ]
    
    for pid, idx, prompt in questions2:
        db.execute(text("""
            INSERT INTO advisory_project_questions (project_id, idx, prompt, qtype)
            VALUES (:pid, :idx, :prompt, 'text')
        """), {'pid': pid, 'idx': idx, 'prompt': prompt})
    
    # Project 3: HFG Equity Research - CAVA Group (Closed)
    project3 = {
        'project_name': 'Haas Finance Group (HFG) Equity Research Report: CAVA Group, Inc. (NYSE: CAVA)',
        'client_name': 'Haas Finance Group',
        'summary': 'Institutional-quality equity research coverage of CAVA Group, a high-growth Mediterranean fast-casual restaurant chain.',
        'description': """This closed project demonstrates the Haas Finance Group's institutional-quality equity coverage of CAVA Group, Inc., a high-growth Mediterranean fast-casual chain.

The report analyzes unit economics, expansion strategy, macro risk factors, and valuation using DCF and comparable company analysis.

Students can no longer apply, but the final report and materials are published on the platform as a reference for investment research methodology.

Majors in finance, economics, or accounting would have been eligible.""",
        'status': 'closed',
        'location_text': 'Berkeley, CA',
        'mode': 'hybrid',
        'duration_weeks': 8,
        'commitment_hours_per_week': 15,
        'team_size': 4,
        'is_public': 1,
        'allow_applications': 0
    }
    
    result3 = db.execute(text("""
        INSERT INTO advisory_projects 
        (project_name, client_name, summary, description, status, location_text, mode, 
         duration_weeks, commitment_hours_per_week, team_size, is_public, allow_applications, created_at, updated_at)
        VALUES 
        (:project_name, :client_name, :summary, :description, :status, :location_text, :mode,
         :duration_weeks, :commitment_hours_per_week, :team_size, :is_public, :allow_applications, datetime('now'), datetime('now'))
    """), project3)
    project3_id = result3.lastrowid
    
    # Project 4: HFG Equity Research - Vail Resorts (Closed)
    project4 = {
        'project_name': 'Haas Finance Group (HFG) Equity Research Report: Vail Resorts, Inc. (NYSE: MTN)',
        'client_name': 'Haas Finance Group',
        'summary': 'Comprehensive equity research on Vail Resorts focusing on operational reset and resort economics.',
        'description': """This closed project captures HFG's coverage of Vail Resorts, Inc., focusing on the company's operational reset under returning management, cost pressures, and long-term resort economics.

The student team produced a full equity research report with scenario modeling around pass products, seasonality, and ancillary spend.

Applications are closed, but the final report remains accessible as a learning resource for students interested in the intersection of travel, leisure, and finance.""",
        'status': 'closed',
        'location_text': 'Berkeley, CA',
        'mode': 'hybrid',
        'duration_weeks': 8,
        'commitment_hours_per_week': 15,
        'team_size': 4,
        'is_public': 1,
        'allow_applications': 0
    }
    
    result4 = db.execute(text("""
        INSERT INTO advisory_projects 
        (project_name, client_name, summary, description, status, location_text, mode, 
         duration_weeks, commitment_hours_per_week, team_size, is_public, allow_applications, created_at, updated_at)
        VALUES 
        (:project_name, :client_name, :summary, :description, :status, :location_text, :mode,
         :duration_weeks, :commitment_hours_per_week, :team_size, :is_public, :allow_applications, datetime('now'), datetime('now'))
    """), project4)
    project4_id = result4.lastrowid
    
    db.commit()
    print("✅ Successfully created 4 test projects!")
    print(f"   Project 1 (ID {project1_id}): UC Investments FY 2025-2026 Annual Fiscal Report")
    print(f"   Project 2 (ID {project2_id}): Liverpool FC Data Analytics & Machine Learning")
    print(f"   Project 3 (ID {project3_id}): HFG Equity Research - CAVA Group (Closed)")
    print(f"   Project 4 (ID {project4_id}): HFG Equity Research - Vail Resorts (Closed)")
    print("\n🎉 Projects are ready for demos!")

if __name__ == "__main__":
    create_test_projects()
