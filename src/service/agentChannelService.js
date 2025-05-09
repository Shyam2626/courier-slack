const imChannelPublicToPrivateRepository = require("../repository/imChannelPublicToPrivateRepository");
const outgoingService = require("./outgoingService");
const jsonParserService = require("./jsonParserService");
const userRepository = require("../repository/userRepository");
const mirroredMessages = new Map();

async function sendMessageToAgentChannel(ticket, userId, messageText) {
  try {
    const imChannelPublicToPrivate =
      await imChannelPublicToPrivateRepository.findByPublicChannelId(
        ticket.channel
      );
    const messageUniqueId = `${ticket._id}:${userId}:${hashCode(messageText)}`;
    if (mirroredMessages.has(messageUniqueId)) {
      console.log("Message already mirrored:", messageUniqueId);
      return;
    }
    mirroredMessages.set(messageUniqueId, true);
    const ticketThreadTs = await getOrCreateTicketThreadInChannel(
      ticket,
      imChannelPublicToPrivate.privateChannelId,
      messageText
    );
    const response = await outgoingService.postMessage(
      imChannelPublicToPrivate.privateChannelId,
      userId,
      messageText,
      ticketThreadTs,
      process.env.BOT_ACCESS_TOKEN
    );
    console.log(
      `Response in Agent channel : ${response.ts} Message : ${messageText}`
    );
    if (response && response.data && response.data.ts) {
      console.log(
        `In Agent channel , ${response.data.ts}, message : ${messageText}`
      );
    }
  } catch (err) {
    console.error("Error mirroring message:", err.message);
  }
}

async function getOrCreateTicketThreadInChannel(ticket, channelId, subject) {
  if (ticket.technicianChannelConversationId)
    return ticket.technicianChannelConversationId;
  const requester = await userRepository.findByUserId(ticket.requester);
  const technicianCard = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `🎫 *Ticket Id:* #${ticket.id}`,
          `*Subject:* ${subject}`,
          `*Requester:* ${requester.name}`,
          `*Created:* ${new Date().toUTCString()}`,
          `*Technician:* ${"Unassigned"}`,
          `*Status:* ${null}`,
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

  const response = await outgoingService.postBlockMessage(
    channelId,
    technicianCard,
    null,
    process.env.BOT_ACCESS_TOKEN
  );

  const threadTs = await jsonParserService.extractThreadTs(response);
  if (threadTs) {
    ticket.technicianChannelConversationId = threadTs;
    await ticket.save();
    console.log(ticket);
  }
  return threadTs;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

module.exports = {
  sendMessageToAgentChannel,
};
