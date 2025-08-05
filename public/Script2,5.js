// Script2,5.js
document.addEventListener('DOMContentLoaded', function() {
    const socket        = window.socket || io();
    const urlParams     = new URLSearchParams(window.location.search);
    let docIndex        = urlParams.get('docIndex');
    let documents       = [];
    let currentDocument = {};

    const saveBtn = document.getElementById('saveBtn');
    const endBtn  = document.getElementById('endBtn');

    function addFileToList(fileName, fileContent) {
        const fileList = document.getElementById('fileList');
        const item     = document.createElement('div');
        const link     = document.createElement('a');
        link.href      = fileContent;
        link.textContent = fileName;
        link.target    = '_blank';
        item.appendChild(link);
        fileList.appendChild(item);
    }

    function loadFormData() {
        if (!currentDocument) return;
        document.getElementById('documentNumber').value  = currentDocument.number || '';
        document.getElementById('orderNumber').value     = currentDocument.orderNumber || '';
        document.getElementById('supplier').value        = currentDocument.supplier || '';
        document.getElementById('note').value            = currentDocument.note || '';
        document.getElementById('recipientName').value   = currentDocument.recipientName || '';
        if (currentDocument.entryControl) {
            const ec = document.querySelector(
              `input[name="entryControl"][value="${currentDocument.entryControl}"]`
            );
            if (ec) ec.checked = true;
        }

        // zobrazíme odkazy na soubory
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        if (Array.isArray(currentDocument.files)) {
            currentDocument.files.forEach(f => {
                addFileToList(f.name, f.content);
            });
        }
    }

    document.addEventListener('documentsUpdated', function(event) {
        documents = event.detail;
        if (docIndex !== null && documents[docIndex]) {
            currentDocument = documents[docIndex];
        }
        loadFormData();
    });
    socket.emit('requestDocuments');

    saveBtn.addEventListener('click', function(event) {
        event.preventDefault();
        currentDocument.number        = document.getElementById('documentNumber').value;
        currentDocument.orderNumber   = document.getElementById('orderNumber').value;
        currentDocument.supplier      = document.getElementById('supplier').value;
        currentDocument.note          = document.getElementById('note').value;
        currentDocument.recipientName = document.getElementById('recipientName').value;
        const entryControlValue       = document.querySelector('input[name="entryControl"]:checked')?.value;
        if (entryControlValue) {
            currentDocument.entryControl = entryControlValue;
        }

        // označení dokončení kroků
        currentDocument.stage2Completed  = true;
        currentDocument.stage25Completed = true;

        if (docIndex !== null) {
            documents[docIndex] = currentDocument;
        }
        socket.emit('updateDocuments', documents);
        window.location.href = 'Strana1.html';
    });

    endBtn.addEventListener('click', function() {
        window.location.href = 'Strana1.html';
    });
});
