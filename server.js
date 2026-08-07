const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

// Importação segura do dotenv usando o caminho absoluto do arquivo
const caminhoEnv = path.resolve(__dirname, '.env');
require('dotenv').config({ path: caminhoEnv });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // caminho absoluto seguro

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
                        parts: [{ text: `Entendido. Sou o consultor especialista do setor de ${setor}. Estou pronto para analisar os dados financeiros do cliente em tempo real e ajudá-la de forma gentil e highly profissional.` }]
                    }
                ],
            });
        }

        //  chat existente com a memória acumulada
        const chat = historicosDeConversa[setor];

        //  contexto em tempo real injetando os valores que vieram do formulário
        let contextoTempoReal = `[DADOS FINANCEIROS DO CLIENTE EM TEMPO REAL]:\n`;
        
        // Verificação segura se os dados de fato chegaram preenchidos do front-end
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

        // 5. Retornamos o JSON com a resposta completa
        res.json({ resposta: respostaTexto });
        
    } catch (error) {
        console.error("ERRO DETALHADO DA IA:", error);
        res.status(500).json({ resposta: "IA com demanda alta, por favor, tente novamente daqui alguns segundos..." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

// Exportação necessária para ambientes Serverless (Vercel)
module.exports = app;