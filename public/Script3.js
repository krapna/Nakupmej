// Script3.js – upraveno pro propisování příjmení příjemce bez diakritiky
// a zachování rozpracovaných dat při stisku „Konec“

document.addEventListener('DOMContentLoaded', function() {
    const socket = window.socket || io();
    const urlParams = new URLSearchParams(window.location.search);
    let docIndex = urlParams.get('docIndex');
    let documents = [];
    let currentDocument = {};

    const saveButton    = document.getElementById('saveBtn');
    const endButton     = document.getElementById('endBtn');
    const fileUpload    = document.getElementById('fileUpload');
    const fileList      = document.getElementById('fileList');
    const form2Container = document.getElementById('form2Container');

    // Načtení dat do formuláře
    function loadFormData() {
        if (!currentDocument) return;

        // Dynamicky vložíme část z Strana2
        form2Container.innerHTML = `
            <div class="form-group">
                <h2>Číslo dokumentu</h2>
                <input type="text" id="documentNumber" name="documentNumber"
                  value="${currentDocument.number || ''}" readonly>
            </div>
        `;

        // Statická pole Strana3
        document.getElementById('orderNumber').value           = currentDocument.orderNumber || '';
        document.getElementById('supplier').value              = currentDocument.supplier || '';
        document.getElementById('confirmedDeliveryDate').value = currentDocument.confirmedDeliveryDate || '';
        document.getElementById('deliveryDate').value          = currentDocument.deliveryDate || '';
        document.getElementById('price').value                 = currentDocument.price || '';

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

        // Nová část: propis příjmení příjemce bez diakritiky, malá písmena
        if (currentDocument.recipientName) {
            const surname = currentDocument.recipientName
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
            const surnameInput = document.getElementById('recipientName');
            if (surnameInput) surnameInput.value = surname;
        }

        // Zobrazení již nahraných souborů
        fileList.innerHTML = '';
        if (currentDocument.files) {
            currentDocument.files.forEach(function(file) {
                addFileToList(file.name, file.content);
            });
        }
    }

    // Pomocná funkce pro výpis nahraných souborů
    function addFileToList(fileName, fileContent) {
        const fileItem = document.createElement('div');
        const link     = document.createElement('a');
        link.href      = fileContent;
        link.download  = fileName;
        link.textContent = fileName;
        link.target    = '_blank';
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
                const dataURL    = e.target.result;
                const base64Data = dataURL.split(',')[1];
                const count      = (currentDocument.files && currentDocument.files.length) || 0;
                const ext        = file.name.split('.').pop();
                const fileName   = documentNumber ? `${documentNumber} ${count + 1}.${ext}` : file.name;

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

    // Přijmeme data ze serveru
    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        if (docIndex !== null && documents[docIndex]) {
            currentDocument = documents[docIndex];
        }
        loadFormData();
    });
    socket.emit('requestDocuments');

    // Uložení (Hotovo)
    saveButton.addEventListener('click', function(event) {
        event.preventDefault();
        const entryControlValue = document.querySelector('input[name="entryControl"]:checked')?.value;
        if (!entryControlValue) {
            alert("Vyberte prosím možnost pod 'Vstupní kontrola'");
            return;
        }
        currentDocument.entryControl = entryControlValue;

        currentDocument.orderNumber           = document.getElementById('orderNumber').value;
        currentDocument.supplier              = document.getElementById('supplier').value;
        currentDocument.confirmedDeliveryDate = document.getElementById('confirmedDeliveryDate').value;
        currentDocument.deliveryDate          = document.getElementById('deliveryDate').value;
        currentDocument.price                 = document.getElementById('price').value;
        // Uložíme právě vypočtené příjmení příjemce
        currentDocument.recipientName         = document.getElementById('recipientName').value;
        currentDocument.timeliness            = document.querySelector('input[name="timeliness"]:checked')?.value;
        currentDocument.systemCheck           = document.querySelector('input[name="systemCheck"]:checked')?.value;
        currentDocument.communication         = document.querySelector('input[name="communication"]:checked')?.value;
        currentDocument.goodsType             = Array.from(
            document.querySelectorAll('input[name="goodsType"]:checked')
        ).map(el => el.value);
        currentDocument.note                  = document.getElementById('note').value;

        // Nastavení barvy a hasStrana4 podle volby
        if (entryControlValue === 'Ano') {
            currentDocument.borderColor = 'orange';
            currentDocument.hasStrana4  = true;
        } else {
            currentDocument.borderColor = 'green';
            currentDocument.hasStrana4  = true;
        }

        // Zrušení draft flagu
        currentDocument.draftStrana3 = false;

        if (docIndex !== null) {
            documents[docIndex] = currentDocument;
        }
        socket.emit('updateDocuments', documents);
        window.location.href = 'Strana1.html';
    });

    // Uložení draftu (Konec)
    endButton.addEventListener('click', function() {
        // Uložíme všechna pole jako draft
        currentDocument.orderNumber           = document.getElementById('orderNumber').value;
        currentDocument.supplier              = document.getElementById('supplier').value;
        currentDocument.confirmedDeliveryDate = document.getElementById('confirmedDeliveryDate').value;
        currentDocument.deliveryDate          = document.getElementById('deliveryDate').value;
        currentDocument.price                 = document.getElementById('price').value;
        const timeliness2     = document.querySelector('input[name="timeliness"]:checked')?.value;
        if (timeliness2)     currentDocument.timeliness = timeliness2;
        const systemCheck2    = document.querySelector('input[name="systemCheck"]:checked')?.value;
        if (systemCheck2)    currentDocument.systemCheck = systemCheck2;
        const communication2  = document.querySelector('input[name="communication"]:checked')?.value;
        if (communication2)  currentDocument.communication = communication2;
        const goodsTypeChk2   = Array.from(
            document.querySelectorAll('input[name="goodsType"]:checked')
        ).map(el => el.value);
        if (goodsTypeChk2.length) currentDocument.goodsType = goodsTypeChk2;
        currentDocument.note                  = document.getElementById('note').value;
        const entryControl2 = document.querySelector('input[name="entryControl"]:checked')?.value;
        if (entryControl2) currentDocument.entryControl = entryControl2;
        // Uložíme i vypočtené příjmení
        currentDocument.recipientName         = document.getElementById('recipientName').value;

        currentDocument.draftStrana3 = true;

        if (docIndex !== null) {
            documents[docIndex] = currentDocument;
        }
        socket.emit('updateDocuments', documents);
        window.location.href = 'Strana1.html';
    });
});
