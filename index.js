const express = require("express");
const path = require("path");

// necessario para o banco.
const { Pool } = require("pg");

const pool = new Pool({
    ssl: { rejectUnauthorized: false }
});



const app = express();
app.use(express.static(path.join(__dirname, "public")));



// Rota Padrão meu amigooo!!!
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});



// SELECT informações do projeto pelo código
app.get("/select/:param", async (req, res) => {

    try {
        const param = req.params.param;

        const resultado = await pool.query(
            `SELECT * FROM projetos WHERE codigo_projeto = 001`
        );

        res.json(resultado.rows);

    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao consultar a tabela." });
    }
    
});






app.listen(3000, console.log(`RUnn!!`));
