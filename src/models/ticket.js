const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Ticket = sequelize.define(
    "Ticket",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      channel: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      requester: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      requesterThreadTs: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      technicianThreadTs: {
        type: DataTypes.STRING,
      },
      technicianChannelConversationId: {
        type: DataTypes.STRING,
      },
      privateChannelId: {
        type: DataTypes.STRING,
      },
      requesterChannelBlockThreadTs: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: "Ticket",
      timestamps: false,
    }
  );

  return Ticket;
};
