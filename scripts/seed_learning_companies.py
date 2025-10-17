"""
Seed script for Learning Module: 10 Curated Companies
Populates learning_companies table with initial data
Following specifications from MarkdownFiles/NGILearning/PRD.NGILearningModule.md
"""

import sys
import os

# Add parent directory to path to import from src
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.api.database import get_db, _ensure_engine
from services.api.models import Base
from services.api.models_learning import LearningCompany
from datetime import datetime


# 10 Curated Companies as specified in PRD Section 5
CURATED_COMPANIES = [
    {
        "ticker": "BUD",
        "company_name": "Anheuser-Busch InBev SA/NV",
        "industry": "Beverages",
        "sub_industry": "Alcoholic Beverages",
        "description": "World's largest brewer with brands like Budweiser, Stella Artois, and Corona. Clean quantity x price modeling with hectoliter volume and price/mix by region/brand.",
        "headquarters": "Leuven, Belgium",
        "fiscal_year_end": "December 31",
        "sec_cik": "0001774359",
        "ir_website_url": "https://www.ab-inbev.com/investors",
        "revenue_model_type": "QxP",
        "revenue_driver_notes": "Q = Hectoliters (hl) volume by region/brand; P = Net revenue per hl (price/mix); Detailed geographic breakdown (Americas, EMEA, Asia Pacific)",
        "data_quality_score": 9,
        "is_active": True
    },
    {
        "ticker": "COST",
        "company_name": "Costco Wholesale Corporation",
        "industry": "Retail",
        "sub_industry": "Warehouse Clubs & Supercenters",
        "description": "Membership-based warehouse club with membership fees as primary profit driver. Clear Q x P modeling with transactions/traffic and average ticket.",
        "headquarters": "Issaquah, Washington",
        "fiscal_year_end": "August 31",
        "sec_cik": "0000909832",
        "ir_website_url": "https://investor.costco.com",
        "revenue_model_type": "QxP",
        "revenue_driver_notes": "Q = Number of transactions (traffic x conversion) or customer visits; P = Average ticket (basket size); Membership counts/renewals as separate driver (high margin)",
        "data_quality_score": 10,
        "is_active": True
    },
    {
        "ticker": "SHOP",
        "company_name": "Shopify Inc.",
        "industry": "Technology",
        "sub_industry": "E-commerce Platform",
        "description": "E-commerce platform enabling online stores. Platform model with GMV-based take-rate plus subscription revenue.",
        "headquarters": "Ottawa, Canada",
        "fiscal_year_end": "December 31",
        "sec_cik": "0001594805",
        "ir_website_url": "https://investors.shopify.com",
        "revenue_model_type": "QxPxT",
        "revenue_driver_notes": "Q = GMV (Gross Merchandise Volume) and subscription merchants; P = Take-rate on GMV (payment processing, shipping, etc.); Subscription ARPU separate stream",
        "data_quality_score": 9,
        "is_active": True
    },
    {
        "ticker": "TSLA",
        "company_name": "Tesla, Inc.",
        "industry": "Automotive",
        "sub_industry": "Electric Vehicles",
        "description": "Electric vehicle manufacturer with energy generation and storage. Clean Q x P modeling with deliveries by model and average selling price.",
        "headquarters": "Austin, Texas",
        "fiscal_year_end": "December 31",
        "sec_cik": "0001318605",
        "ir_website_url": "https://ir.tesla.com",
        "revenue_model_type": "QxP",
        "revenue_driver_notes": "Q = Vehicle deliveries by model (Model 3/Y, Model S/X, Cybertruck); P = Average Selling Price (ASP) by model; Energy generation/storage optional",
        "data_quality_score": 10,
        "is_active": True
    },
    {
        "ticker": "UBER",
        "company_name": "Uber Technologies, Inc.",
        "industry": "Technology",
        "sub_industry": "Ride-Sharing Platform",
        "description": "Mobility and delivery platform with take-rate revenue model. Clear Q x P x T with trips/bookings, average fare, and take-rate.",
        "headquarters": "San Francisco, California",
        "fiscal_year_end": "December 31",
        "sec_cik": "0001543151",
        "ir_website_url": "https://investor.uber.com",
        "revenue_model_type": "QxPxT",
        "revenue_driver_notes": "Q = Trips (Mobility) or Gross Bookings (Delivery); P = Average fare/booking; T = Take-rate (revenue as % of gross bookings); Segment breakdown (Mobility, Delivery, Freight)",
        "data_quality_score": 9,
        "is_active": True
    },
    {
        "ticker": "ABNB",
        "company_name": "Airbnb, Inc.",
        "industry": "Hospitality",
        "sub_industry": "Online Accommodation Platform",
        "description": "Vacation rental platform with take-rate model on nights and experiences booked. Clean Q x P x T modeling.",
        "headquarters": "San Francisco, California",
        "fiscal_year_end": "December 31",
        "sec_cik": "0001559720",
        "ir_website_url": "https://investors.airbnb.com",
        "revenue_model_type": "QxPxT",
        "revenue_driver_notes": "Q = Nights and Experiences booked; P = Average Daily Rate (ADR) or booking value; T = Take-rate (service fees from hosts and guests); Geographic breakdown disclosed",
        "data_quality_score": 9,
        "is_active": True
    },
    {
        "ticker": "DE",
        "company_name": "Deere & Company",
        "industry": "Industrial",
        "sub_industry": "Agricultural Equipment",
        "description": "Agricultural and construction equipment manufacturer with financing arm. Clean Q x P with units/shipments and average selling price by category.",
        "headquarters": "Moline, Illinois",
        "fiscal_year_end": "October 31",
        "sec_cik": "0000315189",
        "ir_website_url": "https://investor.deere.com",
        "revenue_model_type": "QxP",
        "revenue_driver_notes": "Q = Unit shipments/deliveries by category (Agriculture & Turf, Construction & Forestry); P = Average Selling Price (ASP) by category; Financial Services separate (interest income); Backlog disclosed quarterly",
        "data_quality_score": 9,
        "is_active": True
    },
    {
        "ticker": "GE",
        "company_name": "General Electric Company",
        "industry": "Industrial",
        "sub_industry": "Aerospace & Aviation",
        "description": "Diversified industrial conglomerate with focus on aerospace. Q x P modeling with shop visits, flight hours, and service rate/mix.",
        "headquarters": "Boston, Massachusetts",
        "fiscal_year_end": "December 31",
        "sec_cik": "0000040545",
        "ir_website_url": "https://www.ge.com/investor-relations",
        "revenue_model_type": "QxP",
        "revenue_driver_notes": "Q = Shop visits (engine maintenance), flight hours, equipment deliveries; P = Rate per visit, service price/mix; Aerospace segment focus (clear drivers); Power, Renewable Energy segments optional",
        "data_quality_score": 8,
        "is_active": True
    },
    {
        "ticker": "KO",
        "company_name": "The Coca-Cola Company",
        "industry": "Beverages",
        "sub_industry": "Non-Alcoholic Beverages",
        "description": "Global beverage company with unit case volume and price/mix drivers. FX disclosed quarterly.",
        "headquarters": "Atlanta, Georgia",
        "fiscal_year_end": "December 31",
        "sec_cik": "0000021344",
        "ir_website_url": "https://investors.coca-colacompany.com",
        "revenue_model_type": "QxP",
        "revenue_driver_notes": "Q = Unit case volume by region; P = Price/mix (net revenue per unit case); FX impact disclosed separately; Geographic segment breakdown (North America, International)",
        "data_quality_score": 10,
        "is_active": True
    },
    {
        "ticker": "GSBD",
        "company_name": "Goldman Sachs BDC, Inc.",
        "industry": "Finance",
        "sub_industry": "Business Development Company",
        "description": "Business Development Company providing credit to middle-market companies. Q x P with interest-earning investments and weighted average yield.",
        "headquarters": "New York, New York",
        "fiscal_year_end": "December 31",
        "sec_cik": "0001575795",
        "ir_website_url": "https://www.goldmansachsbdc.com/investor-relations",
        "revenue_model_type": "QxP",
        "revenue_driver_notes": "Q = Average interest-earning investment portfolio balance; P = Weighted average yield on investments; Fee income (management fees, incentive fees) separate; Credit analysis focus (leverage ratios, coverage ratios)",
        "data_quality_score": 9,
        "is_active": True
    }
]


