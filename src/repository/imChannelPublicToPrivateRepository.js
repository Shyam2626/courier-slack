const IMChannelPublicToPrivate = require("../models/imChannelPublicToPrivate");

const findByPrivateChannelId = async (channelId) => {
  return await IMChannelPublicToPrivate.findOne({
    where: {
      privateChannelId: channelId,
    },
  });
};

const findByPublicChannelId = async (channelId) => {
  return await IMChannelPublicToPrivate.findOne({
    where: {
      publicChannelId: channelId,
    },
  });
};

module.exports = { findByPrivateChannelId, findByPublicChannelId };
