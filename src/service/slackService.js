const axios = require("axios")
const outgoingService = require("./outgoingService");
const agentChannelService = require("./agentChannelService");
const userRepository = require("../repository/userRepository");
const jsonParserService = require("./jsonParserService");
const ticketRepository = require("../repository/ticketRepository");
const imChannelPublicToPrivateRepository = require("../repository/imChannelPublicToPrivateRepository");

async function replyMessage(ticketId, message, email) {
  const ticket = await ticketRepository.findById(ticketId);
  if (ticket === null) {
    console.log("Ticket not found");
    return;
  }

  if(email) {
    const user = await userRepository.findByEmail(email);
    await relayMessage(message, ticket, true, user.userId);
    return
  }
  await relayMessage(message, ticket, true, null);
}

async function initiateConversation(payload) {
  try {
    const { ticketId, requesterEmail, technicianEmail } = payload.body;
    const channelName = `ticket-${ticketId}`;
    const requester = await userRepository.findByEmail(requesterEmail);
    const channelId = await createPrivateChannel(channelName);

    if (channelId) {
      const technician = await userRepository.findByEmail(technicianEmail);
      await inviteUsersToChannel(channelId, [
        requester.userId,
        technician.userId,
      ]);
      await inviteBotToChannel(channelId);
      const ticket = await ticketService.findById(ticketId);
      ticket.privateChannelId = channelId;
      await ticketService.save(ticket);
    } else {
      console.log("Error in Creating Private Channel");
    }
  } catch (err) {
    console.warn("Error in Creating Private Channel: ", err.message);
  }
}

async function notifyTechnician(ticket, ticketInfo) {
  try {
    const message = [
      `🎫 *Ticket Id:* #${ticket.id}`,
      `*Subject:* ${ticketInfo.data.subject}`,
      `*Requester:* ${ticket.requester}`,
      `*Status:* ${ticketInfo.data.status}`,
    ].join("\n");
    const technician = await userRepository.findByEmail(
      ticketInfo.data.technician
    );
    const response = await outgoingService.postMessage(
      technician.id,
      message,
      null,
      process.env.BOT_ACCESS_TOKEN
    );
    console.log(`Notification sent to assignee with thread TS: ${threadTs}`);
    const threadTs = await jsonParserService.extractThreadTs(response);
    ticket.technicianThreadTs = threadTs;
    await ticketRepository.save(ticket);
  } catch (e) {
    console.log("Error in Sending notification to technician: " + e.message);
  }
}

async function updateTechnicianChannelTicketCard(ticket, ticketInfo) {
  const blocks = await getCardBlocks(ticket, ticketInfo);
  const imChannelPublicToPrivate =
    await imChannelPublicToPrivateRepository.findByPublicChannelId(
      ticket.channel
    );
  await outgoingService.updateBlocksMessage(
    imChannelPublicToPrivate.privateChannelId,
    ticket.technicianChannelConversationId,
    blocks,
    process.env.BOT_ACCESS_TOKEN
  );
}

async function getCardBlocks(ticket, ticketInfo) {
  const requester = await userRepository.findByUserId(ticket.requester);
  const technician = await userRepository.findByEmail(
    ticketInfo.data.technician
  );
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `🎫 *Ticket Id:* #${ticket.id}`,
          `*Subject:* ${ticketInfo.data.subject}`,
          `*Requester:* ${requester?.name || "Unknown"}`,
          `*Created:* ${ticketInfo.data.createdAt}`,
          `*Technician:* ${technician?.name || "Unassigned"}`,
          `*Status:* ${ticketInfo.data.status}`,
        ].join("\n"),
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Update",
          },
          action_id: "update_ticket",
          value: ticket.id.toString(),
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Close",
          },
          style: "danger",
          action_id: "close_ticket",
          value: ticket.id.toString(),
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Initiate Conversation",
          },
          action_id: "add_members",
          value: ticket.id.toString(),
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Add Note",
          },
          action_id: "add_note",
          value: ticket.id.toString(),
        },
      ],
    },
  ];

  return blocks;
}

async function relayMessage(message, ticket, fromAssignee, senderId) {
  try {
    console.log("Relaying message: " + message);
    if (ticket.privateChannelId) {
      const formattedMessage = `*<@${senderId}>:* ${message}`;
      console.log(
        "Sending message to private channel: " + ticket.privateChannelId
      );
      await outgoingService.postMessage(
        ticket.privateChannelId,
        senderId,
        message,
        null,
        process.env.BOT_ACCESS_TOKEN
      );
      return;
    }
    if (fromAssignee) {
      const formattedMessage = `*<@${senderId}>:* ${message}`;
      console.log("Sending message to requester: " + formattedMessage);
      await outgoingService.postMessage(
        ticket.channel,
        senderId,
        message,
        ticket.requesterThreadTs,
        process.env.BOT_ACCESS_TOKEN
      );
    }
    // } else {
    //   const ticketInfo = await axios.get(
    //     `http://localhost:8081/tickets/${ticket.id}`
    //   );
    //   console.log("Technician ", ticketInfo.data.technician);
    //   const technician = await userRepository.findByEmail(
    //     ticketInfo.data.technician
    //   );

    //   if (!technician || !technician.id) {
    //     console.log("Cannot relay message - ticket not assigned to anyone yet");
    //     return;
    //   }

    //   const formattedMessage = `*<@${senderId}>:* ${message}`;
    //   const response = await outgoingService.postMessage(
    //     technician.id,
    //     formattedMessage,
    //     ticket.technicianThreadTs,
    //     process.env.BOT_ACCESS_TOKEN
    //   );
    // }

    await agentChannelService.sendMessageToAgentChannel(ticket, senderId, message);
  } catch (e) {
    console.log("Error relaying message: " + e.message);
    console.error(e);
  }
}

async function createPrivateChannel(channelName) {
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

async function inviteUsersToChannel(channelId, userIds) {
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

async function inviteBotToChannel(channelId) {
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

module.exports = {
  relayMessage,
  replyMessage,
  notifyTechnician,
  updateTechnicianChannelTicketCard,
  initiateConversation,
};
