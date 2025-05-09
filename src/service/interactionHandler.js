async function handleInteraction(payload) {
  try {
    const type = payload.type;
    if (type === "block_actions") {
      const actions = payload.actions;
      if (!Array.isArray(actions) || actions.length === 0) {
        console.warn("⚠️ No actions found in Slack payload");
        return res.status(400).send("No actions found.");
      }
      const action = actions[0];
      if (action.action_id === "add_members") {
        res.sendStatus(200);
        const ticketId = action.value;
        await slackPrivateChannelService
          .createPrivateChannel(
            ticketId,
            null // technicianEmail
          )
          .catch((err) => console.error("Failed to create channel", err));
      } else if (action.action_id === "update_ticket") {
        const triggerId = payload.trigger_id;
        const ticketId = action.value;
        return await ticketService.openUpdateTicketCard(ticketId, triggerId);
      } else if (action.action_id === "close_ticket") {
        await ticketService.updateTicket(payload, "CLOSE_TICKET");
        console.log("Close Ticket Called");
        return res.sendStatus(200);
      } else {
        console.log("Action Id", action.id);
        return res.sendStatus(200);
      }
    } else if (type === "view_submission") {
      const callbackId = payload.view.callback_id;
      if (callbackId === "update_ticket_submit") {
        return await ticketService.updateTicket(payload, "UPDATE_TICKET");
      } else if (callbackId === "submit_note") {
        res.sendStatus(200);
        const ticketId = payload.view.private_metadata;
        const noteText =
          payload.view.state.values.note_input_block.note_input.value;
        console.log("Note for Ticket", ticketId, "=>", noteText);
        await axios.post(`http://localhost:8081/ticket/${ticketId}/notes`, {
          note: noteText,
        });
      }
      return res.sendStatus(200);
    }
  } catch (err) {
    console.error("Error handling Slack interaction:", err);
    return res.status(500).send("Internal Server Error");
  }
}

module.exports = { handleInteraction };
