const slackPrivateChannelService = require("./slackPrivateChannelService");
const slackService = require("./slackService");
const ticketService = require("./ticketService");
const jsonParserService = require("./jsonParserService");
const userRepository = require("../repository/userRepository");
const axios = require("axios");

async function handleInteraction(payload) {
  try {
    const type = payload.type;

    if (type === "block_actions") {
      const actions = payload.actions;
      if (!Array.isArray(actions) || actions.length === 0) {
        console.warn("⚠️ No actions found in Slack payload");
        return;
      }

      const action = actions[0];
      switch (action.action_id) {
        case "add_members":
          await slackPrivateChannelService
            .createPrivateChannel(action.value, null)
            .catch((err) => console.error("Failed to create channel", err));
          break;

        case "update_ticket":
          await slackService.openUpdateTicketCard(
            payload.trigger_id,
            action.value
          );
          break;

        case "initiate_approval":
          await slackService.openInitiateApprovalRequestCard(
            payload.trigger_id,
            action.value
          );
          break;

        case "take_action_expand":
          await slackService.openTakeActionCard(
            payload.trigger_id,
            action.value
          );
          break;

        case "assign_ticket_expand":
          await slackService.openAssignTicketCard(
            payload.trigger_id,
            action.value
          );
          break;

        case "add_note":
          await slackService.openAddNoteCard(payload.trigger_id, action.value);
          break;

        case "assign_to_me":
          const user = await userRepository.findByUserId(payload.user.id);
          await ticketService.updateTicket(
            action.value,
            user.email,
            null,
            null
          );
          break;

        case "assign_to_others":
          await slackService.openTechnicianCard(
            payload.trigger_id,
            action.value
          );
          break;

        case "approve_ticket":
        case "reject_ticket":
        case "more_info":
          await slackService.handleApproverAction(payload);
          break;

        default:
          console.log("Unhandled action:", action.action_id);
      }
    }
    if (type === "view_submission") {
      const callbackId = payload.view.callback_id;
      const ticketId = await jsonParserService.getTicketId(payload);
      switch (callbackId) {
        case "update_ticket_submit":
          const { priority, status } =
            await jsonParserService.getUpdateTicketFields(payload);
          await ticketService.updateTicket(ticketId, null, priority, status);
          break;

        case "update_technician_submit":
          const email = await jsonParserService.getTechnicianEmail(payload);
          await ticketService.updateTicket(ticketId, email, null, null);
          break;

        case "submit_approval":
          const { approvers, note } =
            await jsonParserService.parseInitiateApprovalPayload(payload);
          await slackService.sendApproverNotification(
            ticketId,
            approvers,
            note
          );
          break;

        case "submit_note":
          const noteText =
            payload.view.state.values.note_input_block.note_input.value;
          console.log("Note for Ticket", ticketId, "=>", noteText);
          await axios.post(`http://localhost:8081/ticket/${ticketId}/notes`, {
            note: noteText,
          });
          break;

        case "more_info_submit":
          const infoText =
            payload.view.state.values.info_block.info_input.value;
          console.log("Ticket Id : ", ticketId, "More Info : ", infoText);
          break;
      }
    }
  } catch (err) {
    console.error("Error handling Slack interaction:", err);
  }
}

module.exports = { handleInteraction };
