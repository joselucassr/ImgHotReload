const { contextBridge, ipcRenderer } = require('electron');

// Código encontrado em: https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
const { networkInterfaces } = require('os');

const nets = networkInterfaces();
const results = Object.create(null); // Or just '{}', an empty object

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    if (net.family === 'IPv4' && !net.internal) {
      if (!results[name]) {
        results[name] = [];
      }
      results[name].push(net.address);
    }
  }
}

// Pega o primeiro IP
const localIP = results[Object.keys(results)[0]][0];

contextBridge.exposeInMainWorld('electronAPI', {
  getLocalIP: localIP,
  getSocketIOPort: (callback) => ipcRenderer.on('socketIOPort', callback),
});
