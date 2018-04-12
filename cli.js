#!/usr/bin/env node

let { set } = require('./index')

let all_input = [];

let input_done = () => {
  let str = Buffer.concat(all_input).toString().trim();

  let { key, value, pass, store } = JSON.parse(str)
  console.log(set(store, key, value, pass))
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
