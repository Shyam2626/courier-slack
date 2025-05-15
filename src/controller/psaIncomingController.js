const slackService = require('../service/slackService');
const slackPrivateChannelService = require('../service/slackPrivateChannelService');

module.exports = function (server) {
  // POST /api/sendReply
  server.post("/api/sendReply", async (req, res) => {
    try {
      const { ticketId, message, email } = req.body;
      await slackService.replyMessage(ticketId, message, email);
      res.send(200, { success: true });
    } catch (error) {
      console.error("Error in /api/sendReply:", error);
      res.send(500, { success: false, error: error.message });
    }
  });

  // POST /initiateConversation
  server.post("/initiateConversation", async (req, res) => {
    try {
      const { ticketId, requesterEmail, technicianEmail } = req.body;
      await slackPrivateChannelService.createPrivateChannel(ticketId, technicianEmail);
      res.send(200, { success: true });
    } catch (error) {
      console.error("Error in /initiateConversation:", error);
      res.send(500, { success: false, error: error.message });
    }
  });
};
