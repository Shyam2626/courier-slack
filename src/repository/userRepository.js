const User = require("../models/user");

const findByUserId = async (userId) => {
  return await User.findOne({
    where: { userId: userId },
  });
};

const findByEmail = async (email) => {
  return await User.findOne({
    where : {email : email}
  });
};

module.exports = { findByUserId, findByEmail };
