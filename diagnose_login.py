"""
Diagnose login issue - find the exact problem
"""
import requests
import json
import socket
import time

print("="*60)
print("DIAGNOSING LOGIN ISSUE")
print("="*60)

# 1. Check if ports are open
def check_port(host, port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex((host, port))
    sock.close()
    return result == 0

print("\n1. CHECKING PORTS:")
if check_port('localhost', 8001):
    print("   [OK] Backend port 8001 is OPEN")
else:
    print("   [ERROR] Backend port 8001 is CLOSED - Backend not running!")
    print("   Run: python -m src.api.main")

if check_port('localhost', 3001):
    print("   [OK] Frontend port 3001 is OPEN")
else:
    print("   [ERROR] Frontend port 3001 is CLOSED - Frontend not running!")
    print("   Run: cd apps/desktop && npm run dev")

# 2. Test backend directly
print("\n2. TESTING BACKEND DIRECTLY:")
try:
    # Test health endpoint
    health_response = requests.get("http://localhost:8001/api/health", timeout=5)
    print(f"   Health check: {health_response.status_code}")
    
    # Test login endpoint
    login_data = {
        "email": "lwhitworth@ngicapitaladvisory.com",
        "password": "TempPassword123!"
    }
    
    login_response = requests.post(
        "http://localhost:8001/api/auth/login",
        json=login_data,
        timeout=5
    )
    
    print(f"   Login endpoint: {login_response.status_code}")
    if login_response.status_code == 200:
        data = login_response.json()
        print(f"   Token received: {data.get('access_token', 'NONE')[:30]}...")
    else:
        print(f"   Error: {login_response.text}")
        
except requests.exceptions.Timeout:
    print("   [ERROR] Backend is timing out - may be overloaded or frozen")
except requests.exceptions.ConnectionError as e:
    print(f"   [ERROR] Cannot connect to backend: {e}")
except Exception as e:
    print(f"   [ERROR] Unexpected error: {e}")

# 3. Test from different origins (simulate browser)
print("\n3. TESTING WITH BROWSER HEADERS:")
browser_headers = {
    "Origin": "http://localhost:3001",
    "Referer": "http://localhost:3001/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

try:
    browser_response = requests.post(
        "http://localhost:8001/api/auth/login",
        json=login_data,
        headers=browser_headers,
        timeout=5
    )
    print(f"   With browser headers: {browser_response.status_code}")
    
    # Check CORS headers in response
    cors_headers = {
        "Access-Control-Allow-Origin": browser_response.headers.get("Access-Control-Allow-Origin", "NOT SET"),
        "Access-Control-Allow-Credentials": browser_response.headers.get("Access-Control-Allow-Credentials", "NOT SET")
    }
    print("   CORS headers received:")
    for key, value in cors_headers.items():
        print(f"     {key}: {value}")
        
except Exception as e:
    print(f"   [ERROR] Browser simulation failed: {e}")

# 4. Check if frontend proxy is working
print("\n4. TESTING FRONTEND PROXY:")
try:
    # Try through Next.js proxy
    proxy_response = requests.post(
        "http://localhost:3001/api/auth/login",
        json=login_data,
        timeout=5
    )
    print(f"   Through Next.js proxy: {proxy_response.status_code}")
    if proxy_response.status_code != 200:
        print(f"   Proxy response: {proxy_response.text[:200]}")
except Exception as e:
    print(f"   [ERROR] Proxy test failed: {e}")

# 5. Check localhost vs 127.0.0.1
print("\n5. TESTING LOCALHOST VS 127.0.0.1:")
try:
    localhost_response = requests.post(
        "http://localhost:8001/api/auth/login",
        json=login_data,
        timeout=5
    )
    print(f"   http://localhost:8001 - Status: {localhost_response.status_code}")
except Exception as e:
    print(f"   http://localhost:8001 - Error: {e}")

try:
    ip_response = requests.post(
        "http://127.0.0.1:8001/api/auth/login",
        json=login_data,
        timeout=5
    )
    print(f"   http://127.0.0.1:8001 - Status: {ip_response.status_code}")
except Exception as e:
    print(f"   http://127.0.0.1:8001 - Error: {e}")

# 6. Summary
print("\n" + "="*60)
print("DIAGNOSIS COMPLETE")
print("="*60)

print("\nMost likely issues:")
print("1. Browser is blocking the request (check browser console)")
print("2. CORS is misconfigured (check Access-Control headers)")
print("3. Frontend is using wrong URL (check Network tab)")
print("4. Firewall/antivirus blocking the connection")
print("5. Browser extensions interfering (try incognito mode)")

print("\nTo debug in browser:")
print("1. Open Chrome DevTools (F12)")
print("2. Go to Network tab")
print("3. Clear network log")
print("4. Try to login")
print("5. Look for red requests and click on them")
print("6. Check Console tab for JavaScript errors")
print("7. Share the exact error message from Console/Network tab")