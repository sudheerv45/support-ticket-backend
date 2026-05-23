const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
require('dotenv').config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany();
    await Ticket.deleteMany();
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      email: process.env.ADMIN_EMAIL || 'admin@system.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      name: 'System Administrator',
      role: 'admin'
    });
    console.log('Admin created:', admin.email);

    // Create agent users
    const agents = await User.create([
      {
        email: 'agent1@system.com',
        password: 'agent123',
        name: 'Support Agent 1',
        role: 'agent'
      },
      {
        email: 'agent2@system.com',
        password: 'agent123',
        name: 'Support Agent 2',
        role: 'agent'
      }
    ]);
    console.log('Agents created');

    // Create sample users
    const users = await User.create([
      {
        email: 'user1@example.com',
        password: 'user123',
        name: 'John Doe',
        role: 'user'
      },
      {
        email: 'user2@example.com',
        password: 'user123',
        name: 'Jane Smith',
        role: 'user'
      }
    ]);
    console.log('Users created');

    // Create sample tickets
    const tickets = await Ticket.create([
      {
        title: 'Cannot login to my account',
        description: 'I am getting an error when trying to login. It says invalid credentials but I am sure my password is correct.',
        category: 'technical',
        priority: 'high',
        status: 'open',
        createdBy: users[0]._id,
        aiCategory: 'technical',
        aiConfidence: 0.92
      },
      {
        title: 'Billing issue - charged twice',
        description: 'I noticed I was charged twice for my monthly subscription. Please help resolve this.',
        category: 'billing',
        priority: 'urgent',
        status: 'in-progress',
        createdBy: users[1]._id,
        assignedTo: agents[0]._id,
        aiCategory: 'billing',
        aiConfidence: 0.98
      },
      {
        title: 'Feature request: Dark mode',
        description: 'It would be great if you could add a dark mode option to the dashboard.',
        category: 'feature-request',
        priority: 'low',
        status: 'resolved',
        createdBy: users[0]._id,
        assignedTo: agents[1]._id,
        resolvedAt: new Date(),
        aiCategory: 'feature-request',
        aiConfidence: 0.95
      }
    ]);
    console.log('Tickets created');

    // Add comments
    tickets[1].comments.push({
      author: agents[0]._id,
      content: 'I am looking into this billing issue. Can you provide the transaction IDs?',
      isInternal: false
    });
    await tickets[1].save();

    console.log('\nSeed completed successfully!');
    console.log('\nDefault credentials:');
    console.log('Admin: admin@system.com / admin123');
    console.log('Agent: agent1@system.com / agent123');
    console.log('User: user1@example.com / user123');

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
