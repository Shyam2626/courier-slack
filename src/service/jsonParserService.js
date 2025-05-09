async function extractThreadTs(response) {
  if (!response) {
    console.error("Slack response is undefined or null");
    return null;
  }

  try {
    if (response.data && response.data.ok === true) {
      return response.data.ts;
    }

    if (typeof response === "string") {
      const jsonNode = JSON.parse(response);
      if (jsonNode.ok === true) {
        return jsonNode.ts;
      }
    }

    if (response.ok === true) {
      return response.ts;
    }
  } catch (e) {
    console.error("Failed to parse Slack response:", e);
  }
  return null;
}

async function getTicketId(payload) {
  const ticketMetadata = JSON.parse(payload.view.private_metadata);
  return ticketMetadata.ticketId;
}

async function parseUpdateTicketPayload(payload) {
  const ticketMetadata = JSON.parse(payload.view.private_metadata);
  const ticketId = ticketMetadata.ticketId;
  const technicianEmail =
    payload.view.state.values.technician_block.technician_select.selected_option
      .value;
  const priority =
    payload.view.state.values.priority_block.priority_select.selected_option
      .value;
  const status =
    payload.view.state.values.status_block.status_select.selected_option.value;
  return { ticketId, technicianEmail, priority, status };
}

module.exports = { extractThreadTs, parseUpdateTicketPayload, getTicketId };
