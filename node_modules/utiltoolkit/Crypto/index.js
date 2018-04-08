let crypto = require('crypto');

let random_id = (length = 16, encoding = 'hex') => {
  return crypto.randomBytes(length).toString(encoding);
}

module.exports = {
  random_id
}
