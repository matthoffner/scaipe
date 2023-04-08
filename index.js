const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const app = express();
const Tesseract = require("tesseract.js");
var isMac = process.platform === "darwin";
const defaultArgs = isMac ? {} : { 
  executablePath: '/usr/bin/google-chrome',
  headless: true, args: 
    ['--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-first-run',
    '--no-sandbox',
    '--no-zygote',
    '--single-process',
    "--proxy-server='direct://'",
    '--proxy-bypass-list=*',
    '--deterministic-fetch'
  ] 
};

app.get('/index.html', async (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  const file = fs.createReadStream('index.html');
  file.pipe(res);
});


app.get('/scaipe', async (req, res) => {
    const browser = await puppeteer.launch(defaultArgs);
    const page = await browser.newPage();
    await page.setViewport({
      width: req.query.width || 768,
      height: 1280,
      deviceScaleFactor: 1
    });
    await page.goto(req.query.url, { waitUntil: 'networkidle2' });
    await page.screenshot({fullPage: true}).then(async image => {
      await browser.close();
      const { data } = await Tesseract.recognize(image, "spa+eng");
      res.writeHead(200, {
        'Content-Type': 'image/png', 'Extracted-Text':
        Buffer.from(data.text).toString('base64')});
      res.write(image);
      res.end();
    });
});


const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`scaipe: listening on port ${port}`);
});
