
export function createSendFile(sendMessage) {
  return function handleFile(ev) {
    const file = ev.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      sendMessage(null, {
        name: file.name,
        data: reader.result,
      });
    };
  };
}
