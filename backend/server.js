
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();


if (!process.env.DATABASE_URL) {
  throw new Error("Configure DATABASE_URL nas variáveis de ambiente.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({
  origin: [
    "https://maikonchagas-coder.github.io",
    ...(process.env.FRONTEND_ORIGIN
      ? [process.env.FRONTEND_ORIGIN]
      : [])
  ]
}));

app.use(express.json({ limit: "20kb" }));

// Teste da API
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    res.status(500).json({ ok: false, database: "error" });
  }
});

// Lista todos os projetos cadastrados no Neon
app.get("/api/projetos", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT codigo_qr, nome, area
      FROM public.projetos
      ORDER BY nome ASC
    `);

    res.json(resultado.rows.map((p) => ({
      codigo: p.codigo_qr,
      nome: p.nome,
      area: p.area
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Não foi possível carregar os projetos." });
  }
});

// Busca um projeto específico pelo código QR
app.get("/api/projetos/:codigo", async (req, res) => {
  const codigo = String(req.params.codigo || "").trim();

  try {
    const resultado = await pool.query(
      `SELECT codigo_qr, nome, area
       FROM public.projetos
       WHERE codigo_qr = $1
       LIMIT 1`,
      [codigo]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: "Projeto não encontrado." });
    }

    const p = resultado.rows[0];

    res.json({
      codigo: p.codigo_qr,
      nome: p.nome,
      area: p.area
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao consultar o projeto." });
  }
});


// Salva uma avaliação no Neon
app.post("/api/avaliacoes", async (req, res) => {
  const {
    projetoCodigo,
    participante,
    nota1,
    nota2,
    nota3,
    comentario
  } = req.body || {};

  const codigo = String(projetoCodigo || "").trim();
  const nome = String(participante || "").trim();
  const notas = [nota1, nota2, nota3].map(Number);
  const texto = String(comentario || "").trim();

  if (!codigo || !nome || nome.length > 100) {
    return res.status(400).json({
      erro: "Informe um projeto e um nome válido."
    });
  }

  if (texto.length > 1000) {
    return res.status(400).json({
      erro: "O comentário deve ter no máximo 1000 caracteres."
    });
  }

  if (!notas.every(n => Number.isInteger(n) && n >= 1 && n <= 5)) {
    return res.status(400).json({
      erro: "As três notas devem ser números inteiros de 1 a 5."
    });
  }

  try {
    // Confirma que o projeto existe antes de aceitar a avaliação.
    const projeto = await pool.query(
      `SELECT codigo_qr
       FROM public.projetos
       WHERE codigo_qr = $1`,
      [codigo]
    );

    if (projeto.rowCount === 0) {
      return res.status(404).json({ erro: "Projeto não cadastrado." });
    }

    const resultado = await pool.query(
      `INSERT INTO public.avaliacoes
       (projeto_codigo, participante, nota_1, nota_2, nota_3, comentario)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, criado_em`,
      [codigo, nome, notas[0], notas[1], notas[2], texto || null]
    );

    res.status(201).json({
      mensagem: "Avaliação salva com sucesso.",
      id: resultado.rows[0].id,
      criadoEm: resultado.rows[0].criado_em
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        erro: "Este nome já avaliou este projeto."
      });
    }

    console.error(error);
    res.status(500).json({ erro: "Não foi possível salvar a avaliação." });
  }
});

// Ranking geral, ordenado pela média das três notas
app.get("/api/ranking", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        p.codigo_qr AS codigo,
        p.nome,
        p.area,
        COUNT(a.id)::int AS total_avaliacoes,
        ROUND(
          AVG((a.nota_1 + a.nota_2 + a.nota_3)::numeric / 3),
          2
        ) AS media
      FROM public.projetos p
      LEFT JOIN public.avaliacoes a
        ON a.projeto_codigo = p.codigo_qr
      GROUP BY p.codigo_qr, p.nome, p.area
      ORDER BY
        AVG((a.nota_1 + a.nota_2 + a.nota_3)::numeric / 3) DESC NULLS LAST,
        p.nome ASC
    `);

    res.json(resultado.rows.map(p => ({
      codigo: p.codigo,
      nome: p.nome,
      area: p.area,
      totalAvaliacoes: p.total_avaliacoes,
      media: p.media === null ? null : Number(p.media)
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Não foi possível calcular o ranking." });
  }
});

// Ranking por área, calculado a partir de todas as avaliações
app.get("/api/ranking/areas", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        p.area,
        COUNT(a.id)::int AS total_avaliacoes,
        ROUND(
          AVG((a.nota_1 + a.nota_2 + a.nota_3)::numeric / 3),
          2
        ) AS media
      FROM public.projetos p
      LEFT JOIN public.avaliacoes a
        ON a.projeto_codigo = p.codigo_qr
      GROUP BY p.area
      ORDER BY AVG(
        (a.nota_1 + a.nota_2 + a.nota_3)::numeric / 3
      ) DESC NULLS LAST, p.area ASC
    `);

    res.json(resultado.rows.map(p => ({
      area: p.area,
      totalAvaliacoes: p.total_avaliacoes,
      media: p.media === null ? null : Number(p.media)
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Não foi possível calcular o ranking por área." });
  }
});

// Fecha a conexão com o banco ao encerrar o servidor
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});




app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
