let os = require('os')

let named_pipe = (id) => `\\\\.\\pipe\\${id}`
let unix_socket = (id) => `/tmp/${id}.socket`

let get_socket = (id) => {
  if(os.platform() === 'win32') {
    return named_pipe(id);
  } else {
    return unix_socket(id);
  }
}

module.exports = {
  get_socket
}
