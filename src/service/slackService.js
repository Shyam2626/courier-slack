const axios = require("axios");
const outgoingService = require("./outgoingService");
const agentChannelService = require("./agentChannelService");
const userRepository = require("../repository/userRepository");
const blockService = require("./blockService");
const ticketRepository = require("../repository/ticketRepository");
const imChannelPublicToPrivateRepository = require("../repository/imChannelPublicToPrivateRepository");

async function replyMessage(ticketId, message, email) {
  const ticket = await ticketRepository.findById(ticketId);
  if (ticket === null) {
    console.log("Ticket not found");
    return;
  }
  let senderId = null;
  if (email) {
    const user = await userRepository.findByEmail(email);
    senderId = user.userId;
  }
  await outgoingService.postMessage(
    ticket.channel,
    senderId,
    message,
    ticket.requesterThreadTs,
    process.env.BOT_ACCESS_TOKEN
  );

  const imChannelPublicToPrivate = await imChannelPublicToPrivateRepository.findByPublicChannelId(ticket.channel);

  await outgoingService.postMessage(
    imChannelPublicToPrivate.privateChannelId,
    senderId,
    message,
    ticket.technicianChannelConversationId,
    process.env.BOT_ACCESS_TOKEN
  );
}

async function openTakeActionCard(triggerId, ticketId) {
  const takeActionCardBlocks = await blockService.getTakeActionBlock(ticketId);
  await axios.post(
    "https://slack.com/api/views.open",
    { trigger_id: triggerId, view: takeActionCardBlocks },
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function openInitiateApprovalRequestCard(triggerId, ticketId) {
  const ticketInfo = await axios.get(
    `http://localhost:8081/tickets/${ticketId}`
  );
  const ticket = await ticketRepository.findById(ticketId);
  const technician = await userRepository.findByEmail(
    ticketInfo.data.technician
  );
  const requester = await userRepository.findByEmail(ticketInfo.data.email);
  const initiateApprovalBlocks =
    await blockService.getInitiateApprovalRequestBlock(
      triggerId,
      ticketId,
      ticketInfo,
      requester.name,
      technician?.name ?? "Unassigned"
    );
  return await axios.post(
    "https://slack.com/api/views.push",
    initiateApprovalBlocks,
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function openUpdateTicketCard(triggerId, ticketId) {
  const response = await axios.get(
    `http://localhost:8081/ticket/${ticketId}/fields`
  );

  const updateTicketBlocks = await blockService.getUpdateTicketBlock(
    triggerId,
    ticketId,
    response.data
  );
  return await axios.post(
    "https://slack.com/api/views.open",
    updateTicketBlocks,
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function openTechnicianCard(triggerId, ticketId) {
  const response = await axios.get(
    `http://localhost:8081/technicians?source=SLACK`
  );
  console.log("Payload ", response.data);
  const technicianCardBlocks = await blockService.getTechnicianBlock(
    triggerId,
    ticketId,
    response.data
  );
  return await axios.post(
    "https://slack.com/api/views.push",
    technicianCardBlocks,
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function openAssignTicketCard(triggerId, ticketId) {
  const assignTicketCardBlocks = await blockService.getAssignTicketBlock(
    ticketId
  );
  await axios.post(
    "https://slack.com/api/views.open",
    { trigger_id: triggerId, view: assignTicketCardBlocks },
    {
      headers: {
        Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

// async function openAddNoteCard(triggerId, ticketId) {
//   const notePayload = {
//     trigger_id: triggerId,
//     view: {
//       type: "modal",
//       callback_id: "submit_note",
//       title: {
//         type: "plain_text",
//         text: "Add Note",
//       },
//       submit: {
//         type: "plain_text",
//         text: "Submit",
//       },
//       close: {
//         type: "plain_text",
//         text: "Cancel",
//       },
//       private_metadata: ticketId,
//       blocks: [
//         {
//           type: "input",
//           block_id: "note_input_block",
//           element: {
//             type: "plain_text_input",
//             multiline: true,
//             action_id: "note_input",
//             placeholder: {
//               type: "plain_text",
//               text: "Enter your note here...",
//             },
//           },
//           label: {
//             type: "plain_text",
//             text: "Note",
//           },
//         },
//       ],
//     },
//   };

//   await axios.post("https://slack.com/api/views.open", notePayload, {
//     headers: {
//       Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
//       "Content-Type": "application/json",
//     },
//   });
// }

async function openAddNoteCard(triggerId, ticketId) {
  console.log(
    "🟢 Opening Add Note Modal for ticket:",
    ticketId,
    "with trigger_id:",
    triggerId
  );

  const notePayload = {
    trigger_id: triggerId,
    view: {
      type: "modal",
      callback_id: "submit_note",
      title: {
        type: "plain_text",
        text: "Add Note",
      },
      submit: {
        type: "plain_text",
        text: "Submit",
      },
      close: {
        type: "plain_text",
        text: "Cancel",
      },
      private_metadata: ticketId,
      blocks: [
        {
          type: "input",
          block_id: "note_input_block",
          element: {
            type: "plain_text_input",
            multiline: true,
            action_id: "note_input",
            placeholder: {
              type: "plain_text",
              text: "Enter your note here...",
            },
          },
          label: {
            type: "plain_text",
            text: "Note",
          },
        },
      ],
    },
  };

  try {
    const response = await axios.post(
      "https://slack.com/api/views.push",
      notePayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Slack modal response:", response.data);
  } catch (err) {
    console.error(
      "❌ Error opening Add Note modal:",
      err.response?.data || err.message
    );
  }
}

async function updateChannelCards(ticket, ticketInfo) {
  const requester = await userRepository.findByEmail(ticketInfo.data.email);
  let technician = null;
  if (ticketInfo.data.technician) {
    technician = await userRepository.findByEmail(ticketInfo.data.technician);
  }

  const technicianChannelTicketCardBlocks =
    await blockService.getTicketChannelBlock(
      ticket,
      ticketInfo,
      requester.name,
      technician?.name ?? "Unassigned"
    );
  const requesterChannelTicketCardBlocks =
    await getRequesterChannelTicketCardBlock(ticket, ticketInfo);
  const imChannelPublicToPrivate =
    await imChannelPublicToPrivateRepository.findByPublicChannelId(
      ticket.channel
    );
  await outgoingService.updateBlocksMessage(
    imChannelPublicToPrivate.privateChannelId,
    ticket.technicianChannelConversationId,
    technicianChannelTicketCardBlocks,
    process.env.BOT_ACCESS_TOKEN
  );
  await outgoingService.updateBlocksMessage(
    ticket.channel,
    ticket.requesterChannelBlockThreadTs,
    requesterChannelTicketCardBlocks,
    process.env.BOT_ACCESS_TOKEN
  );
}

async function handleApproverAction(payload) {
  const ticketId = payload.actions[0].value;
  const userId = payload.user.id;
  const actionId = payload.actions[0].action_id;

  if (actionId === "approve_ticket" || actionId === "reject_ticket") {
    const actionType =
      payload.actions[0].action_id === "approve_ticket"
        ? "Approved ✅"
        : "Rejected ❌";

    const updatedBlocks = [...payload.message.blocks];
    const actionBlockId = `ticket_action_${ticketId}`;
    const actionBlockIndex = updatedBlocks.findIndex(
      (block) => block.block_id === actionBlockId
    );
    if (actionBlockIndex !== -1) {
      updatedBlocks[actionBlockIndex] = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${actionType}*`,
        },
      };
    }

    await axios.post(
      "https://slack.com/api/chat.update",
      {
        channel: payload.channel.id,
        ts: payload.message.ts,
        blocks: updatedBlocks,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        },
      }
    );

    const ticket = await ticketRepository.findById(ticketId);
    const ticketInfo = await axios.get(
      `http://localhost:8081/tickets/${ticketId}`
    );

    let technician = "Unassigned";

    // Check if technician is present and not null/undefined
    if (ticketInfo.data.technician) {
      const technicianData = await userRepository.findByEmail(
        ticketInfo.data.technician
      );
      if (technicianData && technicianData.userId) {
        technician = `<@${technicianData.userId}>`;
      }
    }

    const requester = await userRepository.findByEmail(ticketInfo.data.email);

    const message = `✅ Ticket #${ticketId} has been *approved* by <@${userId}>.\n*Technician:* ${technician}\n*Requester:* <@${requester.userId}>`;

    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: ticket.channel,
        thread_ts: ticket.requesterThreadTs,
        text: message,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const imChannelPublicToPrivate =
      await imChannelPublicToPrivateRepository.findByPublicChannelId(
        ticket.channel
      );

    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: imChannelPublicToPrivate.privateChannelId,
        thread_ts: ticket.technicianChannelConversationId,
        text: message,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } else if (actionId === "more_info") {
    await axios.post(
      "https://slack.com/api/views.open",
      {
        trigger_id: payload.trigger_id,
        view: {
          type: "modal",
          callback_id: "more_info_submit",
          private_metadata: JSON.stringify({
            ticketId,
          }),
          title: { type: "plain_text", text: "More Info" },
          submit: { type: "plain_text", text: "Submit" },
          close: { type: "plain_text", text: "Cancel" },
          blocks: [
            {
              type: "input",
              block_id: "info_block",
              label: { type: "plain_text", text: "Enter additional info" },
              element: {
                type: "plain_text_input",
                action_id: "info_input",
                multiline: true,
              },
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
        },
      }
    );
  }
}

async function getRequesterChannelTicketCardBlock(ticket, ticketInfo) {
  const createdAt = await formatCreatedDate(ticketInfo.data.createdAt);
  let technicianName = "Unassigned";
  if (ticketInfo.data.technician) {
    const user = await userRepository.findByEmail(ticketInfo.data.technician);
    technicianName = user.name;
  }

  const requesterChannelBlocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*New Ticket created with ID:* ${ticketInfo.data.id}\n${ticketInfo.data.subject}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Status:* ${ticketInfo.data.status}\n*Assigned To:* ${
          technicianName ?? "Unassigned"
        }\n*Created Date:* ${createdAt}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Update properties",
          },
          action_id: "update_ticket",
          value: ticket.id.toString(),
        },
      ],
    },
  ];

  return requesterChannelBlocks;
}

async function relayMessage(message, ticket, fromAssignee, senderId) {
  try {
    console.log("Relaying message: " + message);
    if (ticket.privateChannelId) {
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

    await agentChannelService.sendMessageToAgentChannel(
      ticket,
      senderId,
      message
    );
  } catch (e) {
    console.log("Error relaying message: " + e.message);
    console.error(e);
  }
}

async function sendApproverNotification(ticketId, approvers, note) {
  const ticketInfo = await axios.get(
    `http://localhost:8081/tickets/${ticketId}`
  );

  const requester = await userRepository.findByEmail(ticketInfo.data.email);

  let technicianName = "Unassigned";
  if (ticketInfo.data.technician) {
    const technician = await userRepository.findByEmail(
      ticketInfo.data.technician
    );
    technicianName = technician.name;
  }

  for (let approver of approvers) {
    const initiateApprovalMessageBlock =
      await blockService.getInitiateApprovalMessageBlock(
        approver,
        ticketId,
        ticketInfo,
        note,
        requester.name,
        technicianName
      );
    await axios.post(
      "https://slack.com/api/chat.postMessage",
      initiateApprovalMessageBlock,
      {
        headers: {
          Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  }
}

async function formatCreatedDate(rawDateStr) {
  const date = new Date(rawDateStr);
  const options = {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

module.exports = {
  relayMessage,
  replyMessage,
  updateChannelCards,
  openAddNoteCard,
  getRequesterChannelTicketCardBlock,
  openTakeActionCard,
  openAssignTicketCard,
  openTechnicianCard,
  openUpdateTicketCard,
  openInitiateApprovalRequestCard,
  sendApproverNotification,
  handleApproverAction,
};
