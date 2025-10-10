#!/usr/bin/env python3
"""
Comprehensive Test Runner for NGI Capital Accounting Module
Runs all tests with detailed debugging and reporting

Author: NGI Capital Development Team
Date: October 10, 2025
"""

import os
import sys
import subprocess
import json
import time
from datetime import datetime
from pathlib import Path

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))


class TestRunner:
    """Test runner with comprehensive debugging and reporting"""
    
    def __init__(self):
        self.start_time = datetime.now()
        self.results = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "errors": 0,
            "test_details": []
        }
        self.test_files = [
            "test_01_timezone_pst.py",
            "test_02_entity_coa_setup.py", 
            "test_03_document_upload_extraction.py",
            "test_05_approval_workflow.py"
        ]
    
    def print_header(self):
        """Print test runner header"""
        print("=" * 80)
        print("NGI CAPITAL ACCOUNTING MODULE - COMPREHENSIVE TEST SUITE")
        print("=" * 80)
        print(f"Start Time: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Python Version: {sys.version}")
        print(f"Working Directory: {os.getcwd()}")
        print("=" * 80)
        print()
    
    def check_docker_status(self):
        """Check if Docker containers are running"""
        print("Checking Docker container status...")
        try:
            result = subprocess.run(
                ["docker", "ps", "--filter", "name=ngi-backend", "--format", "{{.Status}}"],
                capture_output=True,
                text=True,
                check=True
            )
            
            if "Up" in result.stdout:
                print("✓ NGI Backend container is running")
                return True
            else:
                print("✗ NGI Backend container is not running")
                return False
        except subprocess.CalledProcessError as e:
            print(f"✗ Error checking Docker status: {e}")
            return False
        except FileNotFoundError:
            print("✗ Docker command not found")
            return False
    
    def run_single_test(self, test_file: str):
        """Run a single test file with debugging"""
        print(f"\n{'='*60}")
        print(f"RUNNING TEST: {test_file}")
        print(f"{'='*60}")
        
        test_path = Path(__file__).parent / test_file
        
        if not test_path.exists():
            print(f"✗ Test file not found: {test_path}")
            return False
        
        # Run the test with detailed output
        cmd = [
            "docker", "exec", "ngi-backend",
            "python", "-m", "pytest",
            str(test_path),
            "-v",  # verbose
            "-s",  # don't capture output (show print statements)
            "--tb=short",  # short traceback
            "--no-header",  # no header
            "--disable-warnings",  # disable warnings
            "--color=yes"  # colored output
        ]
        
        print(f"Command: {' '.join(cmd)}")
        print()
        
        start_time = time.time()
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            print("STDOUT:")
            print(result.stdout)
            
            if result.stderr:
                print("STDERR:")
                print(result.stderr)
            
            print(f"\nTest completed in {duration:.2f} seconds")
            print(f"Exit code: {result.returncode}")
            
            # Parse results
            success = result.returncode == 0
            
            if success:
                print("✓ Test PASSED")
            else:
                print("✗ Test FAILED")
            
            return success
            
        except Exception as e:
            print(f"✗ Error running test: {e}")
            return False
    
    def run_all_tests(self):
        """Run all test files"""
        print("Running all accounting module tests...")
        
        for test_file in self.test_files:
            success = self.run_single_test(test_file)
            
            self.results["total_tests"] += 1
            if success:
                self.results["passed"] += 1
            else:
                self.results["failed"] += 1
            
            self.results["test_details"].append({
                "file": test_file,
                "success": success,
                "timestamp": datetime.now().isoformat()
            })
    
    def run_specific_tests(self, test_files: list):
        """Run specific test files"""
        print(f"Running specific tests: {', '.join(test_files)}")
        
        for test_file in test_files:
            if test_file in self.test_files:
                success = self.run_single_test(test_file)
                
                self.results["total_tests"] += 1
                if success:
                    self.results["passed"] += 1
                else:
                    self.results["failed"] += 1
                
                self.results["test_details"].append({
                    "file": test_file,
                    "success": success,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                print(f"⚠ Test file not found in test suite: {test_file}")
    
    def run_quick_smoke_tests(self):
        """Run quick smoke tests to verify basic functionality"""
        print("Running quick smoke tests...")
        
        smoke_tests = ["test_01_timezone_pst.py"]
        self.run_specific_tests(smoke_tests)
    
    def print_summary(self):
        """Print test summary"""
        end_time = datetime.now()
        total_duration = (end_time - self.start_time).total_seconds()
        
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed']}")
        print(f"Failed: {self.results['failed']}")
        print(f"Skipped: {self.results['skipped']}")
        print(f"Errors: {self.results['errors']}")
        print(f"Success Rate: {(self.results['passed'] / max(self.results['total_tests'], 1)) * 100:.1f}%")
        print(f"Total Duration: {total_duration:.2f} seconds")
        print(f"End Time: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        if self.results['failed'] > 0:
            print("\nFAILED TESTS:")
            for test in self.results['test_details']:
                if not test['success']:
                    print(f"  - {test['file']} at {test['timestamp']}")
        
        print("=" * 80)
    
    def save_results(self, filename: str = None):
        """Save test results to JSON file"""
        if filename is None:
            filename = f"test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        results_path = Path(__file__).parent / filename
        
        with open(results_path, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print(f"Test results saved to: {results_path}")
    
    def run_debug_mode(self, test_file: str):
        """Run a single test in debug mode with maximum verbosity"""
        print(f"Running {test_file} in DEBUG mode...")
        
        test_path = Path(__file__).parent / test_file
        
        cmd = [
            "docker", "exec", "ngi-backend",
            "python", "-m", "pytest",
            str(test_path),
            "-vvv",  # maximum verbosity
            "-s",  # don't capture output
            "--tb=long",  # long traceback
            "--no-header",
            "--disable-warnings",
            "--color=yes",
            "--capture=no",  # show all output
            "--log-cli-level=DEBUG"  # debug logging
        ]
        
        print(f"Debug Command: {' '.join(cmd)}")
        print()
        
        try:
            result = subprocess.run(cmd, text=True)
            return result.returncode == 0
        except Exception as e:
            print(f"✗ Error in debug mode: {e}")
            return False


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="NGI Capital Accounting Module Test Runner")
    parser.add_argument("--test", "-t", help="Run specific test file")
    parser.add_argument("--debug", "-d", help="Run specific test file in debug mode")
    parser.add_argument("--smoke", "-s", action="store_true", help="Run quick smoke tests")
    parser.add_argument("--all", "-a", action="store_true", help="Run all tests")
    parser.add_argument("--save-results", help="Save results to specific file")
    
    args = parser.parse_args()
    
    runner = TestRunner()
    runner.print_header()
    
    # Check Docker status first
    if not runner.check_docker_status():
        print("Please start the Docker containers before running tests")
        sys.exit(1)
    
    # Run tests based on arguments
    if args.debug:
        success = runner.run_debug_mode(args.debug)
        sys.exit(0 if success else 1)
    elif args.test:
        runner.run_specific_tests([args.test])
    elif args.smoke:
        runner.run_quick_smoke_tests()
    elif args.all:
        runner.run_all_tests()
    else:
        # Default: run smoke tests
        runner.run_quick_smoke_tests()
    
    runner.print_summary()
    
    if args.save_results:
        runner.save_results(args.save_results)
    
    # Exit with error code if any tests failed
    sys.exit(1 if runner.results['failed'] > 0 else 0)


if __name__ == "__main__":
    main()
