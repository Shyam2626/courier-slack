const axios = require("axios");
const ticketRepository = require("../repository/ticketRepository");
const userRepository = require("../repository/userRepository");

async function createPrivateChannel(ticketId, technicianEmail) {
  try {
    const channelName = `ticket-${ticketId}`;
    const channelId = await createChannel(channelName);
    if (channelId) {
      const ticket = await ticketRepository.findById(ticketId);
      if (!technicianEmail) {
        const ticketInfo = await axios.get(
          `http://localhost:8081/tickets/${ticketId}`
        );
        technicianEmail = ticketInfo.data.technician;
      }
      const technician = await userRepository.findByEmail(
        technicianEmail
      );
      if (!technician) {
        console.warn("Technician Not found for the ticket: ", ticketId);
        return;
      }
      await addUsersToChannel(channelId, [ticket.requester, technician.userId]);
      await addBotToChannel(channelId);
      ticket.privateChannelId = channelId;
      await ticketRepository.save(ticket);
    } else {
      console.error(`Failed to create private channel for ticket ${ticketId}`);
    }
  } catch (err) {
    console.error("Error in Creating Private Channel: ", err);
  }
}

async function createChannel(channelName) {
  try {
    const response = await axios.post(
      "https://slack.com/api/conversations.create",
      {
        name: channelName,
        is_private: true,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Channel creation response:", response.data);
    if (response.data.ok) {
      return response.data.channel.id;
    } else {
      console.error("Channel creation failed:", response.data.error);
      return null;
    }
  } catch (err) {
    console.error("Exception creating channel:", err);
    return null;
  }
}

async function addUsersToChannel(channelId, userIds) {
  try {
    const response = await axios.post(
      "https://slack.com/api/conversations.invite",
      {
        channel: channelId,
        users: userIds.join(","),
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Invite users response:", response.data);
    if (!response.data.ok) {
      console.error("Failed to invite users:", response.data.error);
    }
  } catch (err) {
    console.error("Error inviting users:", err);
  }
}

async function addBotToChannel(channelId) {
  try {
    const response = await axios.post(
      "https://slack.com/api/conversations.invite",
      {
        channel: channelId,
        users: process.env.BOT_USER_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Invite bot response:", response.data);
  } catch (err) {
    console.error("Error inviting bot:", err);
  }
}

module.exports = { createPrivateChannel };