def seed_learning_companies():
    """Seed the database with 10 curated learning companies"""
    
    print("Starting Learning Module database seed...")
    
    # Ensure engine is initialized
    _ensure_engine()
    
    # Create tables if they don't exist
    print("Creating tables...")
    from services.api.models import Base
    from services.api.database import _engine
    Base.metadata.create_all(bind=_engine)
    
    # Get database session
    db = next(get_db())
    
    try:
        # Check if companies already exist
        existing_count = db.query(LearningCompany).count()
        if existing_count > 0:
            print(f"Found {existing_count} existing companies. Clearing...")
            db.query(LearningCompany).delete()
            db.commit()
        
        # Insert companies
        print(f"Inserting {len(CURATED_COMPANIES)} curated companies...")
        for company_data in CURATED_COMPANIES:
            company = LearningCompany(**company_data)
            db.add(company)
            print(f"  - Added: {company.ticker} ({company.company_name})")
        
        db.commit()
        print(f"Successfully seeded {len(CURATED_COMPANIES)} companies!")
        
        # Verify
        final_count = db.query(LearningCompany).count()
        print(f"Verification: {final_count} companies in database")
        
        # Print summary
        print("\nCompany Summary:")
        companies = db.query(LearningCompany).order_by(LearningCompany.ticker).all()
        for company in companies:
            print(f"  {company.ticker:6} | {company.company_name:40} | {company.revenue_model_type:6} | Score: {company.data_quality_score}/10")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_learning_companies()

