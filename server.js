const path = require('path');

// 1. CARREGAR VARIÁVEIS DE AMBIENTE PRIMEIRO DE TUDO!
const caminhoEnv = path.resolve(__dirname, '.env');
require('dotenv').config({ path: caminhoEnv });

// 2. Importar os pacotes
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const { Pool } = require('pg');

// 3. Configuração da conexão com o Supabase
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 6543, // Mudei para 6543 (Connection Pooler) caso sua rede não suporte IPv6
  ssl: { rejectUnauthorized: false } 
});

// Teste rápido para garantir que estamos conectados!
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Erro ao conectar ao banco de dados:', err.stack);
  }
  console.log('✅ Conectado ao Supabase (PostgreSQL) com sucesso!');
  release();
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// ROTA  index.html na raiz 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// inicialização da API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// mapa na memória do servidor para guardar o chat de cada setor
const historicosDeConversa = {};

app.post('/perguntar', async (req, res) => {
    const { pergunta, setor, resumoFinanceiro, detalhesCustos } = req.body;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const guias = {
            comercio: "Foque em CMV (Custo da Mercadoria Vendida), giro de estoque e frete last-mile.",
            industria: "Foque em eficiência produtiva, custo de transformação e rateio de custos fixos.",
            servico: "Foque em precificação baseada em valor percebido, custo da hora técnica e escalabilidade."
        };

        // inicializa o chat
        if (!historicosDeConversa[setor]) {
            const instrucaoSistema = `Você é o consultor chefe do ValorizaAI para o setor de ${setor}.
                Seu papel é analisar os dados de precificação do empreendedor e responder às dúvidas de forma ultra realista, analítica e prestativa.
                Diretriz técnica para este setor: ${guias[setor] || ''}.

                REGRAS DE REDAÇÃO E TAMANHO:
                1. Escreva a resposta em no MÁXIMO 2 ou 3 parágrafos curtos, bem estruturados e fluidos.
                2. NÃO use listas ou tópicos (bullet points). Elabore um texto corrido, profissional e elegante.
                3. Vá direto ao ponto na primeira frase, sem saudações ou introduções vazias.
                4. Use negrito estratégico nos TERMOS CONTÁBEIS e NÚMEROS chave para facilitar a leitura rápida.
                5. Mantenha um tom gentil, direto e de alto nível consultivo.`;

            historicosDeConversa[setor] = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: `Contexto do Sistema: ${instrucaoSistema}` }]
                    },
                    {
                        role: "model",
                        parts: [{ text: `Entendido. Sou o consultor especialista do setor de ${setor}. Estou pronto para analisar os dados financeiros do cliente em tempo real e ajudá-la de forma gentil e altamente profissional.` }]
                    }
                ],
            });
        }

        const chat = historicosDeConversa[setor];
        let contextoTempoReal = `[DADOS FINANCEIROS DO CLIENTE EM TEMPO REAL]:\n`;
        
        if (resumoFinanceiro && detalhesCustos && resumoFinanceiro.precoSugerido !== 'R$ 0,00') {
            contextoTempoReal += `- Preço de Venda Final Sugerido: ${resumoFinanceiro.precoSugerido}\n`;
            contextoTempoReal += `- Custo Total Calculado: ${resumoFinanceiro.totalCustos}\n`;
            contextoTempoReal += `- Multiplicador (Markup) Obtido: ${resumoFinanceiro.markup}\n`;
            contextoTempoReal += `- Impostos e Taxas Declarados: ${resumoFinanceiro.taxaPercentual}\n`;
            contextoTempoReal += `- Margem de Lucro Desejada: ${resumoFinanceiro.margemPercentual}\n`;
            contextoTempoReal += `- Desmembramento dos Custos Preenchidos:\n${JSON.stringify(detalhesCustos, null, 2)}\n\n`;
        } else {
            contextoTempoReal += `(Atenção: O usuário clicou no botão mas os campos da calculadora ainda estão zerados ou incompletos na tela dele. Peça gentilmente para ele preencher os valores primeiro).\n\n`;
        }

        const mensagemFinalComContexto = `${contextoTempoReal}PERGUNTA DO CLIENTE:\n"${pergunta}"`;

        // 4. Enviamos a pergunta contextualizada para o Gemini
        const result = await chat.sendMessage(mensagemFinalComContexto);
        const respostaTexto = result.response.text();

        // -----------------------------------------------------------------------
        // NOVO: SALVAR NO BANCO DE DADOS (POSTGRESQL - SUPABASE)
        // -----------------------------------------------------------------------
        const connection = await pool.connect();
        
        try {
            // Insere os dados financeiros
            const insertPrecificacao = `
                INSERT INTO precificacoes 
                (setor, custo_total, preco_sugerido, markup, margem_lucro, impostos, canais_distribuicao, publico_alvo, concorrencia_preco, demanda_estimada)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id;
            `;
            
            const valoresPrecificacao = [
                setor || 'Geral',
                parseFloat(resumoFinanceiro?.totalCustos?.replace('R$', '').replace(',', '.')) || 0,
                parseFloat(resumoFinanceiro?.precoSugerido?.replace('R$', '').replace(',', '.')) || 0,
                parseFloat(resumoFinanceiro?.markup) || 1,
                parseInt(resumoFinanceiro?.margemPercentual) || 0,
                parseInt(resumoFinanceiro?.taxaPercentual) || 0,
                detalhesCustos?.canais || null,
                detalhesCustos?.publico || null,
                detalhesCustos?.concorrencia || null,
                detalhesCustos?.demanda || null
            ];

            const resultPrec = await connection.query(insertPrecificacao, valoresPrecificacao);
            const idGerado = resultPrec.rows[0].id; 

            // Insere a pergunta e a resposta atreladas ao ID gerado acima
            const insertRecomendacao = `
                INSERT INTO recomendacoes_ia (precificacao_id, pergunta, resposta)
                VALUES ($1, $2, $3);
            `;
            await connection.query(insertRecomendacao, [idGerado, pergunta, respostaTexto]);

            console.log(`✅ Dados e histórico da IA salvos com sucesso! ID da precificação: ${idGerado}`);

        } catch (dbError) {
            console.error("⚠️ Erro ao salvar no banco de dados (Mas a IA vai responder mesmo assim):", dbError.stack);
        } finally {
            connection.release();
        }
        // -----------------------------------------------------------------------

        // 5. Retornamos o JSON com a resposta completa para o Frontend
        res.json({ resposta: respostaTexto });
        
    } catch (error) {
        console.error("ERRO DETALHADO DA IA:", error);
        res.status(500).json({ resposta: "IA com demanda alta, por favor, tente novamente daqui alguns segundos..." });
    }
});
gi
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;