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
// Allow all origins in development (for local network access)
const allowedOrigins = process.env.CLIENT_URL
  ? (Array.isArray(process.env.CLIENT_URL) ? process.env.CLIENT_URL : [process.env.CLIENT_URL])
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow localhost and local network IPs
    if (origin.includes('localhost') || origin.includes('127.0.0.1') ||
      origin.match(/^http:\/\/192\.168\.\d+\.\d+:3000$/) ||
      origin.match(/^http:\/\/10\.\d+\.\d+\.\d+:3000$/) ||
      origin.match(/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:3000$/)) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(null, true); // Allow all in development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);

      // Allow localhost and local network IPs
      if (origin.includes('localhost') || origin.includes('127.0.0.1') ||
        origin.match(/^http:\/\/192\.168\.\d+\.\d+:3000$/) ||
        origin.match(/^http:\/\/10\.\d+\.\d+\.\d+:3000$/) ||
        origin.match(/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-9]|3[0-1])\.\d+\.\d+:3000$/)) {
        return callback(null, true);
      }

      callback(null, true); // Allow all in development
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
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

// ---------------- BOLO AI OPTIMIZATION ---------------- //
const { OpenAI } = require('openai');
let botoAiId = null;
let openai = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log("✓ OpenAI API Initialized");
} else {
  console.log("! No OPENAI_API_KEY found. AI will be limited.");
}

const createBoloBot = async () => {
  try {
    const existingBot = await User.findOne({ username: 'BoloAI' });
    if (existingBot) {
      botoAiId = existingBot._id.toString();
      console.log('✓ BoloAI Bot loaded:', botoAiId);
    } else {
      const hashedPassword = await bcrypt.hash("boloai_secret_password", 10);
      const bot = new User({
        username: "BoloAI",
        email: "ai@bologpt.com",
        password: hashedPassword,
        isAvatarImageSet: true,
        avatarImage: "https://api.dicebear.com/6.x/bottts/svg?seed=BoloAI",
        about: "I am your AI Assistant 🤖"
      });
      await bot.save();
      botoAiId = bot._id.toString();
      console.log('✓ BoloAI Bot Created:', botoAiId);
    }
  } catch (ex) {
    console.error("Error creating bot:", ex);
  }
};
createBoloBot();

// AI Logic
const getBotResponse = async (text) => {
  if (!openai) {
    return "I am running in offline mode. Please add OPENAI_API_KEY to your backend .env file to activate my full brain! 🧠";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are BoloAI, a helpful, witty, and slightly chaotic Gen-Z assistant. Keep responses concise and use emojis." },
        { role: "user", content: text }
      ],
      max_tokens: 150,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI Error:", err);
    return "Oof, my brain connection timed out. Try again later? 😵‍💫";
  }
};

// socket events
io.on('connection', async (socket) => {
  const userId = String(socket.userId).trim();
  console.log("✓ Socket connected:", userId);

  socket.join(userId);

  // Handle joinRoom event (for compatibility)
  socket.on('joinRoom', (roomId) => {
    socket.join(String(roomId));
  });

  socket.on('typing', ({ to, typing }) => {
    if (!to) return;
    io.to(String(to)).emit('typing', { from: userId, typing });
  });

  socket.on('sendMessage', async ({ to, text, type, image, audio }) => {
    try {
      if (!to || (!text && !image && !audio)) {
        socket.emit('error', { msg: 'Invalid message data' });
        return;
      }

      const toId = String(to).trim();
      const msg = new Message({
        from: userId,
        to: toId,
        text: text ? text.trim() : "",
        type: type || "text",
        image: image || "",
        audio: audio || ""
      });
      await msg.save();

      console.log("📨 Sending message from", userId, "to", toId);
      io.to(toId).emit('newMessage', msg);
      io.to(userId).emit('newMessage', msg);

      // ---------------- BOT INTERCEPTION ---------------- //
      if (toId === botoAiId) {
        // 1. Typing On
        io.to(userId).emit('typing', { from: botoAiId, typing: true });

        // 2. Process Response
        const replyText = await getBotResponse(text);

        // 3. Send Reply after delay
        setTimeout(async () => {
          io.to(userId).emit('typing', { from: botoAiId, typing: false });

          const replyMsg = new Message({
            from: botoAiId,
            to: userId,
            text: replyText,
            read: false
          });
          await replyMsg.save();
          io.to(userId).emit('newMessage', replyMsg);
        }, 1000);
      }
      // -------------------------------------------------- //

    } catch (err) {
      console.error('Error sending message:', err);
      socket.emit('error', { msg: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log("✗ Socket disconnected:", userId);
  });
});


// ---------------- HEALTH CHECK ---------------- //
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
});

// Also allow root health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
});

// ---------------- AUTH ROUTES ---------------- //
app.post('/api/auth/register', async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ msg: "Server error during registration" });
  }
});


app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ msg: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ msg: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // Exclude password from response
    const userWithoutPassword = {
      id: user._id,
      username: user.username,
      email,
      avatarImage: user.avatarImage,
      about: user.about
    };

    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: "Server error during login" });
  }
});

// ---------------- FILE UPLOAD SETUP ---------------- //
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve uploads as static files
app.use('/uploads', express.static(uploadDir));

// Multer Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }
  // Construct URL. In production, use your actual domain/IP.
  // For local network access, we use a relative path or the request host.
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Update User Avatar/About
app.post('/api/auth/setAvatar', async (req, res) => {
  try {
    const { userId, image } = req.body;
    const userData = await User.findByIdAndUpdate(userId, {
      avatarImage: image,
    }, { new: true });
    return res.json({ isSet: true, image: userData.avatarImage });
  } catch (ex) {
    console.error('SetAvatar error:', ex);
    res.status(500).json({ error: ex.message });
  }
});

// Get All Users (for Contacts list)
app.get('/api/users/:id', async (req, res) => {
  try {
    // Return all users except the current one, select only needed fields
    const users = await User.find({ _id: { $ne: req.params.id } }).select([
      "email", "username", "avatarImage", "_id", "isOnline", "about"
    ]);
    return res.json(users);
  } catch (ex) {
    console.error('Get users error:', ex);
    res.status(500).json({ error: ex.message });
  }
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

    // Notify the SENDER (fromUserId) that I (myId) have read their messages
    io.to(fromUserId).emit('messagesRead', { from: myId });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------- START SERVER ---------------- //
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running on port " + PORT));

