require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

const server = http.createServer(app);

// ---------------- MONGO CONNECTION (verbose) ---------------- //
(async () => {
  try {
    console.log("→ Attempting to connect to MongoDB using MONGO_URI from .env");
    if (process.env.MONGO_URI) {
      const safe = process.env.MONGO_URI.replace(/\/\/(.*):(.*)@/, "//$1:***@");
      console.log("MONGO_URI (masked):", safe);
    } else {
      console.log("MONGO_URI not found in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("Mongo Error (full):", err && err.stack ? err.stack : err);
    // keep the process alive so nodemon shows logs
  }
})();




// ---------------- SOCKET.IO SETUP ---------------- //
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*' }
});

// authenticate socket with token
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// socket events
io.on('connection', (socket) => {
  const oderId = String(socket.userId).trim();
  console.log("✓ Socket connected:", oderId);

  socket.join(oderId);

  socket.on('typing', ({ to, typing }) => {
    io.to(String(to)).emit('typing', { from: oderId, typing });
  });

  socket.on('sendMessage', async ({ to, text }) => {
    const toId = String(to).trim();
    const msg = new Message({
      from: oderId,
      to: toId,
      text
    });
    await msg.save();

    console.log("📨 Sending message from", oderId, "to", toId);
    io.to(toId).emit('newMessage', msg);
    io.to(oderId).emit('newMessage', msg);
  });

  socket.on('disconnect', () => {
    console.log("✗ Socket disconnected:", socket.userId);
  });
});


// ---------------- AUTH ROUTES ---------------- //
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ msg: "Missing fields" });

  if (await User.findOne({ email }))
    return res.status(400).json({ msg: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);

  const user = new User({ username, email, password: hashed });
  await user.save();

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.json({ token, user: { id: user._id, username, email } });
});


app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(400).json({ msg: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok)
    return res.status(400).json({ msg: "Invalid credentials" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.json({ token, user: { id: user._id, username: user.username, email } });
});


// fetch messages between current user and another user
app.get('/api/messages/:id', async (req, res) => {
  try {
    const otherUserId = req.params.id;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: 'No token' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const myId = String(decoded.id);
    
    // Get messages between both users (sent and received)
    const messages = await Message.find({
      $or: [
        { from: myId, to: otherUserId },
        { from: otherUserId, to: myId }
      ]
    }).sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark messages as read
app.post('/api/messages/read/:fromUserId', async (req, res) => {
  try {
    const fromUserId = req.params.fromUserId;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: 'No token' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const myId = String(decoded.id);
    
    // Mark all messages FROM the other user TO me as read
    await Message.updateMany(
      { from: fromUserId, to: myId, read: false },
      { $set: { read: true } }
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------- START SERVER ---------------- //
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running on port " + PORT));
