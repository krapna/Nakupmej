document.addEventListener('DOMContentLoaded', function() {
    const socket = window.socket || io();
    const urlParams = new URLSearchParams(window.location.search);
    let docIndex = urlParams.get('docIndex');
    let documents = [];
    let currentDocument = {};

    const saveButton = document.getElementById('saveBtn');
    const endButton = document.getElementById('endBtn');
    const fileUpload = document.getElementById('fileUpload');
    const fileList = document.getElementById('fileList');
    const form2Container = document.getElementById('form2Container');

    // Pomocná funkce pro generování unikátního názvu souboru
    function generateUniqueFileName(documentNumber, originalFileName, filesArray) {
      let base;
      let extension = '';
      if (documentNumber && documentNumber.trim() !== '') {
        base = documentNumber.trim();
        const dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex !== -1) {
          extension = originalFileName.substring(dotIndex);
        }
      } else {
        const dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex !== -1) {
          base = originalFileName.substring(0, dotIndex);
          extension = originalFileName.substring(dotIndex);
        } else {
          base = originalFileName;
        }
      }
      let count = 0;
      if (filesArray) {
        filesArray.forEach(file => {
          if (file.name.startsWith(base) && file.name.endsWith(extension)) {
            const middle = file.name.substring(base.length, file.name.length - extension.length);
            if (middle === '' || /^\(\d+\)$/.test(middle)) {
              count++;
            }
          }
        });
      }
      if (count === 0) {
        return base + extension;
      } else {
        return base + '(' + (count + 1) + ')' + extension;
      }
    }

    // Funkce pro načtení dat aktuálního dokumentu do formuláře
    function loadFormData() {
        if (!currentDocument) return;
        form2Container.innerHTML = `
            <div class="form-group">
                <h2>Číslo dokumentu</h2>
                <input type="text" id="documentNumber" name="documentNumber" value="${currentDocument.number || ''}" readonly>
            </div>
        `;
        document.getElementById('orderNumber').value = currentDocument.orderNumber || '';
        document.getElementById('supplier').value = currentDocument.supplier || '';
        document.getElementById('confirmedDeliveryDate').value = currentDocument.confirmedDeliveryDate || '';
        document.getElementById('deliveryDate').value = currentDocument.deliveryDate || '';
        document.getElementById('price').value = currentDocument.price || '';

        if (currentDocument.timeliness) {
            const t = document.querySelector(`input[name="timeliness"][value="${currentDocument.timeliness}"]`);
            if (t) t.checked = true;
        }
        if (currentDocument.systemCheck) {
            const s = document.querySelector(`input[name="systemCheck"][value="${currentDocument.systemCheck}"]`);
            if (s) s.checked = true;
        }
        if (currentDocument.communication) {
            const c = document.querySelector(`input[name="communication"][value="${currentDocument.communication}"]`);
            if (c) c.checked = true;
        }
        if (currentDocument.goodsType) {
            currentDocument.goodsType.forEach(function(type) {
                const g = document.querySelector(`input[name="goodsType"][value="${type}"]`);
                if (g) g.checked = true;
            });
        }
        document.getElementById('note').value = currentDocument.note || '';
        if (currentDocument.entryControl) {
            const ec = document.querySelector(`input[name="entryControl"][value="${currentDocument.entryControl}"]`);
            if (ec) ec.checked = true;
        }

        // Zobrazení uložených odkazů na soubory
        fileList.innerHTML = '';
        if (currentDocument.files) {
            currentDocument.files.forEach(function(file) {
                const fileItem = document.createElement('div');
                const link = document.createElement('a');
                link.href = file.content;
                link.download = file.name;
                link.textContent = file.name;
                link.target = '_blank';
                fileItem.appendChild(link);
                fileList.appendChild(fileItem);
            });
        }
    }

    // Pomocná funkce pro zobrazení odkazů na nahrané soubory
    function addFileToList(fileName, fileContent) {
        const fileList = document.getElementById('fileList');
        const fileItem = document.createElement('div');
        const link = document.createElement('a');
        link.href = fileContent;
        link.download = fileName;
        link.textContent = fileName;
        link.target = '_blank';
        fileItem.appendChild(link);
        fileList.appendChild(fileItem);
    }

    // Obsluha nahrávání souborů – nyní s Dropbox integrací a unikátním názvem souboru
    fileUpload.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);
        const documentNumber = document.getElementById('documentNumber').value;
        files.forEach(function(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const dataURL = e.target.result;
                const base64Data = dataURL.split(',')[1];
                // Použijeme funkci generateUniqueFileName pro unikátní pojmenování
                const fileName = generateUniqueFileName(documentNumber, file.name, currentDocument.files);
                // Odeslání souboru na Dropbox pomocí endpointu /uploadToDropbox
                fetch('/uploadToDropbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64Data, fileName })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        addFileToList(fileName, data.link);
                        if (!currentDocument.files) {
                            currentDocument.files = [];
                        }
                        currentDocument.files.push({ name: fileName, content: data.link });
                    } else {
                        console.error('Upload do Dropboxu selhal:', data.error);
                        alert('Upload do Dropboxu selhal: ' + data.error);
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Chyba při uploadu souboru.');
                });
            };
            reader.readAsDataURL(file);
        });
    });

    // Při obdržení synchronizovaných dokumentů ze serveru aktualizujeme lokální pole
    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        if (docIndex !== null && documents[docIndex]) {
            currentDocument = documents[docIndex];
        } else if (docIndex === null) {
            if (!currentDocument) { currentDocument = {}; }
        }
        loadFormData();
    });

    socket.emit('requestDocuments');

    // Obsluha tlačítka "Hotovo" – uložení formuláře a synchronizace dokumentu
    saveButton.addEventListener('click', function(event) {
        event.preventDefault();
        currentDocument.number = document.getElementById('documentNumber').value;
        currentDocument.supplier = document.getElementById('supplier').value;
        const packagingStatus = document.querySelector('input[name="packagingStatus"]:checked')?.value;
        if (packagingStatus) currentDocument.packagingStatus = packagingStatus;
        const packageLabel = document.querySelector('input[name="packageLabel"]:checked')?.value;
        if (packageLabel) currentDocument.packageLabel = packageLabel;
        const deliveryMatch = document.querySelector('input[name="deliveryMatch"]:checked')?.value;
        if (deliveryMatch) currentDocument.deliveryMatch = deliveryMatch;
        const docsChecked = Array.from(document.querySelectorAll('input[name="documents"]:checked')).map(el => el.value);
        currentDocument.documents = docsChecked;
        currentDocument.note = document.getElementById('note').value;
        currentDocument.controlBy = document.getElementById('controlBy').value;
        currentDocument.date = document.getElementById('date').value;
        currentDocument.result = document.getElementById('result').value;

        currentDocument.orderNumber = document.getElementById('orderNumber').value;
        currentDocument.confirmedDeliveryDate = document.getElementById('confirmedDeliveryDate').value;
        currentDocument.deliveryDate = document.getElementById('deliveryDate').value;
        currentDocument.timeliness = document.querySelector('input[name="timeliness"]:checked')?.value;
        currentDocument.systemCheck = document.querySelector('input[name="systemCheck"]:checked')?.value;
        currentDocument.communication = document.querySelector('input[name="communication"]:checked')?.value;
        const goodsTypeChecked = Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value);
        currentDocument.goodsType = goodsTypeChecked;

        if (docIndex === null) {
            documents.push(currentDocument);
            docIndex = documents.length - 1;
        } else {
            documents[docIndex] = currentDocument;
        }

        socket.emit('updateDocuments', documents);
        window.location.href = 'Strana1.html';
    });

    // Obsluha tlačítka "Konec" – přesměrování zpět na Stranu1
    const endButton = document.getElementById('endBtn');
    endButton.addEventListener('click', function() {
        window.location.href = 'Strana1.html';
    });

    // Tlačítko kamery – nová verze, která využívá Dropbox upload endpoint
    const cameraBtn = document.getElementById('cameraBtn');
    cameraBtn.addEventListener('click', function() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
            modal.style.display = 'flex';
