const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

const app = express();
const PORT = 3000;

app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));

app.use(express.static(__dirname));

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

        const fileName = orderNumber ? orderNumber : 'Dokument'; // Pokud není číslo objednávky, použije se "Dokument"

        // **Vytvoření PDF souboru**
        const pdfPath = path.join(tempFolder, `${fileName}.pdf`);
        const pdfDoc = new PDFDocument();
        const pdfStream = fs.createWriteStream(pdfPath);
        pdfDoc.pipe(pdfStream);

        pdfDoc.font('Helvetica').fontSize(14).text(`Souhrn vyplněných formulářů`, { align: 'center' });
        pdfDoc.moveDown(2);

        filledData.split('\n').forEach(line => {
            pdfDoc.fontSize(12).text(line.trim(), { align: 'left' });
            pdfDoc.moveDown(0.5);
        });

        pdfDoc.end();

        await new Promise((resolve) => pdfStream.on('finish', resolve));

        // **Vytvoření ZIP souboru**
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

app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
