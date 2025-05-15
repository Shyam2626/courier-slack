const interactionHandler = require('../service/interactionHandler');
const messageProcessor = require("../service/messageProcessor");
const commandHandlerService = require("../service/commandHandlerService");

module.exports = function (server) {
  // For messages
  server.post("/slack/receive", async (req, res) => {
    try {
      const payload = req.body;
      console.log("Payload ", payload);

      if (payload.challenge) {
        res.send(200, payload.challenge);
      }

      res.send(200);
      messageProcessor.processPayload(payload, res);
    } catch (e) {
      console.error("Error processing Slack event:", e);
      res.send(500, "Internal Server Error");
    }
  });

  // For interactions (cards, buttons, etc.)
  server.post("/slack/interaction", async (req, res) => {
    try {
      const payloadNode = req.body.payload
        ? JSON.parse(req.body.payload)
        : req.body;

      console.log("Payload", payloadNode);
      interactionHandler.handleInteraction(payloadNode, res);
      res.send(200);
    } catch (err) {
      console.error("Error handling Slack interaction:", err);
      res.send(500, "Internal Server Error");
    }
  });

  // For commands
  server.post("/slack/command/receive", async (req, res) => {
    commandHandlerService.handleCommands(req.body);
    res.send(200);
  });
};
