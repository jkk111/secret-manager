let { execSync } = require('child_process');
let path = require('path')
const gui_path = path.join(__dirname, 'secret-manager-gui');
const build_path = path.join(gui_path, 'build');
const static_path = path.join(__dirname, 'build');
const rimraf = require('rimraf')

const fs = require('fs');

execSync('npm install', {
  cwd: gui_path
})

execSync('npm run build', {
  cwd: gui_path
})

rimraf(static_path, () => {
  fs.renameSync(build_path, static_path);
});
