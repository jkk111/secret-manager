let http = require('http');
let express = require('express');
let { Network, Crypto } = require('utiltoolkit')
let { createServer } = require('net');
let { get, set, get_files, touch, write_secrets } = require('./')
let { socket = 8081 } = process.env;
let bodyParser = require('body-parser');
let path = require('path')

let gui_path = require.resolve('@jkk111/secret-manager-gui')
gui_path = path.join(gui_path, 'build');

let app = express();

let server = http.createServer(app);
server.listen(socket);

app.use(express.static(`${__dirname}/static`));
app.use(express.static(gui_path));

class SecretManager {
  constructor(timeout = 60 * 1000) {
    this.timeout = timeout;
    this.pending = {};
    this.files = {};
  }

  expose_secrets(file, keys) {
    let secrets = this.files[file] || {};
    let expose = {};

    for(var key of keys) {
      expose[key] = secrets[key];
    }

    let id = Crypto.random_id();
    let socket = Network.get_socket(id);

    let ln = createServer();
    ln.on('connection', (socket) => {
      let secrets = this.secrets(id);
      socket.write(JSON.stringify(secrets), () => {
        socket.end();
        ln.close();
      });
    });
    ln.listen(socket);
    // Close the endpoint if the client never accesses it.
    setTimeout(() => {
      ln.close()
    }, this.timeout)

    ln.on('close', () => {
      delete this.pending[id]
    })

    return socket;
  }

  secrets(id) {
    let s = this.pending[id] || {};
    delete this.pending[id];
    return s;
  }

  keys(file, pass) {
    let dat = get(file, pass);
    return Object.keys(dat);
  }

  load(file, pass) {
    let data = get(file, pass);
    if(data.success !== false) {
      this.files[file] = data
    } else {
      return data;
    }
  }
}

let instance = new SecretManager();

app.post('/load', bodyParser.json(), (req, res) => {
  let { file, password } = req.body;
  let result = instance.load(file, password);
  if(result) {
    res.send(result);
  } else {
    res.send({ success: true })
  }
})

app.post('/expose', bodyParser.json(), (req, res) => {
  let { file, keys } = req.body;
  let id = instance.expose_secrets(file, keys);
  res.send({ id });
});

app.post('/set', bodyParser.json(), (req, res) => {
  let { file, key, value, password } = req.body;
  set(file, key, value, password)
  res.send('OK');
});

app.post('/keys', bodyParser.json(), (req, res) => {
  let { file, password }  = req.body;
  let keys = instance.keys(file, password);
  res.send(keys)
})

app.get('/files', (req, res) => {
  let files = get_files();
  res.send(files);
});

app.post('/touch', bodyParser.json(), (req, res) => {
  let { file, password } = req.body;
  let files = get_files();

  if(!files.includes(file)) {
    touch(file, password);
  }
  res.send('OK')
})

app.post('/change_pass', bodyParser.json(), (req, res) => {
  let { file, password, updated } = req.body;
  let data = get(file, password)
  if(data.success !== false) {
    write_secrets(file, data, updated);
    res.send({ success: true });
  } else {
    res.send(data);
  }
})
