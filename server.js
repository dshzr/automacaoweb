const express = require("express");
const puppeteer = require("puppeteer");
let pdf = require("html-pdf");

const app = express();
const port = 3333;
const cors = require("cors");
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.json());
app.use(cors());
app.get("/produtos", async (req, res) => {
  const url = "https://www.mercadolivre.com.br/";
  let searchFor = req.query.pesquisa;
  let limite = req.query.limite ? parseInt(req.query.limite) : 10;

  const listaDeProdutos = [];
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--start-fullscreen"],
  });
  let index = 0;
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url);
  await page.waitForSelector("#cb1-edit");
  await page.type("#cb1-edit", searchFor);

  await Promise.all([page.waitForNavigation(), page.click(".nav-search-btn")]);

  await page.waitForSelector(".ui-search-result__image");
  const links = await page.$$eval(".ui-search-result__image a", (element) =>
    element.map((link) => link.href)
  );

  for (const link of links) {
    if (index == limite) {
      continue;
    }
    await page.goto(link);
    await page.waitForSelector(".ui-pdp-title");
    let titulo = await page.$eval(
      ".ui-pdp-title",
      (element) => element.innerText
    );
    let preco = await page.$eval(".andes-money-amount__fraction", (element) =>
      parseFloat(element.innerText)
    );
    let imagens = await page.$$eval(".ui-pdp-gallery__figure img", (img) =>
      img.map((e) => e.getAttribute("src"))
    );

    const obj = {};

    obj.titulo = titulo;
    obj.preco = preco;
    obj.link = link;
    obj.imagens = imagens;
    listaDeProdutos.push(obj);
    index++;

    console.log("pagina: " + index);
  }
  res.send(listaDeProdutos);
  await browser.close();
});

app.post("/pdf", (req, res) => {
  const produtos = req.body.produtos;
  let string = "";
  produtos.forEach((p) => {
    string += `
  <h4 style="text-align: center;"> ${p.titulo} <span style="color:green;">R$ ${p.preco} reais</span> <a style="display: block;" href="${p.link}" target="_blank">clique aqui para ver o produto no mercado livre</a></h4><br>
  
  `;

    p.imagens.forEach(
      (img) =>
        (string += `
        <img 
      style="margin: 5px"
      src="${img} width="100px" height="100px"
      />`)
    );

    string += `<br> <br>`;
  });
  pdf
    .create(string, {})
    .toFile(
      "produtosmercadolivre.pdf",
      (err) => err && console.log("deu erro ao gerar pdf: " + err)
    );
});

app.listen(port, () =>
  console.log(`servidor rodando na porta http://localhost:${port}`)
);
