const express = require("express");
const router = express.Router();

const slackService = require('../service/slackService');
const slackPrivateChannelService = require('../service/slackPrivateChannelService');

router.post("/api/sendReply", async (req, res) => {
  const { ticketId, message, email } = req.body;
  await slackService.replyMessage(ticketId, message, email);
  res.status(200).json({ success: true });
});

router.post('/initiateConversation', async (req, res) => {
  const {ticketId, requesterEmail, technicianEmail} = req.body;
  slackPrivateChannelService.createPrivateChannel(ticketId, technicianEmail);
})

module.exports = router;
