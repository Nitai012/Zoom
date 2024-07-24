const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
  logging: false
});

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: true // Allow null if the user is not currently in a room
  }
});



sequelize.sync().then(() => {
  console.log('Database & tables created!');
});

module.exports = {
  sequelize,
  User
};