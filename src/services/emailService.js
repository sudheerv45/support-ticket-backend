const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

class EmailService {
  async sendTicketCreated(userEmail, ticket) {
    try {
      await transporter.sendMail({
        from: `"Support System" <${process.env.FROM_EMAIL}>`,
        to: userEmail,
        subject: `Ticket Created: ${ticket.ticketNumber}`,
        html: `
          <h2>Your support ticket has been created</h2>
          <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
          <p><strong>Title:</strong> ${ticket.title}</p>
          <p><strong>Category:</strong> ${ticket.category}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><strong>Status:</strong> ${ticket.status}</p>
          <p>We will get back to you shortly.</p>
        `
      });
      logger.info(`Ticket creation email sent to ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send ticket creation email:', error);
    }
  }

  async sendTicketUpdated(userEmail, ticket, updateType) {
    try {
      await transporter.sendMail({
        from: `"Support System" <${process.env.FROM_EMAIL}>`,
        to: userEmail,
        subject: `Ticket Updated: ${ticket.ticketNumber}`,
        html: `
          <h2>Your ticket has been updated</h2>
          <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
          <p><strong>Update:</strong> ${updateType}</p>
          <p><strong>Current Status:</strong> ${ticket.status}</p>
          <p><a href="#">View Ticket</a></p>
        `
      });
      logger.info(`Ticket update email sent to ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send ticket update email:', error);
    }
  }

  async sendAssignedNotification(agentEmail, ticket) {
    try {
      await transporter.sendMail({
        from: `"Support System" <${process.env.FROM_EMAIL}>`,
        to: agentEmail,
        subject: `New Ticket Assigned: ${ticket.ticketNumber}`,
        html: `
          <h2>A new ticket has been assigned to you</h2>
          <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
          <p><strong>Title:</strong> ${ticket.title}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><a href="#">View Ticket</a></p>
        `
      });
      logger.info(`Assignment email sent to ${agentEmail}`);
    } catch (error) {
      logger.error('Failed to send assignment email:', error);
    }
  }
}

module.exports = new EmailService();
