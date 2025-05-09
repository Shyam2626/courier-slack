const { DataTypes } = require("sequelize");
const { sequelize } = require('../config/db');

const IMChannelPublicToPrivate = sequelize.define(
  "IMChannelPublicToPrivate",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    privateChannelId: DataTypes.STRING,
    publicChannelId: DataTypes.STRING,
  },
  {
    tableName: "IMChannelPublicToPrivate",
    timestamps: false,
  }
);

module.exports = IMChannelPublicToPrivate;