const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    orgId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    teamsObjectId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "User",
    timestamps: false,
  }
);

module.exports = User;
