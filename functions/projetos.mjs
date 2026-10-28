import { neon } from "@neondatabase/serverless";

export default async (request) => {
  const url = new URL(request.url);
  const codigo =
    url.searchParams.get("codigo") ||
    url.searchParams.get("projeto");

  if (!codigo) {
    return Response.json(
      { erro: "Código do projeto não informado." },
      { status: 400 }
    );
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const projetos = await sql`
      SELECT id, projeto_codigo, nome, area, descricao
      FROM projetos
      WHERE projeto_codigo = ${codigo}
      LIMIT 1
    `;

    if (projetos.length === 0) {
      return Response.json(
        { erro: "Projeto não cadastrado." },
        { status: 404 }
      );
    }

    return Response.json(projetos[0]);
  } catch (erro) {
    console.error("Erro ao consultar projeto:", erro);

    return Response.json(
      { erro: "Não foi possível consultar o projeto." },
      { status: 500 }
    );
  }
};