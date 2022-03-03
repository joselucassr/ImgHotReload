const btn = document.getElementById('btn');
const directoryPathElement = document.getElementById('directoryPath');

btn.addEventListener('click', async () => {
  const directoryPath = await window.electronAPI.openDirectory();
  directoryPathElement.innerText = directoryPath;
});

console.log(window.electronAPI.getLocalIP);

window.electronAPI.getSocketIOPort((event, value) => {
  console.log('value', value);
});
