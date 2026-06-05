module.exports = (sequelize, DataTypes) => {
  const RequestAccess = sequelize.define('RequestAccess', {
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true },
    },
    role: {
      type: DataTypes.ENUM('Artist', 'Venue', 'Promoter'),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.ENUM('San Francisco', 'Los Angeles'),
      allowNull: false,
    },
    websiteOrInstagram: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    aboutShow: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  });

  return RequestAccess;
};
