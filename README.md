# 🤖 AI-Powered Support Ticket Backend System

A production-ready, real-time support ticket management system built with Node.js, Express, MongoDB, Redis, and OpenAI integration.

## ✨ Features

### Core Functionality
- **JWT Authentication** with role-based access control (Admin, Agent, User)
- **Ticket Management** with full CRUD operations
- **AI Integration** powered by OpenAI GPT for auto-categorization, priority suggestion, and summary generation
- **Real-time Updates** via Socket.IO with Redis adapter for horizontal scaling
- **Queue System** using Bull for email notifications and in-app notifications
- **Redis Caching** for optimized API performance
- **Rate Limiting** and security middleware

### AI Features
- 🤖 **Auto-categorize** tickets based on content (technical, billing, general, feature-request, bug-report)
- 📊 **Auto-priority** suggestion (low, medium, high, urgent)
- 📝 **AI-generated summaries** of ticket conversations
- 💡 **Suggested responses** for support agents

### Real-time Features
- ⚡ Live ticket status updates
- 💬 Real-time comments and notifications
- 🔔 In-app notification system
- 📨 Email notification queue

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client App    │────▶│  Load Balancer │────▶│  Node.js API    │
│  (Web/Mobile)   │     │    (Nginx)      │     │   (Express)     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                           │
                    ┌──────────────────────────────────────┼──────────────────────┐
                    │                                      │                      │
                    ▼                                      ▼                      ▼
            ┌──────────────┐                      ┌──────────────┐      ┌──────────────┐
            │   MongoDB    │                      │    Redis     │      │   OpenAI     │
            │  (Database)   │                      │  (Cache/Queue│      │    (AI)      │
            └──────────────┘                      │ /PubSub)     │      └──────────────┘
                                                └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis >= 7.0 (optional but recommended)
- OpenAI API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-support-ticket-backend.git
cd ai-support-ticket-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Seed the database with sample data
npm run seed

# Start development server
npm run dev
```

### Docker Setup

```bash
# Start all services (API, MongoDB, Redis, Mongo Express)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

## 📚 API Documentation

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | Public |
| POST | `/api/v1/auth/login` | Login user | Public |
| POST | `/api/v1/auth/refresh` | Refresh access token | Public |
| GET | `/api/v1/auth/me` | Get current user | Required |
| PATCH | `/api/v1/auth/profile` | Update profile | Required |

### Tickets

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/v1/tickets` | Create ticket | Required | Any |
| GET | `/api/v1/tickets` | List tickets | Required | Any |
| GET | `/api/v1/tickets/stats` | Get ticket stats | Required | Any |
| GET | `/api/v1/tickets/:id` | Get ticket details | Required | Any |
| PATCH | `/api/v1/tickets/:id` | Update ticket | Required | Any |
| DELETE | `/api/v1/tickets/:id` | Delete ticket | Required | Owner/Admin |
| POST | `/api/v1/tickets/:id/comments` | Add comment | Required | Any |
| PATCH | `/api/v1/tickets/:id/status` | Update status | Required | Any |
| PATCH | `/api/v1/tickets/:id/assign` | Assign to agent | Required | Admin/Agent |
| POST | `/api/v1/tickets/:id/summary` | Generate AI summary | Required | Any |

### AI Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/ai/categorize` | Categorize content | Required |
| POST | `/api/v1/ai/priority` | Suggest priority | Required |
| POST | `/api/v1/ai/analyze` | Full AI analysis | Required |
| POST | `/api/v1/ai/tickets/:id/suggest-response` | Suggest response | Required |

### Admin

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/v1/admin/dashboard` | Dashboard stats | Required | Admin |
| GET | `/api/v1/admin/users` | List all users | Required | Admin |
| PATCH | `/api/v1/admin/users/:id/role` | Update user role | Required | Admin |
| PATCH | `/api/v1/admin/users/:id/toggle` | Toggle user status | Required | Admin |
| GET | `/api/v1/admin/tickets` | All tickets | Required | Admin |
| GET | `/api/v1/admin/health` | System health | Required | Admin |

## 🔌 WebSocket Events

### Client -> Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join-ticket` | `{ ticketId }` | Join ticket room |
| `leave-ticket` | `{ ticketId }` | Leave ticket room |
| `typing` | `{ ticketId }` | User typing indicator |

### Server -> Client
| Event | Payload | Description |
|-------|---------|-------------|
| `ticket-created` | `{ ticketId, ticketNumber, ... }` | New ticket created |
| `ticket-updated` | `{ ticketId, status, ... }` | Ticket updated |
| `ticket-assigned` | `{ ticketId, assignedTo, ... }` | Ticket assigned |
| `ticket-comment` | `{ ticketId, comment }` | New comment added |
| `notification` | `{ type, message, ticketId }` | In-app notification |
| `user-typing` | `{ userId, ticketId }` | Typing indicator |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test -- --coverage
```

## 🗄️ Database Schema

### Users Collection
```javascript
{
  email: String (unique, indexed),
  password: String (hashed),
  name: String,
  role: String (enum: ['user', 'admin', 'agent']),
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Tickets Collection
```javascript
{
  ticketNumber: String (unique, indexed),
  title: String,
  description: String,
  category: String (enum),
  priority: String (enum),
  status: String (enum),
  createdBy: ObjectId (ref: User),
  assignedTo: ObjectId (ref: User),
  comments: [{
    author: ObjectId,
    content: String,
    isInternal: Boolean,
    createdAt: Date
  }],
  aiSummary: String,
  aiCategory: String,
  aiConfidence: Number,
  satisfaction: { rating: Number, feedback: String },
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `email_1_isActive_1` - User queries
- `status_1_createdAt_-1` - Ticket listing
- `createdBy_1_status_1` - User ticket queries
- `assignedTo_1_status_1` - Agent workload
- `ticketNumber_text_title_text_description_text` - Full-text search

## 🔒 Security Features

- ✅ Helmet.js for HTTP security headers
- ✅ CORS configuration
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Stricter auth rate limiting (5 attempts per 15 minutes)
- ✅ Input validation with express-validator
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Role-based access control
- ✅ Request logging and error tracking

## 📊 Performance Optimizations

- ✅ Redis caching for GET endpoints (60s TTL)
- ✅ Database indexing for frequent queries
- ✅ Bull queue for async email/notifications
- ✅ Compression middleware
- ✅ Connection pooling for MongoDB
- ✅ Pagination for all list endpoints

## 🛠️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `REDIS_URL` | Redis connection string | No |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | JWT expiration (e.g., 7d) | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes (for AI) |
| `SMTP_HOST` | Email SMTP host | No |
| `SMTP_USER` | Email SMTP user | No |
| `SMTP_PASS` | Email SMTP password | No |

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

For support, email support@example.com or open an issue on GitHub.
