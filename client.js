let { connect } = require('net');

let get = (socket) => {
  return new Promise(resolve => {
    let buf = [];
    let conn = connect(socket);
    conn.on('data', (d) => buf.push(d));
    conn.on('close', () => {
      let data = Buffer.concat(buf);
      data = JSON.parse(data.toString());
      resolve(data)
    })
  })
}

module.exports = { get }
