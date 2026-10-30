
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async (req, res) => {
    if (req.method !== "GET") {
        return res.status(405).json({
            erro: "Método não permitido."
        });
    }

    try {
        const param = req.query.param;

        const resultado = await pool.query(
            "SELECT * FROM projetos WHERE codigo_projeto = $1",
            [param]
        );

        return res.status(200).json(resultado.rows);

    } catch (erro) {
        console.error("Erro ao consultar Neon:", erro);

        return res.status(500).json({
            erro: "Não foi possível consultar o banco de dados."
        });
    }
};
