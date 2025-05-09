const axios = require("axios");
const userRepository = require("../repository/userRepository");

async function handleCommands(payload) {
  const responseUrl = payload.response_url;
  const command = payload.command;
  const userId = payload.user_id;
  const user = await userRepository.findByUserId(userId);

  if (command === "/mytickets") {
    try {
      const response = await axios.get(
        `http://localhost:8081/tickets?email=${encodeURIComponent(user.email)}`
      );

      const tickets = response.data;
      if (!tickets || tickets.length === 0) {
        await axios.post(responseUrl, {
          response_type: "ephemeral",
          text: "No tickets found for your account.",
        });
        return;
      }
      const blocks = tickets.map((ticket) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `ID: \`${ticket.id}\` \n
                Subject: ${ticket.subject}\n
                Email: ${ticket.email}`,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Ticket",
          },
          url: `http://localhost:8081/ticket/${ticket.id}`,
          action_id: `view_ticket_${ticket.id}`,
        },
      }));
      blocks.unshift({
        type: "header",
        text: {
          type: "plain_text",
          text: "🎫 Your Tickets",
        },
      });
      blocks.splice(1, 0, { type: "divider" });
      await axios.post(responseUrl, {
        response_type: "ephemeral",
        blocks: blocks,
      });
    } catch (err) {
      console.log(
        `Error in getting MyTickets through Command. UserID - ${userId}: ${err.message}`
      );
      await axios.post(responseUrl, {
        response_type: "ephemeral",
        text: "Something went wrong while fetching your tickets.",
      });
    }
  } else if (command === "/viewticket") {
    try {
      const ticketId = payload.text.trim();
      if (!ticketId) {
        await axios.post(responseUrl, {
          response_type: "ephemeral",
          text: "Please provide a ticket ID, e.g. `/viewticket TICKET123`",
        });
        return;
      }
      const response = await axios.get(
        `http://localhost:8081/tickets/${encodeURIComponent(ticketId)}`
      );
      const ticket = response.data;
      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🎟️ Ticket Details: ${ticket.id}`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Status:*\n${ticket.status || "Not Set"}`,
            },
            {
              type: "mrkdwn",
              text: `*Priority:*\n${ticket.priority || "Not Set"}`,
            },
            {
              type: "mrkdwn",
              text: `*Technician:*\n${ticket.technician || "Unassigned"}`,
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
                text: "Open Ticket",
              },
              url: `http://localhost:8081/ticket/${ticket.id}`,
              action_id: "open_ticket_link",
            },
          ],
        },
      ];
      await axios.post(responseUrl, {
        response_type: "ephemeral",
        blocks: blocks,
      });
    } catch (err) {
      console.error("Error fetching ticket:", err.message);
      await axios.post(responseUrl, {
        response_type: "ephemeral",
        text: `Could not find ticket with ID: ${text}`,
      });
    }
  }
}

module.exports = { handleCommands };
