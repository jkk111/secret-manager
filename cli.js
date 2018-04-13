#!/usr/bin/env node

let { set } = require('./index')

let all_input = [];

let input_done = () => {
  let str = Buffer.concat(all_input).toString().trim();
  let parsed = null;
  try {
     parsed = JSON.parse(str)
  } catch(e) {
    throw new Error("Invalid Input");
  }

  let { key, value, pass, store } = parsed;

  if(set(store, key, value, pass)) {
    throw new Error("Incorrect Password");
  }
}

let readable_handler = () => {
  let input = process.stdin.read();
  if(input) {
    all_input.push(input)
  } else {
    process.stdin.removeListener('readable', readable_handler)
    input_done();
  }
}

process.stdin.on('readable', readable_handler)
