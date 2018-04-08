let request = require('request');
let { connect } = require('net');

let socket = process.argv[2];

let client = connect(socket, () => {
  client.write(JSON.stringify({ type: 'ready' }))
});

let FetchEnd = (success, data) => {
  let resp = JSON.stringify({ type: 'done', success, data });
  client.write(resp);
}


let Fetch = (req) => {
  request(req, (err, data, body) => {
    if(err) {
      throw err;
    } else {
      FetchEnd(true, body);
    }
  })
}













client.on('data', (d) => {
  let m = JSON.parse(d.toString());
  let { req, socket = false } = m;

  if(socket) {
    // Stream(req, socket);
  } else {
    Fetch(req)
  }
})
