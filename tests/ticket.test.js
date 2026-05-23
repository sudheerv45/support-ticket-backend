const request = require('supertest');
const { app } = require('../../src/app');
const User = require('../../src/models/User');
const Ticket = require('../../src/models/Ticket');
const jwt = require('jsonwebtoken');

describe('Ticket Endpoints', () => {
  let userToken;
  let adminToken;
  let userId;
  let adminId;

  beforeEach(async () => {
    const user = await User.create({
      email: 'user@example.com',
      password: 'Password123',
      name: 'Test User',
      role: 'user'
    });
    userId = user._id;
    userToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET
    );

    const admin = await User.create({
      email: 'admin@example.com',
      password: 'Password123',
      name: 'Admin User',
      role: 'admin'
    });
    adminId = admin._id;
    adminToken = jwt.sign(
      { userId: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET
    );
  });

  describe('POST /api/v1/tickets', () => {
    it('should create a new ticket', async () => {
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Ticket',
          description: 'This is a test ticket description',
          category: 'technical',
          priority: 'high'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('ticketNumber');
    });

    it('should auto-categorize ticket with AI', async () => {
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Payment failed on checkout',
          description: 'I am unable to complete payment. Getting error code 500.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('aiCategory');
    });
  });

  describe('GET /api/v1/tickets', () => {
    beforeEach(async () => {
      await Ticket.create([
        {
          title: 'Ticket 1',
          description: 'Description 1',
          createdBy: userId,
          status: 'open'
        },
        {
          title: 'Ticket 2',
          description: 'Description 2',
          createdBy: userId,
          status: 'resolved'
        }
      ]);
    });

    it('should list user tickets with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/tickets?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toHaveProperty('total');
    });

    it('should filter tickets by status', async () => {
      const res = await request(app)
        .get('/api/v1/tickets?status=open')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('PATCH /api/v1/tickets/:id/assign', () => {
    let ticket;

    beforeEach(async () => {
      ticket = await Ticket.create({
        title: 'Test Ticket',
        description: 'Description',
        createdBy: userId,
        status: 'open'
      });
    });

    it('should assign ticket to agent', async () => {
      const agent = await User.create({
        email: 'agent@example.com',
        password: 'Password123',
        name: 'Agent User',
        role: 'agent'
      });

      const res = await request(app)
        .patch(`/api/v1/tickets/${ticket._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentId: agent._id });

      expect(res.status).toBe(200);
      expect(res.body.data.assignedTo.toString()).toBe(agent._id.toString());
      expect(res.body.data.status).toBe('in-progress');
    });
  });
});
