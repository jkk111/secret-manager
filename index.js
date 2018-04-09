let fs = require('fs')
let os = require('os')
let path = require('path')
let crypto = require('crypto');
let Client = require('./Client')

try {
  fs.mkdirSync(path.join(os.homedir(), '.secrets'));
} catch(e) {
  if(e.code !== 'EEXIST') {
    throw e;
  }
}

const secret_path = path.join(os.homedir(), '.secrets');

const algorithm = 'aes-256-ctr';

let iv_len = 16;
let key_len = 32;
let salt_len = 8;
let iterations = 1000;
let digest = 'sha512'

let new_salt = () => crypto.randomBytes(salt_len);
let new_iv = () => crypto.randomBytes(iv_len);
let derive_key = (password, salt) => crypto.pbkdf2Sync(password, salt, iterations, key_len, digest)

let generate_key = () => crypto.randomBytes(key_len);
let generate_iv = () => crypto.randomBytes(iv_len);

let encrypt = (pass, data) => {
  if(typeof data === 'object') {
    data = JSON.stringify(data);
  }

  let iv = new_iv();
  let salt = new_salt();
  pass = derive_key(pass, salt)
  let cipher = crypto.createCipheriv(algorithm, pass, iv);
  let enc = [ cipher.update(data), cipher.final(), iv, salt ];
  enc = Buffer.concat(enc);
  return enc;
}

let decrypt = (pass, data) => {
  let iv_salt = data.slice(-(iv_len + salt_len))
  let iv = iv_salt.slice(0, iv_len);
  let salt = iv_salt.slice(iv_len);
  data = data.slice(0, -iv_salt.length)

  pass = derive_key(pass, salt);

  let cipher = crypto.createDecipheriv(algorithm, pass, iv);
  let dec = [ cipher.update(data), cipher.final() ]
  return Buffer.concat(dec)
}

let read_secrets = (file, pass) => {
  let file_path = path.join(secret_path, file);
  let contents = null;
  try {
    contents = fs.readFileSync(file_path);
  } catch(e) {
    if(e.code === 'ENOENT') {
      return {};
    } else {
      throw e;
    }
  }
  contents = decrypt(pass, contents);
  try {
    let secrets = JSON.parse(contents.toString());
    return secrets
  } catch(e) {
    return { success: false, error: 'INVALID_PASS' }
  }
}

let write_secrets = (file, secrets, pass) => {
  let file_path = path.join(secret_path, file);
  secrets = encrypt(pass, secrets);
  try {
    fs.unlinkSync(file_path); // Issues on windows when writing to existing file with 600
  } catch(e) {
    if(e.code !== 'ENOENT') {
      throw e;
    }
  }
  fs.writeFileSync(file_path, secrets, { mode: 400 });
}

let get = (file, pass) => {
  let secrets = read_secrets(file, pass);
  return secrets
}

let set = (file, key, value, pass) => {
  let secrets = read_secrets(file, pass);
  secrets[key] = value;
  write_secrets(file, secrets, pass);
}

let get_files = () => {
  return fs.readdirSync(secret_path);
}

let touch = (file, pass) => {
  write_secrets(file, {}, pass);
}

module.exports = {
  get, set, get_files, touch, write_secrets, Client
}


if(!module.parent) {
  require('./app')
}
