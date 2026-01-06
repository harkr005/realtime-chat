@echo off
echo ========================================
echo   Realtime Chat - Network Setup
echo ========================================
echo.

echo Finding your local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%
echo.
echo Your IP address is: %IP%
echo.
echo The app will be accessible at:
echo   - On this computer: http://localhost:3000
echo   - On other devices: http://%IP%:3000
echo.
echo IMPORTANT: Make sure to update frontend/.env.local with your IP!
echo   REACT_APP_API_URL=http://%IP%:5000/api
echo   REACT_APP_SOCKET_URL=http://%IP%:5000
echo.
pause
echo.
echo Starting backend server...
start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
echo.
echo Starting frontend server...
echo.
cd frontend
set HOST=0.0.0.0
npm start


