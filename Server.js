const express       = require('express');
const bodyParser    = require('body-parser');
const fs            = require('fs');
const path          = require('path');
const PDFDocument   = require('pdfkit');
const archiver      = require('archiver');
const http          = require('http');
const socketIo      = require('socket.io');
const { Dropbox }   = require('dropbox');
const fetch         = require('node-fetch');
const { loadData, saveData } = require('./dataon');

// Funkce pro odstranění diakritiky
function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const app  = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io     = socketIo(server);

app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// OAuth2 – Přesměrování na Dropbox
app.get('/auth/dropbox', (req, res) => {
  const dropboxAuthUrl = new URL('https://www.dropbox.com/oauth2/authorize');
  dropboxAuthUrl.searchParams.set('client_id',     process.env.DROPBOX_APP_KEY);
  dropboxAuthUrl.searchParams.set('redirect_uri',  'https://nakupmej.onrender.com/auth/dropbox/callback');
  dropboxAuthUrl.searchParams.set('response_type', 'code');
  dropboxAuthUrl.searchParams.set('token_access_type','offline');
  res.redirect(dropboxAuthUrl.toString());
});

// OAuth2 – Callback z Dropboxu: výměna code za tokeny
app.get('/auth/dropbox/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Chybí parametr code.');
  }
  try {
    const tokenRes = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code, grant_type: 'authorization_code',
        client_id:     process.env.DROPBOX_APP_KEY,
        client_secret: process.env.DROPBOX_APP_SECRET,
        redirect_uri:  'https://nakupmej.onrender.com/auth/dropbox/callback'
      })
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return res.status(500).send('Chyba při získávání tokenu: ' + errText);
    }
    const tokenData = await tokenRes.json();
    global.dropboxAccessToken  = tokenData.access_token;
    global.dropboxRefreshToken = tokenData.refresh_token;
    global.dropboxExpiresIn    = tokenData.expires_in;
    console.log('Dropbox tokeny získány:', tokenData);
    res.redirect('/Strana1.html');
  } catch (err) {
    console.error('OAuth2 callback chyba:', err);
    res.status(500).send('OAuth2 chyba: ' + err.message);
  }
});


// Endpoint pro generování ZIP souboru (PDF + případné přílohy)
// --- (beze změn oproti předchozímu kódu) ---
app.post('/generateZip', async (req, res) => {
  const { filledData, attachments, orderNumber } = req.body;
  try {
    if (!filledData || filledData.trim() === "") {
      throw new Error("filledData je prázdné, PDF se nevygeneruje.");
    }
    const tempFolder = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder);
    const fileName = orderNumber || 'Dokument';
    const pdfPath  = path.join(tempFolder, `${fileName}.pdf`);
    const pdfDoc   = new PDFDocument();
    const pdfStream = fs.createWriteStream(pdfPath);
    pdfDoc.pipe(pdfStream);
    pdfDoc.font('Helvetica')
          .fontSize(14)
          .text(stripDiacritics('Souhrn vyplněných formulářů'), { align: 'center' });
    pdfDoc.moveDown(2);
    filledData.split('\n').forEach(line => {
      pdfDoc.fontSize(12).text(stripDiacritics(line), { align: 'left' });
      pdfDoc.moveDown(0.5);
    });
    pdfDoc.end();
    await new Promise(resolve => pdfStream.on('finish', resolve));
    const zipPath = path.join(tempFolder, `${fileName}.zip`);
    const output  = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.download(zipPath, `${fileName}.zip`, err => {
        if (err) console.error('Chyba download ZIP:', err);
        fs.unlinkSync(pdfPath);
        fs.unlinkSync(zipPath);
      });
    });
    archive.on('error', err => res.status(500).send({ error: err.message }));

    archive.pipe(output);
    archive.file(pdfPath, { name: `${fileName}.pdf` });
    // attachments sekce zakomentovaná, pokud by se přidávala:
    // attachments.forEach((file, idx) => {
    //   archive.append(Buffer.from(file.content,'base64'), { name: `file${idx+1}_${file.filename}` });
    // });
    archive.finalize();

  } catch (err) {
    console.error('ZIP generování selhalo:', err);
    res.status(500).send('Chyba při generování ZIP: ' + err.message);
  }
});


// Endpoint pro upload do Dropboxu s fallbackem na existující shared link
app.post('/uploadToDropbox', async (req, res) => {
  try {
    const { base64Data, fileName } = req.body;
    if (!global.dropboxAccessToken) {
      return res.status(400).json({
        success: false,
        error: "Dropbox token není dostupný. Proveďte přihlášení přes /auth/dropbox."
      });
    }
    const dbx = new Dropbox({
      accessToken: global.dropboxAccessToken,
      fetch
    });
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const dropboxPath = '/' + fileName;
    // 1) Upload
    const uploadRes = await dbx.filesUpload({ path: dropboxPath, contents: fileBuffer });
    const normalizedPath = uploadRes.result.path_lower;
    // 2) Pokus o vytvoření sdíleného odkazu
    let sharedUrl;
    try {
      const shareRes = await dbx.sharingCreateSharedLinkWithSettings({ path: normalizedPath });
      sharedUrl = shareRes.result.url.replace('?dl=0', '?dl=1');
    } catch (err) {
      // Pokud již existuje, vezmeme první existující odkaz
      if (err.error && err.error['.tag'] === 'shared_link_already_exists') {
        const listRes = await dbx.sharingListSharedLinks({ path: normalizedPath, direct_only: true });
        if (listRes.result.links.length > 0) {
          sharedUrl = listRes.result.links[0].url.replace('?dl=0', '?dl=1');
        } else {
          throw err;  // neočekávané
        }
      } else {
        throw err;
      }
    }
    res.json({ success: true, link: sharedUrl });

  } catch (error) {
    console.error('Upload do Dropboxu selhal:', error);
    res.status(500).json({ success: false, error: error.error_summary || error.message });
  }
});


// Načteme perzistentní data
let documents = loadData();

// Socket.io logika (beze změn)
io.on('connection', socket => {
  console.log('Nový klient připojen');
  socket.on('requestDocuments', () => {
    socket.emit('updateDocuments', documents);
  });
  socket.on('updateDocuments', updated => {
    documents = updated;
    saveData(documents);
    io.emit('updateDocuments', documents);
  });
  socket.on('disconnect', () => {
    console.log('Klient se odpojil');
  });
});

// Spuštění serveru
server.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
