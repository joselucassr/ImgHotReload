const btn = document.getElementById('btn');
const directoryPathElement = document.getElementById('directoryPath');
const fileBeingMonitoredInfoElement =
  document.getElementById('monitoredFileInfo');

let previousMonitoredFileTreeElement = null;

btn.addEventListener('click', async () => {
  const pathFileTree = await window.electronAPI.openDirectory();
  console.log(pathFileTree);
  buildList(pathFileTree.children);
  directoryPathElement.innerText = pathFileTree.name;
});

window.electronAPI.getSocketIOPort((event, port) => {
  console.log(window.electronAPI.getLocalIP);
  console.log('port', port);

  createQRCode(window.electronAPI.getLocalIP, port);
});

const buildList = (children) => {
  let containerElement = document.getElementById('fileTree');
  containerElement.innerHTML = '';

  children.forEach((element) => {
    appendItens(containerElement, element);
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
    div.addEventListener('click', () => {
      console.log(div.getAttribute('path'));
      fileBeingMonitoredInfoElement.innerText = current.name;

      if (previousMonitoredFileTreeElement !== null) {
        previousMonitoredFileTreeElement.classList.contains('monitoredFile') &&
          previousMonitoredFileTreeElement.classList.remove('monitoredFile');
      }
      previousMonitoredFileTreeElement = div;
      div.classList.add('monitoredFile');

      monitorFile(current.path);
    });
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
    width: 250,
    height: 250,
    type: 'svg',
    data: `${ip}:${port}`,
    dotsOptions: {
      color: '#d90429',
      type: 'square',
    },
    backgroundOptions: {
      color: '#edf2f4',
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 20,
    },
  });

  qrCode.append(document.getElementById('canvas'));
};
