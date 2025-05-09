const express = require("express");
const router = express.Router();

const interactionHandler = require('../service/interactionHandler');

const messageProcessor = require("../service/messageProcessor");
const slackPrivateChannelService = require("../service/slackPrivateChannelService");
const ticketService = require("../service/ticketService");
const commandHandlerService = require("../service/commandHandlerService");

//For messages
router.post("/slack/receive", async (req, res) => {
  try {
    const payload = req.body;
    console.log("Payload ", payload);
    if (payload.challenge) {
      return res.send(payload.challenge);
    }
    res.sendStatus(200);
    messageProcessor.processPayload(payload, res);
  } catch (e) {
    console.error("Error processing Slack event:", e);
  }
});

//For interactions (i.e) Cards and button actions
router.post("/slack/interaction", async (req, res) => {

  try {
    const payloadNode = req.body.payload
      ? JSON.parse(req.body.payload)
      : req.body;
    console.log("Payload", payloadNode);
    interactionHandler.handleInteraction(payloadNode, res);
  } catch (err) {
    console.error("Error handling Slack interaction:", err);
    return res.status(500).send("Internal Server Error");
  }
});

//For handling Commands
router.post("/slack/command/receive", async (req, res) => {
  commandHandlerService.handleCommands(req.body);
  res.sendStatus(200);
});

module.exports = router;
