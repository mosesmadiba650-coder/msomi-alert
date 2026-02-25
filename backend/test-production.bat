@echo off
echo ========================================
echo MSOMI ALERT - Production Backend Test
echo ========================================
echo.

cd /d "C:\Users\Admin\Desktop\ANCESTRAL CODE\backend"

echo [1/4] Testing new server startup...
start /B node server-new.js
timeout /t 5 /nobreak > nul

echo [2/4] Testing health endpoint...
curl -s http://localhost:5000/health
echo.

echo [3/4] Testing device registration...
curl -s -X POST http://localhost:5000/api/devices/register -H "Content-Type: application/json" -d "{\"deviceToken\":\"test-token-123\",\"courses\":[\"CSC201\"],\"studentName\":\"Test User\"}"
echo.

echo [4/4] Stopping server...
taskkill /F /IM node.exe > nul 2>&1

echo.
echo ========================================
echo Test Complete!
echo ========================================
echo.
echo Next steps:
echo 1. If all tests passed, deploy to Render
echo 2. Update Render start command to: npm start
echo 3. Test mobile app connection
echo.
pause
