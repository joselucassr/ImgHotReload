const initialBtn = document.getElementById('initialBtn');
const laterBtn = document.getElementById('laterBtn');

const urlElement = document.getElementById('url');

const directoryPathElement = document.getElementById('directoryPath');

let fileTreeElement = document.getElementById('fileTree');

const fileBeingMonitoredInfoElement =
  document.getElementById('monitoredFileInfo');
let previousMonitoredFileTreeElement = null;

let didInit = false;

laterBtn.addEventListener('click', async () => {
  await getDir();
});

initialBtn.addEventListener('click', async () => {
  await getDir();
  changeViewState('fromInitial');
});

const getDir = async () => {
  const pathFileTree = await window.electronAPI.openDirectory();
  buildList(pathFileTree.children);
  directoryPathElement.innerText = pathFileTree.name;
};

window.electronAPI.expressPort((event, port) => {
  // console.log(window.electronAPI.getLocalIP);
  // console.log('port', port);

  if (!didInit) {
    createQRCode(window.electronAPI.getLocalIP, port);
    urlElement.innerHTML = `${window.electronAPI.getLocalIP}:${port}`;
    didInit = true;
  }
});

const buildList = (children) => {
  fileTreeElement.innerHTML = '';

  children.forEach((element) => {
    appendItens(fileTreeElement, element);
  });
};

const monitorFile = (path) => {
  window.electronAPI.monitorFile(path);
};

const appendItens = (parent, current) => {
  let div = document.createElement('div');
  div.classList.add('margin');
  if (current.type === 'file') {
    div.setAttribute('path', current.path);
    div.classList.add('file');
    div.addEventListener('click', () => changeSelectedFile(div, current));
  }
  div.append(current.name);
  parent.append(div);
  if (current.children?.length > 0) {
    current.children.forEach((element) => {
      appendItens(div, element);
    });
  }
};

const createQRCode = (ip, port) => {
  const qrCode = new QRCodeStyling({
    width: 150,
    height: 150,
    type: 'canvas',
    data: `${ip}:${port}`,
    dotsOptions: {
      color: '#F22555',
      type: 'square',
    },
    backgroundOptions: {
      color: '#fff',
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 20,
    },
  });

  qrCode.append(document.getElementById('canvas'));
};

const changeSelectedFile = (div, current) => {
  console.log(div.getAttribute('path'));
  fileBeingMonitoredInfoElement.innerText = current.name;

  if (previousMonitoredFileTreeElement !== null) {
    previousMonitoredFileTreeElement.classList.contains('monitoredFile') &&
      previousMonitoredFileTreeElement.classList.remove('monitoredFile');
  }
  previousMonitoredFileTreeElement = div;
  div.classList.add('monitoredFile');

  monitorFile(current.path);
};

const changeViewState = (from) => {
  switch (from) {
    case 'fromInitial':
      initialBtn.classList.add('hidden');
      directoryPathElement.parentElement.classList.remove('hidden');
      fileTreeElement.classList.remove('hidden');
      laterBtn.classList.remove('hidden');
      break;
  }
};
