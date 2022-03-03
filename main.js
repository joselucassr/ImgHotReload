const { app, BrowserWindow, ipcMain, dialog } = require('electron');

// Para encontrar portas não ocupadas
const findFreePorts = require('find-free-ports').findFreePorts;

// Relacionado a: Express
const express = require('express');
const expServer = express();

// IO e caminhos
const path = require('path');
var fs = require('fs');

// Relacionado a: Socket.IO
const http = require('http');
const { Server } = require('socket.io');
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Relacionado a: Chokidar
const chokidar = require('chokidar');
const watcher = chokidar.watch();

// Criando janela;
function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  const [nodePort, socketIOPort] = await findFreePorts(2);

  console.log('nodePort', nodePort);
  console.log('socketIOPort', socketIOPort);

  expServer.listen(nodePort);
  io.listen(socketIOPort);

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
