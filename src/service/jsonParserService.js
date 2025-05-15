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

async function getTechnicianEmail(payload) {
  return payload.view.state.values.technician_block.technician_select
    .selected_option.value;
}

async function getUpdateTicketFields(payload) {
  const priority =
    payload.view.state.values.priority_block.priority_select.selected_option
      .value;
  const status =
    payload.view.state.values.status_block.status_select.selected_option.value;
  return { priority, status };
}

async function parseInitiateApprovalPayload(payload) {
  const stateValues = payload.view.state.values;
  const approvers =
    stateValues?.approver_block?.approver_select?.selected_users || [];
  const note = stateValues?.note_block?.note_input?.value || "";

  return { approvers, note };
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
  extractThreadTs,
  parseUpdateTicketPayload,
  getTicketId,
  getTechnicianEmail,
  formatCreatedDate,
  getUpdateTicketFields,
  parseInitiateApprovalPayload
};
