console.log(window.electronAPI.getLocalIP);

window.electronAPI.getSocketIOPort((event, value) => {
  console.log('value', value);
});
