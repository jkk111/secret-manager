let { createServer } = require('net')
let { spawn } = require('child_process')
let { random_id } = require('../crypto');
let { get_socket } = require('../Network');

// Interface for thread worker
class Worker {
  constructor(id, worker, server) {
    this.worker = worker;
    this.listener = server;
    this.pending = false;
    // Socket-y stuff, woo skip the network stack
    this.listener.on('connection', this.handle_connection.bind(this))
  }

  handle_connection(socket) {
    this._worker_socket_ = socket;
    socket.on('data', (d) => {
      let m = JSON.parse(d.toString());

      let { type, success = true, data } = m;

      if(type === 'done') {
        if(this.pending) {
          let pending = this.pending;
          this.pending = false;
          pending({ success, data });
        }
      }

      if(type === 'ready') {
        if(this.waiting) {
          this.waiting();
        }
        this.is_ready = true;
      }
    })
  }

  ready() {
    return new Promise(resolve => {
      if(this.is_ready) {
        resolve();
      } else {
        this.waiting = () => {
          this.waiting = null;
          resolve();
        }
      }
    })
  }

  static async New(index, id) {
    let socket = get_socket(id);
    let server = createServer();
    server.listen(socket);
    let client = spawn('node', [ __dirname + '/worker.js', socket ], {
      stdio: 'inherit'
    });
    let worker = new Worker(id, client, server);
    worker.index = index;
    await worker.ready();
    return worker;
  }

  Fetch(req) {
    if(this.pending) {
      throw new Error('Invalid State, Worker Is Busy!')
    }
    return new Promise(resolve => {
      this.pending = resolve;
      this._worker_socket_.write(JSON.stringify({ req }))
    });
  }

  Stream(req, dest) {
    if(this.pending) {
      throw new Error('Invalid State Worker Is Busy!')
    }

    return new Promise(resolve => {
      let socket = random_id();

      let ln = createServer();

      ln.on('connection', (socket) => {
        socket.pipe(dest);
        socket.on('end', () => {
          if(ln.close) ln.close();
          if(dest.close) dest.close();
          resolve();
        })
      })

      this.pending = resolve;
      this._worker_socket_.write(JSON.stringify({ req, socket }));
    });
  }

  destroy() {
    this.worker.kill();
    this.listener.close();
  }
}

// Requester Master
class Requester {
  constructor(cfg = {}, workers) {
    let { threads = 1 } = cfg;
    this.workers = workers;
    this.busy = new Array(workers.length).fill(false);
    this.worker_queue = [];
  }

  static async New(cfg = {}) {
    let { threads = 1 } = cfg;
    let svc_id = random_id();
    let workers = [];

    for(var i = 0; i < threads; i++) {
      let worker_id = `${svc_id}-${i}`;
      console.log('Initializing Worker', i)
      let worker = await Worker.New(i, worker_id)
      console.log('Ready', i)
      workers.push(worker);
    }

    return new Requester(cfg, workers)
  }

  Destroy() {
    for(var worker of this.workers) {
      worker.destroy();
    }
  }

  get_worker() {
    return new Promise(resolve => {
      for(var i = 0; i < this.workers.length; i++) {
        let busy = this.busy[i];
        if(!busy) {
          this.busy[i] = true;
          let worker = this.workers[i]
          return resolve({ worker, index: i });
        }
      }
      this.worker_queue.push(resolve);
    })
  }

  release_worker(index) {
    let waiting = this.worker_queue.shift();
    if(waiting) {
      waiting(this.workers[index])
    } else {
      this.busy[index] = false;
    }
  }

  async Stream(req, dest) {
    let worker = await this.get_worker();
    if(typeof dest === 'string') {
      dest = fs.createWriteStream(dest);
    }
  }

  async Fetch(req) {
    let { worker, index } = await this.get_worker();

    let data = await worker.Fetch(req);
    return data;
  }
}

module.exports = Requester
