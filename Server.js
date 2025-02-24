const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;

// Vytvoříme HTTP server a navážeme na něj socket.io
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));

// Poskytujeme statické soubory z adresáře public
app.use(express.static(path.join(__dirname, 'public')));

// Hlavní stránka – Strana0.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Strana0.html'));
});

// POST požadavek pro generování ZIP souboru s PDF souhrnem a přiloženými soubory
app.post('/generateZip', async (req, res) => {
    const { filledData, attachments, orderNumber } = req.body;

    try {
        if (!filledData || filledData.trim() === "") {
            throw new Error("filledData je prázdné, PDF se nevygeneruje.");
        }

        const tempFolder = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempFolder)) {
            fs.mkdirSync(tempFolder);
        }

        const fileName = orderNumber ? orderNumber : 'Dokument';

        // Vytvoření PDF souboru
        const pdfPath = path.join(tempFolder, `${fileName}.pdf`);
        const pdfDoc = new PDFDocument();
        const pdfStream = fs.createWriteStream(pdfPath);
        pdfDoc.pipe(pdfStream);

        pdfDoc.font('Helvetica')
              .fontSize(14)
              .text(`Souhrn vyplněných formulářů`, { align: 'center' });
        pdfDoc.moveDown(2);

        filledData.split('\n').forEach(line => {
            pdfDoc.fontSize(12).text(line.trim(), { align: 'left' });
            pdfDoc.moveDown(0.5);
        });

        pdfDoc.end();
        await new Promise((resolve) => pdfStream.on('finish', resolve));

        // Vytvoření ZIP souboru
        const zipPath = path.join(tempFolder, `${fileName}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            res.download(zipPath, `${fileName}.zip`, (err) => {
                if (err) console.error('Chyba při stahování ZIP:', err);
                fs.unlinkSync(zipPath);
                fs.unlinkSync(pdfPath);
            });
        });

        archive.on('error', (err) => res.status(500).send({ error: err.message }));
        archive.pipe(output);

        archive.file(pdfPath, { name: `${fileName}.pdf` });

        if (attachments && attachments.length > 0) {
            attachments.forEach((file, index) => {
                const fileBuffer = Buffer.from(file.content, 'base64');
                archive.append(fileBuffer, { name: `file${index + 1}_${file.filename}` });
            });
        }

        archive.finalize();
    } catch (error) {
        console.error('Chyba při generování ZIP souboru:', error);
        res.status(500).send('Chyba při generování ZIP souboru: ' + error.message);
    }
});

// Sdílené pole dokumentů, které bude sloužit pro synchronizaci mezi klienty
let documents = [];

// Obsluha socket.io připojení
io.on('connection', (socket) => {
    console.log('Nový klient připojen');

    // Klient požádá o aktuální dokumenty
    socket.on('requestDocuments', () => {
        socket.emit('updateDocuments', documents);
    });

    // Klient odešle aktualizovaný seznam dokumentů
    socket.on('updateDocuments', (updatedDocuments) => {
        documents = updatedDocuments;
        io.emit('updateDocuments', documents);
    });

    socket.on('disconnect', () => {
        console.log('Klient se odpojil');
    });
});

// Spustíme server s připojeným socket.io
server.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
