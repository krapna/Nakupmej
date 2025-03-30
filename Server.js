const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const http = require('http');
const socketIo = require('socket.io');

// Přidání Dropbox SDK a node-fetch
const { Dropbox } = require('dropbox');
const fetch = require('node-fetch');

// Načteme modul pro perzistenci dat
const { loadData, saveData } = require('./dataon');

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

// Nový endpoint pro nahrávání souborů do Dropboxu
app.post('/uploadToDropbox', async (req, res) => {
  try {
    // Očekáváme JSON s base64Data (bez prefixu) a fileName
    const { base64Data, fileName } = req.body;

    const dbx = new Dropbox({
      accessToken: 'sl.u.AFphMAmO2JtECkY41tVuzd7nuOitXCOXB8kDYP2swEAb-14LpD_J_M5e3Ao0haHg9bW7RXxPHzXhuSeEsy1emBtMX1tuOr1tJPAuRBRWEYX2ncpbm69dUgt8Ss6_LdhucHX5LjGwc7sNA4oUV-6s9LorS1tsh0u0jbOTrl-W85Nce5BQGeRlK3d5-oW_g-zJVJ6a8C7LQ2wDJp79LhZoO2tceFyXD5BRClj6Fn9LnfR0mPcAyKv1FP9hhuNLM2z1-Z_hZnGRcz3aWVwJIwY5sDS6FDEUX4r0MDe9x2Rue96BJZuYOmeXBtiPJQrwmjcTBHN-UI0449vDKY95Wy2HR8cLsJ8vfoGyzBDKXYvBjZKfXNcYJKdJ7c5DU9pqSz7dAdh6KqyuWa_tyWDr0nA78BfvKhOARJT1n4z6ALXtCK5qpQP28o6eN2B91BW6sDsdZ8ioBDOH3Ds-llUrEolATiucZUtnujInZCYVWPjWDuERBfYAQWGsZBWdEVNMvQq0EjYJVHS7gZ5SWlHwccL-D9GfTr9vCYYQO6H4IEIrZYAwOb7Li4Dkwit75TKlxAZiz5n0YTriG4spl_odMMp30SQVzxhEV4mOiIv4XGXXY43s-1at5P2FF3m9auhHeb7h0ka9cOxL1lZNYTlIi1HzMv9CgEQB6C_aW-gt_Xc7jss7q-OBvlOEU3XrxWyaefyg_vYnohc5vRKoRWyEghzKr4diGnXN233BB6Lcu0WwNJF9TZO6hPM9ZtK3Z5SsxFIvXpCixsPFokHe3kQd7LsAwtNzaFkd401gtN7Sl6AvyGU7OyUmDSz5jjZUn8ltAJTIEn7u1NjaiNq9mi-tQoTlPpkt3OAhTpFhtTvfoQF-F4mf5alwIVLGQv5iBrmwz6fZjRTiz5hLyA-Uaim4HndJcviYVjlHiA8jiPJbtS1H0meO5Va2iXOm9jt1w_SZGMla-GuUjfJmENYgKK_YT0cxsdzgS9Vilj8Al88vBfrPepn_mPQXsO9S6VIYfVKyYO8_IQXz9VEtr-aMUwZg9EvhRE4NGAAxMj55VEsugsr66t4M1NLvkNGxoPES_dxgazqM7e68qANGAnjkeGU-HTHD8j4YGjpJaa1V57EUZkTZe2-P5o2Ht76qnzR3grTfPvguRdzLXna2fw2BVP9g22xLnWiWs2dHtUrnqzi8--Xqdm7lOZ0Xo9w9anMqiHZ8Tw3UUyCdxB73QysZr1PP8gO1dF4q1zaYBKbUb5j0iRiTq4all_sH_RKLE2qOXGHFntMMRYpRl0VzdrgzqKZGzmAh9i208TsDcy7E93fE84w-hk2DHO1uXfYChlNIHdqBHaWsiHfrogYDctQabInl4KEwkFElQ8UpWrKEz3WgrFBVM2jzQSGPqqxTdLaFu5hdEtCJ-MJiTjln5gJTLS22gqWYtaG2',
      fetch: fetch
    });

    // Převod base64 na binární buffer
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Nastav cestu, kam se soubor uloží v Dropboxu (např. do složky /app)
    const dropboxPath = '/app/' + fileName;

    // Nahraj soubor do Dropboxu
    const uploadResponse = await dbx.filesUpload({
      path: dropboxPath,
      contents: fileBuffer
    });

    // Vytvoř sdílený odkaz, aby bylo možné soubor stáhnout
    const sharedLinkRes = await dbx.sharingCreateSharedLinkWithSettings({
      path: uploadResponse.result.path_lower
    });

    // Úprava odkazu pro přímé stažení
    let link = sharedLinkRes.result.url.replace('?dl=0', '?dl=1');

    res.json({ success: true, link });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Načteme persistentní data při startu serveru
let documents = loadData();

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
    // Uložíme data do souboru
    saveData(documents);
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
