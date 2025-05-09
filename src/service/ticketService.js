const axios = require("axios");
const jsonParserService = require("./jsonParserService");
const slackService = require("./slackService");
const ticketRepository = require("../repository/ticketRepository");

async function openUpdateTicketCard(ticketId, triggerId) {
  const technicians = await getTechnicians();
  const ticketUpdateFields = await getTicketUpdateFields(ticketId);
  const response = await openCard(
    triggerId,
    ticketId,
    technicians,
    ticketUpdateFields
  );
}

async function updateTicket(payload, ticketAction) {
  try {
    if (ticketAction === "UPDATE_TICKET") {
      const { ticketId, technicianEmail, priority, status } =
        await jsonParserService.parseUpdateTicketPayload(payload);
      const updateTicketRequestModel = {
        ticketId: ticketId,
        technician: technicianEmail,
        priority: priority,
        status: status,
      };
      const ticketInfo = await axios.post(
        "http://localhost:8081/update-ticket",
        updateTicketRequestModel
      );
      const ticket = await ticketRepository.findById(ticketId);
      // await slackService.notifyTechnician(ticket, ticketInfo);
      await slackService.updateTechnicianChannelTicketCard(ticket, ticketInfo);
    } else if (ticketAction === "CLOSE_TICKET") {
      const ticketId = await jsonParserService.getTicketId(payload);
      const updateTicketRequestModel = {
        ticketId: ticketId,
        status: "CLOSED",
      };
      const ticketInfo = await axios.post(
        "http://localhost:8081/update-ticket",
        updateTicketRequestModel
      );
      const ticket = await ticketRepository.findById(ticketId);
      await slackService.updateTechnicianChannelTicketCard(ticket, ticketInfo);
    }
  } catch (err) {
    console.log(`Error in Updating Ticket ${err}`);
  }
}

async function getTechnicians() {
  const response = await axios.get(
    `http://localhost:8081/technicians?source=SLACK`
  );
  console.log("Payload ", response.data);
  return response.data;
}

async function getTicketUpdateFields(ticketId) {
  const response = await axios.get(
    `http://localhost:8081/ticket/${ticketId}/fields`
  );
  console.log("Payload for Update Field fields", response.data);
  return response.data;
}

async function openCard(triggerId, ticketId, technicians, ticketUpdateFields) {
  const blocks = [
    {
      type: "input",
      block_id: "technician_block",
      label: {
        type: "plain_text",
        text: "Select Technician",
      },
      // element: {
      //   type: "static_select",
      //   action_id: "technician_select",
      //   options: technicians.map((technician) => ({
      //     text: {
      //       type: "plain_text",
      //       text: technician.name,
      //     },
      //     value: technician.email.toString(),
      //   })),
      // },
      element: {
        type: "static_select",
        action_id: "technician_select",
        options: technicians.map((technician) => ({
          text: {
            type: "plain_text",
            text: technician.name,
          },
          value: technician.email.toString(),
        })),
        initial_option: {
          text: {
            type: "plain_text",
            text: ticketUpdateFields.find(f => f.name === 'technician')?.value?.name || technicians[0].name,
          },
          value: ticketUpdateFields.find(f => f.name === 'technician')?.value?.email || technicians[0].email,
        }
      }
      
    },
  ];

  for (const field of ticketUpdateFields) {
    const block = {
      type: "input",
      block_id: `${field.name}_block`,
      label: {
        type: "plain_text",
        text: `Select ${capitalize(field.name)}`,
      },
      element: {},
    };

    if (field.type === "dropdown") {
      block.element = {
        type: "static_select",
        action_id: `${field.name}_select`,
        options: field.options.map((option) => ({
          text: {
            type: "plain_text",
            text: option,
          },
          value: option,
        })),
        initial_option: {
          text: {
            type: "plain_text",
            text: field.value.toUpperCase(),
          },
          value: field.value.toUpperCase(),
        },
      };
    } else if (field.type === "text") {
      block.element = {
        type: "plain_text_input",
        action_id: `${field.name}_input`,
        initial_value: field.value,
      };
    }

    blocks.push(block);
  }

  const dialog = {
    trigger_id: triggerId,
    view: {
      type: "modal",
      callback_id: "update_ticket_submit",
      title: {
        type: "plain_text",
        text: "Update Ticket",
      },
      submit: {
        type: "plain_text",
        text: "Confirm",
      },
      close: {
        type: "plain_text",
        text: "Cancel",
      },
      private_metadata: JSON.stringify({ ticketId }),
      blocks,
    },
  };

  return await axios.post("https://slack.com/api/views.open", dialog, {
    headers: {
      Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = { openUpdateTicketCard, updateTicket };
