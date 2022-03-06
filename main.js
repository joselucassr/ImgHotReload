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
let fs = require('fs');

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
function createWindow(expressPort) {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('expressPort', expressPort);
  });
}

app.whenReady().then(async () => {
  const [expressPort, socketIOPort] = await findFreePorts(2);

  serveFiles();
  updatePublicInfoJson('socketIOPort', socketIOPort);

  console.log('nodePort', expressPort);
  console.log('socketIOPort', socketIOPort);

  expServer.listen(expressPort);
  io.listen(socketIOPort);

  ipcMain.handle('dialog:openDirectory', handleDirectoryOpen);
  ipcMain.handle('request:monitorFile', handleMonitorFile);
  createWindow(expressPort);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    deleteTempFolderFiles();
    updatePublicInfoJson('socketIOPort', '');

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
      extensions: /\.(jpg|jpeg|png|gif|svg)$/,
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

const handleMonitorFile = async (event, selectedFilePath) => {
  console.log('selectedFilePath', selectedFilePath);

  copyAndUpdatePublicImage(selectedFilePath);

  await watcher.close();
  watcher.add(selectedFilePath);
  watcher.on('change', (event, thisPath) => {
    copyAndUpdatePublicImage(selectedFilePath);
  });
};

const copyAndUpdatePublicImage = (selectedFilePath) => {
  let dir = path.join(__dirname, 'public');
  let publicTempFolder = path.join(dir, 'temp');

  let filename =
    selectedFilePath.split('/')[selectedFilePath.split('/').length - 1];

  let publicImgPath = path.join(publicTempFolder, encodeURI(filename));

  fs.copyFileSync(selectedFilePath, publicImgPath);

  updatePublicInfoJson('tempFileName', encodeURI(filename));

  io.emit('update', '');
};

const deleteTempFolderFiles = () => {
  // Código copiado de: https://stackoverflow.com/questions/27072866/how-to-remove-all-files-from-directory-without-removing-directory-in-node-js
  let dir = path.join(__dirname, 'public');
  let publicTempFolder = path.join(dir, 'temp');

  updatePublicInfoJson('tempFileName', '');

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

const serveFiles = () => {
  let mime = {
    html: 'text/html',
    txt: 'text/plain',
    css: 'text/css',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    js: 'application/javascript',
  };

  expServer.get('*', function (req, res) {
    let dir = path.join(__dirname, 'public');

    res.set('Cache-control', 'no-store');
    let file = path.join(dir, req.path.replace(/\/$/, `/browserIndex.html`));
    if (file.indexOf(dir + path.sep) !== 0) {
      return res.status(403).end('Forbidden');
    }
    let type = mime[path.extname(file).slice(1)] || 'text/plain';
    let s = fs.createReadStream(file);
    s.on('open', function () {
      res.set('Content-Type', type);
      s.pipe(res);
    });
    s.on('error', function () {
      res.set('Content-Type', 'text/plain');
      res.status(404).end('Not found');
    });
  });
};

const updatePublicInfoJson = (field, value) => {
  let dir = path.join(__dirname, 'public');
  let rawdata = fs.readFileSync(path.join(dir, 'publicInfo.json'));
  let publicInfo = JSON.parse(rawdata);

  publicInfo[field] = value;

  let data = JSON.stringify(publicInfo, null, 2);
  fs.writeFileSync(path.join(dir, 'publicInfo.json'), data);
};
