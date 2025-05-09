const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const IMAccount = sequelize.define(
  "IMAccount",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    adminAccessToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    botAccessToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    orgId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    orgName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    superOpsOrgId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM("SLACK", "TEAMS"),
      allowNull: true,
    },
  },
  {
    tableName: "IMAccount",
    timestamps: false,
  }
);

module.exports = IMAccount;
