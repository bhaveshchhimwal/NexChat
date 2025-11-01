export function createSendFile(sendMessage) {
  return function handleFile(ev) {
    const file = ev.target.files[0];
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('File is too large! Maximum size is 10MB.');
      return;
    }

    if (file.type.startsWith('image/')) {
      compressImage(file, (compressedDataUrl) => {
        sendMessage(null, {
          name: file.name,
          data: compressedDataUrl,
        });
      });
    } else {

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        sendMessage(null, {
          name: file.name,
          data: reader.result,
        });
      };
    }
  };
}

function compressImage(file, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
    
      let width = img.width;
      let height = img.height;
      const maxDimension = 1920;
      
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      callback(compressedDataUrl);
    };
  };
}