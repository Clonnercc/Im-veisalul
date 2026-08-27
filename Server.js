const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "troque-esta-senha";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let configuracao = {
  titulo: "Pagamento do aluguel",
  valor: "0,00",
  pix: "",
  contrato:
    "Declaro que li e concordo com os termos do contrato de locação apresentados nesta página."
};

const cadastros = [];

function autenticar(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Painel Administrativo"');
    return res.status(401).send("Não autorizado");
  }

  const dados = Buffer.from(header.slice(6), "base64").toString();
  const separador = dados.indexOf(":");

  const usuario = dados.slice(0, separador);
  const senha = dados.slice(separador + 1);

  if (usuario !== ADMIN_USER || senha !== ADMIN_PASS) {
    res.set("WWW-Authenticate", 'Basic realm="Painel Administrativo"');
    return res.status(401).send("Não autorizado");
  }

  next();
}

app.get("/api/config", (req, res) => {
  res.json({
    titulo: configuracao.titulo,
    valor: configuracao.valor,
    pixConfigurado: Boolean(configuracao.pix),
    contrato: configuracao.contrato
  });
});

app.get("/api/pix", (req, res) => {
  res.json({
    pix: configuracao.pix
  });
});

app.post("/api/cadastro", (req, res) => {
  const campos = [
    "nome",
    "cpf",
    "nascimento",
    "telefone",
    "email",
    "endereco",
    "cidade",
    "retiradaNome",
    "retiradaCpf",
    "retiradaTelefone",
    "assinaturaNome"
  ];

  for (const campo of campos) {
    if (!req.body[campo]) {
      return res.status(400).json({
        erro: `Preencha o campo obrigatório: ${campo}`
      });
    }
  }

  if (req.body.contratoAceito !== true) {
    return res.status(400).json({
      erro: "É necessário aceitar os termos."
    });
  }

  const cadastro = {
    id: Date.now().toString(),
    data: new Date().toISOString(),

    nome: req.body.nome,
    cpf: req.body.cpf,
    nascimento: req.body.nascimento,
    telefone: req.body.telefone,
    email: req.body.email,
    endereco: req.body.endereco,
    cidade: req.body.cidade,

    retiradaNome: req.body.retiradaNome,
    retiradaCpf: req.body.retiradaCpf,
    retiradaTelefone: req.body.retiradaTelefone,

    assinaturaNome: req.body.assinaturaNome,
    contratoAceito: true,

    status: "Aguardando pagamento"
  };

  cadastros.push(cadastro);

  res.json({
    sucesso: true,
    id: cadastro.id
  });
});

app.get("/api/admin", autenticar, (req, res) => {
  res.json({
    configuracao,
    cadastros
  });
});

app.post("/api/admin/config", autenticar, (req, res) => {
  configuracao.titulo = String(req.body.titulo || "").slice(0, 120);
  configuracao.valor = String(req.body.valor || "").slice(0, 30);
  configuracao.pix = String(req.body.pix || "");
  configuracao.contrato = String(req.body.contrato || "").slice(0, 10000);

  res.json({
    sucesso: true
  });
});

app.patch("/api/admin/cadastro/:id", autenticar, (req, res) => {
  const cadastro = cadastros.find(
    item => item.id === req.params.id
  );

  if (!cadastro) {
    return res.status(404).json({
      erro: "Cadastro não encontrado."
    });
  }

  const statusPermitidos = [
    "Aguardando pagamento",
    "Pago",
    "Cancelado"
  ];

  if (!statusPermitidos.includes(req.body.status)) {
    return res.status(400).json({
      erro: "Status inválido."
    });
  }

  cadastro.status = req.body.status;

  res.json({
    sucesso: true
  });
});

app.get("/admin", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "admin.html")
  );
});

app.listen(PORT, () => {
  console.log(`Site funcionando em http://localhost:${PORT}`);
});
