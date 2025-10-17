"""
Generate sample Excel package for testing
Creates a TSLA package to verify Excel generation works correctly
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.api.learning.excel_generator import ExcelPackageGenerator


def generate_tsla_package():
    """Generate sample TSLA package for testing"""
    print("Generating TSLA Excel package...")
    
    generator = ExcelPackageGenerator(output_dir="uploads/learning_packages")
    
    filepath = generator.generate_package(
        ticker="TSLA",
        company_name="Tesla, Inc.",
        fiscal_year_end="December 31",
        version=1
    )
    
    print(f"Success! Package generated at: {filepath}")
    print(f"File size: {os.path.getsize(filepath):,} bytes")
    
    # Verify file exists
    if os.path.exists(filepath):
        print("File verification: OK")
        return filepath
    else:
        print("ERROR: File not found!")
        return None


if __name__ == "__main__":
    generate_tsla_package()

