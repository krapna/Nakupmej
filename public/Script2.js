// Script2.js
document.addEventListener('DOMContentLoaded', function() {
    // Inicializace socket.io – předpokládáme, že onlineserv.js již vytvořil socket a uložil ho do window.socket
    const socket = window.socket || io();

    // Získání parametru docIndex z URL (pokud existuje)
    const urlParams = new URLSearchParams(window.location.search);
    let docIndex = urlParams.get('docIndex');

    // Globální pole dokumentů (budou synchronizovány se serverem)
    let documents = [];
    // Aktuální dokument – pokud docIndex existuje, načte se ze sdíleného pole, jinak nový prázdný objekt
    let currentDocument = docIndex !== null ? null : {};

    // Funkce pro načtení dat aktuálního dokumentu do formuláře (Strana2)
    function loadFormData() {
        if (!currentDocument) return;
        document.getElementById('documentNumber').value = currentDocument.number || '';
        document.getElementById('supplier').value = currentDocument.supplier || '';
        if (currentDocument.packagingStatus) {
            const ps = document.querySelector(`input[name="packagingStatus"][value="${currentDocument.packagingStatus}"]`);
            if (ps) ps.checked = true;
        }
        if (currentDocument.packageLabel) {
            const pl = document.querySelector(`input[name="packageLabel"][value="${currentDocument.packageLabel}"]`);
            if (pl) pl.checked = true;
        }
        if (currentDocument.deliveryMatch) {
            const dm = document.querySelector(`input[name="deliveryMatch"][value="${currentDocument.deliveryMatch}"]`);
            if (dm) dm.checked = true;
        }
        if (currentDocument.documents) {
            currentDocument.documents.forEach(function(doc) {
                const cb = document.querySelector(`input[name="documents"][value="${doc}"]`);
                if (cb) cb.checked = true;
            });
        }
        document.getElementById('note').value = currentDocument.note || '';

        // Načtení nové kolonky Umístění
        if (currentDocument.location) {
            currentDocument.location.forEach(function(loc) {
                const cb = document.querySelector(`input[name="location"][value="${loc}"]`);
                if (cb) cb.checked = true;
            });
        }

        document.getElementById('controlBy').value = currentDocument.controlBy || '';
        document.getElementById('date').value = currentDocument.date || '';
        document.getElementById('result').value = currentDocument.result || '';

        // Načtení uložených odkazů na soubory
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        if (currentDocument.files) {
            currentDocument.files.forEach(function(file) {
                const fileItem = document.createElement('div');
                const link = document.createElement('a');
                link.href = file.content;
                link.textContent = file.name;
                link.target = '_blank';
                fileItem.appendChild(link);
                fileList.appendChild(fileItem);
            });
        }
        loadForm3();
    }

    // Dynamické vložení formuláře ze "Strany 3" do divu s id="form3Container"
    function loadForm3() {
        const form3Container = document.getElementById('form3Container');
        form3Container.innerHTML = `
            <div class="form-group">
                <label for="orderNumber">Číslo objednávky</label>
                <input type="text" id="orderNumber" name="orderNumber" value="${currentDocument && currentDocument.orderNumber ? currentDocument.orderNumber : ''}">
            </div>
            <div class="form-group">
                <label for="orderSupplier">Dodavatel</label>
                <input type="text" id="orderSupplier" name="orderSupplier" value="${currentDocument && currentDocument.supplier ? currentDocument.supplier : ''}">
            </div>
            <div class="form-group">
                <label for="confirmedDeliveryDate">Potvrzené datum dodání</label>
                <input type="date" id="confirmedDeliveryDate" name="confirmedDeliveryDate" value="${currentDocument && currentDocument.confirmedDeliveryDate ? currentDocument.confirmedDeliveryDate : ''}">
            </div>
            <div class="form-group">
                <label for="deliveryDate">Datum dodání</label>
                <input type="date" id="deliveryDate" name="deliveryDate" value="${currentDocument && currentDocument.deliveryDate ? currentDocument.deliveryDate : ''}">
            </div>
            <div class="form-group">
                <label>Včasnost dodávky</label>
                <div>
                    <label><input type="radio" name="timeliness" value="OK" ${currentDocument && currentDocument.timeliness === 'OK' ? 'checked' : ''}> OK</label>
                    <label><input type="radio" name="timeliness" value="NOK" ${currentDocument && currentDocument.timeliness === 'NOK' ? 'checked' : ''}> NOK</label>
                </div>
            </div>
            <div class="form-group">
                <label>Kontrola vůči systému (úplnost, cena...)</label>
                <div>
                    <label><input type="radio" name="systemCheck" value="1" ${currentDocument && currentDocument.systemCheck === '1' ? 'checked' : ''}> 1</label>
                    <label><input type="radio" name="systemCheck" value="2" ${currentDocument && currentDocument.systemCheck === '2' ? 'checked' : ''}> 2</label>
                </div>
            </div>
            <div class="form-group">
                <label>Komunikace s dodavatelem</label>
                <div>
                    <label><input type="radio" name="communication" value="1" ${currentDocument && currentDocument.communication === '1' ? 'checked' : ''}> 1</label>
                    <label><input type="radio" name="communication" value="2" ${currentDocument && currentDocument.communication === '2' ? 'checked' : ''}> 2</label>
                </div>
            </div>
            <div class="form-group">
                <label>Druh zboží</label>
                <div>
                    <label><input type="checkbox" name="goodsType" value="Výrobní" ${(currentDocument && currentDocument.goodsType && currentDocument.goodsType.includes('Výrobní')) ? 'checked' : ''}> Výrobní</label>
                    <label><input type="checkbox" name="goodsType" value="Ostatní" ${(currentDocument && currentDocument.goodsType && currentDocument.goodsType.includes('Ostatní')) ? 'checked' : ''}> Ostatní</label>
                </div>
            </div>
        `;
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

    // Obsluha nahrávání souborů přes input typu "file"
    const fileUpload = document.getElementById('fileUpload');
    fileUpload.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);
        const documentNumber = document.getElementById('documentNumber').value;
        files.forEach(function(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const dataURL = e.target.result;
                const base64Data = dataURL.split(',')[1];

                // vypočteme pořadí souboru
                const count = (currentDocument.files && currentDocument.files.length) || 0;
                // extrahujeme příponu
                const ext = file.name.split('.').pop();
                // nové pojmenování: <číslo dokumentu> <pořadové číslo>.<ext>
                const fileName = documentNumber ? `${documentNumber} ${count + 1}.${ext}` : file.name;

                // Odeslání souboru na Dropbox pomocí endpointu /uploadToDropbox
                fetch('/uploadToDropbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64Data, fileName })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        if (!currentDocument.files) {
                            currentDocument.files = [];
                        }
                        currentDocument.files.push({ name: fileName, content: data.link });
                        addFileToList(fileName, data.link);
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
        // vyčistíme input, aby šel znovu vybrat stejný soubor
        fileUpload.value = '';
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

    // Obsluha tlačítka "Hotovo" – uložení formuláře
    const saveButton = document.getElementById('saveBtn');
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

        // Uložení nové kolonky Umístění
        const locationChecked = Array.from(document.querySelectorAll('input[name="location"]:checked')).map(el => el.value);
        if (locationChecked.length) currentDocument.location = locationChecked;

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
            modal.style.flexDirection = 'column';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.zIndex = '1000';

            const video = document.createElement('video');
            video.autoplay = true;
            video.style.width = '80%';
            video.style.maxWidth = '500px';
            modal.appendChild(video);

            const captureBtn = document.createElement('button');
            captureBtn.textContent = 'Pořídit fotografii';
            captureBtn.style.marginTop = '20px';
            modal.appendChild(captureBtn);

            document.body.appendChild(modal);

            const constraints = { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }};
            navigator.mediaDevices.getUserMedia(constraints)
                .then(function(stream) {
                    video.srcObject = stream;
                    captureBtn.addEventListener('click', function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const dataURL = canvas.toDataURL('image/jpeg', 0.90);
                        stream.getTracks().forEach(track => track.stop());
                        document.body.removeChild(modal);

                        const documentNumber = document.getElementById('documentNumber').value;
                        const count = (currentDocument.files && currentDocument.files.length) || 0;
                        const fileName = documentNumber ? `${documentNumber} ${count + 1}.jpg` : 'photo.jpg';
                        const base64Data = dataURL.split(',')[1];

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
                    });
                })
                .catch(function(err) {
                    console.error("Chyba při přístupu ke kameře: ", err);
                    alert("Nelze získat přístup ke kameře.");
                    if (document.body.contains(modal)) {
                        document.body.removeChild(modal);
                    }
                });
        } else {
            alert("Funkce pro přístup ke kameře není podporována vaším prohlížečem.");
        }
    });

    function showThumbnail(dataURL, fileName) {
        let photoPreview = document.getElementById('photoPreview');
        if (!photoPreview) {
            photoPreview = document.createElement('div');
            photoPreview.id = 'photoPreview';
            const resultElement = document.getElementById('result');
            resultElement.parentNode.insertBefore(photoPreview, resultElement.nextSibling);
        }
        photoPreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = dataURL;
        img.style.maxWidth = '600px';
        img.style.cursor = 'pointer';
        img.style.marginTop = '10px';
        img.addEventListener('click', function() {
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = fileName;
            a.click();
        });
        photoPreview.appendChild(img);
    }
});
