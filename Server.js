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

    // PŘÍMO VLOŽENÝ Access Token
    // (POZOR: není to doporučené řešení pro produkční nasazení)
    const dbx = new Dropbox({
      accessToken: 'sl.u.AFq4a8kog5h5Cogdpmgp8rKBw7yn_agmEyf-DG2Be6B-YYhDyt-qC2KwLee5awSsEc1EwfrAanvPnU1TrzIsjGA6FXiH1rAxkjqATCZNZJVeUbbcIzJKV2lOKhx8D1FujCJ98QMVRFHNEF7IerFXG9I3a6r8YpvAmn3GfWkjYIMjXIB6SbBdrqiQ-OWwBjj6aezG0WjPtWEDikxgeGKBBZLR9-qsTH0fNrkoC0N6H-19auovHIEgkiWg2D3mrQYBIARpmTroYj1s-kijMVmoX_T3l1B7oEsr9D7KQqSzGJ1aos5C0qxhFQ_ru0pFKCLujHKSr9jQTY9HEHZPyobiNtqDGIKGX2GVahImU8QADYw59BUBGj8k60Nm9j6g40ufKD2RCuwjo7R3QmLJNQ3riphzaabZHJ5h4nSneTldGH6oQs7oUTru2NHbBr2ezsgxVEFukwaAJ1WLHjaML5bZnl4I3VUNV67JknkUxDAw56x4fG5OyDkQ9H0UzReWk50N9cehGZkpcVZnFxKR-l9MiLIVxsXPdWvU0q54p76UdfbL0p8Bm9Jm6tp65vu2DNSy28qMaPjpFCDyZcqPI0begtfCv1Xw0Mbe7PaEvHw0mpBnmRVRckDtxvzI7QceyG0fdtsyrTCyqySuepx_vs_bbKswiDq9LAbRCcYZv_hZ-ddg40q0Z0VEa19G_IeIiKXn0k_MxwToLBERy_ERq9ZcgD14NcZlAjc-Ev18oga36xJoIVLrg-BoGhotT9j_ba3--C_B2XwRs2ewTwYCGeJpz7ezC1tRyuvkMV9GteFauTw81h4YzPZb5UE2xLj61r5qQtCPcG-8_t3sPwd9WNro6XHiWBgavGrtIbcqziVSuxmt1Po3gCC8jnpBwwNyKKV7r1BdIRfQW_EWrFhpJ1TS8KWDaNmcEEfv0nwshiMZ-lo40lWD1O8kI8BTN0x4s7bEUUkUyNGIQQG2-F2ADHjVf9-cNkD8UWhE4iMZcfErt4ZgeYVIBnCwLKuG3OyS7zq9BUDu7KUuuEwGSzlWrKcE0QaVDlbI-D0X4wL8iEqSD6GYO2onxYAPjQEi4INAItU_73_BqSIvrdN-dRDjapT-0pWVWNGAlj-uSJ2u0qBwOQVqoGJRlGdJEpL9VZYWhI8pQbGkECoELl71Af9SwTyj1tc_3Qk5JDGB8XvB1HaXs2iRyzAkCxapvenG7uSarxAAqaoHPiIO-EE5YdGUDpRApxU-QB1rf_fO9fygpcLzMf1CWzCWW5FlwLgEAjdUS9zW-vlldmCwN1F-HUdWK8Ut-QXNRkosWKLDSkR6W0VOx0cA9VdJl4__o9mD2iGutKJ35EFeLwfgrTLGh9xP1yQWGlfn46ndcsFdTsj1yMQJ5huXmrN6o9-ztQJhninYXyi7C6s83C2t5yX80G0stKjEKbNAaZQOUL1aiSoglv4pKbnQ2w',
      fetch: fetch
    });

    // Převod base64 na binární buffer
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Cesta, kam se soubor uloží v Dropboxu (zde do kořene "/")
    const dropboxPath = '/' + fileName;

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
