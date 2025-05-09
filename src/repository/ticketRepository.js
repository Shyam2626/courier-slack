const { Ticket } = require('../config/db');
const { Op, where } = require('sequelize');
const ticket = require('../src/models/ticket');

const createTicket = async (ticketId, userId, channelId, messageTs) => {
  const ticket = await Ticket.create({
    id: ticketId,
    requester: userId,
    channel: channelId,
    requesterThreadTs: messageTs,
  });
  console.log(`Created ticket ${ticket.id} for user ${userId}`);
  return ticket;
};

const findByPrivateChannelId = async (channelId) => {
  return await Ticket.findOne({
    where: { privateChannelId: channelId },
  });
};

const findByTechnicianChannelConversationId = async (threadTs) => {
  const leftPart = threadTs.split(".")[0];
  return await Ticket.findOne({
    where: {
      technicianChannelConversationId: {
        [Op.like]: `${leftPart}%`,
      },
    },
  });
};

const findByRequesterThreadTs = async (threadTs) => {
  const leftPart = threadTs.split(".")[0];
  return await Ticket.findOne({
    where: {
      requesterThreadTs: {
        [Op.like]: `${leftPart}.%`,
      }
    },
  });
};

const findByTechnicianThreadTs = async (threadTs) => {
  return await Ticket.findOne({
    where: { technicianThreadTs: threadTs }
  });
};

const findById = async (ticketId) => {
  return await Ticket.findOne({
    where: { id: ticketId },
  });
};

const save = async (ticket) => {
  return await ticket.save();
};

module.exports = {
  createTicket,
  findByPrivateChannelId,
  findByTechnicianChannelConversationId,
  findById,
  findByRequesterThreadTs,
  findByTechnicianThreadTs,
  save
};