
const pool = require("../lib/db");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({
            erro: "Método não permitido."
        });
    }

    try {
        const {
            projetoCodigo,
            participante,
            nota1,
            nota2,
            nota3,
            comentario
        } = req.body || {};

        // Validar identificação
        if (
            typeof projetoCodigo !== "string" ||
            !projetoCodigo.trim() ||
            typeof participante !== "string" ||
            !participante.trim()
        ) {
            return res.status(400).json({
                erro: "Projeto e participante são obrigatórios."
            });
        }

        // Validar notas (escala de 1 a 5)
        const notas = [nota1, nota2, nota3];

        if (!notas.every(
            nota => Number.isInteger(nota) && nota >= 1 && nota <= 5
        )) {
            return res.status(400).json({
                erro: "As três notas devem ser números inteiros de 1 a 5."
            });
        }

        // Validar comentário
        if (
            comentario !== undefined &&
            typeof comentario !== "string"
        ) {
            return res.status(400).json({
                erro: "Comentário inválido."
            });
        }

        // Confirmar que o projeto existe
        const projeto = await pool.query(
            `SELECT projeto_codigo
             FROM public.projetos
             WHERE projeto_codigo = $1
             LIMIT 1`,
            [projetoCodigo.trim()]
        );

        if (projeto.rows.length === 0) {
            return res.status(404).json({
                erro: "Projeto não encontrado."
            });
        }

        // Registrar avaliação e impedir duplicidade
        const resultado = await pool.query(
            `INSERT INTO public.avaliacoes
                (projeto_codigo, participante, nota_1, nota_2, nota_3, comentario)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (projeto_codigo, participante)
             DO NOTHING
             RETURNING id, criado_em`,
            [
                projetoCodigo.trim(),
                participante.trim(),
                nota1,
                nota2,
                nota3,
                comentario?.trim() || null
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(409).json({
                erro: "Você já avaliou este projeto."
            });
        }

        return res.status(201).json({
            sucesso: true,
            mensagem: "Avaliação registrada com sucesso!",
            avaliacao: resultado.rows[0]
        });

    } catch (erro) {
        console.error("Erro ao salvar avaliação:", erro);

        return res.status(500).json({
            erro: "Não foi possível registrar a avaliação."
        });
    }
};