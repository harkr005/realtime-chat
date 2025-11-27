import { io } from "socket.io-client";

let socket = null;
export function connectSocket(token) {
  if (!token) return null;
  if (socket) {
    socket.disconnect();
  }
  socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling']
  });
  return socket;
}
export function getSocket() { return socket; }
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
