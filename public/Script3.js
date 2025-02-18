document.addEventListener('DOMContentLoaded', function() {
    var saveButton = document.getElementById('saveBtn');
    var endButton = document.getElementById('endBtn');
    
    var fileUpload = document.getElementById('fileUpload');
    var fileList = document.getElementById('fileList');
    
    var form2Container = document.getElementById('form2Container');
   let currentDocumentIndex = parseInt(localStorage.getItem('currentDocumentIndex'), 10);
let documents = [];

function loadOrders() {
    fetch('/getOrders')
        .then(response => response.json())
        .then(data => {
            documents = data;
            currentDocument = (currentDocumentIndex !== null && !isNaN(currentDocumentIndex)) ? documents[currentDocumentIndex] : null;
            loadFormData();
        });
}

loadOrders();
documents[currentDocumentIndex] : null;

    function loadFormData() {
        if (!currentDocument) return;

        var form2HTML = `
            <div class="form-group">
                <h2>Číslo dokumentu</h2>
                <input type="text" id="documentNumber" name="documentNumber" value="${currentDocument.number || ''}" readonly>
            </div>
        `;
        form2Container.innerHTML = form2HTML;

        document.getElementById('orderNumber').value = currentDocument.orderNumber || '';
        document.getElementById('supplier').value = currentDocument.supplier || ''; 
        document.getElementById('confirmedDeliveryDate').value = currentDocument.confirmedDeliveryDate || '';
        document.getElementById('deliveryDate').value = currentDocument.deliveryDate || '';
        document.getElementById('price').value = currentDocument.price || ''; 

        if (currentDocument.timeliness) {
            document.querySelector(`input[name="timeliness"][value="${currentDocument.timeliness}"]`).checked = true;
        }
        if (currentDocument.systemCheck) {
            document.querySelector(`input[name="systemCheck"][value="${currentDocument.systemCheck}"]`).checked = true;
        }
        if (currentDocument.communication) {
            document.querySelector(`input[name="communication"][value="${currentDocument.communication}"]`).checked = true;
        }
        if (currentDocument.goodsType) {
            currentDocument.goodsType.forEach(function(type) {
                document.querySelector(`input[name="goodsType"][value="${type}"]`).checked = true;
            });
        }
        document.getElementById('note').value = currentDocument.note || '';

        if (currentDocument.entryControl) {
            document.querySelector(`input[name="entryControl"][value="${currentDocument.entryControl}"]`).checked = true;
        }

        // Načtení nahraných souborů
        if (currentDocument.files) {
            currentDocument.files.forEach(function(file) {
                addFileToList(file.name, file.content);
            });
        }
    }

    function addFileToList(fileName, fileContent) {
        var fileItem = document.createElement('div');
        var link = document.createElement('a');
        link.href = fileContent;
        link.target = '_blank';
        link.textContent = fileName;
        fileItem.appendChild(link);
        fileList.appendChild(fileItem);
    }

    fileUpload.addEventListener('change', function(event) {
        var files = Array.from(event.target.files);
        var documentNumber = document.getElementById('documentNumber').value;

        files.forEach(function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var fileContent = e.target.result;

                // Automatické přejmenování souboru podle čísla dokumentu
                var fileName = documentNumber ? `${documentNumber}_${file.name}` : file.name;

                addFileToList(fileName, fileContent);
                if (!currentDocument.files) {
                    currentDocument.files = [];
                }
                currentDocument.files.push({ name: fileName, content: fileContent });
            };
            reader.readAsDataURL(file); 
        });
    });

    if (currentDocument) {
        loadFormData();
    }

  saveButton.addEventListener('click', function(event) {
    event.preventDefault();

        var entryControlValue = document.querySelector('input[name="entryControl"]:checked')?.value;

        if (!entryControlValue) {
            alert("Vyberte prosím možnost pod 'Vstupní kontrola'");
            return;
        }

        var orderData = {
            entryControl: entryControlValue,
            orderNumber: document.getElementById('orderNumber').value,
            supplier: document.getElementById('supplier').value,
            confirmedDeliveryDate: document.getElementById('confirmedDeliveryDate').value,
            deliveryDate: document.getElementById('deliveryDate').value,
            price: document.getElementById('price').value,
            timeliness: document.querySelector('input[name="timeliness"]:checked')?.value,
            systemCheck: document.querySelector('input[name="systemCheck"]:checked')?.value,
            communication: document.querySelector('input[name="communication"]:checked')?.value,
            goodsType: Array.from(document.querySelectorAll('input[name="goodsType"]:checked')).map(el => el.value),
            note: document.getElementById('note').value,
            number: document.getElementById('documentNumber').value,
            files: currentDocument.files || []  // Uložení souborů
        };

        if (currentDocumentIndex !== null && !isNaN(currentDocumentIndex)) {
            documents[currentDocumentIndex] = { ...documents[currentDocumentIndex], ...orderData };
        } else {
            documents.push(orderData);
            currentDocumentIndex = documents.length - 1; 
        }

        if (entryControlValue === 'Ano') {
            documents[currentDocumentIndex].borderColor = 'orange';
            documents[currentDocumentIndex].hasStrana4 = true;
        } else if (entryControlValue === 'Ne') {
            documents[currentDocumentIndex].borderColor = 'green';
        }

        saveOrders();
    localStorage.removeItem('currentDocumentIndex');
    window.location.href = 'Strana1.html';
    function saveOrders() {
    fetch('/saveOrders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: documents })
    });
}


        window.location.href = 'Strana1.html';
    });

    endButton.addEventListener('click', function() {
        localStorage.removeItem('currentDocumentIndex');
        window.location.href = 'Strana1.html';
    });
});
