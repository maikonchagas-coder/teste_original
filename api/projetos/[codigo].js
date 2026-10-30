
const pool = require("../../lib/db");

module.exports = async (req, res) => {
    if (req.method !== "GET") {
        return res.status(405).json({
            erro: "Método não permitido."
        });
    }

    try {
        const codigo = String(req.query.codigo || "").trim();

        if (!codigo) {
            return res.status(400).json({
                erro: "Código do projeto não informado."
            });
        }

        const resultado = await pool.query(
            `SELECT
                projeto_codigo AS codigo,
                nome,
                area
             FROM public.projetos
             WHERE projeto_codigo = $1
             LIMIT 1`,
            [codigo]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: "Projeto não encontrado."
            });
        }

        return res.status(200).json(resultado.rows[0]);

    } catch (erro) {
        console.error("Erro ao buscar projeto:", erro);

        return res.status(500).json({
            erro: "Erro ao consultar o projeto."
        });
    }
};
