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

// OAuth2 – Přesměrování na Dropbox
app.get('/auth/dropbox', (req, res) => {
  // V environmentálních proměnných nastavte DROPBOX_APP_KEY a DROPBOX_APP_SECRET
  const dropboxAuthUrl = new URL('https://www.dropbox.com/oauth2/authorize');
  dropboxAuthUrl.searchParams.set('client_id', process.env.DROPBOX_APP_KEY);
  dropboxAuthUrl.searchParams.set('redirect_uri', 'https://nakupmej.onrender.com/auth/dropbox/callback');
  dropboxAuthUrl.searchParams.set('response_type', 'code');
  dropboxAuthUrl.searchParams.set('token_access_type', 'offline'); // Chceme refresh token
  res.redirect(dropboxAuthUrl.toString());
});

// OAuth2 – Callback z Dropboxu: Výměna code za tokeny
app.get('/auth/dropbox/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Chybí parametr code.');
  }
  try {
    const tokenRes = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        client_id: process.env.DROPBOX_APP_KEY,
        client_secret: process.env.DROPBOX_APP_SECRET,
        redirect_uri: 'https://nakupmej.onrender.com/auth/dropbox/callback'
      })
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return res.status(500).send('Chyba při získávání tokenu: ' + errText);
    }
    const tokenData = await tokenRes.json();
    // Uložení tokenů do globálních proměnných (jen pro tento demo – v produkci používejte bezpečnější metodu!)
    global.dropboxAccessToken = tokenData.access_token;
    global.dropboxRefreshToken = tokenData.refresh_token;
    global.dropboxExpiresIn = tokenData.expires_in;
    console.log('Dropbox tokeny:', tokenData);
    res.redirect('/Strana1.html');
  } catch (error) {
    console.error('Chyba OAuth2 callback:', error);
    res.status(500).send('OAuth2 chyba: ' + error.message);
  }
});

// POST endpoint pro generování ZIP souboru s PDF souhrnem a přiloženými soubory
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
    const pdfPath = path.join(tempFolder, `${fileName}.pdf`);
    const pdfDoc = new PDFDocument();
    const pdfStream = fs.createWriteStream(pdfPath);
    pdfDoc.pipe(pdfStream);

    // **REGISTER AND USE CUSTOM FONT**
    const fontPath = path.join(__dirname, 'public', 'fonts', 'DejaVuSans.ttf');
    pdfDoc.registerFont('DejaVuSans', fontPath);
    pdfDoc.font('DejaVuSans')
          .fontSize(14)
          .text(`Souhrn vyplněných formulářů`, { align: 'center' });

    pdfDoc.moveDown(2);
    filledData.split('\n').forEach(line => {
      pdfDoc.fontSize(12).text(line.trim(), { align: 'left' });
      pdfDoc.moveDown(0.5);
    });
    pdfDoc.end();
    await new Promise((resolve) => pdfStream.on('finish', resolve));

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

    //    if (attachments && attachments.length > 0) {
    //      attachments.forEach((file, index) => {
    //        const fileBuffer = Buffer.from(file.content, 'base64');
    //        archive.append(fileBuffer, { name: `file${index + 1}_${file.filename}` });
    //      });
    //    }

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
    // Pokud token ještě nebyl získán, vrátíme chybu
    if (!global.dropboxAccessToken) {
      return res.status(400).json({ success: false, error: "Dropbox token není dostupný. Nejdříve se přihlaste přes /auth/dropbox." });
    }
    const dbx = new Dropbox({
      accessToken: global.dropboxAccessToken,
      fetch: fetch
    });
    const fileBuffer = Buffer.from(base64Data, 'base64');
    // Uložíme soubor přímo do kořene Dropboxu (bez podsložek)
    const dropboxPath = '/' + fileName;
    const uploadResponse = await dbx.filesUpload({
      path: dropboxPath,
      contents: fileBuffer
    });
    const sharedLinkRes = await dbx.sharingCreateSharedLinkWithSettings({
      path: uploadResponse.result.path_lower
    });
    let link = sharedLinkRes.result.url.replace('?dl=0', '?dl=1');
    res.json({ success: true, link });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Načteme persistentní data při startu serveru
let documents = loadData();

// Socket.io obsluha
io.on('connection', (socket) => {
  console.log('Nový klient připojen');
  socket.on('requestDocuments', () => {
    socket.emit('updateDocuments', documents);
  });
  socket.on('updateDocuments', (updatedDocuments) => {
    documents = updatedDocuments;
    saveData(documents);
    io.emit('updateDocuments', documents);
  });
  socket.on('disconnect', () => {
    console.log('Klient se odpojil');
  });
});

// Spustíme server
server.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
