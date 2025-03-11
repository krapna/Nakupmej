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

        // Nová část: načtení hodnoty příjemce z Strany3
        document.getElementById('recipientFromStrana3').value = currentDocument.recipientName || '';

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

        if (currentDocument.files) {
            currentDocument.files.forEach(function(file) {
                addFileToList(file.name, file.content);
            });
        }
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

    // Pomocná funkce pro zobrazení nahraných souborů – nyní s atributem download
    function addFileToList(fileName, fileContent) {
        const fileList = document.getElementById('fileList');
        const fileItem = document.createElement('div');
        const link = document.createElement('a');
        link.href = fileContent;
        link.download = fileName; // Soubor se stáhne po kliknutí
        link.textContent = fileName;
        fileItem.appendChild(link);
        fileList.appendChild(fileItem);
    }

    // Obsluha nahrávání souborů
    fileUpload.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);
        const documentNumber = document.getElementById('documentNumber').value;
        files.forEach(function(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const fileContent = e.target.result;
                const fileName = documentNumber ? `${documentNumber}_${file.name}` : file.name;
                addFileToList(fileName, fileContent);
                if (!currentDocument.files) {
                    currentDocument.files = [];
                }
                currentDocument.files.push({ name: fileName, content: fileContent });
            };
            reader.readAsDataURL(file);
        });
    });

    // Při obdržení synchronizovaných dokumentů ze serveru aktualizujeme data
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
        // Shromáždění dat ze Strany2
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

        // Shromáždění dat z formuláře Strany3
        currentDocument.orderNumber = document.getElementById('orderNumber').value;
        currentDocument.confirmedDeliveryDate = document.getElementById('confirmedDeliveryDate').value;
        currentDocument.deliveryDate = document.getElementById('deliveryDate').value;
        currentDocument.timeliness = document.querySelector('input[name="timeliness"]:checked')?.value;
        currentDocument.systemCheck = document.querySelector('input[name="systemCheck"]:checked')?.value;
        currentDocument.communication = document.querySelector('input[name="communication"]:checked')?.value;
        const goodsTypeChecked = Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value);
        currentDocument.goodsType = goodsTypeChecked;

        // Uložení hodnoty z nového pole Příjemce
        currentDocument.recipientName = document.getElementById('recipientFromStrana3').value || '';

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
});
