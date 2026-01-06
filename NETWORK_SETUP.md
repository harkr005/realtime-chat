# Network Setup Guide

## Making the App Accessible on Your Local Network

### 🚀 Quick Start (Recommended)

**Option 1: Use the PowerShell Script (Windows)**
```powershell
.\start-network.ps1
```
This script will:
- Automatically find your IP address
- Configure the frontend to use your IP
- Start both backend and frontend servers
- Show you the URLs to access the app

**Option 2: Use the Batch Script (Windows)**
```cmd
start-network.bat
```

### 📋 Manual Setup

**Step 1: Find Your Computer's IP Address**

**Windows PowerShell:**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}
```

**Windows CMD:**
```cmd
ipconfig
```
Look for "IPv4 Address" (usually starts with 192.168.x.x or 10.x.x.x)

**Step 2: Update Frontend Configuration**

Create or edit `frontend/.env.local`:
```
REACT_APP_API_URL=http://YOUR_IP:5000/api
REACT_APP_SOCKET_URL=http://YOUR_IP:5000
```

Replace `YOUR_IP` with your actual IP (e.g., `192.168.1.100`)

**Step 3: Start the Servers**

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend (for network access):**
```bash
cd frontend
npm run start:network
```

Or manually:
```bash
cd frontend
set HOST=0.0.0.0
npm start
```

### 🌐 Access the App

- **On your computer:** http://localhost:3000
- **On other devices (same WiFi):** http://YOUR_IP:3000
  - Example: http://192.168.1.100:3000

### 🔧 Troubleshooting

**Can't connect from other devices?**

1. **Check Windows Firewall:**
   - Open Windows Defender Firewall
   - Click "Allow an app through firewall"
   - Make sure Node.js is allowed for Private networks
   - Or temporarily disable firewall to test

2. **Verify Same Network:**
   - All devices must be on the same WiFi network
   - Check your IP hasn't changed (run `ipconfig` again)

3. **Check Ports:**
   - Backend should be on port 5000
   - Frontend should be on port 3000
   - Make sure no other apps are using these ports

4. **Try Different Port:**
   - Edit `frontend/package.json`:
   ```json
   "start:network": "set PORT=3001&& set HOST=0.0.0.0&& react-scripts start"
   ```

**Backend not accessible?**
- Make sure backend is running: `cd backend && npm run dev`
- Check backend terminal for errors
- Verify MongoDB is connected

### 📱 Testing on Mobile

1. Make sure your phone is on the same WiFi
2. Open browser on phone
3. Go to: `http://YOUR_IP:3000`
4. You should see the login page!

### 🔒 Security Note

This setup makes your app accessible on your local network only. For production, you'll need proper security, HTTPS, and authentication.

