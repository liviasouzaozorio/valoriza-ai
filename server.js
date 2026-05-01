const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve seus arquivos HTML/CSS

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


app.post('/perguntar', async (req, res) => {
    const { pergunta } = req.body;
    const dicasReserva = [
        "No Valoriza AI, lembramos: o peso cubado pode ser o vilão do seu frete. Revise suas embalagens!",
        "Dica Logística: Para rotas longas como SP -> Nordeste, transportadoras fracionadas costumam ser mais baratas que o SEDEX.",
        "Atenção: O diesel subiu em 2026, reajuste sua planilha de fretes mensalmente para não perder margem.",
        "Dica de Ouro: Use papel Kraft e colmeias de proteção para produtos frágeis, é sustentável e seguro."
    ];

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = `Você é o consultor de logística do sistema ValorizaAI. 
        Ajude o empreendedor com a seguinte dúvida: ${pergunta}. Não use saudações longas, e foque em respostas breves, curtas e objetivas,
         com no máximo 3 tópicos e negrito em informações importantes, como valores e prazos.
        Seja breve, profissional e foque em dicas de logística.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text(); // Extrai o texto da resposta
        
        res.json({ resposta: text });
    } catch (error) {
        console.error("Erro detalhado no servidor:", error); // Isso vai mostrar o erro real no terminal
        const dicaAleatoria = dicasReserva[Math.floor(Math.random() * dicasReserva.length)];
        res.json({ 
            resposta: `🤖 **Nota do Valoriza AI:** Nossa IA está processando muitas cargas agora! Enquanto isso, aqui vai uma dica estratégica: \n\n ${dicaAleatoria}` 
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});