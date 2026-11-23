const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

let io;

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/common/discovery/v2.0/keys`
});

function getKey(header, callback) {
  if (!header.kid) {
    // If there's no kid, it's our local signed JWT token
    return callback(null, process.env.JWT_SECRET || 'local-secret-key-12345');
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) return true;
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;
  if (process.env.ALLOWED_ORIGINS) {
    const list = process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
    if (list.includes(origin)) return true;
  }
  const defaults = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    'https://capstrong.vercel.app',
    'https://azure-cloud-ops.vercel.app'
  ];
  return defaults.includes(origin);
}

function initGateway(server) {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }
        console.warn(`[WebSocket CORS] Disallowed origin: ${origin}`);
        callback(new Error('CORS: origin not allowed'));
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        'Authorization', 
        'Content-Type', 
        'Accept', 
        'Origin', 
        'X-Requested-With', 
        'x-azure-token', 
        'x-api-key', 
        'x-access-token', 
        'x-request-id'
      ],
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['x-auth-token'] || socket.handshake.query?.token;
    
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(token, getKey, { algorithms: ['RS256', 'HS256', 'HS512', 'HS384'] }, (err, decoded) => {
      if (err) {
        return next(new Error(`Authentication error: ${err.message}`));
      }
      
      socket.tenantId = decoded.tid || decoded.tenantId;
      socket.userId = decoded.oid || decoded.id;
      socket.userEmail = decoded.preferred_username || decoded.upn || decoded.email || 'user';
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id} (User: ${socket.userId})`);
    
    // Join user-specific room for strictly isolated broadcasting
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

/**
 * Broadcast an event to a specific user
 */
function broadcastToUser(userId, eventType, payload) {
  if (io) {
    io.to(`user:${userId}`).emit(eventType, payload);
  }
}

module.exports = {
  initGateway,
  getIo,
  broadcastToUser
};
