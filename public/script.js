(() => {
    'use strict';

    /* =========================================================================
       1. CONSTANTES E DEFINIÇÕES DE SETORES
       ========================================================================= */
    const STORAGE_KEYS = {
        WORKSPACE: 'valorizai_workspace_v1',
        DRAFT: 'valorizai_wizard_draft_v1',
        SIDEBAR: 'valorizai_sidebar_collapsed_v1'
    };

    const NILO_ASSETS = {
        boasVindas: '/img-valorizaai/nilo/nilo-boas-vindas.svg',
        apresentacao: '/img-valorizaai/nilo/nilo-apresentacao.svg',
        analisando: '/img-valorizaai/nilo/nilo-analisando.svg',
        recomendacao: '/img-valorizaai/nilo/nilo-recomendacao.svg',
        processando: '/img-valorizaai/nilo/nilo-processando.svg',
        comemorando: '/img-valorizaai/nilo/nilo-comemorando.svg'
    };

    const SETORES = {
        comercio: {
            id: 'comercio',
            nome: 'Comércio',
            subtitulo: 'Revenda, lojas físicas, e-commerce e varejo',
            itemTipoPadrao: 'Produto revendido',
            unidadePadrao: 'Unidade',
            camposCusto: [
                {
                    id: 'custoAquisicao',
                    label: 'Custo de aquisição unitário',
                    categoria: 'Aquisição',
                    tipo: 'currency',
                    obrigatorio: true,
                    placeholder: '0,00',
                    help: 'Valor pago ao fornecedor por 1 unidade do produto (antes de adicionar frete).'
                },
                {
                    id: 'freteEntrada',
                    label: 'Frete de entrada unitário',
                    categoria: 'Aquisição e logística',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Divida o frete pago na compra do pedido pela quantidade total de unidades recebidas.'
                },
                {
                    id: 'seguroDespesasAquisicao',
                    label: 'Seguro e despesas de aquisição',
                    categoria: 'Aquisição e logística',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Rateio por unidade de seguros, DIFAL na entrada ou taxas alfandegárias/emissão.'
                },
                {
                    id: 'embalagem',
                    label: 'Embalagem de envio / entrega',
                    categoria: 'Custos variáveis unitários',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Caixa, sacola, etiqueta, plástico bolha ou material de proteção usado por venda.'
                },
                {
                    id: 'outrosVariaveis',
                    label: 'Outros custos variáveis unitários',
                    categoria: 'Custos variáveis unitários',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Brindes, montagem rápida ou insumos específicos por unidade vendida.'
                },
                {
                    id: 'custosOperacionaisRateados',
                    label: 'Custos operacionais rateados (por unidade)',
                    categoria: 'Rateio operacional',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Parcela unitária de aluguel, energia e internet. Nunca informe o valor mensal cheio sem dividir pelo volume.'
                }
            ]
        },
        industria: {
            id: 'industria',
            nome: 'Indústria',
            subtitulo: 'Produção própria, artesanal e fabricação em lotes',
            itemTipoPadrao: 'Produto fabricado',
            unidadePadrao: 'Unidade (do lote)',
            camposCusto: [
                {
                    id: 'quantidadeLote',
                    label: 'Quantidade produzida no lote',
                    categoria: 'Parâmetro de lote',
                    tipo: 'integer',
                    obrigatorio: true,
                    placeholder: '1',
                    help: 'Informe quantas unidades são fabricadas com os valores de lote abaixo (use 1 se preencher tudo por unidade).'
                },
                {
                    id: 'materiaPrima',
                    label: 'Matéria-prima principal (no lote)',
                    categoria: 'Insumos diretos',
                    tipo: 'currency',
                    obrigatorio: true,
                    placeholder: '0,00',
                    help: 'Total gasto com a matéria-prima principal para produzir o lote informado acima.'
                },
                {
                    id: 'insumos',
                    label: 'Insumos auxiliares (no lote)',
                    categoria: 'Insumos diretos',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Componentes secundários, aditivos, linhas, parafusos ou temperos consumidos no lote.'
                },
                {
                    id: 'embalagemProducao',
                    label: 'Embalagens de produção (no lote)',
                    categoria: 'Insumos diretos',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Rótulos, frascos, caixas ou invólucros que integram o produto acabado no lote.'
                },
                {
                    id: 'maoObraDireta',
                    label: 'Mão de obra direta (no lote)',
                    categoria: 'Transformação',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Custo das horas da equipe diretamente envolvida na produção deste lote.'
                },
                {
                    id: 'cifRateado',
                    label: 'Custos indiretos de fabricação rateados (no lote)',
                    categoria: 'Transformação e rateio',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Rateio proporcional de aluguel fabril, manutenção de máquinas e supervisão para este lote.'
                },
                {
                    id: 'energiaTransformacao',
                    label: 'Energia e outros custos de transformação (no lote)',
                    categoria: 'Transformação e rateio',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Energia elétrica, gás, água ou combustível consumidos diretamente no processo produtivo do lote.'
                },
                {
                    id: 'perdasProducao',
                    label: 'Perdas normais de produção (%)',
                    categoria: 'Eficiência produtiva',
                    tipo: 'percent',
                    obrigatorio: false,
                    placeholder: '0',
                    help: 'Percentual esperado de quebra, refugo ou aparas que impactam os insumos do lote.'
                }
            ]
        },
        servico: {
            id: 'servico',
            nome: 'Serviços',
            subtitulo: 'Horas técnicas, projetos, atendimentos e especialidade',
            itemTipoPadrao: 'Serviço',
            unidadePadrao: 'Atendimento / Projeto',
            camposCusto: [
                {
                    id: 'tempoExecucao',
                    label: 'Tempo de execução (horas)',
                    categoria: 'Tempo técnico',
                    tipo: 'decimal',
                    obrigatorio: true,
                    placeholder: '1',
                    help: 'Total de horas dedicadas para realizar este serviço ou entrega completa.'
                },
                {
                    id: 'custoHoraProdutiva',
                    label: 'Custo da hora produtiva (R$/h)',
                    categoria: 'Tempo técnico',
                    tipo: 'currency',
                    obrigatorio: true,
                    placeholder: '0,00',
                    help: 'Seus custos fixos de operação + pró-labore base divididos pelas horas faturáveis do mês.'
                },
                {
                    id: 'maoObraContratada',
                    label: 'Mão de obra própria extra ou contratada',
                    categoria: 'Execução e terceiros',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Valor pago a assistentes, freelancers ou técnicos auxiliares neste atendimento específico.'
                },
                {
                    id: 'deslocamento',
                    label: 'Deslocamento e logística do atendimento',
                    categoria: 'Despesas diretas',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Combustível, transporte, estacionamento, pedágio ou alimentação vinculada ao serviço.'
                },
                {
                    id: 'materiaisUtilizados',
                    label: 'Materiais utilizados na prestação',
                    categoria: 'Despesas diretas',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Peças, insumos ou consumíveis aplicados diretamente durante a execução.'
                },
                {
                    id: 'ferramentasLicencas',
                    label: 'Ferramentas e licenças proporcionais',
                    categoria: 'Estrutura técnica',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Rateio de softwares, assinaturas ou desgaste de equipamentos usados no trabalho.'
                },
                {
                    id: 'outrosEspecificos',
                    label: 'Outros custos específicos da prestação',
                    categoria: 'Estrutura técnica',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Taxas de emissão, ART, impressões ou custos pontuais exigidos pelo projeto.'
                }
            ]
        }
    };

    const VIEW_LABELS = {
        dashboard: 'Visão geral',
        negocio: 'Perfil da empresa',
        catalogo: 'Produtos e serviços',
        precificacao: 'Nova precificação',
        simulacao: 'Simulação rápida',
        historico: 'Histórico',
        analises: 'Custos e rentabilidade',
        consultor: 'Nilo',
        conta: 'Minha conta',
        configuracoes: 'Configurações'
    };

    /* =========================================================================
       2. FORMATADORES E UTILITÁRIOS
       ========================================================================= */
    const Formatter = {
        brl(value) {
            const num = Number(value);
            if (!Number.isFinite(num)) return 'R$ 0,00';
            return num.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },
        num(value, decimals = 2) {
            const n = Number(value);
            if (!Number.isFinite(n)) return '0';
            return n.toLocaleString('pt-BR', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        },
        percent(value, decimals = 1) {
            const n = Number(value);
            if (!Number.isFinite(n)) return '0,0%';
            return `${n.toLocaleString('pt-BR', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            })}%`;
        },
        dateShort(iso) {
            if (!iso) return '—';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '—';
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        },
        dateTime(iso) {
            if (!iso) return '—';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '—';
            return d.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        parseNumber(raw) {
            if (raw === null || raw === undefined) return null;
            const s = String(raw).trim();
            if (s === '') return null;
            // Aceita tanto 1.250,50 quanto 1250.50
            let normalized = s.replace(/R\$\s?/g, '').replace(/\s/g, '');
            if (normalized.includes(',') && normalized.includes('.')) {
                normalized = normalized.replace(/\./g, '').replace(',', '.');
            } else if (normalized.includes(',')) {
                normalized = normalized.replace(',', '.');
            }
            const parsed = Number(normalized);
            return Number.isFinite(parsed) ? parsed : NaN;
        },
        escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },
        renderMarkdown(text) {
            const raw = String(text || '');
            if (window.marked && typeof window.marked.parse === 'function') {
                const parsed = window.marked.parse(raw);
                const template = document.createElement('template');
                template.innerHTML = parsed;
                template.content.querySelectorAll('script, style, iframe, object, embed, form').forEach(node => node.remove());
                template.content.querySelectorAll('*').forEach(node => {
                    [...node.attributes].forEach(attr => {
                        if (/^on/i.test(attr.name) || ((attr.name === 'href' || attr.name === 'src') && /^\s*javascript:/i.test(attr.value))) {
                            node.removeAttribute(attr.name);
                        }
                    });
                });
                return template.innerHTML;
            }
            return `<p>${Formatter.escapeHtml(raw).replace(/\n+/g, '</p><p>')}</p>`;
        },
        greeting() {
            const hour = new Date().getHours();
            if (hour < 12) return 'Bom dia';
            if (hour < 18) return 'Boa tarde';
            return 'Boa noite';
        },
        todayHeader() {
            return new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        },
        uid(prefix = 'id') {
            return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        }
    };

    /* =========================================================================
       3. GERENCIAMENTO DE ESTADO LOCAL (SEPARADO DE RASCUNHOS)
       ========================================================================= */
    function defaultWorkspaceState() {
        return {
            isDemo: false,
            business: {
                empreendedor: '',
                nomeNegocio: '',
                segmento: '',
                modeloOperacao: '',
                descricao: '',
                regimeInformativo: '',
                cidadeUf: '',
                observacoes: '',
                margemMeta: null,
                atualizadoEm: null
            },
            settings: {
                alertaCargaTributaria: null,
                mostrarDicasCampos: true,
                salvarRascunhoAutomatico: true
            },
            catalog: [],
            pricings: [],
            chatHistory: []
        };
    }

    function defaultWizardDraft() {
        return {
            step: 1,
            sourceType: 'new', // 'new' | 'existing'
            catalogItemId: '',
            itemNome: '',
            setor: '',
            unidade: '',
            descricao: '',
            costs: {},
            taxes: {
                impostosVenda: '',
                taxaPagamento: '',
                comissao: '',
                taxaMarketplace: '',
                margemDesejada: ''
            },
            previewResult: null,
            updatedAt: null
        };
    }

    const WorkspaceStore = {
        state: defaultWorkspaceState(),
        load() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.WORKSPACE);
                if (!raw) {
                    this.state = defaultWorkspaceState();
                    return;
                }
                const parsed = JSON.parse(raw);
                this.state = {
                    ...defaultWorkspaceState(),
                    ...parsed,
                    business: { ...defaultWorkspaceState().business, ...(parsed.business || {}) },
                    settings: { ...defaultWorkspaceState().settings, ...(parsed.settings || {}) },
                    catalog: Array.isArray(parsed.catalog) ? parsed.catalog : [],
                    pricings: Array.isArray(parsed.pricings) ? parsed.pricings : [],
                    chatHistory: Array.isArray(parsed.chatHistory) ? parsed.chatHistory : []
                };
                // Migra metas personalizadas antigas; 20% era apenas o padrão legado.
                if (!Object.prototype.hasOwnProperty.call(parsed.business || {}, 'margemMeta')) {
                    const legacyTarget = parsed.settings?.margemMetaPadrao;
                    this.state.business.margemMeta =
                        Number.isFinite(Number(legacyTarget)) && legacyTarget !== null &&
                        Number(legacyTarget) >= 0 && Number(legacyTarget) < 100 && Number(legacyTarget) !== 20
                            ? Number(legacyTarget)
                            : null;
                }
                delete this.state.settings.margemMetaPadrao;
                if (this.state.settings.alertaCargaTributaria === 35) this.state.settings.alertaCargaTributaria = null;
            } catch {
                this.state = defaultWorkspaceState();
            }
        },
        save() {
            try {
                localStorage.setItem(STORAGE_KEYS.WORKSPACE, JSON.stringify(this.state));
            } catch {
                // Ignora indisponibilidade de storage
            }
        },
        resetAll() {
            this.state = defaultWorkspaceState();
            localStorage.removeItem(STORAGE_KEYS.WORKSPACE);
        },
        loadDemoScenario() {
            const now = Date.now();
            const day = 86400000;
            const item1 = 'item_demo_camisa';
            const item2 = 'item_demo_vela';
            const item3 = 'item_demo_consultoria';

            this.state = {
                ...defaultWorkspaceState(),
                isDemo: true,
                business: {
                    empreendedor: 'Marina Oliveira',
                    nomeNegocio: 'Ateliê & Loja Horizonte (Demonstração)',
                    segmento: 'comercio',
                    modeloOperacao: 'Loja física e e-commerce',
                    descricao: 'Operação mista de demonstração para explorar indicadores e comparativos no ValorizAI.',
                    regimeInformativo: 'Simples Nacional (exemplo)',
                    cidadeUf: 'Campinas / SP',
                    observacoes: 'Dados fictícios carregados explicitamente para demonstração.',
                    atualizadoEm: new Date(now - 5 * day).toISOString()
                },
                settings: { ...this.state.settings },
                catalog: [
                    {
                        id: item1,
                        nome: 'Camisa Linho Casual',
                        descricao: 'Peça de revenda com envio em caixa personalizada.',
                        categoria: 'Vestuário',
                        tipo: 'Produto revendido',
                        setor: 'comercio',
                        unidade: 'Unidade',
                        status: 'Ativo',
                        criadoEm: new Date(now - 20 * day).toISOString()
                    },
                    {
                        id: item2,
                        nome: 'Vela Aromática Lavanda 180g',
                        descricao: 'Produção própria em lotes de 20 unidades.',
                        categoria: 'Casa & Bem-estar',
                        tipo: 'Produto fabricado',
                        setor: 'industria',
                        unidade: 'Unidade',
                        status: 'Ativo',
                        criadoEm: new Date(now - 14 * day).toISOString()
                    },
                    {
                        id: item3,
                        nome: 'Organização de Vitrine e Estoque',
                        descricao: 'Atendimento técnico presencial para pequenos lojistas.',
                        categoria: 'Consultoria Visual',
                        tipo: 'Serviço',
                        setor: 'servico',
                        unidade: 'Projeto',
                        status: 'Ativo',
                        criadoEm: new Date(now - 7 * day).toISOString()
                    }
                ],
                pricings: [
                    {
                        id: 'prec_demo_1',
                        catalogItemId: item1,
                        itemNome: 'Camisa Linho Casual',
                        versao: 1,
                        setor: 'comercio',
                        unidade: 'Unidade',
                        criadoEm: new Date(now - 18 * day).toISOString(),
                        custoTotal: 64.50,
                        precoSugerido: 115.18,
                        markup: 1.79,
                        margemPlanejada: 25,
                        percentualImpostosTaxas: 19,
                        valorImpostosTaxas: 21.88,
                        lucroEstimado: 28.80,
                        fonteCalculo: 'demo-local',
                        categoriasCusto: [
                            { nome: 'Aquisição e frete', valor: 57.50 },
                            { nome: 'Embalagem e envio', valor: 4.00 },
                            { nome: 'Rateio operacional', valor: 3.00 }
                        ],
                        detalhesCustos: {
                            custoAquisicao: 52.00,
                            freteEntrada: 5.50,
                            embalagem: 4.00,
                            custosOperacionaisRateados: 3.00
                        },
                        taxas: { impostosVenda: 6, taxaPagamento: 4, comissao: 3, taxaMarketplace: 6, margemDesejada: 25 }
                    },
                    {
                        id: 'prec_demo_2',
                        catalogItemId: item1,
                        itemNome: 'Camisa Linho Casual',
                        versao: 2,
                        setor: 'comercio',
                        unidade: 'Unidade',
                        criadoEm: new Date(now - 6 * day).toISOString(),
                        custoTotal: 71.00,
                        precoSugerido: 118.33,
                        markup: 1.67,
                        margemPlanejada: 18,
                        percentualImpostosTaxas: 22,
                        valorImpostosTaxas: 26.03,
                        lucroEstimado: 21.30,
                        fonteCalculo: 'demo-local',
                        categoriasCusto: [
                            { nome: 'Aquisição e frete', valor: 63.00 },
                            { nome: 'Embalagem e envio', valor: 4.50 },
                            { nome: 'Rateio operacional', valor: 3.50 }
                        ],
                        detalhesCustos: {
                            custoAquisicao: 57.00,
                            freteEntrada: 6.00,
                            embalagem: 4.50,
                            custosOperacionaisRateados: 3.50
                        },
                        taxas: { impostosVenda: 6, taxaPagamento: 4, comissao: 4, taxaMarketplace: 8, margemDesejada: 18 }
                    },
                    {
                        id: 'prec_demo_3',
                        catalogItemId: item2,
                        itemNome: 'Vela Aromática Lavanda 180g',
                        versao: 1,
                        setor: 'industria',
                        unidade: 'Unidade',
                        criadoEm: new Date(now - 10 * day).toISOString(),
                        custoTotal: 19.80,
                        precoSugerido: 36.67,
                        markup: 1.85,
                        margemPlanejada: 32,
                        percentualImpostosTaxas: 14,
                        valorImpostosTaxas: 5.13,
                        lucroEstimado: 11.73,
                        fonteCalculo: 'demo-local',
                        categoriasCusto: [
                            { nome: 'Matéria-prima e insumos', valor: 11.40 },
                            { nome: 'Mão de obra direta', valor: 5.00 },
                            { nome: 'Transformação e CIF', valor: 3.40 }
                        ],
                        detalhesCustos: {
                            quantidadeLote: 20,
                            materiaPrima: 140,
                            insumos: 45,
                            embalagemProducao: 32,
                            maoObraDireta: 100,
                            cifRateado: 48,
                            energiaTransformacao: 20,
                            perdasProducao: 5
                        },
                        taxas: { impostosVenda: 6, taxaPagamento: 4, comissao: 0, taxaMarketplace: 4, margemDesejada: 32 }
                    },
                    {
                        id: 'prec_demo_4',
                        catalogItemId: item3,
                        itemNome: 'Organização de Vitrine e Estoque',
                        versao: 1,
                        setor: 'servico',
                        unidade: 'Projeto',
                        criadoEm: new Date(now - 2 * day).toISOString(),
                        custoTotal: 325.00,
                        precoSugerido: 541.67,
                        markup: 1.67,
                        margemPlanejada: 28,
                        percentualImpostosTaxas: 12,
                        valorImpostosTaxas: 65.00,
                        lucroEstimado: 151.67,
                        fonteCalculo: 'demo-local',
                        categoriasCusto: [
                            { nome: 'Horas técnicas', valor: 240.00 },
                            { nome: 'Deslocamento e materiais', valor: 65.00 },
                            { nome: 'Ferramentas e licenças', valor: 20.00 }
                        ],
                        detalhesCustos: {
                            tempoExecucao: 6,
                            custoHoraProdutiva: 40,
                            deslocamento: 45,
                            materiaisUtilizados: 20,
                            ferramentasLicencas: 20
                        },
                        taxas: { impostosVenda: 8, taxaPagamento: 4, comissao: 0, taxaMarketplace: 0, margemDesejada: 28 }
                    }
                ],
                chatHistory: []
            };
            this.save();
        }
    };

    const DraftStore = {
        load() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.DRAFT);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                return { ...defaultWizardDraft(), ...parsed };
            } catch {
                return null;
            }
        },
        save(draft) {
            if (!WorkspaceStore.state.settings.salvarRascunhoAutomatico) return;
            try {
                const payload = { ...draft, updatedAt: new Date().toISOString() };
                localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(payload));
            } catch {
                // Ignora indisponibilidade de storage
            }
        },
        clear() {
            localStorage.removeItem(STORAGE_KEYS.DRAFT);
        }
    };

    /* =========================================================================
       4. CAMADA DE COMUNICAÇÃO E ADAPTADORES DE API
       ========================================================================= */
    const ApiService = {
        /**
         * Endpoint REAL existente no backend (server.js -> POST /perguntar).
         * Mantém integralmente o contrato esperado.
         */
        async enviarPerguntaIA(payload) {
            const config = window.VALORIZAI_CONFIG || {};
            const supabaseLib = window.supabase;
            const headers = { 'Content-Type': 'application/json' };
            if (supabaseLib?.createClient && config.supabaseUrl && config.supabaseAnonKey) {
                const client = supabaseLib.createClient(config.supabaseUrl, config.supabaseAnonKey, {
                    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
                });
                const { data } = await client.auth.getSession();
                if (data?.session?.access_token) {
                    headers.Authorization = `Bearer ${data.session.access_token}`;
                }
            }
            const response = await fetch('/perguntar', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            let data = null;
            try {
                data = await response.json();
            } catch {
                throw new Error('Resposta inválida do servidor ao consultar o assistente.');
            }

            if (!response.ok) {
                throw new Error(data?.resposta || 'Não foi possível consultar o Consultor IA.');
            }

            return data;
        },

        /**
         * Adaptador preparado para o futuro motor oficial de precificação no backend.
         * Enquanto o endpoint dedicado não existir, executa uma prévia transparente
         * para permitir simulação na interface sem substituir o motor oficial futuro.
         */
        async calcularPreviaPrecificacao(payload) {
            const { setor, costs, taxes } = payload;
            const categoriasCusto = [];
            let custoTotal = 0;

            if (setor === 'comercio') {
                const aquisicao = (costs.custoAquisicao || 0) + (costs.freteEntrada || 0) + (costs.seguroDespesasAquisicao || 0);
                const variaveis = (costs.embalagem || 0) + (costs.outrosVariaveis || 0);
                const operacional = costs.custosOperacionaisRateados || 0;
                custoTotal = aquisicao + variaveis + operacional;

                if (aquisicao > 0) categoriasCusto.push({ nome: 'Aquisição e logística', valor: aquisicao });
                if (variaveis > 0) categoriasCusto.push({ nome: 'Embalagem e variáveis', valor: variaveis });
                if (operacional > 0) categoriasCusto.push({ nome: 'Rateio operacional', valor: operacional });
            } else if (setor === 'industria') {
                const lote = Math.max(1, costs.quantidadeLote || 1);
                const perdaFator = 1 + ((costs.perdasProducao || 0) / 100);
                const insumosLote = ((costs.materiaPrima || 0) + (costs.insumos || 0) + (costs.embalagemProducao || 0)) * perdaFator;
                const modLote = costs.maoObraDireta || 0;
                const transfLote = (costs.cifRateado || 0) + (costs.energiaTransformacao || 0);

                const insumosUnit = insumosLote / lote;
                const modUnit = modLote / lote;
                const transfUnit = transfLote / lote;
                custoTotal = insumosUnit + modUnit + transfUnit;

                if (insumosUnit > 0) categoriasCusto.push({ nome: 'Matéria-prima e insumos (c/ perdas)', valor: insumosUnit });
                if (modUnit > 0) categoriasCusto.push({ nome: 'Mão de obra direta', valor: modUnit });
                if (transfUnit > 0) categoriasCusto.push({ nome: 'Transformação e CIF rateado', valor: transfUnit });
            } else if (setor === 'servico') {
                const horas = (costs.tempoExecucao || 0) * (costs.custoHoraProdutiva || 0);
                const terceiros = costs.maoObraContratada || 0;
                const diretas = (costs.deslocamento || 0) + (costs.materiaisUtilizados || 0);
                const estrutura = (costs.ferramentasLicencas || 0) + (costs.outrosEspecificos || 0);
                custoTotal = horas + terceiros + diretas + estrutura;

                if (horas + terceiros > 0) categoriasCusto.push({ nome: 'Tempo técnico e execução', valor: horas + terceiros });
                if (diretas > 0) categoriasCusto.push({ nome: 'Deslocamento e materiais', valor: diretas });
                if (estrutura > 0) categoriasCusto.push({ nome: 'Ferramentas e despesas específicas', valor: estrutura });
            }

            if (categoriasCusto.length === 0) {
                categoriasCusto.push({ nome: 'Custos informados', valor: custoTotal });
            }

            const imposto = taxes.impostosVenda || 0;
            const taxaPag = taxes.taxaPagamento || 0;
            const comissao = taxes.comissao || 0;
            const mkt = taxes.taxaMarketplace || 0;
            const margem = taxes.margemDesejada || 0;

            const percentualImpostosTaxas = imposto + taxaPag + comissao + mkt;
            const somaPercentuais = percentualImpostosTaxas + margem;
            const divisor = 1 - (somaPercentuais / 100);

            const precoSugerido = divisor > 0 ? custoTotal / divisor : 0;
            const markup = custoTotal > 0 && precoSugerido > 0 ? precoSugerido / custoTotal : 0;
            const valorImpostos = precoSugerido * (imposto / 100);
            const valorTaxasComissoes = precoSugerido * ((taxaPag + comissao + mkt) / 100);
            const lucroEstimado = precoSugerido * (margem / 100);

            return {
                fonteCalculo: 'preview-local',
                custoTotal: Number(custoTotal.toFixed(2)),
                precoSugerido: Number(precoSugerido.toFixed(2)),
                markup: Number(markup.toFixed(2)),
                margemPlanejada: Number(margem.toFixed(2)),
                percentualImpostosTaxas: Number(percentualImpostosTaxas.toFixed(2)),
                valorImpostos: Number(valorImpostos.toFixed(2)),
                valorTaxasComissoes: Number(valorTaxasComissoes.toFixed(2)),
                valorImpostosTaxas: Number((valorImpostos + valorTaxasComissoes).toFixed(2)),
                lucroEstimado: Number(lucroEstimado.toFixed(2)),
                categoriasCusto
            };
        },

        integracoesStatus() {
            return [
                {
                    nome: 'Consultor IA (Gemini API)',
                    endpoint: 'POST /perguntar',
                    disponivel: true,
                    descricao: 'Integração ativa no servidor Node.js/Express.'
                },
                {
                    nome: 'Persistência de Negócio, Catálogo e Histórico',
                    endpoint: 'Endpoints REST dedicados (pendentes)',
                    disponivel: false,
                    descricao: 'Dados armazenados localmente no navegador em modo de demonstração até criação dos endpoints no backend.'
                },
                {
                    nome: 'Motor Oficial de Precificação',
                    endpoint: 'Endpoint de cálculo no backend (pendente)',
                    disponivel: false,
                    descricao: 'Cálculo exibido como prévia transparente no navegador aguardando o motor validado no servidor.'
                }
            ];
        }
    };

    /* =========================================================================
       5. GRÁFICOS SVG ANALÍTICOS (COM TOOLTIPS, EIXOS E LEGENDAS)
       ========================================================================= */
    let tooltipEl = null;

    function showChartTooltip(evt, html) {
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'chart-tooltip hidden';
            document.body.appendChild(tooltipEl);
        }
        tooltipEl.innerHTML = html;
        tooltipEl.classList.remove('hidden');
        const x = Math.min(window.innerWidth - 220, evt.clientX + 12);
        const y = Math.max(12, evt.clientY - 46);
        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top = `${y}px`;
    }

    function hideChartTooltip() {
        if (tooltipEl) tooltipEl.classList.add('hidden');
    }

    const ChartRenderer = {
        renderPriceEvolutionChart(container, pricings) {
            if (!pricings.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-state-desc">Ainda não há precificações salvas para traçar a evolução ao longo do tempo.</p>
                    </div>`;
                return;
            }

            const ordered = [...pricings].sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
            const width = 580;
            const height = 240;
            const pad = { top: 20, right: 24, bottom: 38, left: 72 };
            const innerW = width - pad.left - pad.right;
            const innerH = height - pad.top - pad.bottom;

            const maxVal = Math.max(...ordered.map(p => Math.max(p.precoSugerido, p.custoTotal)), 10) * 1.15;
            const stepX = ordered.length > 1 ? innerW / (ordered.length - 1) : innerW / 2;

            const getX = idx => ordered.length === 1 ? pad.left + innerW / 2 : pad.left + idx * stepX;
            const getY = val => pad.top + innerH - (val / maxVal) * innerH;

            const yTicks = [0, 0.33, 0.66, 1].map(ratio => ({
                val: maxVal * ratio,
                y: getY(maxVal * ratio)
            }));

            const pricePoints = ordered.map((p, i) => `${getX(i)},${getY(p.precoSugerido)}`).join(' ');
            const costPoints = ordered.map((p, i) => `${getX(i)},${getY(p.custoTotal)}`).join(' ');

            const areaPath = ordered.length > 1
                ? `M ${getX(0)},${getY(0)} ` +
                  ordered.map((p, i) => `L ${getX(i)},${getY(p.precoSugerido)}`).join(' ') +
                  ` L ${getX(ordered.length - 1)},${getY(0)} Z`
                : '';

            container.innerHTML = `
                <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolução dos preços sugeridos e custos">
                    <defs>
                        <linearGradient id="chartPriceArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#3986D8" stop-opacity="0.28"/>
                            <stop offset="100%" stop-color="#3986D8" stop-opacity="0"/>
                        </linearGradient>
                    </defs>
                    ${yTicks.map(t => `
                        <line x1="${pad.left}" y1="${t.y}" x2="${width - pad.right}" y2="${t.y}" stroke="rgba(168,181,199,0.12)" stroke-dasharray="3,3" />
                        <text x="${pad.left - 8}" y="${t.y + 4}" text-anchor="end" fill="#A8B5C7" font-size="11" font-family="JetBrains Mono, monospace">${Formatter.brl(t.val)}</text>
                    `).join('')}
                    ${areaPath ? `<path d="${areaPath}" fill="url(#chartPriceArea)" />` : ''}
                    ${ordered.length > 1 ? `
                        <polyline fill="none" stroke="#3986D8" stroke-width="2.5" stroke-linejoin="round" points="${pricePoints}" />
                        <polyline fill="none" stroke="#A8B5C7" stroke-width="1.8" stroke-dasharray="5,4" points="${costPoints}" />
                    ` : ''}
                    ${ordered.map((p, i) => {
                        const x = getX(i);
                        const yp = getY(p.precoSugerido);
                        const yc = getY(p.custoTotal);
                        const label = Formatter.dateShort(p.criadoEm).slice(0, 5);
                        return `
                            <text x="${x}" y="${height - 12}" text-anchor="middle" fill="#A8B5C7" font-size="11" font-family="Inter, sans-serif">${label}</text>
                            <circle cx="${x}" cy="${yc}" r="3.5" fill="#A8B5C7" stroke="#101827" stroke-width="1.5" />
                            <circle class="chart-point" data-idx="${i}" cx="${x}" cy="${yp}" r="5" fill="#55D6A0" stroke="#101827" stroke-width="2" style="cursor:pointer" />
                        `;
                    }).join('')}
                </svg>
                <div class="chart-legend">
                    <span class="chart-legend-entry"><span class="legend-swatch" style="background:#3986D8"></span> Preço sugerido (R$)</span>
                    <span class="chart-legend-entry"><span class="legend-swatch" style="background:#A8B5C7"></span> Custo unitário (R$)</span>
                </div>
            `;

            container.querySelectorAll('.chart-point').forEach(dot => {
                const item = ordered[Number(dot.dataset.idx)];
                dot.addEventListener('mouseenter', e => {
                    showChartTooltip(e, `
                        <strong>${Formatter.escapeHtml(item.itemNome)} (v${item.versao})</strong><br>
                        Preço: <span class="mono">${Formatter.brl(item.precoSugerido)}</span><br>
                        Custo: <span class="mono">${Formatter.brl(item.custoTotal)}</span> · Margem: ${Formatter.percent(item.margemPlanejada)}
                    `);
                });
                dot.addEventListener('mousemove', e => showChartTooltip(e, tooltipEl.innerHTML));
                dot.addEventListener('mouseleave', hideChartTooltip);
            });
        },

        renderCostDistributionChart(container, categorias, totalCusto) {
            if (!categorias || !categorias.length || totalCusto <= 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-state-desc">Selecione ou registre uma precificação para visualizar a distribuição dos custos.</p>
                    </div>`;
                return;
            }

            const colors = ['#3986D8', '#55D6A0', '#F59E0B', '#A8B5C7'];
            const maxVal = Math.max(...categorias.map(c => c.valor), 1);

            container.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:14px;">
                    ${categorias.map((cat, idx) => {
                        const pct = (cat.valor / totalCusto) * 100;
                        const barW = Math.max(4, (cat.valor / maxVal) * 100);
                        const color = colors[idx % colors.length];
                        return `
                            <div>
                                <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;font-size:13px;">
                                    <span style="color:var(--color-cloud);font-weight:500;">${Formatter.escapeHtml(cat.nome)}</span>
                                    <span class="mono" style="color:var(--color-silver);">${Formatter.brl(cat.valor)} (${Formatter.percent(pct)})</span>
                                </div>
                                <div style="height:10px;border-radius:999px;background:var(--color-midnight);overflow:hidden;border:var(--border-hairline);">
                                    <div class="chart-bar-anim" style="width:${barW}%;height:100%;background:${color};border-radius:999px;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        },

        renderPlannedMarginChart(container, pricings, targetMargin) {
            if (!pricings.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-state-desc">Nenhuma margem planejada registrada ainda. Salve uma precificação para acompanhar este indicador.</p>
                    </div>`;
                return;
            }

            // Agrupa pela versão mais recente de cada item
            const latestByItem = new Map();
            [...pricings].sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm)).forEach(p => {
                latestByItem.set(p.catalogItemId || p.itemNome, p);
            });
            const rows = Array.from(latestByItem.values()).slice(-6);
            const hasTarget = targetMargin !== null && Number.isFinite(Number(targetMargin));
            const maxMargin = Math.max(hasTarget ? Number(targetMargin) : 0, ...rows.map(r => r.margemPlanejada), 40);

            container.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:14px;">
                    ${rows.map(r => {
                        const belowTarget = hasTarget && r.margemPlanejada < Number(targetMargin);
                        const color = !hasTarget ? 'var(--color-blue)' : (belowTarget ? 'var(--color-warning)' : 'var(--color-emerald)');
                        const barW = Math.min(100, Math.max(4, (r.margemPlanejada / maxMargin) * 100));
                        const targetPos = hasTarget ? Math.min(100, (Number(targetMargin) / maxMargin) * 100) : null;
                        return `
                            <div>
                                <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:5px;font-size:13px;">
                                    <span style="color:var(--color-cloud);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Formatter.escapeHtml(r.itemNome)}</span>
                                    <span class="mono" style="color:${color};font-weight:600;">${Formatter.percent(r.margemPlanejada)} ${!hasTarget ? '· Meta não definida' : (belowTarget ? '· Abaixo da meta' : '· Na meta')}</span>
                                </div>
                                <div style="position:relative;height:10px;border-radius:999px;background:var(--color-midnight);border:var(--border-hairline);">
                                    <div class="chart-bar-anim" style="width:${barW}%;height:100%;background:${color};border-radius:999px;"></div>
                                    ${hasTarget ? `<div title="Meta: ${Formatter.percent(targetMargin, 0)}" style="position:absolute;top:-3px;bottom:-3px;left:${targetPos}%;width:2px;background:var(--color-cloud);opacity:0.65;"></div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                ${hasTarget ? `<div class="chart-legend">
                    <span class="chart-legend-entry"><span class="legend-swatch" style="background:#55D6A0"></span> Margem planejada dentro da meta</span>
                    <span class="chart-legend-entry"><span class="legend-swatch" style="background:#F59E0B"></span> Abaixo da meta (${Formatter.percent(targetMargin, 0)})</span>
                </div>` : '<p class="chart-legend">Defina uma meta de margem em Meu negócio para ativar a comparação.</p>'}
            `;
        }
    };

    /* =========================================================================
       6. NOTIFICAÇÕES E INSIGHTS DERIVADOS DE DADOS REAIS
       ========================================================================= */
    function computeDerivedInsights() {
        const { catalog, pricings, business } = WorkspaceStore.state;
        const target = business.margemMeta === null || business.margemMeta === '' || business.margemMeta === undefined
            ? null
            : Number(business.margemMeta);
        const insights = [];
        const notifications = [];

        const draft = DraftStore.load();
        if (draft && (draft.itemNome || Object.keys(draft.costs || {}).length > 0)) {
            notifications.push({
                title: 'Rascunho de precificação em andamento',
                desc: draft.itemNome ? `Item "${draft.itemNome}" na etapa ${draft.step} de 5.` : `Etapa ${draft.step} aguardando retomada.`,
                actionNav: 'precificacao'
            });
        }

        if (!business.nomeNegocio) {
            notifications.push({
                title: 'Configure o perfil do negócio',
                desc: 'Defina segmento e modelo de operação para agilizar novas precificações.',
                actionNav: 'negocio'
            });
        }

        if (pricings.length === 0) {
            return { insights, notifications, belowTargetCount: null, avgMargin: null };
        }

        // Última versão por item
        const latestByItem = new Map();
        const versionsByItem = new Map();
        [...pricings].sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm)).forEach(p => {
            const key = p.catalogItemId || p.itemNome;
            latestByItem.set(key, p);
            if (!versionsByItem.has(key)) versionsByItem.set(key, []);
            versionsByItem.get(key).push(p);
        });

        const latestList = Array.from(latestByItem.values());
        const avgMargin = latestList.reduce((acc, p) => acc + p.margemPlanejada, 0) / latestList.length;
        const belowTarget = target === null ? null : latestList.filter(p => p.margemPlanejada < target);

        if (belowTarget && belowTarget.length > 0) {
            const lowest = [...belowTarget].sort((a, b) => a.margemPlanejada - b.margemPlanejada)[0];
            insights.push({
                tone: 'warning',
                title: `${belowTarget.length} ${belowTarget.length === 1 ? 'item com margem planejada abaixo da meta' : 'itens com margem planejada abaixo da meta'}`,
                desc: `"${lowest.itemNome}" está com ${Formatter.percent(lowest.margemPlanejada)} frente à meta de ${Formatter.percent(target, 0)}. Avalie custos ou reposicionamento.`
            });
            notifications.push({
                title: 'Margem abaixo da meta configurada',
                desc: `${lowest.itemNome} registra ${Formatter.percent(lowest.margemPlanejada)} planejada.`,
                actionNav: 'analises'
            });
        }

        const highestCost = [...latestList].sort((a, b) => b.custoTotal - a.custoTotal)[0];
        if (highestCost) {
            insights.push({
                tone: 'info',
                title: 'Maior custo unitário registrado',
                desc: `"${highestCost.itemNome}" possui custo de ${Formatter.brl(highestCost.custoTotal)} e preço sugerido de ${Formatter.brl(highestCost.precoSugerido)} (markup ${highestCost.markup.toFixed(2)}x).`
            });
        }

        // Variação relevante de custo entre versões
        versionsByItem.forEach(list => {
            if (list.length >= 2) {
                const prev = list[list.length - 2];
                const curr = list[list.length - 1];
                if (prev.custoTotal > 0) {
                    const diffPct = ((curr.custoTotal - prev.custoTotal) / prev.custoTotal) * 100;
                    if (Math.abs(diffPct) >= 5) {
                        insights.push({
                            tone: diffPct > 0 ? 'warning' : 'success',
                            title: `Variação de custo em "${curr.itemNome}"`,
                            desc: `O custo unitário variou ${diffPct > 0 ? '+' : ''}${Formatter.percent(diffPct)} entre a v${prev.versao} (${Formatter.brl(prev.custoTotal)}) e a v${curr.versao} (${Formatter.brl(curr.custoTotal)}).`
                        });
                    }
                }
            }
        });

        // Itens no catálogo ainda sem precificação
        const unpriced = catalog.filter(c => c.status !== 'Arquivado' && !latestByItem.has(c.id));
        if (unpriced.length > 0) {
            insights.push({
                tone: 'info',
                title: `${unpriced.length} ${unpriced.length === 1 ? 'item aguardando precificação' : 'itens aguardando precificação'}`,
                desc: `"${unpriced[0].nome}" está no catálogo, mas ainda não possui histórico de preço calculado.`
            });
        }

        return {
            insights,
            notifications,
            belowTargetCount: belowTarget === null ? null : belowTarget.length,
            avgMargin
        };
    }

    /* =========================================================================
       7. CONTROLE DE INTERFACE, MODAL E TOASTS
       ========================================================================= */
    const UI = {
        currentView: 'dashboard',
        wizard: defaultWizardDraft(),
        activeConsultorContextId: 'latest',
        catalogFilter: { search: '', sector: 'all', status: 'all' },
        historyFilter: { search: '', sector: 'all', sort: 'newest' },
        analysisSelectedItemId: 'all',
        simulacaoResult: null,
        chatSending: false,
        niloOpen: false,

        toast(message, type = 'info') {
            const region = document.getElementById('toast-region');
            const el = document.createElement('div');
            el.className = `toast ${type}`;
            el.textContent = message;
            region.appendChild(el);
            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transition = 'opacity 180ms ease';
                setTimeout(() => el.remove(), 200);
            }, 3400);
        },

        openModal(title, bodyHtml, onMount) {
            const root = document.getElementById('modal-root');
            document.getElementById('modal-title').textContent = title;
            const body = document.getElementById('modal-body');
            body.innerHTML = bodyHtml;
            root.classList.remove('hidden');
            if (typeof onMount === 'function') onMount(body);
        },

        closeModal() {
            document.getElementById('modal-root').classList.add('hidden');
            document.getElementById('modal-body').innerHTML = '';
        },

        updateChrome() {
            const { business } = WorkspaceStore.state;
            const bizName = business.nomeNegocio?.trim() || 'Meu Negócio';
            const segNome = business.segmento ? SETORES[business.segmento]?.nome : 'Defina seu segmento';

            document.getElementById('sidebar-business-name').textContent = bizName;
            document.getElementById('sidebar-business-sector').textContent = segNome;
            document.getElementById('topbar-view-title').textContent = VIEW_LABELS[this.currentView] || 'ValorizAI';
            document.getElementById('topbar-date').textContent = Formatter.todayHeader();

            document.querySelectorAll('.nav-item[data-nav]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.nav === this.currentView);
            });

            const { notifications } = computeDerivedInsights();
            const countEl = document.getElementById('notifications-count');
            if (notifications.length > 0) {
                countEl.textContent = String(notifications.length);
                countEl.classList.remove('hidden');
            } else {
                countEl.classList.add('hidden');
            }

            const listEl = document.getElementById('notifications-list');
            if (notifications.length === 0) {
                listEl.innerHTML = `<div class="notification-item"><div class="notification-item-desc">Nenhum alerta pendente no momento.</div></div>`;
            } else {
                listEl.innerHTML = notifications.map(n => `
                    <button type="button" class="notification-item" data-notif-nav="${n.actionNav}" style="text-align:left;width:100%;">
                        <div class="notification-item-title">${Formatter.escapeHtml(n.title)}</div>
                        <div class="notification-item-desc">${Formatter.escapeHtml(n.desc)}</div>
                    </button>
                `).join('');
                listEl.querySelectorAll('[data-notif-nav]').forEach(b => {
                    b.addEventListener('click', () => {
                        document.getElementById('notifications-popover').classList.add('hidden');
                        document.getElementById('notifications-btn').setAttribute('aria-expanded', 'false');
                        this.navigate(b.dataset.notifNav);
                    });
                });
            }
        },

        navigate(viewId, options = {}) {
            if (!VIEW_LABELS[viewId]) viewId = 'dashboard';
            this.currentView = viewId;
            if (options.wizardPreset) {
                this.wizard = { ...defaultWizardDraft(), ...options.wizardPreset };
            }
            if (options.consultorContextId) {
                this.activeConsultorContextId = options.consultorContextId;
            }

            // Fecha drawer mobile ao navegar
            document.getElementById('app-shell').classList.remove('mobile-drawer-open');
            this.updateChrome();
            this.renderCurrentView();
            const viewport = document.getElementById('main-viewport');
            viewport.focus({ preventScroll: true });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        renderCurrentView() {
            const viewport = document.getElementById('main-viewport');
            viewport.classList.remove('view-enter');
            void viewport.offsetWidth;
            viewport.classList.add('view-enter');

            switch (this.currentView) {
                case 'dashboard': renderDashboard(viewport); break;
                case 'negocio': renderBusiness(viewport); break;
                case 'catalogo': renderCatalog(viewport); break;
                case 'precificacao': renderWizard(viewport); break;
                case 'simulacao': renderQuickSim(viewport); break;
                case 'historico': renderHistory(viewport); break;
                case 'analises': renderAnalyses(viewport); break;
                case 'consultor': renderConsultor(viewport); break;
                case 'conta': renderMyAccount(viewport); break;
                case 'configuracoes': renderSettings(viewport); break;
                default: renderDashboard(viewport);
            }
        }
    };

    /* =========================================================================
       8. RENDERIZAÇÃO DAS 9 TELAS
       ========================================================================= */

    // --- 8.1 DASHBOARD ---
    function renderDashboard(root) {
        const { business, catalog, pricings, settings, isDemo } = WorkspaceStore.state;
        const { insights, belowTargetCount, avgMargin } = computeDerivedInsights();
        const activeItems = catalog.filter(c => c.status !== 'Arquivado');
        const target = business.margemMeta === null || business.margemMeta === '' || business.margemMeta === undefined
            ? null
            : Number(business.margemMeta);

        const saudacaoNome = business.empreendedor?.trim() || business.nomeNegocio?.trim();
        const saudacaoTitulo = saudacaoNome ? `${Formatter.greeting()}, ${Formatter.escapeHtml(saudacaoNome)}` : `${Formatter.greeting()}!`;

        const latestPricing = pricings.length
            ? [...pricings].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))[0]
            : null;

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-display">${saudacaoTitulo}</h1>
                    <p class="page-subtitle">
                        ${business.nomeNegocio
                            ? `${Formatter.escapeHtml(business.nomeNegocio)}${business.segmento ? ` · ${SETORES[business.segmento]?.nome}` : ''} · Visão financeira e operacional das suas precificações.`
                            : 'Mais clareza. Melhores decisões. Acompanhe seus custos, margens planejadas e recomendações do negócio.'}
                    </p>
                </div>
                <div class="page-header-actions">
                    <button type="button" class="btn btn-secondary" id="dash-quick-sim-btn">Simulação rápida</button>
                    <button type="button" class="btn btn-primary" id="dash-new-pricing-btn">Nova precificação</button>
                </div>
            </div>

            ${isDemo ? `
                <div class="notice-bar warning">
                    <div>
                        <div class="notice-bar-text"><strong>Modo de demonstração ativo</strong> — os itens e precificações abaixo são exemplos locais para exploração da interface.</div>
                        <div class="notice-bar-sub">Você pode limpar esses dados a qualquer momento em Configurações ou iniciar sua própria precificação.</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" id="dash-clear-demo-btn">Limpar demonstração</button>
                </div>
            ` : ''}

            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-label">Produtos e serviços cadastrados</div>
                    <div class="kpi-value">${activeItems.length}</div>
                    <div class="kpi-meta">${activeItems.length === 0 ? 'Nenhum item ativo no catálogo' : `${catalog.length} no total incluindo arquivados`}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Precificações realizadas</div>
                    <div class="kpi-value">${pricings.length}</div>
                    <div class="kpi-meta">${pricings.length === 0 ? 'Salve uma precificação para iniciar o histórico' : `Última em ${Formatter.dateShort(latestPricing.criadoEm)}`}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Margem média registrada</div>
                    <div class="kpi-value ${avgMargin === null || target === null ? '' : (avgMargin >= target ? 'positive' : 'warning')}">
                        ${avgMargin === null ? '—' : Formatter.percent(avgMargin)}
                    </div>
                    <div class="kpi-meta">${avgMargin === null ? 'Calculada após salvar precificações' : 'Margem planejada média (não realizada)'}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">${target === null ? 'Meta de margem' : `Margem abaixo da meta (${Formatter.percent(target, 0)})`}</div>
                    <div class="kpi-value ${target === null ? '' : (belowTargetCount > 0 ? 'warning' : (pricings.length > 0 ? 'positive' : ''))}">
                        ${target === null || pricings.length === 0 ? '—' : belowTargetCount}
                    </div>
                    <div class="kpi-meta">${target === null ? 'Defina uma meta em Meu negócio' : (pricings.length === 0 ? 'Aguardando precificações salvas' : (belowTargetCount === 0 ? 'Todos os itens dentro da meta' : 'Itens que merecem revisão'))}</div>
                </div>
            </div>

            <div class="dashboard-charts-grid">
                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">Evolução das precificações</h2>
                            <p class="card-subtitle">Histórico de preço sugerido e custo unitário ao longo das versões salvas.</p>
                        </div>
                    </div>
                    <div id="dash-chart-evolution" class="chart-container"></div>
                </section>

                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">Distribuição dos custos</h2>
                            <p class="card-subtitle">${latestPricing ? `Composição do último registro: ${Formatter.escapeHtml(latestPricing.itemNome)}` : 'Composição por categoria de custo'}</p>
                        </div>
                    </div>
                    <div id="dash-chart-costs" class="chart-container"></div>
                </section>
            </div>

            <div class="dashboard-bottom-grid">
                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">Margem planejada por item</h2>
                            <p class="card-subtitle">${target === null ? 'Margens planejadas por item (não representam vendas realizadas). Defina uma meta em Meu negócio para comparar.' : `Margem planejada comparada à meta de ${Formatter.percent(target, 0)} (não representa venda realizada).`}</p>
                        </div>
                    </div>
                    <div id="dash-chart-margin" class="chart-container"></div>
                </section>

                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">Insights do seu negócio</h2>
                            <p class="card-subtitle">Leituras objetivas derivadas exclusivamente dos seus registros reais.</p>
                        </div>
                    </div>
                    <div id="dash-insights-content"></div>
                </section>
            </div>
        `;

        ChartRenderer.renderPriceEvolutionChart(document.getElementById('dash-chart-evolution'), pricings);
        ChartRenderer.renderCostDistributionChart(
            document.getElementById('dash-chart-costs'),
            latestPricing ? latestPricing.categoriasCusto : [],
            latestPricing ? latestPricing.custoTotal : 0
        );
        ChartRenderer.renderPlannedMarginChart(document.getElementById('dash-chart-margin'), pricings, target);

        const insightsContainer = document.getElementById('dash-insights-content');
        if (pricings.length === 0) {
            insightsContainer.innerHTML = `
                <div class="nilo-spotlight" style="border:0;padding:8px 0;background:transparent;">
                    <div class="nilo-avatar-box">
                        <img src="${NILO_ASSETS.boasVindas}" alt="Nilo dando boas-vindas" class="nilo-figure nilo-float">
                    </div>
                    <div>
                        <h3 style="font-size:16px;font-weight:600;margin-bottom:6px;">Olá! Sou o Nilo, seu apoio analítico.</h3>
                        <p style="font-size:13px;color:var(--color-silver);margin-bottom:14px;">
                            Ainda não há precificações salvas para gerar diagnósticos do negócio. Comece cadastrando uma primeira precificação ou carregue um cenário de demonstração para explorar os gráficos.
                        </p>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            <button type="button" class="btn btn-primary btn-sm" id="dash-empty-start">Criar primeira precificação</button>
                            <button type="button" class="btn btn-secondary btn-sm" id="dash-load-demo">Carregar demonstração</button>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('dash-empty-start')?.addEventListener('click', () => UI.navigate('precificacao'));
            document.getElementById('dash-load-demo')?.addEventListener('click', () => {
                WorkspaceStore.loadDemoScenario();
                UI.updateChrome();
                UI.renderCurrentView();
                UI.toast('Cenário de demonstração carregado localmente.', 'success');
            });
        } else {
            const niloPose = belowTargetCount > 0 ? NILO_ASSETS.recomendacao : NILO_ASSETS.analisando;
            insightsContainer.innerHTML = `
                <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px;">
                    <div class="nilo-avatar-box-sm">
                        <img src="${niloPose}" alt="Nilo analisando indicadores" class="nilo-figure nilo-float">
                    </div>
                    <p style="font-size:13px;color:var(--color-silver);padding-top:6px;">
                        ${belowTargetCount > 0
                            ? 'Identifiquei pontos de atenção nas suas margens planejadas. Vale revisar os itens destacados antes de atualizar sua tabela de vendas.'
                            : 'Suas precificações salvas estão consistentes com a meta definida. Use o Consultor IA se quiser validar competitividade.'}
                    </p>
                </div>
                <div class="insights-list">
                    ${insights.length ? insights.map(ins => `
                        <div class="insight-row">
                            <div>
                                <div class="insight-title">${Formatter.escapeHtml(ins.title)}</div>
                                <div class="insight-desc">${Formatter.escapeHtml(ins.desc)}</div>
                            </div>
                            <span class="status-label ${ins.tone}">${ins.tone === 'warning' ? 'Atenção' : ins.tone === 'success' ? 'Positivo' : 'Leitura'}</span>
                        </div>
                    `).join('') : `
                        <div class="insight-row">
                            <div>
                                <div class="insight-title">Base inicial registrada</div>
                                <div class="insight-desc">Continue registrando novos itens ou revisões de custo para ampliar os comparativos automáticos.</div>
                            </div>
                        </div>
                    `}
                </div>
            `;
        }

        document.getElementById('dash-new-pricing-btn')?.addEventListener('click', () => UI.navigate('precificacao'));
        document.getElementById('dash-quick-sim-btn')?.addEventListener('click', () => UI.navigate('simulacao'));
        document.getElementById('dash-clear-demo-btn')?.addEventListener('click', () => {
            WorkspaceStore.resetAll();
            UI.updateChrome();
            UI.renderCurrentView();
            UI.toast('Dados de demonstração removidos.', 'info');
        });
    }

    // --- 8.2 MEU NEGÓCIO ---
    function renderBusiness(root) {
        const b = WorkspaceStore.state.business;
        let selectedSegment = b.segmento || '';

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Meu negócio</h1>
                    <p class="page-subtitle">Organize o perfil operacional do seu empreendimento para agilizar novas precificações e contextualizar análises.</p>
                </div>
            </div>

            <div class="notice-bar">
                <div class="notice-bar-text">
                    <strong>Armazenamento local (demonstração):</strong> Estas informações ficam salvas no navegador e pré-selecionam seu segmento padrão sem impedir simulações em outros setores.
                </div>
            </div>

            <form id="business-form" class="surface-card" novalidate>
                <div style="margin-bottom:22px;">
                    <div class="field-label" style="margin-bottom:10px;">
                        <span>Segmento principal de atuação</span>
                        <span class="field-req">Opcional para começar</span>
                    </div>
                    <div class="sector-selector-grid" id="biz-sector-grid">
                        ${Object.values(SETORES).map(s => `
                            <button type="button" class="sector-option ${selectedSegment === s.id ? 'active' : ''}" data-sector="${s.id}">
                                <span class="sector-option-title">${s.nome}</span>
                                <span class="sector-option-desc">${s.subtitulo}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-field form-field-full">
                        <label class="field-label" for="biz-margem-meta">Meta de margem da empresa (%) <span class="field-req">Opcional</span></label>
                        <input id="biz-margem-meta" class="field-input mono" type="text" inputmode="decimal" value="${b.margemMeta ?? ''}" placeholder="Ex: 25">
                        <span class="field-help">Use uma meta definida pela sua estratégia. Se deixar vazio, o ValorizAI não classificará margens como acima ou abaixo de uma meta.</span>
                    </div>
                    <div class="form-field">
                        <label class="field-label" for="biz-nome">Nome do negócio</label>
                        <input id="biz-nome" class="field-input" type="text" value="${Formatter.escapeHtml(b.nomeNegocio)}" placeholder="Ex: Padaria Trigo & Cia ou Studio Silva">
                    </div>

                    <div class="form-field">
                        <label class="field-label" for="biz-empreendedor">Nome do empreendedor</label>
                        <input id="biz-empreendedor" class="field-input" type="text" value="${Formatter.escapeHtml(b.empreendedor)}" placeholder="Como prefere ser chamado">
                    </div>

                    <div class="form-field">
                        <label class="field-label" for="biz-modelo">Modelo de operação</label>
                        <select id="biz-modelo" class="field-select">
                            <option value="">Selecione quando desejar</option>
                            ${[
                                'Loja física',
                                'Loja virtual / E-commerce',
                                'Loja física e e-commerce',
                                'Marketplaces',
                                'Produção sob encomenda',
                                'Produção em lote / própria',
                                'Atendimento presencial',
                                'Prestação remota / consultoria',
                                'Modelo híbrido'
                            ].map(m => `<option value="${m}" ${b.modeloOperacao === m ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-field">
                        <label class="field-label" for="biz-regime">Enquadramento / Regime (informativo)</label>
                        <input id="biz-regime" class="field-input" type="text" value="${Formatter.escapeHtml(b.regimeInformativo)}" placeholder="Ex: MEI, Simples Nacional, Autônomo">
                        <span class="field-help">Apenas referência organizacional; nenhuma alíquota automática é presumida.</span>
                    </div>

                    <div class="form-field form-field-full">
                        <label class="field-label" for="biz-descricao">Descrição do negócio</label>
                        <textarea id="biz-descricao" class="field-textarea" placeholder="Descreva brevemente o que vende ou produz, seu público e diferenciais.">${Formatter.escapeHtml(b.descricao)}</textarea>
                    </div>

                    <div class="form-field">
                        <label class="field-label" for="biz-cidade">Cidade / UF</label>
                        <input id="biz-cidade" class="field-input" type="text" value="${Formatter.escapeHtml(b.cidadeUf)}" placeholder="Ex: Belo Horizonte / MG">
                    </div>

                    <div class="form-field">
                        <label class="field-label" for="biz-obs">Informações complementares</label>
                        <input id="biz-obs" class="field-input" type="text" value="${Formatter.escapeHtml(b.observacoes)}" placeholder="Ex: Canais de entrega, sazonalidade ou observações">
                    </div>
                </div>

                <div class="wizard-footer">
                    <span class="field-help">${b.atualizadoEm ? `Última atualização em ${Formatter.dateTime(b.atualizadoEm)}` : 'Você pode preencher apenas o necessário e completar depois.'}</span>
                    <div style="display:flex;gap:10px;">
                        <button type="submit" class="btn btn-primary">Salvar informações</button>
                    </div>
                </div>
            </form>
        `;

        root.querySelectorAll('#biz-sector-grid .sector-option').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedSegment = selectedSegment === btn.dataset.sector ? '' : btn.dataset.sector;
                root.querySelectorAll('#biz-sector-grid .sector-option').forEach(o => {
                    o.classList.toggle('active', o.dataset.sector === selectedSegment);
                });
            });
        });

        document.getElementById('business-form').addEventListener('submit', e => {
            e.preventDefault();
            const margemMeta = Formatter.parseNumber(document.getElementById('biz-margem-meta').value);
            if (margemMeta !== null && (!Number.isFinite(margemMeta) || margemMeta < 0 || margemMeta >= 100)) {
                UI.toast('Informe uma meta entre 0% e 99%, ou deixe o campo vazio.', 'error');
                return;
            }
            WorkspaceStore.state.business = {
                nomeNegocio: document.getElementById('biz-nome').value.trim(),
                empreendedor: document.getElementById('biz-empreendedor').value.trim(),
                margemMeta,
                segmento: selectedSegment,
                modeloOperacao: document.getElementById('biz-modelo').value,
                regimeInformativo: document.getElementById('biz-regime').value.trim(),
                descricao: document.getElementById('biz-descricao').value.trim(),
                cidadeUf: document.getElementById('biz-cidade').value.trim(),
                observacoes: document.getElementById('biz-obs').value.trim(),
                atualizadoEm: new Date().toISOString()
            };
            WorkspaceStore.save();
            UI.updateChrome();
            UI.renderCurrentView();
            UI.toast('Informações do negócio salvas neste navegador. A sincronização com a conta ainda será integrada.', 'info');
        });
    }

    // --- 8.3 CATÁLOGO ---
    function renderCatalog(root) {
        const { catalog, pricings } = WorkspaceStore.state;
        const { search, sector, status } = UI.catalogFilter;

        const latestByItem = new Map();
        const countByItem = new Map();
        [...pricings].sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm)).forEach(p => {
            latestByItem.set(p.catalogItemId, p);
            countByItem.set(p.catalogItemId, (countByItem.get(p.catalogItemId) || 0) + 1);
        });

        const filtered = catalog.filter(item => {
            if (sector !== 'all' && item.setor !== sector) return false;
            if (status !== 'all' && item.status !== status) return false;
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                const hay = `${item.nome} ${item.categoria} ${item.descricao}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Catálogo de produtos e serviços</h1>
                    <p class="page-subtitle">Cada item mantém identidade única e preserva todas as versões anteriores de precificação.</p>
                </div>
                <div class="page-header-actions">
                    <button type="button" class="btn btn-primary" id="cat-add-btn">Novo item</button>
                </div>
            </div>

            <div class="surface-card">
                <div class="toolbar">
                    <div class="toolbar-group" style="flex:1;min-width:240px;">
                        <input type="search" id="cat-search" class="field-input" style="max-width:320px;" value="${Formatter.escapeHtml(search)}" placeholder="Buscar por nome, categoria ou descrição...">
                        <select id="cat-sector-filter" class="field-select" style="width:auto;min-width:150px;">
                            <option value="all" ${sector === 'all' ? 'selected' : ''}>Todos os setores</option>
                            <option value="comercio" ${sector === 'comercio' ? 'selected' : ''}>Comércio</option>
                            <option value="industria" ${sector === 'industria' ? 'selected' : ''}>Indústria</option>
                            <option value="servico" ${sector === 'servico' ? 'selected' : ''}>Serviços</option>
                        </select>
                        <select id="cat-status-filter" class="field-select" style="width:auto;min-width:140px;">
                            <option value="all" ${status === 'all' ? 'selected' : ''}>Todos os status</option>
                            <option value="Ativo" ${status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                            <option value="Em revisão" ${status === 'Em revisão' ? 'selected' : ''}>Em revisão</option>
                            <option value="Arquivado" ${status === 'Arquivado' ? 'selected' : ''}>Arquivado</option>
                        </select>
                    </div>
                </div>

                <div id="cat-list-region"></div>
            </div>
        `;

        const region = document.getElementById('cat-list-region');
        if (catalog.length === 0) {
            region.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-nilo">
                        <img src="${NILO_ASSETS.boasVindas}" alt="Nilo" class="nilo-figure nilo-float">
                    </div>
                    <h2 class="empty-state-title">Seu catálogo ainda está vazio</h2>
                    <p class="empty-state-desc">Cadastre produtos revendidos, itens fabricados ou serviços prestados para manter o histórico completo de precificação por item.</p>
                    <div class="empty-state-actions">
                        <button type="button" class="btn btn-primary" id="cat-empty-add">Cadastrar primeiro item</button>
                    </div>
                </div>
            `;
            document.getElementById('cat-empty-add')?.addEventListener('click', () => openCatalogItemModal());
        } else if (filtered.length === 0) {
            region.innerHTML = `
                <div class="empty-state">
                    <h2 class="empty-state-title">Nenhum item corresponde aos filtros</h2>
                    <p class="empty-state-desc">Ajuste o texto da busca ou os filtros de setor e status.</p>
                </div>
            `;
        } else {
            region.innerHTML = `
                <div class="table-wrap">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Setor / Tipo</th>
                                <th>Unidade</th>
                                <th>Status</th>
                                <th class="num">Último preço</th>
                                <th class="num">Versões</th>
                                <th style="text-align:right;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.map(item => {
                                const latest = latestByItem.get(item.id);
                                const versions = countByItem.get(item.id) || 0;
                                const statusClass = item.status === 'Ativo' ? 'success' : item.status === 'Em revisão' ? 'warning' : 'neutral';
                                return `
                                    <tr>
                                        <td>
                                            <div style="font-weight:600;color:var(--color-cloud);">${Formatter.escapeHtml(item.nome)}</div>
                                            <div style="font-size:12px;color:var(--color-silver);">${Formatter.escapeHtml(item.categoria || 'Sem categoria')} · Cadastro ${Formatter.dateShort(item.criadoEm)}</div>
                                        </td>
                                        <td>
                                            <div>${SETORES[item.setor]?.nome || item.setor}</div>
                                            <div style="font-size:12px;color:var(--color-silver);">${Formatter.escapeHtml(item.tipo || '—')}</div>
                                        </td>
                                        <td>${Formatter.escapeHtml(item.unidade)}</td>
                                        <td><span class="status-label ${statusClass}">${Formatter.escapeHtml(item.status)}</span></td>
                                        <td class="num">${latest ? Formatter.brl(latest.precoSugerido) : '—'}</td>
                                        <td class="num">${versions}</td>
                                        <td style="text-align:right;white-space:nowrap;">
                                            <div style="display:inline-flex;gap:6px;">
                                                <button type="button" class="btn btn-ghost btn-sm" data-cat-detail="${item.id}">Detalhes</button>
                                                <button type="button" class="btn btn-ghost btn-sm" data-cat-edit="${item.id}">Editar</button>
                                                <button type="button" class="btn btn-secondary btn-sm" data-cat-price="${item.id}">Precificar</button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            region.querySelectorAll('[data-cat-detail]').forEach(b => {
                b.addEventListener('click', () => openCatalogDetailModal(b.dataset.catDetail));
            });
            region.querySelectorAll('[data-cat-edit]').forEach(b => {
                b.addEventListener('click', () => {
                    const item = WorkspaceStore.state.catalog.find(i => i.id === b.dataset.catEdit);
                    if (item) openCatalogItemModal(item);
                });
            });
            region.querySelectorAll('[data-cat-price]').forEach(b => {
                b.addEventListener('click', () => startWizardForCatalogItem(b.dataset.catPrice));
            });
        }

        document.getElementById('cat-add-btn').addEventListener('click', () => openCatalogItemModal());
        document.getElementById('cat-search').addEventListener('input', e => {
            UI.catalogFilter.search = e.target.value;
            renderCatalog(root);
        });
        document.getElementById('cat-sector-filter').addEventListener('change', e => {
            UI.catalogFilter.sector = e.target.value;
            renderCatalog(root);
        });
        document.getElementById('cat-status-filter').addEventListener('change', e => {
            UI.catalogFilter.status = e.target.value;
            renderCatalog(root);
        });
    }

    function openCatalogItemModal(existing = null) {
        const defaultSetor = existing?.setor || WorkspaceStore.state.business.segmento || 'comercio';
        const isEdit = Boolean(existing);

        UI.openModal(
            isEdit ? 'Editar item do catálogo' : 'Novo item no catálogo',
            `
            <form id="cat-item-form" novalidate>
                <div class="form-grid">
                    <div class="form-field form-field-full">
                        <label class="field-label" for="modal-item-nome">Nome do produto ou serviço <span class="field-req">Obrigatório</span></label>
                        <input id="modal-item-nome" class="field-input" type="text" value="${Formatter.escapeHtml(existing?.nome || '')}" placeholder="Ex: Bolo artesanal 1kg, Camiseta algodão, Consultoria mensal">
                        <span class="field-error hidden" id="err-item-nome"></span>
                    </div>
                    <div class="form-field">
                        <label class="field-label" for="modal-item-setor">Setor</label>
                        <select id="modal-item-setor" class="field-select">
                            <option value="comercio" ${defaultSetor === 'comercio' ? 'selected' : ''}>Comércio</option>
                            <option value="industria" ${defaultSetor === 'industria' ? 'selected' : ''}>Indústria</option>
                            <option value="servico" ${defaultSetor === 'servico' ? 'selected' : ''}>Serviços</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label class="field-label" for="modal-item-tipo">Tipo de item</label>
                        <input id="modal-item-tipo" class="field-input" type="text" value="${Formatter.escapeHtml(existing?.tipo || SETORES[defaultSetor].itemTipoPadrao)}" placeholder="Ex: Produto revendido, Fabricado, Serviço">
                    </div>
                    <div class="form-field">
                        <label class="field-label" for="modal-item-categoria">Categoria</label>
                        <input id="modal-item-categoria" class="field-input" type="text" value="${Formatter.escapeHtml(existing?.categoria || '')}" placeholder="Ex: Alimentos, Vestuário, Manutenção">
                    </div>
                    <div class="form-field">
                        <label class="field-label" for="modal-item-unidade">Unidade de comercialização</label>
                        <input id="modal-item-unidade" class="field-input" type="text" value="${Formatter.escapeHtml(existing?.unidade || SETORES[defaultSetor].unidadePadrao)}" placeholder="Ex: Unidade, Hora, Projeto, Lote">
                    </div>
                    <div class="form-field">
                        <label class="field-label" for="modal-item-status">Status</label>
                        <select id="modal-item-status" class="field-select">
                            <option value="Ativo" ${existing?.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                            <option value="Em revisão" ${existing?.status === 'Em revisão' ? 'selected' : ''}>Em revisão</option>
                            <option value="Arquivado" ${existing?.status === 'Arquivado' ? 'selected' : ''}>Arquivado</option>
                        </select>
                    </div>
                    <div class="form-field form-field-full">
                        <label class="field-label" for="modal-item-desc">Descrição</label>
                        <textarea id="modal-item-desc" class="field-textarea" placeholder="Observações sobre especificações, fornecimento ou escopo.">${Formatter.escapeHtml(existing?.descricao || '')}</textarea>
                    </div>
                </div>
                <div class="wizard-footer">
                    <button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Salvar alterações' : 'Adicionar ao catálogo'}</button>
                </div>
            </form>
            `,
            body => {
                const setorSelect = body.querySelector('#modal-item-setor');
                const tipoInput = body.querySelector('#modal-item-tipo');
                const unidadeInput = body.querySelector('#modal-item-unidade');

                setorSelect.addEventListener('change', () => {
                    if (!isEdit) {
                        const s = SETORES[setorSelect.value];
                        tipoInput.value = s.itemTipoPadrao;
                        unidadeInput.value = s.unidadePadrao;
                    }
                });

                body.querySelector('#modal-cancel-btn').addEventListener('click', () => UI.closeModal());
                body.querySelector('#cat-item-form').addEventListener('submit', e => {
                    e.preventDefault();
                    const nome = body.querySelector('#modal-item-nome').value.trim();
                    const errEl = body.querySelector('#err-item-nome');
                    if (!nome) {
                        errEl.textContent = 'Informe o nome do produto ou serviço.';
                        errEl.classList.remove('hidden');
                        body.querySelector('#modal-item-nome').classList.add('has-error');
                        return;
                    }

                    if (isEdit) {
                        Object.assign(existing, {
                            nome,
                            setor: setorSelect.value,
                            tipo: tipoInput.value.trim() || SETORES[setorSelect.value].itemTipoPadrao,
                            categoria: body.querySelector('#modal-item-categoria').value.trim(),
                            unidade: unidadeInput.value.trim() || SETORES[setorSelect.value].unidadePadrao,
                            status: body.querySelector('#modal-item-status').value,
                            descricao: body.querySelector('#modal-item-desc').value.trim()
                        });
                        UI.toast('Item atualizado no catálogo.', 'success');
                    } else {
                        WorkspaceStore.state.catalog.unshift({
                            id: Formatter.uid('item'),
                            nome,
                            setor: setorSelect.value,
                            tipo: tipoInput.value.trim() || SETORES[setorSelect.value].itemTipoPadrao,
                            categoria: body.querySelector('#modal-item-categoria').value.trim(),
                            unidade: unidadeInput.value.trim() || SETORES[setorSelect.value].unidadePadrao,
                            status: body.querySelector('#modal-item-status').value,
                            descricao: body.querySelector('#modal-item-desc').value.trim(),
                            criadoEm: new Date().toISOString()
                        });
                        UI.toast('Item adicionado ao catálogo.', 'success');
                    }
                    WorkspaceStore.save();
                    UI.closeModal();
                    UI.updateChrome();
                    UI.renderCurrentView();
                });
            }
        );
    }

    function openCatalogDetailModal(itemId) {
        const item = WorkspaceStore.state.catalog.find(i => i.id === itemId);
        if (!item) return;
        const itemPricings = WorkspaceStore.state.pricings
            .filter(p => p.catalogItemId === item.id)
            .sort((a, b) => b.versao - a.versao);

        UI.openModal(
            item.nome,
            `
            <div class="kv-list simulation-result-details" style="margin-bottom:20px;">
                <div class="kv-row"><span class="kv-key">Setor / Tipo</span><span class="kv-val">${SETORES[item.setor]?.nome || item.setor} · ${Formatter.escapeHtml(item.tipo)}</span></div>
                <div class="kv-row"><span class="kv-key">Categoria</span><span class="kv-val">${Formatter.escapeHtml(item.categoria || 'Não informada')}</span></div>
                <div class="kv-row"><span class="kv-key">Unidade de comercialização</span><span class="kv-val">${Formatter.escapeHtml(item.unidade)}</span></div>
                <div class="kv-row"><span class="kv-key">Status · Cadastro</span><span class="kv-val">${Formatter.escapeHtml(item.status)} · ${Formatter.dateShort(item.criadoEm)}</span></div>
                ${item.descricao ? `<div class="kv-row"><span class="kv-key">Descrição</span><span class="kv-val" style="max-width:65%;font-weight:400;">${Formatter.escapeHtml(item.descricao)}</span></div>` : ''}
            </div>

            <h3 style="font-size:15px;font-weight:600;margin-bottom:10px;">Histórico preservado de precificações (${itemPricings.length})</h3>
            ${itemPricings.length === 0 ? `
                <p style="font-size:13px;color:var(--color-silver);margin-bottom:16px;">Este item ainda não possui precificações salvas.</p>
            ` : `
                <div class="table-wrap" style="margin-bottom:16px;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Versão</th>
                                <th>Data</th>
                                <th class="num">Custo</th>
                                <th class="num">Preço</th>
                                <th class="num">Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemPricings.map(p => `
                                <tr>
                                    <td class="mono">v${p.versao}</td>
                                    <td>${Formatter.dateShort(p.criadoEm)}</td>
                                    <td class="num">${Formatter.brl(p.custoTotal)}</td>
                                    <td class="num" style="color:var(--color-emerald);font-weight:600;">${Formatter.brl(p.precoSugerido)}</td>
                                    <td class="num">${Formatter.percent(p.margemPlanejada)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
            <div class="wizard-footer">
                <button type="button" class="btn btn-ghost" id="detail-close-btn">Fechar</button>
                <button type="button" class="btn btn-primary" id="detail-new-pricing-btn">Nova precificação para este item</button>
            </div>
            `,
            body => {
                body.querySelector('#detail-close-btn').addEventListener('click', () => UI.closeModal());
                body.querySelector('#detail-new-pricing-btn').addEventListener('click', () => {
                    UI.closeModal();
                    startWizardForCatalogItem(item.id);
                });
            }
        );
    }

    function startWizardForCatalogItem(itemId) {
        const item = WorkspaceStore.state.catalog.find(i => i.id === itemId);
        if (!item) return;
        const nextDraft = {
            ...defaultWizardDraft(),
            step: 2,
            sourceType: 'existing',
            catalogItemId: item.id,
            itemNome: item.nome,
            setor: item.setor,
            unidade: item.unidade,
            descricao: item.descricao || ''
        };
        DraftStore.save(nextDraft);
        UI.navigate('precificacao', { wizardPreset: nextDraft });
    }

    // --- 8.4 PRECIFICAÇÃO (WIZARD EM 5 ETAPAS) ---
    function renderWizard(root) {
        const savedDraft = DraftStore.load();
        const w = UI.wizard;
        const activeCatalog = WorkspaceStore.state.catalog.filter(c => c.status !== 'Arquivado');

        // Se o wizard atual está vazio e há rascunho salvo diferente, mostra opção de retomar
        const hasPendingDraftBanner = savedDraft && w.step === 1 && !w.itemNome && Object.keys(w.costs || {}).length === 0 && (savedDraft.itemNome || savedDraft.step > 1);

        const steps = [
            { num: 1, label: 'Identificação' },
            { num: 2, label: 'Estrutura de custos' },
            { num: 3, label: 'Impostos e margem' },
            { num: 4, label: 'Revisão' },
            { num: 5, label: 'Resultado' }
        ];

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Assistente de precificação</h1>
                    <p class="page-subtitle">Estruture custos por setor, revise impostos e gere uma prévia transparente antes de salvar no histórico.</p>
                </div>
                <div class="page-header-actions">
                    <button type="button" class="btn btn-ghost btn-sm" id="wiz-reset-btn">Reiniciar assistente</button>
                </div>
            </div>

            ${hasPendingDraftBanner ? `
                <div class="notice-bar">
                    <div>
                        <div class="notice-bar-text"><strong>Rascunho encontrado:</strong> ${Formatter.escapeHtml(savedDraft.itemNome || 'Precificação em andamento')} (Etapa ${savedDraft.step} de 5)</div>
                        <div class="notice-bar-sub">Salvo localmente em ${Formatter.dateTime(savedDraft.updatedAt)}</div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button type="button" class="btn btn-primary btn-sm" id="wiz-resume-draft">Retomar rascunho</button>
                        <button type="button" class="btn btn-ghost btn-sm" id="wiz-discard-draft">Descartar</button>
                    </div>
                </div>
            ` : ''}

            <div class="wizard-stepper" role="tablist" aria-label="Etapas da precificação">
                ${steps.map(s => {
                    const cls = w.step === s.num ? 'active' : (w.step > s.num ? 'completed' : '');
                    return `
                        <button type="button" class="wizard-step ${cls}" data-wiz-step="${s.num}" ${s.num > w.step && s.num !== 5 ? 'disabled' : ''}>
                            <span class="wizard-step-num">${w.step > s.num ? '✓' : s.num}</span>
                            <span class="wizard-step-label">${s.label}</span>
                        </button>
                    `;
                }).join('')}
            </div>

            <div id="wiz-step-container"></div>
        `;

        document.getElementById('wiz-reset-btn').addEventListener('click', () => {
            UI.wizard = defaultWizardDraft();
            DraftStore.clear();
            renderWizard(root);
            UI.toast('Assistente reiniciado.', 'info');
        });

        document.getElementById('wiz-resume-draft')?.addEventListener('click', () => {
            UI.wizard = savedDraft;
            renderWizard(root);
            UI.toast('Rascunho retomado.', 'success');
        });

        document.getElementById('wiz-discard-draft')?.addEventListener('click', () => {
            DraftStore.clear();
            renderWizard(root);
        });

        root.querySelectorAll('[data-wiz-step]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetStep = Number(btn.dataset.wizStep);
                if (targetStep < UI.wizard.step) {
                    UI.wizard.step = targetStep;
                    DraftStore.save(UI.wizard);
                    renderWizard(root);
                }
            });
        });

        const stepContainer = document.getElementById('wiz-step-container');
        if (w.step === 1) renderWizardStep1(stepContainer, activeCatalog);
        else if (w.step === 2) renderWizardStep2(stepContainer);
        else if (w.step === 3) renderWizardStep3(stepContainer);
        else if (w.step === 4) renderWizardStep4(stepContainer);
        else renderWizardStep5(stepContainer);
    }

    function renderWizardStep1(container, activeCatalog) {
        const w = UI.wizard;
        const defaultSetor = w.setor || WorkspaceStore.state.business.segmento || 'comercio';
        if (!w.setor) w.setor = defaultSetor;

        container.innerHTML = `
            <div class="surface-card">
                <h2 class="card-title" style="margin-bottom:6px;">Etapa 1 — Identificação do produto ou serviço</h2>
                <p class="card-subtitle" style="margin-bottom:20px;">Escolha um item já cadastrado no catálogo para gerar uma nova versão ou crie uma nova identificação.</p>

                ${activeCatalog.length > 0 ? `
                    <div style="margin-bottom:20px;">
                        <div class="segmented-tabs" role="tablist">
                            <button type="button" class="segmented-tab ${w.sourceType === 'new' ? 'active' : ''}" data-source="new">Novo item</button>
                            <button type="button" class="segmented-tab ${w.sourceType === 'existing' ? 'active' : ''}" data-source="existing">Selecionar do catálogo (${activeCatalog.length})</button>
                        </div>
                    </div>
                ` : ''}

                <div id="wiz-s1-fields"></div>

                <div class="wizard-footer">
                    <span class="field-help">As etapas seguintes se adaptam automaticamente ao setor selecionado.</span>
                    <button type="button" class="btn btn-primary" id="wiz-s1-next">Avançar para custos</button>
                </div>
            </div>
        `;

        const fieldsBox = document.getElementById('wiz-s1-fields');

        function renderSourceFields() {
            if (w.sourceType === 'existing' && activeCatalog.length > 0) {
                fieldsBox.innerHTML = `
                    <div class="form-grid">
                        <div class="form-field form-field-full">
                            <label class="field-label" for="wiz-catalog-select">Item do catálogo <span class="field-req">Obrigatório</span></label>
                            <select id="wiz-catalog-select" class="field-select">
                                <option value="">Selecione um item...</option>
                                ${activeCatalog.map(c => `<option value="${c.id}" ${w.catalogItemId === c.id ? 'selected' : ''}>${Formatter.escapeHtml(c.nome)} (${SETORES[c.setor]?.nome} · ${Formatter.escapeHtml(c.unidade)})</option>`).join('')}
                            </select>
                            <span class="field-error hidden" id="err-s1-catalog"></span>
                        </div>
                    </div>
                `;
                document.getElementById('wiz-catalog-select').addEventListener('change', e => {
                    const item = activeCatalog.find(c => c.id === e.target.value);
                    if (item) {
                        w.catalogItemId = item.id;
                        w.itemNome = item.nome;
                        w.setor = item.setor;
                        w.unidade = item.unidade;
                        w.descricao = item.descricao || '';
                        DraftStore.save(w);
                    }
                });
            } else {
                fieldsBox.innerHTML = `
                    <div style="margin-bottom:18px;">
                        <div class="field-label" style="margin-bottom:8px;">Setor da operação <span class="field-req">Obrigatório</span></div>
                        <div class="sector-selector-grid">
                            ${Object.values(SETORES).map(s => `
                                <button type="button" class="sector-option ${w.setor === s.id ? 'active' : ''}" data-wiz-sector="${s.id}">
                                    <span class="sector-option-title">${s.nome}</span>
                                    <span class="sector-option-desc">${s.subtitulo}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label" for="wiz-item-nome">Nome do produto ou serviço <span class="field-req">Obrigatório</span></label>
                            <input id="wiz-item-nome" class="field-input" type="text" value="${Formatter.escapeHtml(w.itemNome)}" placeholder="Ex: Café especial 250g ou Revisão elétrica">
                            <span class="field-error hidden" id="err-s1-nome"></span>
                        </div>
                        <div class="form-field">
                            <label class="field-label" for="wiz-item-unidade">Unidade de comercialização <span class="field-req">Obrigatório</span></label>
                            <input id="wiz-item-unidade" class="field-input" type="text" value="${Formatter.escapeHtml(w.unidade || SETORES[w.setor].unidadePadrao)}" placeholder="Ex: Unidade, Hora, Projeto, Caixa">
                            <span class="field-error hidden" id="err-s1-unidade"></span>
                        </div>
                        <div class="form-field form-field-full">
                            <label class="field-label" for="wiz-item-desc">Descrição complementar <span class="field-req">Opcional</span></label>
                            <input id="wiz-item-desc" class="field-input" type="text" value="${Formatter.escapeHtml(w.descricao)}" placeholder="Detalhes que ajudam a diferenciar esta versão de preço">
                        </div>
                    </div>
                `;

                fieldsBox.querySelectorAll('[data-wiz-sector]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const prevSetor = w.setor;
                        w.setor = btn.dataset.wizSector;
                        if (prevSetor !== w.setor) {
                            w.costs = {};
                            w.unidade = SETORES[w.setor].unidadePadrao;
                        }
                        DraftStore.save(w);
                        renderSourceFields();
                    });
                });
            }
        }

        renderSourceFields();

        container.querySelectorAll('[data-source]').forEach(btn => {
            btn.addEventListener('click', () => {
                w.sourceType = btn.dataset.source;
                if (w.sourceType === 'new') w.catalogItemId = '';
                DraftStore.save(w);
                renderSourceFields();
                container.querySelectorAll('[data-source]').forEach(b => b.classList.toggle('active', b === btn));
            });
        });

        document.getElementById('wiz-s1-next').addEventListener('click', () => {
            if (w.sourceType === 'existing' && activeCatalog.length > 0) {
                const select = document.getElementById('wiz-catalog-select');
                const item = activeCatalog.find(c => c.id === select.value);
                if (!item) {
                    const err = document.getElementById('err-s1-catalog');
                    err.textContent = 'Selecione um item do catálogo para continuar.';
                    err.classList.remove('hidden');
                    select.classList.add('has-error');
                    return;
                }
                w.catalogItemId = item.id;
                w.itemNome = item.nome;
                w.setor = item.setor;
                w.unidade = item.unidade;
                w.descricao = item.descricao || '';
            } else {
                const nome = document.getElementById('wiz-item-nome').value.trim();
                const unidade = document.getElementById('wiz-item-unidade').value.trim();
                const desc = document.getElementById('wiz-item-desc').value.trim();
                let valid = true;

                if (!nome) {
                    document.getElementById('err-s1-nome').textContent = 'Informe o nome do produto ou serviço.';
                    document.getElementById('err-s1-nome').classList.remove('hidden');
                    document.getElementById('wiz-item-nome').classList.add('has-error');
                    valid = false;
                }
                if (!unidade) {
                    document.getElementById('err-s1-unidade').textContent = 'Informe a unidade de comercialização.';
                    document.getElementById('err-s1-unidade').classList.remove('hidden');
                    document.getElementById('wiz-item-unidade').classList.add('has-error');
                    valid = false;
                }
                if (!valid) return;

                w.itemNome = nome;
                w.unidade = unidade;
                w.descricao = desc;
            }

            w.step = 2;
            DraftStore.save(w);
            renderWizard(document.getElementById('main-viewport'));
        });
    }

    function renderWizardStep2(container) {
        const w = UI.wizard;
        const sectorCfg = SETORES[w.setor] || SETORES.comercio;
        const showHelp = WorkspaceStore.state.settings.mostrarDicasCampos;

        container.innerHTML = `
            <div class="surface-card">
                <div class="card-header">
                    <div>
                        <h2 class="card-title">Etapa 2 — Estrutura de custos (${sectorCfg.nome})</h2>
                        <p class="card-subtitle">Item: <strong>${Formatter.escapeHtml(w.itemNome)}</strong> · Unidade: ${Formatter.escapeHtml(w.unidade)}. Preencha os custos na unidade correspondente sem misturar contas mensais brutas.</p>
                    </div>
                </div>

                ${w.setor === 'comercio' ? `
                    <div class="notice-bar">
                        <div class="notice-bar-text">Precisa calcular o rateio operacional unitário? Divida seu custo fixo mensal pelo volume estimado de vendas mensais usando o auxiliar rápido.</div>
                        <button type="button" class="btn btn-secondary btn-sm" id="wiz-rateio-helper-btn">Calcular rateio unitário</button>
                    </div>
                ` : ''}

                <div class="form-grid" id="wiz-s2-fields">
                    ${sectorCfg.camposCusto.map(field => {
                        const rawVal = w.costs[field.id] ?? '';
                        const prefix = field.tipo === 'currency' ? '<span class="input-prefix">R$</span>' : '';
                        const suffix = field.tipo === 'percent' ? '<span class="input-suffix">%</span>' : '';
                        const padCls = field.tipo === 'currency' ? 'has-prefix' : (field.tipo === 'percent' ? 'has-suffix' : '');
                        return `
                            <div class="form-field">
                                <label class="field-label" for="cost-${field.id}">
                                    <span>${field.label}</span>
                                    <span class="field-req">${field.obrigatorio ? 'Obrigatório' : 'Opcional'}</span>
                                </label>
                                <div class="input-with-prefix">
                                    ${prefix}
                                    <input
                                        id="cost-${field.id}"
                                        class="field-input mono ${padCls}"
                                        type="text"
                                        inputmode="decimal"
                                        data-cost-field="${field.id}"
                                        value="${Formatter.escapeHtml(rawVal)}"
                                        placeholder="${field.placeholder}"
                                    >
                                    ${suffix}
                                </div>
                                ${showHelp ? `<span class="field-help">${field.help}</span>` : ''}
                                <span class="field-error hidden" id="err-cost-${field.id}"></span>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="wizard-footer">
                    <button type="button" class="btn btn-ghost" id="wiz-s2-back">Voltar para identificação</button>
                    <button type="button" class="btn btn-primary" id="wiz-s2-next">Avançar para impostos e margem</button>
                </div>
            </div>
        `;

        // Salva rascunho em tempo real sem apagar ao navegar
        container.querySelectorAll('[data-cost-field]').forEach(inp => {
            inp.addEventListener('input', () => {
                w.costs[inp.dataset.costField] = inp.value;
                inp.classList.remove('has-error');
                const err = document.getElementById(`err-cost-${inp.dataset.costField}`);
                if (err) err.classList.add('hidden');
                DraftStore.save(w);
            });
        });

        document.getElementById('wiz-rateio-helper-btn')?.addEventListener('click', () => {
            UI.openModal(
                'Auxiliar de rateio operacional unitário',
                `
                <p style="font-size:13px;color:var(--color-silver);margin-bottom:16px;">Informe o total de despesas fixas mensais (aluguel, energia, sistemas) e a quantidade média de unidades vendidas no mês para preencher o rateio por unidade sem misturar períodos.</p>
                <div class="form-grid">
                    <div class="form-field">
                        <label class="field-label" for="aux-fixo">Custo fixo mensal (R$)</label>
                        <input id="aux-fixo" class="field-input mono" type="text" inputmode="decimal" placeholder="Ex: 2500,00">
                    </div>
                    <div class="form-field">
                        <label class="field-label" for="aux-vol">Vendas médias no mês (unid.)</label>
                        <input id="aux-vol" class="field-input mono" type="text" inputmode="numeric" placeholder="Ex: 500">
                    </div>
                </div>
                <div id="aux-preview" style="margin-top:16px;font-size:14px;color:var(--color-emerald);" class="mono"></div>
                <div class="wizard-footer">
                    <button type="button" class="btn btn-ghost" id="aux-cancel">Fechar</button>
                    <button type="button" class="btn btn-primary" id="aux-apply">Aplicar ao campo de rateio</button>
                </div>
                `,
                body => {
                    const fixo = body.querySelector('#aux-fixo');
                    const vol = body.querySelector('#aux-vol');
                    const prev = body.querySelector('#aux-preview');
                    let calcUnit = 0;

                    const updateAux = () => {
                        const f = Formatter.parseNumber(fixo.value);
                        const v = Formatter.parseNumber(vol.value);
                        if (Number.isFinite(f) && f >= 0 && Number.isFinite(v) && v > 0) {
                            calcUnit = f / v;
                            prev.textContent = `Rateio unitário calculado: ${Formatter.brl(calcUnit)}`;
                        } else {
                            calcUnit = 0;
                            prev.textContent = '';
                        }
                    };
                    fixo.addEventListener('input', updateAux);
                    vol.addEventListener('input', updateAux);
                    body.querySelector('#aux-cancel').addEventListener('click', () => UI.closeModal());
                    body.querySelector('#aux-apply').addEventListener('click', () => {
                        if (calcUnit <= 0) {
                            UI.toast('Informe custo fixo e volume mensal válidos.', 'warning');
                            return;
                        }
                        const formatted = calcUnit.toFixed(2).replace('.', ',');
                        w.costs.custosOperacionaisRateados = formatted;
                        const targetInput = document.getElementById('cost-custosOperacionaisRateados');
                        if (targetInput) targetInput.value = formatted;
                        DraftStore.save(w);
                        UI.closeModal();
                    });
                }
            );
        });

        document.getElementById('wiz-s2-back').addEventListener('click', () => {
            w.step = 1;
            DraftStore.save(w);
            renderWizard(document.getElementById('main-viewport'));
        });

        document.getElementById('wiz-s2-next').addEventListener('click', () => {
            let valid = true;
            sectorCfg.camposCusto.forEach(field => {
                const raw = w.costs[field.id];
                const parsed = Formatter.parseNumber(raw);
                const errEl = document.getElementById(`err-cost-${field.id}`);
                const inpEl = document.getElementById(`cost-${field.id}`);

                if (field.obrigatorio && (parsed === null || Number.isNaN(parsed))) {
                    errEl.textContent = 'Este campo é obrigatório para estruturar o cálculo.';
                    errEl.classList.remove('hidden');
                    inpEl.classList.add('has-error');
                    valid = false;
                } else if (parsed !== null && Number.isNaN(parsed)) {
                    errEl.textContent = 'Informe um número decimal válido (ex: 12,50).';
                    errEl.classList.remove('hidden');
                    inpEl.classList.add('has-error');
                    valid = false;
                } else if (parsed !== null && parsed < 0) {
                    errEl.textContent = 'O valor não pode ser negativo.';
                    errEl.classList.remove('hidden');
                    inpEl.classList.add('has-error');
                    valid = false;
                } else if (field.id === 'quantidadeLote' && parsed !== null && parsed <= 0) {
                    errEl.textContent = 'A quantidade produzida no lote deve ser maior que zero.';
                    errEl.classList.remove('hidden');
                    inpEl.classList.add('has-error');
                    valid = false;
                } else if (field.id === 'tempoExecucao' && parsed !== null && parsed <= 0) {
                    errEl.textContent = 'O tempo de execução deve ser maior que zero.';
                    errEl.classList.remove('hidden');
                    inpEl.classList.add('has-error');
                    valid = false;
                } else if (field.tipo === 'percent' && parsed !== null && parsed >= 100) {
                    errEl.textContent = 'O percentual deve ser menor que 100%.';
                    errEl.classList.remove('hidden');
                    inpEl.classList.add('has-error');
                    valid = false;
                }
            });

            if (!valid) return;
            w.step = 3;
            DraftStore.save(w);
            renderWizard(document.getElementById('main-viewport'));
        });
    }

    function renderWizardStep3(container) {
        const w = UI.wizard;
        const t = w.taxes;

        const taxFields = [
            {
                id: 'impostosVenda',
                label: 'Impostos incidentes sobre a venda (%)',
                obrigatorio: false,
                placeholder: 'Ex: 6',
                help: 'Percentual de imposto sobre faturamento/nota fiscal conforme seu regime. O ValorizAI não presume alíquota nem presta aconselhamento tributário.'
            },
            {
                id: 'taxaPagamento',
                label: 'Taxas de pagamento / maquininha (%)',
                obrigatorio: false,
                placeholder: 'Ex: 3,5',
                help: 'Tarifa média de cartão de crédito, débito, PIX comercial ou gateway.'
            },
            {
                id: 'comissao',
                label: 'Comissões sobre venda (%)',
                obrigatorio: false,
                placeholder: 'Ex: 0',
                help: 'Comissão paga a vendedores ou parceiros sobre o valor da venda.'
            },
            {
                id: 'taxaMarketplace',
                label: 'Taxas de marketplace / plataforma (%)',
                obrigatorio: false,
                placeholder: 'Ex: 0',
                help: 'Tarifa percentual cobrada por aplicativos de entrega ou marketplaces.'
            },
            {
                id: 'margemDesejada',
                label: 'Margem de lucro desejada sobre o preço de venda (%)',
                obrigatorio: true,
                placeholder: 'Ex: 25',
                help: 'Percentual do preço final de venda que deve restar como lucro após pagar custos, taxas e impostos (diferente de markup sobre custo).'
            }
        ];

        container.innerHTML = `
            <div class="surface-card">
                <div class="card-header">
                    <div>
                        <h2 class="card-title">Etapa 3 — Impostos, taxas variáveis e margem</h2>
                        <p class="card-subtitle">Informe os percentuais que incidem diretamente sobre o preço final de venda.</p>
                    </div>
                </div>

                <div class="form-grid">
                    ${taxFields.map(f => `
                        <div class="form-field ${f.id === 'margemDesejada' ? 'form-field-full' : ''}">
                            <label class="field-label" for="tax-${f.id}">
                                <span>${f.label}</span>
                                <span class="field-req">${f.obrigatorio ? 'Obrigatório' : 'Opcional'}</span>
                            </label>
                            <div class="input-with-prefix">
                                <input id="tax-${f.id}" class="field-input mono has-suffix" type="text" inputmode="decimal" data-tax-field="${f.id}" value="${Formatter.escapeHtml(t[f.id] ?? '')}" placeholder="${f.placeholder}">
                                <span class="input-suffix">%</span>
                            </div>
                            <span class="field-help">${f.help}</span>
                            <span class="field-error hidden" id="err-tax-${f.id}"></span>
                        </div>
                    `).join('')}
                </div>

                <div id="err-tax-total" class="notice-bar warning hidden" style="margin-top:18px;margin-bottom:0;"></div>

                <div class="wizard-footer">
                    <button type="button" class="btn btn-ghost" id="wiz-s3-back">Voltar para custos</button>
                    <button type="button" class="btn btn-primary" id="wiz-s3-next">Avançar para revisão</button>
                </div>
            </div>
        `;

        container.querySelectorAll('[data-tax-field]').forEach(inp => {
            inp.addEventListener('input', () => {
                w.taxes[inp.dataset.taxField] = inp.value;
                inp.classList.remove('has-error');
                document.getElementById(`err-tax-${inp.dataset.taxField}`)?.classList.add('hidden');
                document.getElementById('err-tax-total')?.classList.add('hidden');
                DraftStore.save(w);
            });
        });

        document.getElementById('wiz-s3-back').addEventListener('click', () => {
            w.step = 2;
            DraftStore.save(w);
            renderWizard(document.getElementById('main-viewport'));
        });

        document.getElementById('wiz-s3-next').addEventListener('click', () => {
            let valid = true;
            let sumPct = 0;

            taxFields.forEach(f => {
                const parsed = Formatter.parseNumber(w.taxes[f.id]);
                const errEl = document.getElementById(`err-tax-${f.id}`);
                const inpEl = document.getElementById(`tax-${f.id}`);

                if (f.obrigatorio && (parsed === null || Number.isNaN(parsed))) {
                    errEl.textContent = 'Informe a margem de lucro desejada.';
                    errEl.classList.remove('hidden');
                    inpEl.classList.add('has-error');
                    valid = false;
                } else if (parsed !== null && Number.isNaN(parsed)) {
                    errEl.textContent = 'Informe um percentual numérico válido.';
                    errEl.classList.remove('hidden');
                    inpEl.classList.add('has-error');
                    valid = false;
                } else if (parsed !== null && parsed < 0) {
                    errEl.textContent = 'O percentual não pode ser negativo.';
                    errEl.classList.remove('hidden');
                    inpEl.classList.add('has-error');
                    valid = false;
                } else if (parsed !== null) {
                    sumPct += parsed;
                }
            });

            if (valid && sumPct >= 100) {
                const totalErr = document.getElementById('err-tax-total');
                totalErr.innerHTML = `<div class="notice-bar-text">A soma de impostos, taxas e margem (${Formatter.percent(sumPct)}) precisa ser menor que 100% para que exista um preço viável.</div>`;
                totalErr.classList.remove('hidden');
                valid = false;
            }

            if (!valid) return;
            w.step = 4;
            DraftStore.save(w);
            renderWizard(document.getElementById('main-viewport'));
        });
    }

    function normalizeNumericInputsForCalculation(setor, costsRaw, taxesRaw) {
        const sectorCfg = SETORES[setor];
        const costs = {};
        sectorCfg.camposCusto.forEach(f => {
            const val = Formatter.parseNumber(costsRaw[f.id]);
            costs[f.id] = Number.isFinite(val) ? val : 0;
        });
        const taxes = {
            impostosVenda: Formatter.parseNumber(taxesRaw.impostosVenda) || 0,
            taxaPagamento: Formatter.parseNumber(taxesRaw.taxaPagamento) || 0,
            comissao: Formatter.parseNumber(taxesRaw.comissao) || 0,
            taxaMarketplace: Formatter.parseNumber(taxesRaw.taxaMarketplace) || 0,
            margemDesejada: Formatter.parseNumber(taxesRaw.margemDesejada) || 0
        };
        return { costs, taxes };
    }

    function renderWizardStep4(container) {
        const w = UI.wizard;
        const sectorCfg = SETORES[w.setor] || SETORES.comercio;

        const grouped = new Map();
        sectorCfg.camposCusto.forEach(f => {
            if (!grouped.has(f.categoria)) grouped.set(f.categoria, []);
            grouped.get(f.categoria).push(f);
        });

        container.innerHTML = `
            <div class="surface-card">
                <div class="card-header">
                    <div>
                        <h2 class="card-title">Etapa 4 — Revisão antes de calcular</h2>
                        <p class="card-subtitle">Confira os valores declarados. Campos deixados em branco aparecem como "Não informado".</p>
                    </div>
                </div>

                <div class="grid-2" style="margin-bottom:20px;">
                    <div class="review-summary-card" style="padding:18px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                            <h3 style="font-size:15px;font-weight:600;">Identificação</h3>
                            <button type="button" class="btn btn-ghost btn-sm" data-goto-step="1">Editar</button>
                        </div>
                        <div class="kv-list">
                            <div class="kv-row"><span class="kv-key">Item</span><span class="kv-val">${Formatter.escapeHtml(w.itemNome)}</span></div>
                            <div class="kv-row"><span class="kv-key">Setor</span><span class="kv-val">${sectorCfg.nome}</span></div>
                            <div class="kv-row"><span class="kv-key">Unidade</span><span class="kv-val">${Formatter.escapeHtml(w.unidade)}</span></div>
                            <div class="kv-row"><span class="kv-key">Origem</span><span class="kv-val">${w.sourceType === 'existing' ? 'Item do catálogo' : 'Novo cadastro'}</span></div>
                        </div>
                    </div>

                    <div class="review-summary-card" style="padding:18px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                            <h3 style="font-size:15px;font-weight:600;">Impostos, taxas e margem</h3>
                            <button type="button" class="btn btn-ghost btn-sm" data-goto-step="3">Editar</button>
                        </div>
                        <div class="kv-list">
                            <div class="kv-row"><span class="kv-key">Impostos sobre venda</span><span class="kv-val mono">${w.taxes.impostosVenda ? Formatter.percent(Formatter.parseNumber(w.taxes.impostosVenda)) : 'Não informado'}</span></div>
                            <div class="kv-row"><span class="kv-key">Taxas de pagamento</span><span class="kv-val mono">${w.taxes.taxaPagamento ? Formatter.percent(Formatter.parseNumber(w.taxes.taxaPagamento)) : 'Não informado'}</span></div>
                            <div class="kv-row"><span class="kv-key">Comissões</span><span class="kv-val mono">${w.taxes.comissao ? Formatter.percent(Formatter.parseNumber(w.taxes.comissao)) : 'Não informado'}</span></div>
                            <div class="kv-row"><span class="kv-key">Marketplace</span><span class="kv-val mono">${w.taxes.taxaMarketplace ? Formatter.percent(Formatter.parseNumber(w.taxes.taxaMarketplace)) : 'Não informado'}</span></div>
                            <div class="kv-row"><span class="kv-key">Margem desejada</span><span class="kv-val mono" style="color:var(--color-emerald);">${Formatter.percent(Formatter.parseNumber(w.taxes.margemDesejada))}</span></div>
                        </div>
                    </div>
                </div>

                <div class="review-summary-card" style="padding:18px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                        <h3 style="font-size:15px;font-weight:600;">Custos declarados por categoria</h3>
                        <button type="button" class="btn btn-ghost btn-sm" data-goto-step="2">Editar custos</button>
                    </div>
                    <div class="grid-2">
                        ${Array.from(grouped.entries()).map(([catName, fields]) => `
                            <div>
                                <div style="font-size:12px;font-weight:600;color:var(--color-blue);margin-bottom:8px;">${catName}</div>
                                <div class="kv-list">
                                    ${fields.map(f => {
                                        const raw = w.costs[f.id];
                                        const parsed = Formatter.parseNumber(raw);
                                        let formatted = 'Não informado';
                                        if (parsed !== null && Number.isFinite(parsed)) {
                                            if (f.tipo === 'currency') formatted = Formatter.brl(parsed);
                                            else if (f.tipo === 'percent') formatted = Formatter.percent(parsed);
                                            else formatted = String(parsed);
                                        }
                                        return `<div class="kv-row"><span class="kv-key">${f.label}</span><span class="kv-val mono">${formatted}</span></div>`;
                                    }).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="wizard-footer">
                    <button type="button" class="btn btn-ghost" id="wiz-s4-back">Voltar</button>
                    <button type="button" class="btn btn-primary" id="wiz-s4-calc">Calcular recomendação de preço</button>
                </div>
            </div>
        `;

        container.querySelectorAll('[data-goto-step]').forEach(btn => {
            btn.addEventListener('click', () => {
                w.step = Number(btn.dataset.gotoStep);
                DraftStore.save(w);
                renderWizard(document.getElementById('main-viewport'));
            });
        });

        document.getElementById('wiz-s4-back').addEventListener('click', () => {
            w.step = 3;
            DraftStore.save(w);
            renderWizard(document.getElementById('main-viewport'));
        });

        document.getElementById('wiz-s4-calc').addEventListener('click', async () => {
            const btn = document.getElementById('wiz-s4-calc');
            btn.disabled = true;
            btn.textContent = 'Processando...';

            const { costs, taxes } = normalizeNumericInputsForCalculation(w.setor, w.costs, w.taxes);
            const result = await ApiService.calcularPreviaPrecificacao({
                setor: w.setor,
                costs,
                taxes
            });

            w.previewResult = { ...result, costsNormalized: costs, taxesNormalized: taxes };
            w.step = 5;
            DraftStore.save(w);
            renderWizard(document.getElementById('main-viewport'));
        });
    }

    function renderWizardStep5(container) {
        const w = UI.wizard;
        const r = w.previewResult;
        if (!r) {
            w.step = 4;
            renderWizard(document.getElementById('main-viewport'));
            return;
        }

        const businessTarget = WorkspaceStore.state.business.margemMeta;
        const targetMargin = businessTarget === null || businessTarget === '' || businessTarget === undefined ? null : Number(businessTarget);
        const taxAlertThreshold = WorkspaceStore.state.settings.alertaCargaTributaria;
        const hasTaxThreshold = taxAlertThreshold !== null && taxAlertThreshold !== '' && Number.isFinite(Number(taxAlertThreshold));
        const healthyMargin = targetMargin !== null && r.margemPlanejada >= targetMargin;

        const warnings = [];
        if (targetMargin !== null && r.margemPlanejada < targetMargin) {
            warnings.push(`Margem planejada (${Formatter.percent(r.margemPlanejada)}) está abaixo da meta configurada (${Formatter.percent(targetMargin, 0)}).`);
        }
        if (hasTaxThreshold && r.percentualImpostosTaxas >= Number(taxAlertThreshold)) {
            warnings.push(`Carga de impostos e taxas sobre o preço (${Formatter.percent(r.percentualImpostosTaxas)}) está elevada.`);
        }
        if (r.markup > 0 && r.markup < 1.3) {
            warnings.push(`Multiplicador markup (${r.markup.toFixed(2)}x) oferece folga reduzida para absorver oscilações de custo.`);
        }

        const total = Math.max(r.precoSugerido, 0.01);
        const pctCusto = (r.custoTotal / total) * 100;
        const pctImposto = (r.valorImpostos / total) * 100;
        const pctTaxas = (r.valorTaxasComissoes / total) * 100;
        const pctLucro = (r.lucroEstimado / total) * 100;

        container.innerHTML = `
            <div class="notice-bar">
                <div>
                    <div class="notice-bar-text"><strong>Prévia de recomendação calculada</strong> com base nas informações declaradas (aguardando integração do motor oficial no backend).</div>
                    <div class="notice-bar-sub">A margem exibida considera o percentual sobre o preço de venda sugerido, e não sobre o custo.</div>
                </div>
            </div>

            <div class="grid-2" style="margin-bottom:20px;">
                <section class="surface-card pricing-result-metrics">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px;">
                        <div>
                            <div class="kpi-label">Preço de venda sugerido · ${Formatter.escapeHtml(w.unidade)}</div>
                            <div class="mono" style="font-size:34px;font-weight:700;color:var(--color-emerald);line-height:1.15;margin-top:4px;">${Formatter.brl(r.precoSugerido)}</div>
                            <div style="font-size:13px;color:var(--color-silver);margin-top:6px;">Item: <strong style="color:var(--color-cloud);">${Formatter.escapeHtml(w.itemNome)}</strong> · ${SETORES[w.setor]?.nome}</div>
                        </div>
                        <div class="nilo-avatar-box-sm">
                            <img src="${healthyMargin ? NILO_ASSETS.comemorando : NILO_ASSETS.recomendacao}" alt="Nilo resultado da precificação" class="nilo-figure nilo-enter">
                        </div>
                    </div>

                    <div class="grid-2" style="gap:12px;">
                        <div class="pricing-result-metric-card" style="padding:14px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                            <div class="kpi-label">Custo total unitário</div>
                            <div class="kpi-value" style="font-size:20px;margin-top:4px;">${Formatter.brl(r.custoTotal)}</div>
                        </div>
                        <div class="pricing-result-metric-card" style="padding:14px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                            <div class="kpi-label">Multiplicador (Markup)</div>
                            <div class="kpi-value" style="font-size:20px;color:var(--color-blue);margin-top:4px;">${r.markup.toFixed(2)}x</div>
                        </div>
                        <div class="pricing-result-metric-card" style="padding:14px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                            <div class="kpi-label">Impostos e taxas (${Formatter.percent(r.percentualImpostosTaxas)})</div>
                            <div class="kpi-value warning" style="font-size:20px;margin-top:4px;">${Formatter.brl(r.valorImpostosTaxas)}</div>
                        </div>
                        <div class="pricing-result-metric-card" style="padding:14px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                            <div class="kpi-label">Lucro estimado / unidade (${Formatter.percent(r.margemPlanejada)})</div>
                            <div class="kpi-value positive" style="font-size:20px;margin-top:4px;">${Formatter.brl(r.lucroEstimado)}</div>
                        </div>
                    </div>
                </section>

                <section class="surface-card">
                    <h3 class="card-title" style="margin-bottom:6px;">Composição de cada real do preço</h3>
                    <p class="card-subtitle" style="margin-bottom:18px;">Visualização proporcional entre custos operacionais, impostos, taxas de venda e lucro planejado.</p>

                    <div class="composition-bar" role="img" aria-label="Composição percentual do preço sugerido">
                        <div class="composition-seg" style="width:${pctCusto}%;background:#3986D8;" title="Custos: ${Formatter.percent(pctCusto)}"></div>
                        <div class="composition-seg" style="width:${pctImposto}%;background:#EF4444;" title="Impostos: ${Formatter.percent(pctImposto)}"></div>
                        <div class="composition-seg" style="width:${pctTaxas}%;background:#F59E0B;" title="Taxas e comissões: ${Formatter.percent(pctTaxas)}"></div>
                        <div class="composition-seg" style="width:${pctLucro}%;background:#55D6A0;" title="Lucro estimado: ${Formatter.percent(pctLucro)}"></div>
                    </div>

                    <div class="composition-legend">
                        <div class="legend-item">
                            <span class="legend-label"><span class="legend-swatch" style="background:#3986D8"></span> Custo unitário</span>
                            <span class="mono" style="font-size:12px;">${Formatter.brl(r.custoTotal)} (${Formatter.percent(pctCusto)})</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-label"><span class="legend-swatch" style="background:#EF4444"></span> Impostos</span>
                            <span class="mono" style="font-size:12px;">${Formatter.brl(r.valorImpostos)} (${Formatter.percent(pctImposto)})</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-label"><span class="legend-swatch" style="background:#F59E0B"></span> Taxas e comissões</span>
                            <span class="mono" style="font-size:12px;">${Formatter.brl(r.valorTaxasComissoes)} (${Formatter.percent(pctTaxas)})</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-label"><span class="legend-swatch" style="background:#55D6A0"></span> Lucro estimado</span>
                            <span class="mono" style="font-size:12px;">${Formatter.brl(r.lucroEstimado)} (${Formatter.percent(pctLucro)})</span>
                        </div>
                    </div>

                    ${warnings.length ? `
                        <div style="margin-top:18px;padding-top:14px;border-top:var(--border-hairline);">
                            <div style="font-size:12px;font-weight:600;color:var(--color-warning);margin-bottom:6px;">Indicadores de atenção</div>
                            <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--color-silver);display:flex;flex-direction:column;gap:4px;">
                                ${warnings.map(msg => `<li>${Formatter.escapeHtml(msg)}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </section>
            </div>

            <div class="surface-card">
                <div class="wizard-footer" style="margin-top:0;padding-top:0;border-top:0;">
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button type="button" class="btn btn-ghost" id="wiz-s5-back">Ajustar valores</button>
                        <button type="button" class="btn btn-secondary" id="wiz-s5-new">Nova simulação</button>
                        <button type="button" class="btn btn-secondary" id="wiz-s5-ai">Consultar Nilo IA sobre este preço</button>
                    </div>
                    <button type="button" class="btn btn-primary" id="wiz-s5-save">Salvar no catálogo e histórico</button>
                </div>
            </div>
        `;

        document.getElementById('wiz-s5-back').addEventListener('click', () => {
            w.step = 4;
            DraftStore.save(w);
            renderWizard(document.getElementById('main-viewport'));
        });

        document.getElementById('wiz-s5-new').addEventListener('click', () => {
            UI.wizard = defaultWizardDraft();
            DraftStore.clear();
            renderWizard(document.getElementById('main-viewport'));
        });

        document.getElementById('wiz-s5-ai').addEventListener('click', () => {
            UI.navigate('consultor', { consultorContextId: 'wizard_preview' });
        });

        document.getElementById('wiz-s5-save').addEventListener('click', () => {
            const savedPricing = persistPricingToWorkspace({
                catalogItemId: w.catalogItemId,
                itemNome: w.itemNome,
                setor: w.setor,
                unidade: w.unidade,
                descricao: w.descricao,
                result: r
            });
            DraftStore.clear();
            UI.wizard = defaultWizardDraft();
            UI.updateChrome();
            UI.toast(`Precificação v${savedPricing.versao} salva no catálogo e no histórico.`, 'success');
            UI.navigate('historico');
        });
    }

    function persistPricingToWorkspace({ catalogItemId, itemNome, setor, unidade, descricao, result }) {
        let item = catalogItemId
            ? WorkspaceStore.state.catalog.find(c => c.id === catalogItemId)
            : null;

        if (!item) {
            item = {
                id: Formatter.uid('item'),
                nome: itemNome,
                descricao: descricao || '',
                categoria: 'Geral',
                tipo: SETORES[setor]?.itemTipoPadrao || 'Item',
                setor,
                unidade: unidade || SETORES[setor]?.unidadePadrao || 'Unidade',
                status: 'Ativo',
                criadoEm: new Date().toISOString()
            };
            WorkspaceStore.state.catalog.unshift(item);
        }

        const existingVersions = WorkspaceStore.state.pricings.filter(p => p.catalogItemId === item.id);
        const nextVersion = existingVersions.length ? Math.max(...existingVersions.map(p => p.versao)) + 1 : 1;

        const record = {
            id: Formatter.uid('prec'),
            catalogItemId: item.id,
            itemNome: item.nome,
            versao: nextVersion,
            setor,
            unidade: item.unidade,
            criadoEm: new Date().toISOString(),
            custoTotal: result.custoTotal,
            precoSugerido: result.precoSugerido,
            markup: result.markup,
            margemPlanejada: result.margemPlanejada,
            percentualImpostosTaxas: result.percentualImpostosTaxas,
            valorImpostosTaxas: result.valorImpostosTaxas,
            lucroEstimado: result.lucroEstimado,
            fonteCalculo: result.fonteCalculo,
            categoriasCusto: result.categoriasCusto,
            detalhesCustos: result.costsNormalized,
            taxas: result.taxesNormalized
        };

        WorkspaceStore.state.pricings.unshift(record);
        WorkspaceStore.save();
        return record;
    }

    // --- 8.5 SIMULAÇÃO RÁPIDA ---
    function renderQuickSim(root) {
        const defaultSetor = WorkspaceStore.state.business.segmento || 'comercio';
        if (!UI.quickSimState) {
            UI.quickSimState = {
                nome: '',
                setor: defaultSetor,
                costs: {},
                taxasTotais: '',
                margemDesejada: ''
            };
        }
        const sim = UI.quickSimState;
        const sectorCfg = SETORES[sim.setor];

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Simulação rápida</h1>
                    <p class="page-subtitle">Teste cenários de preço instantaneamente sem poluir seu histórico. Registros só são salvos se você decidir adicionar ao catálogo.</p>
                </div>
            </div>

            <div class="notice-bar">
                <div class="notice-bar-text"><strong>Simulação temporária:</strong> Nenhum resultado desta tela entra automaticamente no histórico ou nas análises.</div>
            </div>

            <div class="grid-2">
                <section class="surface-card">
                    <h2 class="card-title" style="margin-bottom:14px;">Parâmetros da hipótese</h2>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label" for="sim-nome">Nome do teste <span class="field-req">Opcional</span></label>
                            <input id="sim-nome" class="field-input" type="text" value="${Formatter.escapeHtml(sim.nome)}" placeholder="Ex: Teste kit promocional">
                        </div>
                        <div class="form-field">
                            <label class="field-label" for="sim-setor">Setor</label>
                            <select id="sim-setor" class="field-select">
                                <option value="comercio" ${sim.setor === 'comercio' ? 'selected' : ''}>Comércio</option>
                                <option value="industria" ${sim.setor === 'industria' ? 'selected' : ''}>Indústria</option>
                                <option value="servico" ${sim.setor === 'servico' ? 'selected' : ''}>Serviços</option>
                            </select>
                        </div>

                        ${sectorCfg.camposCusto.slice(0, 4).map(f => `
                            <div class="form-field">
                                <label class="field-label" for="sim-cost-${f.id}">${f.label}</label>
                                <input id="sim-cost-${f.id}" class="field-input mono" type="text" inputmode="decimal" data-sim-cost="${f.id}" value="${Formatter.escapeHtml(sim.costs[f.id] ?? '')}" placeholder="${f.placeholder}">
                            </div>
                        `).join('')}

                        <div class="form-field">
                            <label class="field-label" for="sim-taxas">Impostos e taxas totais (%)</label>
                            <input id="sim-taxas" class="field-input mono" type="text" inputmode="decimal" value="${Formatter.escapeHtml(sim.taxasTotais)}" placeholder="Ex: 10">
                        </div>
                        <div class="form-field">
                            <label class="field-label" for="sim-margem">Margem desejada (%)</label>
                            <input id="sim-margem" class="field-input mono" type="text" inputmode="decimal" value="${Formatter.escapeHtml(sim.margemDesejada)}" placeholder="Ex: 25">
                        </div>
                    </div>

                    <div class="wizard-footer">
                        <button type="button" class="btn btn-ghost" id="sim-clear-btn">Limpar campos</button>
                        <button type="button" class="btn btn-primary" id="sim-run-btn">Simular preço</button>
                    </div>
                </section>

                <section class="surface-card" id="sim-result-panel"></section>
            </div>
        `;

        function renderSimResult() {
            const panel = document.getElementById('sim-result-panel');
            const res = UI.simulacaoResult;
            if (!res) {
                panel.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-nilo">
                            <img src="${NILO_ASSETS.analisando}" alt="Nilo aguardando simulação" class="nilo-figure nilo-float">
                        </div>
                        <h3 class="empty-state-title">Pronto para simular</h3>
                        <p class="empty-state-desc">Preencha os custos, as taxas totais e a margem desejada ao lado para visualizar o preço sugerido sem gravar no histórico.</p>
                    </div>
                `;
                return;
            }

            panel.innerHTML = `
                <div class="simulation-result-content" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px;">
                    <div>
                        <div class="kpi-label">Resultado temporário da simulação</div>
                        <div class="mono" style="font-size:32px;font-weight:700;color:var(--color-emerald);margin-top:4px;">${Formatter.brl(res.precoSugerido)}</div>
                        <div style="font-size:12px;color:var(--color-silver);margin-top:4px;">Não salvo no catálogo nem no histórico</div>
                    </div>
                    <div class="nilo-avatar-box-sm">
                        <img src="${NILO_ASSETS.recomendacao}" alt="Nilo recomendando" class="nilo-figure nilo-enter">
                    </div>
                </div>

                <div class="kv-list" style="margin-bottom:20px;">
                    <div class="kv-row"><span class="kv-key">Custo total considerado</span><span class="kv-val mono">${Formatter.brl(res.custoTotal)}</span></div>
                    <div class="kv-row"><span class="kv-key">Multiplicador (Markup)</span><span class="kv-val mono">${res.markup.toFixed(2)}x</span></div>
                    <div class="kv-row"><span class="kv-key">Impostos e taxas (${Formatter.percent(res.percentualImpostosTaxas)})</span><span class="kv-val mono" style="color:var(--color-warning);">${Formatter.brl(res.valorImpostosTaxas)}</span></div>
                    <div class="kv-row"><span class="kv-key">Lucro estimado (${Formatter.percent(res.margemPlanejada)})</span><span class="kv-val mono" style="color:var(--color-emerald);">${Formatter.brl(res.lucroEstimado)}</span></div>
                </div>

                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button type="button" class="btn btn-primary" id="sim-promote-btn">Adicionar ao catálogo e salvar no histórico</button>
                    <button type="button" class="btn btn-secondary" id="sim-ai-btn">Analisar simulação com Consultor IA</button>
                </div>
            `;

            document.getElementById('sim-promote-btn').addEventListener('click', () => {
                const nomeFinal = sim.nome.trim() || `Item simulado (${SETORES[sim.setor].nome})`;
                const saved = persistPricingToWorkspace({
                    catalogItemId: '',
                    itemNome: nomeFinal,
                    setor: sim.setor,
                    unidade: SETORES[sim.setor].unidadePadrao,
                    descricao: 'Originado de simulação rápida.',
                    result: res
                });
                UI.updateChrome();
                UI.toast(`"${saved.itemNome}" adicionado ao catálogo e salvo no histórico.`, 'success');
                UI.navigate('historico');
            });

            document.getElementById('sim-ai-btn').addEventListener('click', () => {
                UI.navigate('consultor', { consultorContextId: 'quick_sim' });
            });
        }

        renderSimResult();

        document.getElementById('sim-nome').addEventListener('input', e => { sim.nome = e.target.value; });
        document.getElementById('sim-setor').addEventListener('change', e => {
            sim.setor = e.target.value;
            sim.costs = {};
            UI.simulacaoResult = null;
            renderQuickSim(root);
        });
        root.querySelectorAll('[data-sim-cost]').forEach(inp => {
            inp.addEventListener('input', () => { sim.costs[inp.dataset.simCost] = inp.value; });
        });
        document.getElementById('sim-taxas').addEventListener('input', e => { sim.taxasTotais = e.target.value; });
        document.getElementById('sim-margem').addEventListener('input', e => { sim.margemDesejada = e.target.value; });

        document.getElementById('sim-clear-btn').addEventListener('click', () => {
            UI.quickSimState = { nome: '', setor: sim.setor, costs: {}, taxasTotais: '', margemDesejada: '' };
            UI.simulacaoResult = null;
            renderQuickSim(root);
        });

        document.getElementById('sim-run-btn').addEventListener('click', async () => {
            const taxasVal = Formatter.parseNumber(sim.taxasTotais) || 0;
            const margemVal = Formatter.parseNumber(sim.margemDesejada) || 0;
            if (taxasVal < 0 || margemVal < 0) {
                UI.toast('Taxas e margem não podem ser negativas.', 'error');
                return;
            }
            if (taxasVal + margemVal >= 100) {
                UI.toast('A soma de taxas e margem deve ser menor que 100%.', 'error');
                return;
            }
            const { costs } = normalizeNumericInputsForCalculation(sim.setor, sim.costs, {});
            if (sim.setor === 'industria' && (!costs.quantidadeLote || costs.quantidadeLote <= 0)) {
                costs.quantidadeLote = 1;
            }
            const taxes = {
                impostosVenda: taxasVal,
                taxaPagamento: 0,
                comissao: 0,
                taxaMarketplace: 0,
                margemDesejada: margemVal
            };
            const res = await ApiService.calcularPreviaPrecificacao({ setor: sim.setor, costs, taxes });
            UI.simulacaoResult = { ...res, costsNormalized: costs, taxesNormalized: taxes };
            renderSimResult();
        });
    }

    // --- 8.6 HISTÓRICO ---
    function renderHistory(root) {
        const { pricings } = WorkspaceStore.state;
        const { search, sector, sort } = UI.historyFilter;

        let filtered = pricings.filter(p => {
            if (sector !== 'all' && p.setor !== sector) return false;
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                if (!p.itemNome.toLowerCase().includes(q)) return false;
            }
            return true;
        });

        filtered = [...filtered].sort((a, b) => {
            if (sort === 'oldest') return new Date(a.criadoEm) - new Date(b.criadoEm);
            if (sort === 'price_desc') return b.precoSugerido - a.precoSugerido;
            if (sort === 'margin_asc') return a.margemPlanejada - b.margemPlanejada;
            return new Date(b.criadoEm) - new Date(a.criadoEm);
        });

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Histórico de precificações</h1>
                    <p class="page-subtitle">Registros efetivamente salvos. Versões anteriores são preservadas para consulta e comparação.</p>
                </div>
                <div class="page-header-actions">
                    <button type="button" class="btn btn-primary" id="hist-new-btn">Nova precificação</button>
                </div>
            </div>

            <div class="surface-card">
                <div class="toolbar">
                    <div class="toolbar-group" style="flex:1;">
                        <input type="search" id="hist-search" class="field-input" style="max-width:300px;" value="${Formatter.escapeHtml(search)}" placeholder="Pesquisar por produto ou serviço...">
                        <select id="hist-sector" class="field-select" style="width:auto;min-width:150px;">
                            <option value="all" ${sector === 'all' ? 'selected' : ''}>Todos os setores</option>
                            <option value="comercio" ${sector === 'comercio' ? 'selected' : ''}>Comércio</option>
                            <option value="industria" ${sector === 'industria' ? 'selected' : ''}>Indústria</option>
                            <option value="servico" ${sector === 'servico' ? 'selected' : ''}>Serviços</option>
                        </select>
                        <select id="hist-sort" class="field-select" style="width:auto;min-width:170px;">
                            <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Mais recentes</option>
                            <option value="oldest" ${sort === 'oldest' ? 'selected' : ''}>Mais antigos</option>
                            <option value="price_desc" ${sort === 'price_desc' ? 'selected' : ''}>Maior preço sugerido</option>
                            <option value="margin_asc" ${sort === 'margin_asc' ? 'selected' : ''}>Menor margem planejada</option>
                        </select>
                    </div>
                </div>

                <div id="hist-table-region"></div>
            </div>
        `;

        const region = document.getElementById('hist-table-region');
        if (pricings.length === 0) {
            region.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-nilo">
                        <img src="${NILO_ASSETS.boasVindas}" alt="Nilo" class="nilo-figure nilo-float">
                    </div>
                    <h2 class="empty-state-title">Nenhuma precificação salva no histórico</h2>
                    <p class="empty-state-desc">Conclua o assistente de precificação e salve o resultado para acompanhar a evolução dos preços aqui. Simulações rápidas não são gravadas automaticamente.</p>
                    <div class="empty-state-actions">
                        <button type="button" class="btn btn-primary" id="hist-empty-start">Iniciar precificação</button>
                    </div>
                </div>
            `;
            document.getElementById('hist-empty-start')?.addEventListener('click', () => UI.navigate('precificacao'));
        } else if (filtered.length === 0) {
            region.innerHTML = `<div class="empty-state"><h2 class="empty-state-title">Nenhum registro encontrado</h2><p class="empty-state-desc">Altere os filtros aplicados acima.</p></div>`;
        } else {
            const businessTarget = WorkspaceStore.state.business.margemMeta;
            const target = businessTarget === null || businessTarget === '' || businessTarget === undefined ? null : Number(businessTarget);
            region.innerHTML = `
                <div class="table-wrap">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Item relacionado</th>
                                <th>Versão</th>
                                <th>Data</th>
                                <th>Setor</th>
                                <th class="num">Custo total</th>
                                <th class="num">Preço sugerido</th>
                                <th class="num">Markup</th>
                                <th class="num">Margem planejada</th>
                                <th style="text-align:right;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.map(p => `
                                <tr>
                                    <td style="font-weight:600;">${Formatter.escapeHtml(p.itemNome)}</td>
                                    <td class="mono">v${p.versao}</td>
                                    <td>${Formatter.dateShort(p.criadoEm)}</td>
                                    <td>${SETORES[p.setor]?.nome || p.setor}</td>
                                    <td class="num">${Formatter.brl(p.custoTotal)}</td>
                                    <td class="num" style="color:var(--color-emerald);font-weight:600;">${Formatter.brl(p.precoSugerido)}</td>
                                    <td class="num">${p.markup.toFixed(2)}x</td>
                                    <td class="num" style="${target === null ? '' : `color:${p.margemPlanejada < target ? 'var(--color-warning)' : 'var(--color-emerald)'};`}">${Formatter.percent(p.margemPlanejada)}</td>
                                    <td style="text-align:right;white-space:nowrap;">
                                        <div style="display:inline-flex;gap:6px;">
                                            <button type="button" class="btn btn-ghost btn-sm" data-hist-detail="${p.id}">Detalhes</button>
                                            <button type="button" class="btn btn-secondary btn-sm" data-hist-ai="${p.id}">Consultor IA</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            region.querySelectorAll('[data-hist-detail]').forEach(b => {
                b.addEventListener('click', () => openPricingDetailModal(b.dataset.histDetail));
            });
            region.querySelectorAll('[data-hist-ai]').forEach(b => {
                b.addEventListener('click', () => UI.navigate('consultor', { consultorContextId: b.dataset.histAi }));
            });
        }

        document.getElementById('hist-new-btn').addEventListener('click', () => UI.navigate('precificacao'));
        document.getElementById('hist-search').addEventListener('input', e => {
            UI.historyFilter.search = e.target.value;
            renderHistory(root);
        });
        document.getElementById('hist-sector').addEventListener('change', e => {
            UI.historyFilter.sector = e.target.value;
            renderHistory(root);
        });
        document.getElementById('hist-sort').addEventListener('change', e => {
            UI.historyFilter.sort = e.target.value;
            renderHistory(root);
        });
    }

    function openPricingDetailModal(pricingId) {
        const p = WorkspaceStore.state.pricings.find(x => x.id === pricingId);
        if (!p) return;
        const sectorCfg = SETORES[p.setor];

        UI.openModal(
            `${p.itemNome} — Versão ${p.versao}`,
            `
            <div class="kv-list" style="margin-bottom:18px;">
                <div class="kv-row"><span class="kv-key">Data do registro</span><span class="kv-val">${Formatter.dateTime(p.criadoEm)}</span></div>
                <div class="kv-row"><span class="kv-key">Setor · Unidade</span><span class="kv-val">${sectorCfg?.nome || p.setor} · ${Formatter.escapeHtml(p.unidade)}</span></div>
                <div class="kv-row"><span class="kv-key">Custo total unitário</span><span class="kv-val mono">${Formatter.brl(p.custoTotal)}</span></div>
                <div class="kv-row"><span class="kv-key">Preço sugerido</span><span class="kv-val mono" style="color:var(--color-emerald);">${Formatter.brl(p.precoSugerido)}</span></div>
                <div class="kv-row"><span class="kv-key">Markup · Margem planejada</span><span class="kv-val mono">${p.markup.toFixed(2)}x · ${Formatter.percent(p.margemPlanejada)}</span></div>
                <div class="kv-row"><span class="kv-key">Impostos e taxas (${Formatter.percent(p.percentualImpostosTaxas)})</span><span class="kv-val mono">${Formatter.brl(p.valorImpostosTaxas)}</span></div>
                <div class="kv-row"><span class="kv-key">Lucro estimado / unidade</span><span class="kv-val mono">${Formatter.brl(p.lucroEstimado)}</span></div>
            </div>

            <h3 style="font-size:14px;font-weight:600;margin-bottom:10px;">Composição dos custos</h3>
            <div id="modal-hist-cost-chart" style="margin-bottom:18px;"></div>

            <div class="wizard-footer">
                <button type="button" class="btn btn-ghost" id="hist-modal-close">Fechar</button>
                <button type="button" class="btn btn-primary" id="hist-modal-reprice">Criar nova versão</button>
            </div>
            `,
            body => {
                ChartRenderer.renderCostDistributionChart(body.querySelector('#modal-hist-cost-chart'), p.categoriasCusto, p.custoTotal);
                body.querySelector('#hist-modal-close').addEventListener('click', () => UI.closeModal());
                body.querySelector('#hist-modal-reprice').addEventListener('click', () => {
                    UI.closeModal();
                    startWizardForCatalogItem(p.catalogItemId);
                });
            }
        );
    }

    // --- 8.7 ANÁLISES ---
    function renderAnalyses(root) {
        const { pricings, catalog, business } = WorkspaceStore.state;
        const target = business.margemMeta === null || business.margemMeta === '' || business.margemMeta === undefined ? null : Number(business.margemMeta);

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Custos e rentabilidade</h1>
                    <p class="page-subtitle">Comparativos derivados exclusivamente dos custos e precificações salvos (sem estimativas fictícias de faturamento ou vendas realizadas).</p>
                </div>
            </div>
            <div id="analises-body"></div>
        `;

        const body = document.getElementById('analises-body');
        if (pricings.length === 0) {
            body.innerHTML = `
                <div class="surface-card empty-state">
                    <div class="empty-state-nilo">
                        <img src="${NILO_ASSETS.analisando}" alt="Nilo" class="nilo-figure nilo-float">
                    </div>
                    <h2 class="empty-state-title">Sem dados suficientes para análise</h2>
                    <p class="empty-state-desc">Registre ao menos uma precificação no histórico para destravar comparativos de composição de custos, evolução entre versões e margens planejadas.</p>
                    <div class="empty-state-actions">
                        <button type="button" class="btn btn-primary" id="ana-start-btn">Ir para Precificação</button>
                    </div>
                </div>
            `;
            document.getElementById('ana-start-btn').addEventListener('click', () => UI.navigate('precificacao'));
            return;
        }

        const itemsWithPricing = catalog.filter(c => pricings.some(p => p.catalogItemId === c.id));
        const selectedId = UI.analysisSelectedItemId;
        const filteredPricings = selectedId === 'all'
            ? pricings
            : pricings.filter(p => p.catalogItemId === selectedId);

        const ordered = [...filteredPricings].sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
        const latestFocus = ordered[ordered.length - 1];

        body.innerHTML = `
            <div class="surface-card" style="margin-bottom:20px;">
                <div class="toolbar" style="margin-bottom:0;">
                    <div class="toolbar-group">
                        <label for="ana-item-select" style="font-size:13px;font-weight:500;color:var(--color-silver);">Escopo da análise:</label>
                        <select id="ana-item-select" class="field-select" style="width:auto;min-width:240px;">
                            <option value="all" ${selectedId === 'all' ? 'selected' : ''}>Todos os itens precificados (${pricings.length} registros)</option>
                            ${itemsWithPricing.map(item => `<option value="${item.id}" ${selectedId === item.id ? 'selected' : ''}>${Formatter.escapeHtml(item.nome)}</option>`).join('')}
                        </select>
                    </div>
                    <span style="font-size:12px;color:var(--color-silver);">Exibindo métricas planejadas de custo, preço e margem</span>
                </div>
            </div>

            <div class="grid-2" style="margin-bottom:20px;">
                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">Evolução de preços e custos</h2>
                            <p class="card-subtitle">Comparativo cronológico entre custo unitário e preço sugerido.</p>
                        </div>
                    </div>
                    <div id="ana-chart-evo"></div>
                </section>

                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">Composição de custos por categoria</h2>
                            <p class="card-subtitle">Referência: ${Formatter.escapeHtml(latestFocus.itemNome)} (v${latestFocus.versao})</p>
                        </div>
                    </div>
                    <div id="ana-chart-comp"></div>
                </section>
            </div>

            <div class="grid-2">
                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">${target === null ? 'Margens planejadas' : 'Margens planejadas vs. meta'}</h2>
                            <p class="card-subtitle">${target === null ? 'Acompanhe as margens registradas. Defina uma meta em Meu negócio para ativar a comparação.' : `Meta definida pela empresa: ${Formatter.percent(target, 0)} sobre o preço de venda.`}</p>
                        </div>
                    </div>
                    <div id="ana-chart-margin"></div>
                </section>

                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">Comparação entre versões e preços</h2>
                            <p class="card-subtitle">Resumo tabular dos registros selecionados.</p>
                        </div>
                    </div>
                    <div class="table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Item / Versão</th>
                                    <th class="num">Custo</th>
                                    <th class="num">Preço</th>
                                    <th class="num">Markup</th>
                                    <th class="num">Margem</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${[...ordered].reverse().slice(0, 8).map(p => `
                                    <tr>
                                        <td>${Formatter.escapeHtml(p.itemNome)} <span class="mono" style="color:var(--color-silver);">v${p.versao}</span></td>
                                        <td class="num">${Formatter.brl(p.custoTotal)}</td>
                                        <td class="num" style="color:var(--color-emerald);">${Formatter.brl(p.precoSugerido)}</td>
                                        <td class="num">${p.markup.toFixed(2)}x</td>
                                        <td class="num">${Formatter.percent(p.margemPlanejada)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        `;

        document.getElementById('ana-item-select').addEventListener('change', e => {
            UI.analysisSelectedItemId = e.target.value;
            renderAnalyses(root);
        });

        ChartRenderer.renderPriceEvolutionChart(document.getElementById('ana-chart-evo'), ordered);
        ChartRenderer.renderCostDistributionChart(document.getElementById('ana-chart-comp'), latestFocus.categoriasCusto, latestFocus.custoTotal);
        ChartRenderer.renderPlannedMarginChart(document.getElementById('ana-chart-margin'), ordered, target);
    }

    // --- 8.8 CONSULTOR IA (INTEGRADO COM POST /perguntar) ---
    function buildConsultorPayloadContext(contextId) {
        if (contextId === 'wizard_preview' && UI.wizard.previewResult) {
            const w = UI.wizard;
            const r = w.previewResult;
            return {
                label: `${w.itemNome} (Prévia atual do assistente)`,
                setor: w.setor,
                resumoFinanceiro: {
                    precoSugerido: Formatter.brl(r.precoSugerido),
                    totalCustos: Formatter.brl(r.custoTotal),
                    markup: `${r.markup.toFixed(2)}x`,
                    taxaPercentual: `${r.percentualImpostosTaxas}%`,
                    margemPercentual: `${r.margemPlanejada}%`
                },
                detalhesCustos: r.costsNormalized || {}
            };
        }

        if (contextId === 'quick_sim' && UI.simulacaoResult) {
            const sim = UI.quickSimState;
            const r = UI.simulacaoResult;
            return {
                label: `${sim.nome || 'Simulação rápida'} (Temporária)`,
                setor: sim.setor,
                resumoFinanceiro: {
                    precoSugerido: Formatter.brl(r.precoSugerido),
                    totalCustos: Formatter.brl(r.custoTotal),
                    markup: `${r.markup.toFixed(2)}x`,
                    taxaPercentual: `${r.percentualImpostosTaxas}%`,
                    margemPercentual: `${r.margemPlanejada}%`
                },
                detalhesCustos: r.costsNormalized || {}
            };
        }

        const pricings = WorkspaceStore.state.pricings;
        let record = null;
        if (contextId === 'latest' && pricings.length) {
            record = [...pricings].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))[0];
        } else if (contextId !== 'none') {
            record = pricings.find(p => p.id === contextId) || null;
        }

        if (record) {
            return {
                label: `${record.itemNome} (v${record.versao})`,
                setor: record.setor,
                resumoFinanceiro: {
                    precoSugerido: Formatter.brl(record.precoSugerido),
                    totalCustos: Formatter.brl(record.custoTotal),
                    markup: `${record.markup.toFixed(2)}x`,
                    taxaPercentual: `${record.percentualImpostosTaxas}%`,
                    margemPercentual: `${record.margemPlanejada}%`
                },
                detalhesCustos: record.detalhesCustos || {}
            };
        }

        const fallbackSetor = WorkspaceStore.state.business.segmento || null;
        return {
            label: 'Consulta geral sem dados financeiros',
            setor: fallbackSetor,
            resumoFinanceiro: null,
            detalhesCustos: null
        };
    }

    function renderConsultor(root) {
        const pricings = WorkspaceStore.state.pricings;
        const ctx = buildConsultorPayloadContext(UI.activeConsultorContextId);
        const chatMsgs = WorkspaceStore.state.chatHistory;

        const contextOptions = [];
        if (UI.wizard.previewResult) {
            contextOptions.push({ id: 'wizard_preview', text: `Prévia do assistente: ${UI.wizard.itemNome}` });
        }
        if (UI.simulacaoResult) {
            contextOptions.push({ id: 'quick_sim', text: `Simulação rápida: ${UI.quickSimState?.nome || 'Cenário atual'}` });
        }
        if (pricings.length) {
            contextOptions.push({ id: 'latest', text: 'Última precificação salva' });
            pricings.slice(0, 10).forEach(p => {
                contextOptions.push({ id: p.id, text: `${p.itemNome} (v${p.versao} · ${Formatter.brl(p.precoSugerido)})` });
            });
        }
        contextOptions.push({ id: 'none', text: 'Consulta geral sem item específico' });

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Consultor IA ValorizAI</h1>
                    <p class="page-subtitle">Pergunte sobre negócios, mercado, gestão, tecnologia ou seu próprio negócio.</p>
                </div>
                <div class="page-header-actions">
                    <button type="button" class="btn btn-ghost btn-sm" id="ai-clear-chat" ${chatMsgs.length === 0 ? 'disabled' : ''}>Limpar conversa</button>
                </div>
            </div>

            <div class="chat-layout">
                <aside class="surface-card">
                    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
                        <div class="nilo-avatar-box-sm">
                            <img src="${UI.chatSending ? NILO_ASSETS.processando : NILO_ASSETS.apresentacao}" alt="Nilo Consultor IA" class="nilo-figure ${UI.chatSending ? '' : 'nilo-float'}" id="ai-nilo-avatar">
                        </div>
                        <div>
                            <div style="font-family:var(--font-display);font-weight:700;font-size:15px;">Nilo · Consultor</div>
                            <div style="font-size:12px;color:var(--color-silver);">${ctx.setor && SETORES[ctx.setor] ? `Setor: <strong style="color:var(--color-cloud);">${SETORES[ctx.setor].nome}</strong>` : 'Consultas gerais e apoio a negócios'}</div>
                        </div>
                    </div>

                    <div class="form-field" style="margin-bottom:16px;">
                        <label class="field-label" for="ai-ctx-select">Contexto financeiro enviado</label>
                        <select id="ai-ctx-select" class="field-select">
                            ${contextOptions.map(opt => `<option value="${opt.id}" ${UI.activeConsultorContextId === opt.id ? 'selected' : ''}>${Formatter.escapeHtml(opt.text)}</option>`).join('')}
                        </select>
                    </div>

                    <div style="padding:14px;border-radius:var(--radius-md);background:var(--app-background);border:1px solid var(--border);">
                        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;">Contexto enviado à IA</div>
                        ${ctx.resumoFinanceiro ? `
                            <div class="kv-list">
                                <div class="kv-row"><span class="kv-key">Preço sugerido</span><span class="kv-val mono">${ctx.resumoFinanceiro.precoSugerido}</span></div>
                                <div class="kv-row"><span class="kv-key">Custo total</span><span class="kv-val mono">${ctx.resumoFinanceiro.totalCustos}</span></div>
                                <div class="kv-row"><span class="kv-key">Markup</span><span class="kv-val mono">${ctx.resumoFinanceiro.markup}</span></div>
                                <div class="kv-row"><span class="kv-key">Impostos e taxas</span><span class="kv-val mono">${ctx.resumoFinanceiro.taxaPercentual}</span></div>
                                <div class="kv-row"><span class="kv-key">Margem desejada</span><span class="kv-val mono">${ctx.resumoFinanceiro.margemPercentual}</span></div>
                            </div>
                        ` : '<p style="font-size:12px;color:var(--text-secondary);">Nenhum dado financeiro será enviado. O Nilo pode responder normalmente a perguntas gerais.</p>'}
                    </div>
                </aside>

                <section class="chat-panel">
                    <div class="chat-messages" id="ai-messages-list">
                        ${chatMsgs.length === 0 ? `
                            <div class="empty-state" style="margin:auto;">
                                <div class="empty-state-nilo" style="width:100px;">
                                    <img src="${NILO_ASSETS.apresentacao}" alt="Nilo" class="nilo-figure nilo-float">
                                </div>
                                <h2 class="empty-state-title">O que você gostaria de entender?</h2>
                                <p class="empty-state-desc">Pode perguntar sobre gestão, mercado, empreendedorismo, tecnologia ou custos. Se houver dados financeiros selecionados, o Nilo poderá usá-los quando forem relevantes.</p>
                            </div>
                        ` : chatMsgs.map((m, idx) => `
                            <div class="chat-bubble ${m.role}">
                                ${m.role === 'assistant'
                                    ? Formatter.renderMarkdown(m.text)
                                    : m.role === 'error'
                                        ? `<div>${Formatter.escapeHtml(m.text)}</div><button type="button" class="btn btn-ghost btn-sm" data-retry-idx="${idx}" style="margin-top:8px;">Tentar novamente</button>`
                                        : Formatter.escapeHtml(m.text)
                                }
                            </div>
                        `).join('')}
                        ${UI.chatSending ? `
                            <div class="chat-bubble assistant" style="display:flex;align-items:center;gap:12px;">
                                <img src="${NILO_ASSETS.processando}" alt="Processando" style="width:40px;height:auto;">
                                <span>Preparando uma resposta para sua pergunta...</span>
                            </div>
                        ` : ''}
                    </div>

                    <form class="chat-composer" id="ai-chat-form">
                        <div class="prompt-suggestions">
                            ${[
                                'O que é margem de contribuição?',
                                'Como organizar o fluxo de caixa?',
                                'Como avaliar uma ideia de negócio?'
                            ].map(q => `<button type="button" class="prompt-chip" data-prompt-chip="${Formatter.escapeHtml(q)}">${Formatter.escapeHtml(q)}</button>`).join('')}
                        </div>
                        <div class="chat-composer-row">
                            <input type="text" id="ai-question-input" class="field-input" placeholder="Pergunte sobre negócios, mercado, gestão, tecnologia..." ${UI.chatSending ? 'disabled' : ''}>
                            <button type="submit" class="btn btn-primary" ${UI.chatSending ? 'disabled' : ''}>${UI.chatSending ? 'Analisando...' : 'Enviar'}</button>
                        </div>
                    </form>
                </section>
            </div>
        `;

        const msgList = document.getElementById('ai-messages-list');
        msgList.scrollTop = msgList.scrollHeight;

        document.getElementById('ai-ctx-select').addEventListener('change', e => {
            UI.activeConsultorContextId = e.target.value;
            renderConsultor(root);
        });

        document.getElementById('ai-clear-chat').addEventListener('click', () => {
            WorkspaceStore.state.chatHistory = [];
            WorkspaceStore.save();
            renderConsultor(root);
        });

        root.querySelectorAll('[data-prompt-chip]').forEach(chip => {
            chip.addEventListener('click', () => {
                const inp = document.getElementById('ai-question-input');
                inp.value = chip.dataset.promptChip;
                inp.focus();
            });
        });

        root.querySelectorAll('[data-retry-idx]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.dataset.retryIdx);
                const prevUserMsg = [...WorkspaceStore.state.chatHistory].slice(0, idx).reverse().find(m => m.role === 'user');
                if (prevUserMsg) sendQuestion(prevUserMsg.text, root);
            });
        });

        async function sendQuestion(questionText, targetRoot) {
            const pergunta = questionText.trim();
            if (!pergunta || UI.chatSending) return;

            WorkspaceStore.state.chatHistory.push({ role: 'user', text: pergunta, at: new Date().toISOString() });
            UI.chatSending = true;
            WorkspaceStore.save();
            renderConsultor(targetRoot);

            try {
                const historico = WorkspaceStore.state.chatHistory
                    .slice(0, -1)
                    .filter(m => ['user', 'assistant'].includes(m.role))
                    .slice(-12)
                    .map(m => ({ role: m.role, text: m.text }));
                const data = await ApiService.enviarPerguntaIA({
                    pergunta,
                    setor: ctx.setor,
                    resumoFinanceiro: ctx.resumoFinanceiro,
                    detalhesCustos: ctx.detalhesCustos,
                    historico
                });

                WorkspaceStore.state.chatHistory.push({
                    role: 'assistant',
                    text: data.resposta || 'Não houve retorno textual do consultor.',
                    at: new Date().toISOString()
                });
            } catch (err) {
                WorkspaceStore.state.chatHistory.push({
                    role: 'error',
                    text: err.message || 'Erro ao comunicar com o endpoint /perguntar.',
                    at: new Date().toISOString()
                });
            } finally {
                UI.chatSending = false;
                WorkspaceStore.save();
                if (UI.currentView === 'consultor') {
                    renderConsultor(document.getElementById('main-viewport'));
                }
                if (UI.niloOpen) {
                    renderConsultor(document.getElementById('nilo-panel-content'));
                }
            }
        }

        document.getElementById('ai-chat-form').addEventListener('submit', e => {
            e.preventDefault();
            const inp = document.getElementById('ai-question-input');
            sendQuestion(inp.value, root);
        });
    }

    // --- CONTA DO USUÁRIO ---
    function renderMyAccount(root) {
        const config = window.VALORIZAI_CONFIG || {};
        const supabaseLib = window.supabase;
        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Minha conta</h1>
                    <p class="page-subtitle">Informações da sua conta de acesso ao ValorizAI.</p>
                </div>
            </div>
            <section class="surface-card account-summary">
                <div class="account-avatar" aria-hidden="true">👤</div>
                <div>
                    <h2 class="card-title" id="account-user-name">Carregando conta…</h2>
                    <p class="card-subtitle" id="account-user-email">Consultando sessão autenticada</p>
                </div>
            </section>
            <section class="surface-card account-details">
                <h2 class="card-title">Acesso e segurança</h2>
                <p class="card-subtitle">Sua autenticação é gerenciada pelo Supabase. A senha não é armazenada no ValorizAI.</p>
                <div class="account-detail-row"><span>Status da sessão</span><strong id="account-session-status">Verificando…</strong></div>
                <div class="account-detail-row"><span>Provedor de autenticação</span><strong>Supabase Auth</strong></div>
            </section>
        `;

        if (!supabaseLib?.createClient || !config.supabaseUrl || !config.supabaseAnonKey) {
            document.getElementById('account-user-name').textContent = 'Conta indisponível';
            document.getElementById('account-user-email').textContent = 'Não foi possível consultar a sessão.';
            document.getElementById('account-session-status').textContent = 'Não verificada';
            return;
        }

        const client = supabaseLib.createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        client.auth.getUser().then(({ data, error }) => {
            if (error || !data?.user) {
                document.getElementById('account-user-name').textContent = 'Sessão não encontrada';
                document.getElementById('account-user-email').textContent = 'Entre novamente para continuar.';
                document.getElementById('account-session-status').textContent = 'Inativa';
                return;
            }
            const user = data.user;
            const metadata = user.user_metadata || {};
            document.getElementById('account-user-name').textContent =
                metadata.full_name || metadata.name || 'Minha conta';
            document.getElementById('account-user-email').textContent = user.email || 'E-mail não informado';
            document.getElementById('account-session-status').textContent = 'Ativa';
        }).catch(() => {
            document.getElementById('account-session-status').textContent = 'Não verificada';
        });
    }

    // --- 8.9 CONFIGURAÇÕES ---
    function renderSettings(root) {
        const { settings, business } = WorkspaceStore.state;
        const integrations = ApiService.integracoesStatus();

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Configurações</h1>
                    <p class="page-subtitle">Preferências de metas financeiras, comportamento do assistente e estado das integrações do projeto.</p>
                </div>
            </div>

            <div class="grid-2" style="margin-bottom:20px;">
                <form id="settings-form" class="surface-card">
                    <h2 class="card-title" style="margin-bottom:6px;">Metas e preferências da interface</h2>
                    <p class="card-subtitle" style="margin-bottom:18px;">Ajuste os parâmetros de leitura de margem e exibição de ajudas nos formulários.</p>

                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label" for="set-margem-meta">Margem mínima de referência (%)</label>
                            <p class="field-help">A meta de margem é definida no perfil da empresa, em Meu negócio.</p>
                        </div>

                        <div class="form-field">
                            <label class="field-label" for="set-carga-alerta">Alerta de impostos + taxas (%)</label>
                            <input id="set-carga-alerta" class="field-input mono" type="text" inputmode="decimal" value="${settings.alertaCargaTributaria}">
                            <span class="field-help">Destaca quando a soma percentual sobre o preço atingir este limiar.</span>
                        </div>

                        <div class="form-field form-field-full">
                            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;">
                                <input id="set-dicas" type="checkbox" ${settings.mostrarDicasCampos ? 'checked' : ''} style="width:16px;height:16px;">
                                <span>Exibir textos explicativos abaixo de cada campo de custo</span>
                            </label>
                        </div>

                        <div class="form-field form-field-full">
                            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;">
                                <input id="set-rascunho" type="checkbox" ${settings.salvarRascunhoAutomatico ? 'checked' : ''} style="width:16px;height:16px;">
                                <span>Preservar rascunhos locais automaticamente ao interromper o assistente</span>
                            </label>
                        </div>
                    </div>

                    <div class="wizard-footer">
                        <button type="submit" class="btn btn-primary">Salvar preferências</button>
                    </div>
                </form>

                <section class="surface-card">
                    <h2 class="card-title" style="margin-bottom:6px;">Perfil e estado das integrações</h2>
                    <p class="card-subtitle" style="margin-bottom:16px;">Transparência sobre os serviços conectados ao backend atual.</p>

                    <div class="kv-list" style="margin-bottom:18px;">
                        <div class="kv-row"><span class="kv-key">Empreendedor</span><span class="kv-val">${Formatter.escapeHtml(business.empreendedor || 'Não informado')}</span></div>
                        <div class="kv-row"><span class="kv-key">Negócio</span><span class="kv-val">${Formatter.escapeHtml(business.nomeNegocio || 'Não informado')}</span></div>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:10px;">
                        ${integrations.map(intg => `
                            <div style="padding:12px 14px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                                <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:4px;">
                                    <span style="font-weight:600;font-size:13px;">${intg.nome}</span>
                                    <span class="status-label ${intg.disponivel ? 'success' : 'warning'}">${intg.disponivel ? 'Ativo' : 'Demonstração local'}</span>
                                </div>
                                <div style="font-size:12px;color:var(--color-silver);">${intg.descricao}</div>
                            </div>
                        `).join('')}
                    </div>
                </section>
            </div>

            <section class="surface-card">
                <h2 class="card-title" style="margin-bottom:6px;">Gerenciamento de dados locais</h2>
                <p class="card-subtitle" style="margin-bottom:16px;">Exporte seus registros locais em JSON, carregue um cenário de demonstração ou limpe o armazenamento do navegador.</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button type="button" class="btn btn-secondary" id="set-export-btn">Exportar dados (JSON)</button>
                    <button type="button" class="btn btn-secondary" id="set-demo-btn">Carregar cenário de demonstração</button>
                    <button type="button" class="btn btn-danger-ghost" id="set-clear-btn">Limpar todos os dados locais</button>
                </div>
            </section>
        `;

        document.getElementById('settings-form').addEventListener('submit', e => {
            e.preventDefault();
            const carga = Formatter.parseNumber(document.getElementById('set-carga-alerta').value);
            if (carga !== null && (!Number.isFinite(carga) || carga < 0 || carga >= 100)) {
                UI.toast('Informe um limiar de alerta entre 0% e 99%, ou deixe vazio.', 'error');
                return;
            }
            WorkspaceStore.state.settings = {
                alertaCargaTributaria: carga,
                mostrarDicasCampos: document.getElementById('set-dicas').checked,
                salvarRascunhoAutomatico: document.getElementById('set-rascunho').checked
            };
            WorkspaceStore.save();
            UI.toast('Preferências atualizadas.', 'success');
        });

        document.getElementById('set-export-btn').addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(WorkspaceStore.state, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `valorizai-workspace-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById('set-demo-btn').addEventListener('click', () => {
            WorkspaceStore.loadDemoScenario();
            UI.updateChrome();
            UI.renderCurrentView();
            UI.toast('Cenário de demonstração carregado.', 'success');
        });

        document.getElementById('set-clear-btn').addEventListener('click', () => {
            UI.openModal(
                'Confirmar limpeza de dados locais',
                `
                <p style="font-size:14px;color:var(--color-silver);margin-bottom:18px;">
                    Esta ação remove informações do negócio, catálogo, histórico local, rascunhos e histórico de conversa do navegador. Deseja continuar?
                </p>
                <div class="wizard-footer">
                    <button type="button" class="btn btn-ghost" id="confirm-clear-cancel">Cancelar</button>
                    <button type="button" class="btn btn-danger-ghost" id="confirm-clear-ok">Limpar tudo</button>
                </div>
                `,
                body => {
                    body.querySelector('#confirm-clear-cancel').addEventListener('click', () => UI.closeModal());
                    body.querySelector('#confirm-clear-ok').addEventListener('click', () => {
                        WorkspaceStore.resetAll();
                        DraftStore.clear();
                        UI.wizard = defaultWizardDraft();
                        UI.simulacaoResult = null;
                        UI.closeModal();
                        UI.updateChrome();
                        UI.renderCurrentView();
                        UI.toast('Dados locais limpos com sucesso.', 'info');
                    });
                }
            );
        });
    }

    /* =========================================================================
       9. INICIALIZAÇÃO E EVENTOS GLOBAIS
       ========================================================================= */
    function init() {
        WorkspaceStore.load();

        const shell = document.getElementById('app-shell');
        const collapseButton = document.getElementById('sidebar-collapse-btn');
        const mobileMenuButton = document.getElementById('mobile-menu-btn');
        const isMobileNavigation = () => window.matchMedia('(max-width: 960px)').matches;

        const setDesktopSidebarCollapsed = (collapsed) => {
            shell.classList.toggle('sidebar-collapsed', collapsed);
            localStorage.setItem(STORAGE_KEYS.SIDEBAR, collapsed ? '1' : '0');
            collapseButton.setAttribute('aria-expanded', String(!collapsed));
            collapseButton.setAttribute('aria-label', collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral');
            collapseButton.title = collapsed ? 'Expandir menu' : 'Recolher menu';
        };

        const setMobileDrawerOpen = (open) => {
            shell.classList.toggle('mobile-drawer-open', open);
            mobileMenuButton.setAttribute('aria-expanded', String(open));
            mobileMenuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
        };

        // Aplica o estado local imediatamente; a preferência da conta sincroniza em seguida.
        setDesktopSidebarCollapsed(localStorage.getItem(STORAGE_KEYS.SIDEBAR) === '1');

        const getSidebarSession = async () => {
            const config = window.VALORIZAI_CONFIG || {};
            if (!window.supabase?.createClient || !config.supabaseUrl || !config.supabaseAnonKey) return null;
            const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
            const { data, error } = await client.auth.getSession();
            return error ? null : data.session || null;
        };

        const loadSidebarPreference = async () => {
            try {
                const session = await getSidebarSession();
                if (!session?.access_token) return;
                const response = await fetch('/api/preferences/sidebar', {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                if (!response.ok) return;
                const result = await response.json();
                if (typeof result.data?.collapsed === 'boolean') setDesktopSidebarCollapsed(result.data.collapsed);
            } catch (error) {
                console.warn('Não foi possível sincronizar a preferência da navegação.', error);
            }
        };

        const saveSidebarPreference = async (collapsed) => {
            try {
                const session = await getSidebarSession();
                if (!session?.access_token) return;
                await fetch('/api/preferences/sidebar', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ collapsed })
                });
            } catch (error) {
                console.warn('Não foi possível salvar a preferência da navegação.', error);
            }
        };

        // Navegação Sidebar
        document.querySelectorAll('[data-nav]').forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault();
                UI.navigate(el.dataset.nav);
                if (isMobileNavigation()) setMobileDrawerOpen(false);
            });
        });

        // Desktop: controle único de expandir/recolher, com preferência sincronizada na conta.
        collapseButton.addEventListener('click', () => {
            const collapsed = !shell.classList.contains('sidebar-collapsed');
            setDesktopSidebarCollapsed(collapsed);
            saveSidebarPreference(collapsed);
        });

        // Mobile: o hamburger alterna abrir/fechar o drawer.
        mobileMenuButton.addEventListener('click', () => {
            setMobileDrawerOpen(!shell.classList.contains('mobile-drawer-open'));
        });
        document.getElementById('sidebar-backdrop').addEventListener('click', () => setMobileDrawerOpen(false));
        loadSidebarPreference();

        // Nilo é global: abrir o painel preserva a tela atual.
        const niloFab = document.getElementById('nilo-fab');
        const niloPanel = document.getElementById('nilo-panel');
        const niloPanelContent = document.getElementById('nilo-panel-content');
        const closeNilo = () => {
            UI.niloOpen = false;
            niloPanel.hidden = true;
            niloFab.setAttribute('aria-expanded', 'false');
        };
        niloFab.addEventListener('click', () => {
            UI.niloOpen = true;
            niloPanel.hidden = false;
            niloFab.setAttribute('aria-expanded', 'true');
            renderConsultor(niloPanelContent);
            document.getElementById('ai-question-input')?.focus();
        });
        document.getElementById('nilo-panel-close').addEventListener('click', closeNilo);
        document.getElementById('nilo-clear-chat').addEventListener('click', () => {
            WorkspaceStore.state.chatHistory = [];
            WorkspaceStore.save();
            if (UI.niloOpen) renderConsultor(niloPanelContent);
            if (UI.currentView === 'consultor') renderConsultor(document.getElementById('main-viewport'));
        });

        // Ação Topbar Nova Precificação
        document.getElementById('topbar-new-pricing-btn').addEventListener('click', () => {
            UI.navigate('precificacao');
        });

        // Popover Notificações
        const notifBtn = document.getElementById('notifications-btn');
        const notifPop = document.getElementById('notifications-popover');
        notifBtn.addEventListener('click', e => {
            e.stopPropagation();
            const isHidden = notifPop.classList.toggle('hidden');
            notifBtn.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
        });

        document.addEventListener('click', e => {
            if (!notifPop.classList.contains('hidden') && !notifPop.contains(e.target) && e.target !== notifBtn) {
                notifPop.classList.add('hidden');
                notifBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Modal close handlers
        document.getElementById('modal-close-btn').addEventListener('click', () => UI.closeModal());
        document.getElementById('modal-backdrop').addEventListener('click', () => UI.closeModal());

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                UI.closeModal();
                notifPop.classList.add('hidden');
                notifBtn.setAttribute('aria-expanded', 'false');
                setMobileDrawerOpen(false);
                if (UI.niloOpen) closeNilo();
            }
        });

        UI.updateChrome();
        UI.renderCurrentView();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
