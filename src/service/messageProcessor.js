const { Mutex } = require("async-mutex");
const axios = require("axios");

const processedMessages = new Map();
const channelLocks = new Map();

const imChannelPublicToPrivateRepository = require("../repository/imChannelPublicToPrivateRepository");
const ticketRepository = require("../repository/ticketRepository");
const outgoingService = require("./outgoingService");
const messageHandler = require("./messageHandler");
const userRepository = require("../repository/userRepository");

const processPayload = async (payload, res) => {
  try {
    const teamId = payload.team_id;
    const eventNode = payload.event;

    if (eventNode && eventNode.type === "message") {
      if (eventNode.bot_id || eventNode.subtype) {
        return;
      }

      const userId = eventNode.user;
      const channelId = eventNode.channel;
      const messageText = eventNode.text;
      const messageTs = eventNode.ts;
      const eventTs = eventNode.event_ts;
      const threadTs = eventNode.thread_ts || null;
      const messageUniqueId = `${channelId}:${messageTs}`;

      if (isMessageAlreadyProcessed(messageUniqueId)) {
        console.log(`Duplicate message detected: ${messageUniqueId}`);
        return;
      }

      const lock = getLockForChannel(channelId);
      await lock.runExclusive(async () => {
        if (isMessageAlreadyProcessed(messageUniqueId)) {
          console.log(`Duplicate caught in sync block: ${messageUniqueId}`);
          return;
        }

        markMessageAsProcessed(messageUniqueId);

        const imChannel =
          await imChannelPublicToPrivateRepository.findByPrivateChannelId(
            channelId
          );
        let ticket = null;
        if (imChannel && threadTs) {
          ticket = await ticketRepository.findByTechnicianChannelConversationId(
            threadTs
          );
        }

        if (imChannel && ticket) {
          //Message is form Private Channel
          console.log("Ticket found via im channel and threadTs ", threadTs);

          // Sending conversation to PSA
          const user = await userRepository.findByUserId(userId);
          const payload = {
            email: user.email,
            message: messageText,
          };
          await axios.post(
            `http://localhost:8081/ticket/${ticket.id}/reply`,
            payload
          );

          // Sending to Public Channel
          const response = await outgoingService.postMessage(
            imChannel.publicChannelId,
            userId,
            messageText,
            ticket.requesterThreadTs,
            process.env.BOT_ACCESS_TOKEN
          );

          console.log("Response from Agent Channel Message ", response);
          return;
        }

        console.log(
          "Ticket not found via private channel and threadTs ",
          threadTs
        );
        const ticketByChannel = await ticketRepository.findByPrivateChannelId(
          channelId
        );

        if (ticketByChannel) {
          await messageHandler.handlePrivateChannelMessage(
            userId,
            channelId,
            messageText,
            eventTs,
            teamId
          );
        } else if (threadTs) {
          await messageHandler.handleThreadReply(
            userId,
            channelId,
            messageText,
            threadTs,
            eventTs,
            teamId
          );
        } else if (isDirectMessage(channelId)) {
          await messageHandler.handleDirectMessage(
            userId,
            messageText,
            teamId,
            eventTs
          );
        } else {
          await messageHandler.handleChannelMessage(
            userId,
            channelId,
            messageText,
            teamId,
            eventTs
          );
        }
      });
    }
  } catch (e) {
    console.error("Error processing Slack event:", e);
  }
};

function getLockForChannel(channelId) {
  if (!channelLocks.has(channelId)) {
    channelLocks.set(channelId, new Mutex());
  }
  return channelLocks.get(channelId);
}

function isMessageAlreadyProcessed(id) {
  return processedMessages.has(id);
}

function markMessageAsProcessed(id) {
  processedMessages.set(id, true);
}

function isDirectMessage(channelId) {
  return channelId && channelId.startsWith("D");
}

module.exports = { processPayload };
