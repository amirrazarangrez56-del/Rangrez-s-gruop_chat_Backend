require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const socketHandler = require('./socket/socketHandler');

const PORT = process.env.PORT || 5000;
connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET','POST'], credentials: true },
  pingTimeout: 60000, pingInterval: 25000,
});

app.set('io', io);
socketHandler(io);

server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
process.on('unhandledRejection', (err) => { console.error(err); server.close(() => process.exit(1)); });
