const { Sequelize, DataTypes } = require("sequelize")
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "database.sqlite",
  logging: false,
  define: {
    timestamps: false,
  },
})

const User = sequelize.define("User", {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    primaryKey: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
})
const Rooms = sequelize.define("Rooms", {
  roomId: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  NumberOfUsers: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
})
Rooms.hasMany(User, { foreignKey: "roomId" })
User.belongsTo(Rooms, { foreignKey: "roomId" })
sequelize.sync().then(() => {
  console.log("Database & tables created!")
})

module.exports = {
  sequelize,
  User,
  Rooms,
}
