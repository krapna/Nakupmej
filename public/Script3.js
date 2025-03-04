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

    // Pomocná funkce pro zobrazení nahraných souborů – nyní s atributem download (soubor se stáhne po kliknutí)
    function addFileToList(fileName, fileContent) {
        const fileItem = document.createElement('div');
        const link = document.createElement('a');
        link.href = fileContent;
        link.download = fileName; // Atribut download způsobí stažení souboru
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

    // Při obdržení synchronizovaných dokumentů ze serveru se aktualizují data
    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        if (docIndex !== null && documents[docIndex]) {
            currentDocument = documents[docIndex];
        }
        loadFormData();
    });

    socket.emit('requestDocuments');

    // Obsluha tlačítka "Hotovo" – zpracování formuláře a nastavení logiky vstupní kontroly
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
        currentDocument.timeliness = document.querySelector('input[name="timeliness"]:checked')?.value;
        currentDocument.systemCheck = document.querySelector('input[name="systemCheck"]:checked')?.value;
        currentDocument.communication = document.querySelector('input[name="communication"]:checked')?.value;
        const goodsTypeChecked = Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value);
        currentDocument.goodsType = goodsTypeChecked;
        currentDocument.note = document.getElementById('note').value;

        // Zde nyní nastavíme v obou případech (Ano i Ne) příznak hasStrana4 = true,
        // aby na Straně1 byl zobrazen tlačítko pro Stranu5, když je vstupní kontrola hotová.
        if (entryControlValue === 'Ano') {
            currentDocument.borderColor = 'orange';
            currentDocument.hasStrana4 = true;
        } else if (entryControlValue === 'Ne') {
            currentDocument.borderColor = 'green';
            currentDocument.hasStrana4 = true;
        }

        if (docIndex !== null) {
            documents[docIndex] = currentDocument;
        }
        socket.emit('updateDocuments', documents);
        window.location.href = 'Strana1.html';
    });

    endButton.addEventListener('click', function() {
        window.location.href = 'Strana1.html';
    });
});
