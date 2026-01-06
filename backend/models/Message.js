const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  text: { type: String, required: false },
  image: { type: String, required: false },
  audio: { type: String, required: false }, // URL to audio
  type: { type: String, default: "text" }, // "text", "image", "audio"
  read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
