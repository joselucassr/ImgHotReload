const { app, BrowserWindow, ipcMain, dialog } = require('electron');

// Para visualizar a árvore de arquivos
const dirTree = require('directory-tree');

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
function createWindow(socketIOPort) {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('socketIOPort', socketIOPort);
  });

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  const [nodePort, socketIOPort] = await findFreePorts(2);

  console.log('nodePort', nodePort);
  console.log('socketIOPort', socketIOPort);

  expServer.listen(nodePort);
  io.listen(socketIOPort);

  ipcMain.handle('dialog:openDirectory', handleDirectoryOpen);
  ipcMain.handle('request:monitorFile', handleMonitorFile);
  createWindow(socketIOPort);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Devolve os arquivos dentro da pasta
const handleDirectoryOpen = async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (canceled) {
    return;
  } else {
    console.log(filePaths);

    const filteredTree = dirTree(filePaths[0], {
      extensions: /\.(jpg|jpeg|png|gif)$/,
      attributes: ['type'],
    });

    removeEmptyFolder(filteredTree);

    return filteredTree;
  }
};

// Código pego em: https://gist.github.com/g45t345rt/22a356fdba70a04932db2c37a0f9691a
const removeEmptyFolder = (obj, parent) => {
  const { children, name } = obj;
  if (children) {
    let i = children.length;
    while (i--) {
      const child = children[i];
      removeEmptyFolder(child, obj);
    }

    if (children.length === 0 && parent) {
      const index = parent.children.findIndex((child) => child.name === name);
      parent.children.splice(index, 1);
    }
  }
};

const handleMonitorFile = (event, selectedFilePath) => {
  console.log('selectedFilePath', selectedFilePath);
};
