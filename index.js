const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const incomingController = require("./src/controller/slackIncomingController");
const psaIncomingController = require("./src/controller/psaIncomingController");
require("dotenv").config();

app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(incomingController);
app.use(psaIncomingController);

app.listen(8080, () => {
  console.log(`Slack handler running on port 8080`);
});
