const axios = require("axios");
const userRepository = require('../repository/userRepository');

async function postMessage(channelId, userId, message, threadTs, token) {
  try {
    const user = await userRepository.findByUserId(userId);
    const payload = {
      channel: channelId,
      text: message,
      username: user.name || "Unknown-User",
      icon_url: user.imageUrl
    };

    if (threadTs) {
      payload.thread_ts = threadTs;
    }

    const response = await axios.post(
      "https://slack.com/api/chat.postMessage",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Slack Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error sending Slack message:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function postBlockMessage(channelId, blocks, threadTs, token) {
  const body = {
    channel: channelId,
    blocks,
  };
  if (threadTs) body.thread_ts = threadTs;

  const response = await axios.post(
    "https://slack.com/api/chat.postMessage",
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

async function updateBlocksMessage(channel, ts, blocks, token) {
  return await axios.post(
    "https://slack.com/api/chat.update",
    {
      channel,
      ts,
      blocks,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
}

module.exports = { postMessage, postBlockMessage, updateBlocksMessage };
