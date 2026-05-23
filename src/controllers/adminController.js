const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Activity = require('../models/Activity');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class AdminController {
  async getDashboardStats(req, res, next) {
    try {
      const [
        totalUsers,
        totalTickets,
        ticketsByStatus,
        ticketsByPriority,
        ticketsByCategory,
        recentActivity,
        topAgents
      ] = await Promise.all([
        User.countDocuments(),
        Ticket.countDocuments(),
        Ticket.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Ticket.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]),
        Ticket.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Activity.find()
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('user', 'name email')
          .populate('ticket', 'ticketNumber title'),
        User.aggregate([
          { $match: { role: { $in: ['admin', 'agent'] } } },
          {
            $lookup: {
              from: 'tickets',
              localField: '_id',
              foreignField: 'assignedTo',
              as: 'assignedTickets'
            }
          },
          {
            $project: {
              name: 1,
              email: 1,
              role: 1,
              ticketCount: { $size: '$assignedTickets' },
              resolvedCount: {
                $size: {
                  $filter: {
                    input: '$assignedTickets',
                    as: 'ticket',
                    cond: { $eq: ['$$ticket.status', 'resolved'] }
                  }
                }
              }
            }
          },
          { $sort: { ticketCount: -1 } },
          { $limit: 5 }
        ])
      ]);

      return ApiResponse.success(res, {
        overview: {
          totalUsers,
          totalTickets,
          activeTickets: ticketsByStatus.find(s => s._id === 'open')?.count || 0,
          resolvedTickets: ticketsByStatus.find(s => s._id === 'resolved')?.count || 0
        },
        ticketsByStatus: ticketsByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        ticketsByPriority: ticketsByPriority.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        ticketsByCategory: ticketsByCategory.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        recentActivity,
        topAgents
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find()
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments()
      ]);

      return ApiResponse.paginated(res, users, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      logger.info(`User ${userId} role updated to ${role} by ${req.user.userId}`);
      return ApiResponse.success(res, user, 'User role updated');
    } catch (error) {
      next(error);
    }
  }

  async toggleUserStatus(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);

      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      user.isActive = !user.isActive;
      await user.save();

      logger.info(`User ${userId} status toggled to ${user.isActive} by ${req.user.userId}`);
      return ApiResponse.success(res, { isActive: user.isActive }, 'User status updated');
    } catch (error) {
      next(error);
    }
  }

  async getAllTickets(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const query = {};
      if (req.query.status) query.status = req.query.status;
      if (req.query.priority) query.priority = req.query.priority;
      if (req.query.category) query.category = req.query.category;

      const [tickets, total] = await Promise.all([
        Ticket.find(query)
          .populate('createdBy', 'name email')
          .populate('assignedTo', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Ticket.countDocuments(query)
      ]);

      return ApiResponse.paginated(res, tickets, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      next(error);
    }
  }

  async getSystemHealth(req, res, next) {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV,
        database: {
          status: 'connected' // Would check actual connection in production
        }
      };

      return ApiResponse.success(res, health);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
