document.addEventListener('DOMContentLoaded', function() {
    // Inicializace socket.io – předpokládáme, že onlineserv.js již vytvořil socket a případně jej uloženého do window.socket
    const socket = window.socket || io();

    // Získání parametru docIndex z URL (pokud existuje)
    const urlParams = new URLSearchParams(window.location.search);
    let docIndex = urlParams.get('docIndex');

    // Globální pole dokumentů (budou synchronizovány se serverem)
    let documents = [];
    // Aktuální dokument – pokud docIndex existuje, bude později načten ze sdíleného pole, jinak nový prázdný objekt
    let currentDocument = docIndex !== null ? null : {};

    // Funkce pro načtení dat aktuálního dokumentu do formuláře (část Strana2)
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
        document.getElementById('controlBy').value = currentDocument.controlBy || '';
        document.getElementById('date').value = currentDocument.date || '';
        document.getElementById('result').value = currentDocument.result || '';

        // Načtení nahraných souborů
        if (currentDocument.files) {
            currentDocument.files.forEach(function(file) {
                addFileToList(file.name, file.content);
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

    // Pomocná funkce pro zobrazení nahraných souborů
    function addFileToList(fileName, fileContent) {
        const fileList = document.getElementById('fileList');
        const fileItem = document.createElement('div');
        const link = document.createElement('a');
        link.href = fileContent;
        link.target = '_blank';
        link.textContent = fileName;
        fileItem.appendChild(link);
        fileList.appendChild(fileItem);
    }

    // Obsluha nahrávání souborů
    const fileUpload = document.getElementById('fileUpload');
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

    // Při obdržení synchronizovaných dokumentů ze serveru aktualizujeme naše lokální pole
    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        // Pokud docIndex byl předán a odpovídající dokument existuje, nastavíme currentDocument
        if (docIndex !== null && documents[docIndex]) {
            currentDocument = documents[docIndex];
        } else if (docIndex === null) {
            // Nový dokument – pokud currentDocument ještě nebyl vytvořen, vytvoříme prázdný objekt
            if (!currentDocument) {
                currentDocument = {};
            }
        }
        loadFormData();
    });

    // Po navázání spojení požádáme server o aktuální dokumenty
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

        // Shromáždění dat z dynamicky vloženého formuláře (část Strany3)
        currentDocument.orderNumber = document.getElementById('orderNumber').value;
        currentDocument.confirmedDeliveryDate = document.getElementById('confirmedDeliveryDate').value;
        currentDocument.deliveryDate = document.getElementById('deliveryDate').value;
        currentDocument.timeliness = document.querySelector('input[name="timeliness"]:checked')?.value;
        currentDocument.systemCheck = document.querySelector('input[name="systemCheck"]:checked')?.value;
        currentDocument.communication = document.querySelector('input[name="communication"]:checked')?.value;
        const goodsTypeChecked = Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value);
        currentDocument.goodsType = goodsTypeChecked;

        // Pokud se jedná o nový dokument, přidáme ho do sdíleného pole; pokud existuje, aktualizujeme jej
        if (docIndex === null) {
            documents.push(currentDocument);
            docIndex = documents.length - 1;
        } else {
            documents[docIndex] = currentDocument;
        }

        // Odeslání aktualizovaného pole dokumentů na server pro synchronizaci v reálném čase
        socket.emit('updateDocuments', documents);

        // Přesměrování zpět na Stranu1 (přehled objednávek)
        window.location.href = 'Strana1.html';
    });

    // Obsluha tlačítka "Konec" – přesměrování zpět na přehled
    const endButton = document.getElementById('endBtn');
    endButton.addEventListener('click', function() {
        window.location.href = 'Strana1.html';
    });
});
