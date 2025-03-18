const bcrypt = require("bcrypt");

const hashPassword = (password) => {
  const salt = bcrypt.genSaltSync(parseInt(process.env.SALT_Round));
  console.log(salt);

  return bcrypt.hashSync(password, salt);
};

const verifyPassword = (password, hash) => {
  return bcrypt.compareSync(password, hash);
};

module.exports = {
  hashPassword,
  verifyPassword,
};
