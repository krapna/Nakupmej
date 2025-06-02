// Script3.js - upraveno pro podporu 5× polí Jméno příjemce a jejich uchování při „Konec“
document.addEventListener('DOMContentLoaded', function() {
    const socket = window.socket || io();
    const urlParams = new URLSearchParams(window.location.search);
    let docIndex = urlParams.get('docIndex');
    let documents = [];
    let currentDocument = {};

    const saveButton   = document.getElementById('saveBtn');
    const endButton    = document.getElementById('endBtn');
    const fileUpload   = document.getElementById('fileUpload');
    const fileList     = document.getElementById('fileList');
    const form2Container = document.getElementById('form2Container');

    // Načtení dat do formuláře
    function loadFormData() {
        if (!currentDocument) return;
        form2Container.innerHTML = `
            <div class="form-group">
                <label for="documentNumber"><strong>Číslo dokumentu</strong></label>
                <input type="text" id="documentNumber" name="documentNumber" value="${currentDocument.number || ''}" readonly>
            </div>
            <div class="form-group">
                <label for="supplier"><strong>Dodavatel</strong></label>
                <input type="text" id="supplier" name="supplier" value="${currentDocument.supplier || ''}">
            </div>
            <div class="form-group">
                <label><strong>Stav balení</strong></label>
                <label><input type="radio" name="packagingStatus" value="1" ${currentDocument.packagingStatus === '1' ? 'checked' : ''}> 1</label>
                <label><input type="radio" name="packagingStatus" value="2" ${currentDocument.packagingStatus === '2' ? 'checked' : ''}> 2</label>
            </div>
            <div class="form-group">
                <label><strong>Označení balení</strong></label>
                <label><input type="radio" name="packageLabel" value="1" ${currentDocument.packageLabel === '1' ? 'checked' : ''}> 1</label>
                <label><input type="radio" name="packageLabel" value="2" ${currentDocument.packageLabel === '2' ? 'checked' : ''}> 2</label>
            </div>
            <div class="form-group">
                <label><strong>Dodávka odpovídá dokumentům</strong></label>
                <label><input type="radio" name="deliveryMatch" value="1" ${currentDocument.deliveryMatch === '1' ? 'checked' : ''}> 1</label>
                <label><input type="radio" name="deliveryMatch" value="2" ${currentDocument.deliveryMatch === '2' ? 'checked' : ''}> 2</label>
            </div>
            <div class="form-group">
                <label><strong>Dokumenty dodávky</strong></label>
                <label><input type="checkbox" name="documents" value="Dodací list" ${currentDocument.documents && currentDocument.documents.includes('Dodací list') ? 'checked' : ''}> Dodací list</label>
                <label><input type="checkbox" name="documents" value="Materiálové listy" ${currentDocument.documents && currentDocument.documents.includes('Materiálové listy') ? 'checked' : ''}> Materiálové listy</label>
                <label><input type="checkbox" name="documents" value="Faktura" ${currentDocument.documents && currentDocument.documents.includes('Faktura') ? 'checked' : ''}> Faktura</label>
                <label><input type="checkbox" name="documents" value="Certifikáty/Návody" ${currentDocument.documents && currentDocument.documents.includes('Certifikáty/Návody') ? 'checked' : ''}> Certifikáty/Návody</label>
                <label><input type="checkbox" name="documents" value="Jiné" ${currentDocument.documents && currentDocument.documents.includes('Jiné') ? 'checked' : ''}> Jiné</label>
            </div>
            <div class="form-group">
                <label><strong>Poznámka - uvést jestli Příjem 1 nebo Příjem 2</strong></label>
                <textarea id="note" name="note">${currentDocument.note || ''}</textarea>
            </div>
            <div class="form-group">
                <label><strong>Umístění</strong></label>
                <label><input type="checkbox" name="location" value="Příjem 1" ${(currentDocument.location && currentDocument.location.includes('Příjem 1')) ? 'checked' : ''}> Příjem 1</label>
                <label><input type="checkbox" name="location" value="Příjem 2" ${(currentDocument.location && currentDocument.location.includes('Příjem 2')) ? 'checked' : ''}> Příjem 2</label>
                <label><input type="checkbox" name="location" value="Jiné" ${(currentDocument.location && currentDocument.location.includes('Jiné')) ? 'checked' : ''}> Jiné</label>
            </div>
            <div class="form-group">
                <label><strong>Vstupní kontrolu provedl</strong></label>
                <input type="text" id="controlBy" name="controlBy" value="${currentDocument.controlBy || ''}">
            </div>
            <div class="form-group">
                <label><strong>Datum</strong></label>
                <input type="date" id="date" name="date" value="${currentDocument.date || ''}">
            </div>
        `;
        // Předvyplnění polí Strana3
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
        // Předvyplnění 5× pole Jméno příjemce
        document.getElementById('recipientName').value  = currentDocument.recipientName  || '';
        document.getElementById('recipientName2').value = currentDocument.recipientName2 || '';
        document.getElementById('recipientName3').value = currentDocument.recipientName3 || '';
        document.getElementById('recipientName4').value = currentDocument.recipientName4 || '';
        document.getElementById('recipientName5').value = currentDocument.recipientName5 || '';

        // Zobrazení uložených souborů
        fileList.innerHTML = '';
        if (currentDocument.files) {
            currentDocument.files.forEach(function(file) {
                addFileToList(file.name, file.content);
            });
        }
    }

    function addFileToList(fileName, fileContent) {
        const fileItem = document.createElement('div');
        const link = document.createElement('a');
        link.href = fileContent;
        link.download = fileName;
        link.textContent = fileName;
        link.target = '_blank';
        fileItem.appendChild(link);
        fileList.appendChild(fileItem);
    }

    // Upload souborů
    fileUpload.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);
        const documentNumber = document.getElementById('documentNumber').value;
        files.forEach(function(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const dataURL = e.target.result;
                const base64Data = dataURL.split(',')[1];
                const count = (currentDocument.files && currentDocument.files.length) || 0;
                const ext = file.name.split('.').pop();
                const fileName = documentNumber ? `${documentNumber} ${count + 1}.${ext}` : file.name;
                fetch('/uploadToDropbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64Data, fileName })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        addFileToList(fileName, data.link);
                        currentDocument.files = currentDocument.files || [];
                        currentDocument.files.push({ name: fileName, content: data.link });
                    } else {
                        alert('Upload do Dropboxu selhal: ' + data.error);
                    }
                })
                .catch(() => alert('Chyba při uploadu souboru.'));
            };
            reader.readAsDataURL(file);
        });
        fileUpload.value = '';
    });

    // Příjem aktualizací z backendu
    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        if (docIndex !== null && documents[docIndex]) {
            currentDocument = documents[docIndex];
        }
        loadFormData();
    });
    socket.emit('requestDocuments');

    // Uložení formuláře (Hotovo) + odstranění draft flagu
    saveButton.addEventListener('click', function(event) {
        event.preventDefault();
        const entryControlValue = document.querySelector('input[name="entryControl"]:checked')?.value;
        if (!entryControlValue) {
            alert("Vyberte prosím možnost pod 'Vstupní kontrola'");
            return;
        }
        currentDocument.entryControl = entryControlValue;
        currentDocument.orderNumber = document.getElementById('orderNumber').value;
        currentDocument.supplier = document.getElementById('supplier').value;
        currentDocument.confirmedDeliveryDate = document.getElementById('confirmedDeliveryDate').value;
        currentDocument.deliveryDate = document.getElementById('deliveryDate').value;
        currentDocument.price = document.getElementById('price').value;
        currentDocument.recipientName  = document.getElementById('recipientName').value;
        currentDocument.recipientName2 = document.getElementById('recipientName2').value;
        currentDocument.recipientName3 = document.getElementById('recipientName3').value;
        currentDocument.recipientName4 = document.getElementById('recipientName4').value;
        currentDocument.recipientName5 = document.getElementById('recipientName5').value;
        currentDocument.timeliness = document.querySelector('input[name="timeliness"]:checked')?.value;
        currentDocument.systemCheck = document.querySelector('input[name="systemCheck"]:checked')?.value;
        currentDocument.communication = document.querySelector('input[name="communication"]:checked')?.value;
        currentDocument.goodsType = Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value);
        currentDocument.note = document.getElementById('note').value;

        // Nastavení barvy a hasStrana4
        if (entryControlValue === 'Ano') {
            currentDocument.borderColor = 'orange';
            currentDocument.hasStrana4 = true;
        } else {
            currentDocument.borderColor = 'green';
            currentDocument.hasStrana4 = true;
        }
        // Draft flag zrušíme
        currentDocument.draftStrana3 = false;

        if (docIndex !== null) {
            documents[docIndex] = currentDocument;
        }
        socket.emit('updateDocuments', documents);
        window.location.href = 'Strana1.html';
    });

    // Uložení draftu a návrat na Strana1 (změní se draft flag, barva zůstává stejná)
    endButton.addEventListener('click', function() {
        currentDocument.orderNumber = document.getElementById('orderNumber').value;
        currentDocument.supplier = document.getElementById('supplier').value;
        currentDocument.confirmedDeliveryDate = document.getElementById('confirmedDeliveryDate').value;
        currentDocument.deliveryDate = document.getElementById('deliveryDate').value;
        currentDocument.price = document.getElementById('price').value;
        const timeliness = document.querySelector('input[name="timeliness"]:checked')?.value;
        if (timeliness) currentDocument.timeliness = timeliness;
        const systemCheck = document.querySelector('input[name="systemCheck"]:checked')?.value;
        if (systemCheck) currentDocument.systemCheck = systemCheck;
        const communication = document.querySelector('input[name="communication"]:checked')?.value;
        if (communication) currentDocument.communication = communication;
        const goodsTypeChecked = Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value);
        if (goodsTypeChecked.length) currentDocument.goodsType = goodsTypeChecked;
        currentDocument.note = document.getElementById('note').value;
        const entryControl = document.querySelector('input[name="entryControl"]:checked')?.value;
        if (entryControl) currentDocument.entryControl = entryControl;

        // 5× pole Jméno příjemce (draft)
        currentDocument.recipientName  = document.getElementById('recipientName').value;
        currentDocument.recipientName2 = document.getElementById('recipientName2').value;
        currentDocument.recipientName3 = document.getElementById('recipientName3').value;
        currentDocument.recipientName4 = document.getElementById('recipientName4').value;
        currentDocument.recipientName5 = document.getElementById('recipientName5').value;

        // Označíme dokument jako draft
        currentDocument.draftStrana3 = true;

        if (docIndex !== null) {
            documents[docIndex] = currentDocument;
        }
        socket.emit('updateDocuments', documents);
        window.location.href = 'Strana1.html';
    });
});
