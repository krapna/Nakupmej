// Script6.js
document.addEventListener('DOMContentLoaded', () => {
  // najdeme kontejnery
  const fileUpload = document.getElementById('fileUpload');
  const fileList = document.getElementById('fileList');

  // vytvoříme element pro zobrazení počtu
  let counterEl = document.createElement('div');
  counterEl.id = 'fileCount';
  counterEl.style.marginTop = '10px';
  counterEl.textContent = 'Počet nahraných souborů: 0';
  fileList.parentNode.insertBefore(counterEl, fileList.nextSibling);

  // zjistíme počáteční počet (pokud currentDocument.files již existuje)
  let count = window.currentDocument && Array.isArray(window.currentDocument.files)
    ? window.currentDocument.files.length
    : 0;
  updateCounter();

  // helper na aktualizaci UI
  function updateCounter() {
    counterEl.textContent = `Počet nahraných souborů: ${count}`;
  }

  // helper pro vytvoření názvu souboru
  function makeFileName(rawName, ext = '') {
    const docNum = document.getElementById('documentNumber')?.value
                  || document.getElementById('orderNumber')?.value
                  || 'unknown';
    // první soubor dostane jen číslo, další dokument + mezera + pořadí
    const suffix = count > 0 ? ` ${count + 1}` : '';
    return ext
      ? `${docNum}${suffix}.${ext}`
      : `${docNum}${suffix}`;
  }

  // obsluha klasického file-inputu
  fileUpload.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (let file of files) {
      // zkusíme odvodit příponu
      const ext = file.name.split('.').pop();
      const fileName = makeFileName(file.name, ext);
      // čteme base64
      const dataURL = await new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(file);
      });
      const base64Data = dataURL.split(',')[1];

      // odešleme na server
      fetch('/uploadToDropbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, fileName })
      })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          // přidáme do currentDocument a UI
          if (!window.currentDocument.files) window.currentDocument.files = [];
          window.currentDocument.files.push({ name: fileName, content: data.link });
          const link = document.createElement('a');
          link.href = data.link;
          link.textContent = fileName;
          link.download = fileName;
          link.target = '_blank';
          const item = document.createElement('div');
          item.appendChild(link);
          fileList.appendChild(item);

          count++;
          updateCounter();
        } else {
          throw new Error(data.error);
        }
      })
      .catch(err => alert('Upload selhal: ' + err.message));
    }
    // vyčistíme input, aby šel zase vybrat stejný soubor
    fileUpload.value = '';
  });

  // _Strana 2_: navíc přepíšeme funkci pro focení (pokud existuje)
  if (window.navigator && window.navigator.mediaDevices) {
    const oldCameraBtn = document.getElementById('cameraBtn');
    if (oldCameraBtn) {
      oldCameraBtn.addEventListener('click', () => {
        // spustíme původní modal/focení
        // po pořízení fotky se z canvasu volá tato callback funkce:
        const takePhoto = (dataURL) => {
          const base64Data = dataURL.split(',')[1];
          const fileName = makeFileName('photo', 'jpg');
          fetch('/uploadToDropbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data, fileName })
          })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              if (!window.currentDocument.files) window.currentDocument.files = [];
              window.currentDocument.files.push({ name: fileName, content: data.link });
              const img = document.createElement('img');
              img.src = dataURL;
              img.style.maxWidth = '200px';
              img.style.display = 'block';
              img.style.marginTop = '10px';
              img.addEventListener('click', () => {
                const a = document.createElement('a');
                a.href = dataURL;
                a.download = fileName;
                a.click();
              });
              fileList.appendChild(img);

              count++;
              updateCounter();
            } else {
              throw new Error(data.error);
            }
          })
          .catch(err => alert('Foto upload selhalo: ' + err.message));
        };

        // načteme modul focení z původního Script2.js
        // tam se po vyfocení volá addFileToList – přepíšeme to:
        window.addFileToList = (name, link) => {
          // ignorovat, protože vše řešíme tady
        };
        // spustíme původní kód, který nakonec zavolá takePhoto(dataURL)
        // (v původním Script2.js)
      });
    }
  }
});
