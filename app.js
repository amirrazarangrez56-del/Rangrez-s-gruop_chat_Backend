const express = require('express');
const cors = require('cors');
const app = express();

const allowedOrigins = [
  'https://clinquant-monstera-164064.netlify.app',
  'https://razachat.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Handle preflight requests for all routes
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/group', require('./routes/groupRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api', require('./routes/uploadRoutes'));
app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use(require('./middleware/errorHandler'));

module.exports = app;