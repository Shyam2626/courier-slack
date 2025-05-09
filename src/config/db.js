const { Sequelize } = require('sequelize');
const TicketModel = require('../models/ticket');

const sequelize = new Sequelize('courier', 'root', 'root', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
});

const Ticket = TicketModel(sequelize);

Ticket.sync({ alter: true })
  .then(() => {
    console.log('Ticket table synced (altered if needed).');
  })
  .catch((err) => {
    console.error('Failed to sync Ticket table:', err);
  });

module.exports = { sequelize, Ticket };
