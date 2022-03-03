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

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    deleteTempFolderFiles();

    app.quit();
  }
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

  copyAndUpdatePublicImage(selectedFilePath);

  watcher.add(selectedFilePath);
  watcher.on('change', (event, thisPath) => {
    copyAndUpdatePublicImage(selectedFilePath);
  });
};

const copyAndUpdatePublicImage = (selectedFilePath) => {
  deleteTempFolderFiles();

  var dir = path.join(__dirname, 'public');
  let publicTempFolder = path.join(dir, 'temp');

  let filename =
    selectedFilePath.split('/')[selectedFilePath.split('/').length - 1];

  let publicImgPath = path.join(publicTempFolder, filename);

  fs.copyFile(selectedFilePath, publicImgPath, (err) => {
    if (err) throw err;
    console.log('image was copied to temp folder.');
  });

  let fileInfo = {
    tempFileName: filename,
  };

  let data = JSON.stringify(fileInfo, null, 2);
  fs.writeFileSync(path.join(publicTempFolder, 'filesInfo.json'), data);

  io.emit('update', '');
};

const deleteTempFolderFiles = () => {
  // Código copiado de: https://stackoverflow.com/questions/27072866/how-to-remove-all-files-from-directory-without-removing-directory-in-node-js
  var dir = path.join(__dirname, 'public');
  let publicTempFolder = path.join(dir, 'temp');

  fs.readdir(publicTempFolder, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      if (file !== '.gitignore')
        fs.unlink(path.join(publicTempFolder, file), (err) => {
          if (err) throw err;
        });
    }
  });
};
