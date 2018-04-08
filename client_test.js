let { Client } = require('./');
let { get } = Client;

get(process.argv[2]).then(secrets => {
  console.log(secrets)
})
