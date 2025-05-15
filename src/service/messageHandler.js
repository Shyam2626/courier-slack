const ticketRepository = require("../repository/ticketRepository");
const userRepository = require("../repository/userRepository");
const outgoingService = require("./outgoingService");
const agentChannelService = require("./agentChannelService");
const slackService = require("./slackService");
const jsonParserService = require("./jsonParserService");
const axios = require("axios");

async function handlePrivateChannelMessage(
  userId,
  channelId,
  messageText,
  eventTs,
  teamId
) {
  try {
    const ticket = await ticketRepository.findByPrivateChannelId(channelId);

    if (ticket) {
      console.log(
        `Found ticket id: ${ticket.id} for private channel: ${channelId}`
      );
      const user = await userRepository.findByUserId(userId);
      const payload = {
        email: user.email,
        message: messageText,
      };
      await axios.post(
        `http://localhost:8081/ticket/${ticket.id}/reply`,
        payload
      );

      // await relayMessageFromPrivateChannel(
      //   messageText,
      //   ticket,
      //   isFromAssignee,
      //   userId
      // );
    } else {
      await handleChannelMessage(
        userId,
        channelId,
        messageText,
        teamId,
        eventTs
      );
    }
  } catch (error) {
    console.error("Error handling private channel message:", error);
  }
}

async function handleThreadReply(
  userId,
  channelId,
  messageText,
  threadTs,
  eventTs,
  teamId
) {
  console.log(
    `Message received - userId: ${userId}, channelId: ${channelId}, teamId: ${teamId}, message: ${messageText}`
  );

  const ticket = await ticketRepository.findByRequesterThreadTs(threadTs);

  // if (!ticket && threadTs) {
  //   ticket = await ticketRepository.findByTechnicianThreadTs(threadTs);
  //   if (ticket) {
  //     lookupMethod = "technician";
  //     console.log(
  //       `Ticket by assigneeThreadTs/teamId: ${ticket ? ticket.id : "not found"}`
  //     );
  //   }
  // }

  if (ticket) {
    console.log(`Found ticket id: ${ticket.id}`);

    const user = await userRepository.findByUserId(userId);
    const payload = {
      email: user.email,
      message: messageText,
    };
    await axios.post(
      `http://localhost:8081/ticket/${ticket.id}/reply`,
      payload
    );

    // await slackService.relayMessage(
    //   messageText,
    //   ticket,
    //   isFromAssignee,
    //   userId
    // );

    //techician send message from help channel
    await agentChannelService.sendMessageToAgentChannel(
      ticket,
      userId,
      messageText
    );
  } else {
    console.log(
      `No matching ticket found for channelId: ${channelId} or threadTs: ${threadTs}`
    );
  }
}

// async function handleDirectMessage(userId, messageText, teamId, eventTs) {
//   const workspace = await workspaceService.findByTeamId(teamId);
//   if (!workspace) throw new Error("Workspace not found");

//   const ticket = await ticketService.createTicket(
//     userId,
//     userId,
//     messageText,
//     teamId,
//     eventTs
//   );

//   const response = await slackClientService.sendMessage(
//     userId,
//     `✅ Your issue is registered. Ticket ID: ${ticket.id}`,
//     eventTs,
//     workspace.botAccessToken
//   );

//   const threadTs = slackClientService.extractThreadTs(response);
//   if (threadTs) {
//     ticket.threadTs = threadTs;
//     await ticketService.save(ticket);
//     await ticket.addRelatedThreadTs(threadTs);
//   }

//   await duplicateChannelService.mirrorMessageToTicketChannel(
//     ticket,
//     userId,
//     messageText,
//     false
//   );
// }

async function handleChannelMessage(
  userId,
  channelId,
  messageText,
  teamId,
  eventTs
) {
  const user = await userRepository.findByUserId(userId);

  const ticketRequest = {
    subject: messageText,
    provider: "SLACK",
    email: user.email,
  };

  const ticketInfo = await axios.post(
    `http://localhost:8081/create-ticket`,
    ticketRequest
  );
  console.log("Ticket", ticketInfo.data);
  const ticket = await ticketRepository.createTicket(
    ticketInfo.data.id,
    userId,
    channelId,
    eventTs
  );
  const requesterChannelBlocks =
    await slackService.getRequesterChannelTicketCardBlock(ticket, ticketInfo);
  const response = await outgoingService.postBlockMessage(
    channelId,
    requesterChannelBlocks,
    eventTs,
    process.env.BOT_ACCESS_TOKEN
  );
  const requesterChannelBlockThreadTs = await jsonParserService.extractThreadTs(
    response.data
  );
  ticket.requesterChannelBlockThreadTs = requesterChannelBlockThreadTs;
  ticketRepository.save(ticket);
  await agentChannelService.sendMessageToAgentChannel(
    ticket,
    userId,
    messageText,
    ticketInfo
  );
}

async function relayMessageFromPrivateChannel(
  message,
  ticket,
  fromAssignee,
  userId
) {
  try {
    console.log(`Relaying message from private channel: ${message}`);

    if (fromAssignee) {
      if (ticket.requesterThreadTs) {
        console.log(`Sending message to requester thread: ${message}`);
        await outgoingService.postMessage(
          ticket.channel,
          userId,
          message,
          ticket.requesterThreadTs,
          process.env.BOT_ACCESS_TOKEN
        );
      } else {
        console.log("Cannot relay to requester - missing thread information");
      }
    }
    // } else {
    //   if (ticket.technicianThreadTs) {
    //     console.log(`Sending message to assignee thread: ${message}`);
    //     const ticketInfo = await axios.get(
    //       `http://localhost:8081/tickets/${ticket.id}`
    //     );
    //     console.log("Technician ", ticketInfo.data.technician);
    //     const technician = await slackUserService.findByEmail(
    //       ticketDetails.data.technician
    //     );
    //     await outgoingService.postMessage(
    //       technician.id,
    //       formattedMessage,
    //       ticket.technicianThreadTs,
    //       process.env.BOT_ACCESS_TOKEN
    //     );
    //   } else {
    //     console.log("Cannot relay to assignee - missing thread information");
    //   }
    // }
  } catch (err) {
    console.error("Error relaying message from private channel:", err);
  }
}

module.exports = {
  handlePrivateChannelMessage,
  handleThreadReply,
  handleChannelMessage,
};
