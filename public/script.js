(() => {
    'use strict';

    /* =========================================================================
       1. CONSTANTES E DEFINIÇÕES DE SETORES
       ========================================================================= */
    const STORAGE_KEYS = {
        LEGACY_WORKSPACE: 'valorizai_workspace_v1',
        WORKSPACE: null,
        DRAFT: null,
        SIDEBAR: null
    };

    function mapProductFromApi(row) {
        const extra = row.additional_data || {};
        return {
            id: row.id,
            nome: row.name,
            descricao: row.description || '',
            categoria: row.category || '',
            tipo: extra.subtype || (row.item_type === 'servico' ? 'Serviço' : 'Produto'),
            setor: row.sector === 'servicos' ? 'servico' : row.sector,
            unidade: row.unit || 'Unidade',
            status: row.status === 'archived' ? 'Arquivado' : (extra.status_label || 'Ativo'),
            criadoEm: row.created_at,
            atualizadoEm: row.updated_at
        };
    }

    function nullableFiniteNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function getGrossMargin(pricing) {
        const price = nullableFiniteNumber(pricing?.precoSugerido);
        const cost = nullableFiniteNumber(pricing?.custoTotal);
        if (price === null || cost === null || price <= 0) return { amount: null, percent: null };
        const amount = price - cost;
        return { amount, percent: (amount / price) * 100 };
    }

    function formatNullablePercent(value) {
        const parsed = nullableFiniteNumber(value);
        return parsed === null ? '—' : Formatter.percent(parsed);
    }

    function mapPricingFromApi(row) {
        const input = row.input_snapshot || {};
        const snapshot = row.result_snapshot || {};
        const serverResult = snapshot.server_calculation || {};
        const extra = snapshot.ui_record || snapshot;
        const isServerCalculation = row.calculation_version === 'server-v1' ||
            serverResult.calculationVersion === 'server-v1';
        const cost = nullableFiniteNumber(row.custo_total ?? extra.custoTotal);
        const price = nullableFiniteNumber(row.preco_sugerido ?? extra.precoSugerido);
        // Registros legados sem snapshot/versionamento não comprovam que margem_lucro
        // representa margem planejada. Só confiamos em campos explicitamente semânticos.
        const plannedMargin = nullableFiniteNumber(
            row.desired_margin_percent ??
            serverResult.margemPlanejada ??
            (isServerCalculation ? (extra.margemPlanejada ?? row.margem_lucro) : null)
        );
        const grossMargin = getGrossMargin({ precoSugerido: price, custoTotal: cost });
        return {
            id: String(row.id),
            catalogItemId: row.product_id || '',
            itemNome: row.product_name || input.item_name || 'Item sem nome',
            versao: Number(extra.versao || snapshot.version || 1),
            setor: row.setor === 'servicos' ? 'servico' : (row.setor || input.sector || 'comercio'),
            unidade: row.unit || '',
            criadoEm: row.data_criacao,
            custoTotal: cost,
            precoSugerido: price,
            markup: nullableFiniteNumber(row.markup ?? extra.markup),
            margemBrutaValor: grossMargin.amount,
            margemBruta: grossMargin.percent,
            margemPlanejada: plannedMargin,
            percentualImpostosTaxas: nullableFiniteNumber(row.variable_expenses_percent ?? row.impostos ?? serverResult.percentualImpostosTaxas ?? extra.percentualImpostosTaxas),
            valorImpostosTaxas: nullableFiniteNumber(serverResult.valorImpostosTaxas ?? extra.valorImpostosTaxas),
            lucroEstimado: nullableFiniteNumber(serverResult.lucroEstimado ?? extra.lucroEstimado),
            fonteCalculo: row.calculation_version || serverResult.calculationVersion || extra.fonteCalculo || 'persistido',
            categoriasCusto: Array.isArray(serverResult.categoriasCusto)
                ? serverResult.categoriasCusto
                : (Array.isArray(extra.categoriasCusto) ? extra.categoriasCusto : []),
            detalhesCustos: input.costs || {},
            taxas: input.taxes || {}
        };
    }

    function configureUserStorage(userId) {
        if (!userId || typeof userId !== 'string') throw new Error('Conta autenticada inválida.');
        const suffix = userId;
        STORAGE_KEYS.WORKSPACE = `valorizai_workspace_v1:${suffix}`;
        STORAGE_KEYS.DRAFT = `valorizai_wizard_draft_v1:${suffix}`;
        STORAGE_KEYS.SIDEBAR = `valorizai_sidebar_collapsed_v1:${suffix}`;
    }

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
            orientacaoCustos: 'Informe quanto cada unidade vendida custa para o negócio. Quando uma despesa for mensal, divida pelo número de unidades que espera vender no mês.',
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
                    help: 'Quanto você paga ao fornecedor por uma unidade, sem incluir o frete. Exemplo: se cada peça custa R$ 25, informe 25,00.'
                },
                {
                    id: 'freteEntrada',
                    label: 'Frete de entrada unitário',
                    categoria: 'Aquisição e logística',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Divida o frete total da compra pela quantidade de unidades recebidas. Exemplo: R$ 60 de frete ÷ 20 unidades = R$ 3 por unidade.'
                },
                {
                    id: 'seguroDespesasAquisicao',
                    label: 'Seguro e despesas de aquisição',
                    categoria: 'Aquisição e logística',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Some os gastos extras para receber a mercadoria e divida pela quantidade de unidades. Informe apenas a parte correspondente a uma unidade.'
                },
                {
                    id: 'embalagem',
                    label: 'Embalagem de envio / entrega',
                    categoria: 'Custos variáveis unitários',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Quanto você gasta com a embalagem de uma venda: caixa, sacola, etiqueta ou proteção. Se não usar embalagem, deixe em branco.'
                },
                {
                    id: 'outrosVariaveis',
                    label: 'Outros custos variáveis unitários',
                    categoria: 'Custos variáveis unitários',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Outros gastos que acontecem a cada venda, como brinde ou montagem. Informe o valor por unidade, não o total do mês.'
                },
                {
                    id: 'custosOperacionaisRateados',
                    label: 'Custos operacionais rateados (por unidade)',
                    categoria: 'Rateio operacional',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Divida os custos fixos do mês (como aluguel, energia e internet) pela quantidade que espera vender no mês. Informe somente o valor de uma unidade.'
                }
            ]
        },
        industria: {
            id: 'industria',
            nome: 'Indústria',
            subtitulo: 'Produção própria, artesanal e fabricação em lotes',
            orientacaoCustos: 'Na indústria, informe os gastos do lote inteiro, não o custo de uma única peça. O sistema distribui esses valores pela quantidade produzida e considera as perdas informadas.',
            itemTipoPadrao: 'Produto fabricado',
            unidadePadrao: 'Unidade (do lote)',
            camposCusto: [
                {
                    id: 'quantidadeLote',
                    label: 'Quantidade total produzida no lote',
                    categoria: 'Parâmetro de lote',
                    tipo: 'integer',
                    obrigatorio: true,
                    placeholder: '1',
                    help: 'Quantas unidades saem da produção antes de descontar perdas. Exemplo: se produzir 100 peças, informe 100. A perda será considerada no campo próprio.'
                },
                {
                    id: 'materiaPrima',
                    label: 'Matéria-prima principal (no lote)',
                    categoria: 'Insumos diretos',
                    tipo: 'currency',
                    obrigatorio: true,
                    placeholder: '0,00',
                    help: 'Quanto foi gasto, no total, com a matéria-prima principal para fabricar todo esse lote — não o valor de uma peça.'
                },
                {
                    id: 'insumos',
                    label: 'Insumos auxiliares (no lote)',
                    categoria: 'Insumos diretos',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Total gasto com materiais complementares usados no lote, como linhas, parafusos, aditivos ou temperos.'
                },
                {
                    id: 'embalagemProducao',
                    label: 'Embalagens de produção (no lote)',
                    categoria: 'Insumos diretos',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Total gasto com rótulos, frascos, caixas ou embalagens usadas nas unidades deste lote.'
                },
                {
                    id: 'maoObraDireta',
                    label: 'Mão de obra direta (no lote)',
                    categoria: 'Transformação',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Some o custo das horas das pessoas que trabalharam diretamente na fabricação deste lote. Exemplo: 5 horas × R$ 20 = R$ 100.'
                },
                {
                    id: 'cifRateado',
                    label: 'Custos indiretos de fabricação rateados (no lote)',
                    categoria: 'Transformação e rateio',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Parcela dos custos da fábrica atribuída a este lote, como aluguel, manutenção e supervisão. Não informe o valor mensal inteiro.'
                },
                {
                    id: 'energiaTransformacao',
                    label: 'Energia e outros custos de transformação (no lote)',
                    categoria: 'Transformação e rateio',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Valor de energia, gás, água ou combustível usado para produzir este lote. Se a conta for compartilhada, estime a parte consumida na produção.'
                },
                {
                    id: 'perdasProducao',
                    label: 'Perdas normais de produção (%)',
                    categoria: 'Eficiência produtiva',
                    tipo: 'percent',
                    obrigatorio: false,
                    placeholder: '0',
                    help: 'Percentual de unidades que normalmente não ficam prontas para venda por quebra, defeito ou sobra de material. Exemplo: se costuma perder 5 em cada 100 unidades, informe 5.'
                }
            ]
        },
        servico: {
            id: 'servico',
            nome: 'Serviços',
            subtitulo: 'Horas técnicas, projetos, atendimentos e especialidade',
            orientacaoCustos: 'Informe os custos para entregar um serviço completo. Considere o tempo de trabalho, o valor da sua hora e os gastos extras daquele atendimento ou projeto.',
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
                    help: 'Quantas horas você ou sua equipe levam para concluir o serviço, incluindo o tempo de preparação e execução. Exemplo: 2 horas e 30 minutos = 2,5.'
                },
                {
                    id: 'custoHoraProdutiva',
                    label: 'Quanto custa cada hora de trabalho? (R$/h)',
                    categoria: 'Tempo de trabalho',
                    tipo: 'currency',
                    obrigatorio: true,
                    placeholder: 'Ex: 40,00',
                    help: 'Para estimar: some os custos mensais do negócio e o valor que precisa receber pelo seu trabalho. Divida pelas horas que realmente consegue cobrar dos clientes no mês. Exemplo: R$ 4.000 ÷ 100 horas = R$ 40 por hora.'
                },
                {
                    id: 'maoObraContratada',
                    label: 'Pagamento de ajudante ou profissional contratado',
                    categoria: 'Ajuda na execução',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: 'Ex: 50,00',
                    help: 'Quanto você pagará a um ajudante ou profissional por este serviço específico. Se não houver outra pessoa envolvida, deixe em branco.'
                },
                {
                    id: 'deslocamento',
                    label: 'Deslocamento e logística do atendimento',
                    categoria: 'Despesas diretas',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Gastos para chegar ao cliente ou realizar o atendimento, como combustível, transporte, estacionamento ou pedágio.'
                },
                {
                    id: 'materiaisUtilizados',
                    label: 'Materiais utilizados na prestação',
                    categoria: 'Despesas diretas',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Materiais que serão usados ou consumidos durante este serviço, como peças, produtos ou materiais de trabalho.'
                },
                {
                    id: 'ferramentasLicencas',
                    label: 'Ferramentas e licenças proporcionais',
                    categoria: 'Estrutura técnica',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Parte do custo de ferramentas, softwares ou equipamentos usada neste serviço. Se tiver uma assinatura mensal, estime a parcela correspondente.'
                },
                {
                    id: 'outrosEspecificos',
                    label: 'Outros custos específicos da prestação',
                    categoria: 'Estrutura técnica',
                    tipo: 'currency',
                    obrigatorio: false,
                    placeholder: '0,00',
                    help: 'Outras despesas específicas deste trabalho, como taxas, impressões ou documentos técnicos.'
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
            if (value === null || value === undefined || value === '') return '—';
            const num = Number(value);
            if (!Number.isFinite(num)) return '—';
            return num.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },
        num(value, decimals = 2) {
            if (value === null || value === undefined || value === '') return '—';
            const n = Number(value);
            if (!Number.isFinite(n)) return '—';
            return n.toLocaleString('pt-BR', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        },
        percent(value, decimals = 1) {
            if (value === null || value === undefined || value === '') return '—';
            const n = Number(value);
            if (!Number.isFinite(n)) return '—';
            return `${n.toLocaleString('pt-BR', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            })}%`;
        },
        multiplier(value) {
            const n = nullableFiniteNumber(value);
            return n === null ? '—' : `${n.toFixed(2)}x`;
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


    function fieldInfoIcon(description) {
        if (!description) return '';
        const safeDescription = Formatter.escapeHtml(description);
        return `<span class="field-info" tabindex="0" role="img" aria-label="Informações do campo: ${safeDescription}" data-tooltip="${safeDescription}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path>
            </svg>
        </span>`;
    }

    function fieldRequiredMark(required) {
        return required ? '<span class="field-required" aria-label="Campo obrigatório">*</span>' : '';
    }

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
            chatHistory: [],
            niloConversationId: null
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
        storageWriteBlocked: false,
        load() {
            this.storageWriteBlocked = false;
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
                // Preserva a cópia original se o conteúdo estiver corrompido ou inacessível.
                this.storageWriteBlocked = true;
                this.state = defaultWorkspaceState();
            }
        },
        save() {
            try {
                if (!STORAGE_KEYS.WORKSPACE || this.storageWriteBlocked) return false;
                localStorage.setItem(STORAGE_KEYS.WORKSPACE, JSON.stringify(this.state));
                return true;
            } catch {
                return false;
            }
        },
        resetAll() {
            this.state = defaultWorkspaceState();
            if (STORAGE_KEYS.WORKSPACE) localStorage.removeItem(STORAGE_KEYS.WORKSPACE);
            this.storageWriteBlocked = false;
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
        async authenticatedRequest(url, options = {}) {
            const config = window.VALORIZAI_CONFIG || {};
            const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
            });
            const { data, error } = await client.auth.getSession();
            if (error || !data?.session?.access_token) throw new Error('Sua sessão expirou. Entre novamente.');
            const headers = { Authorization: `Bearer ${data.session.access_token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
            const response = await fetch(url, { ...options, headers });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.success === false) throw new Error(payload.error?.message || payload.resposta || 'Não foi possível concluir a operação.');
            return payload.data || payload;
        },
        async listProducts() { return (await this.authenticatedRequest('/api/products')).products || []; },
        async listPricings() { return (await this.authenticatedRequest('/api/pricings')).pricings || []; },
        async createProduct(product) { return (await this.authenticatedRequest('/api/products', { method: 'POST', body: JSON.stringify(product) })).product; },
        async updateProduct(id, product) { return (await this.authenticatedRequest(`/api/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(product) })).product; },
        async createPricing(pricing) { return (await this.authenticatedRequest('/api/pricings', { method: 'POST', body: JSON.stringify(pricing) })).pricing; },
        async getLatestNiloConversation() {
            return await this.authenticatedRequest('/api/nilo/conversations/latest');
        },
        async getNiloConversation(id) {
            return await this.authenticatedRequest(`/api/nilo/conversations/${encodeURIComponent(id)}`);
        },
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
         * Normaliza o contrato da interface para o formato esperado pelo motor server-side.
         * A interface mantém "setor"; a API de cálculo recebe "sector".
         */
        async calcularPreviaPrecificacao(payload) {
            const requestPayload = {
                sector: payload.setor || payload.sector,
                costs: payload.costs,
                taxes: payload.taxes
            };
            const response = await this.authenticatedRequest('/api/pricings/calculate', {
                method: 'POST',
                body: JSON.stringify(requestPayload)
            });
            return {
                fonteCalculo: 'server-preview',
                custoTotal: response.result.custoTotal,
                precoSugerido: response.result.precoSugerido,
                markup: response.result.markup,
                margemPlanejada: response.result.margemPlanejada,
                percentualImpostosTaxas: response.result.percentualImpostosTaxas,
                valorImpostosTaxas: response.result.valorImpostosTaxas,
                lucroEstimado: response.result.lucroEstimado,
                categoriasCusto: response.result.categoriasCusto,
                calculationVersion: response.result.calculationVersion,
                costsNormalized: payload.costs,
                taxesNormalized: payload.taxes
            };
        },

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
            const ordered = [...pricings].sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
            const records = ordered.map(item => {
                const price = nullableFiniteNumber(item.precoSugerido);
                const cost = nullableFiniteNumber(item.custoTotal);
                const date = new Date(item.criadoEm);
                return {
                    item,
                    price: price !== null && price >= 0 ? price : null,
                    cost: cost !== null && cost >= 0 ? cost : null,
                    date: Number.isFinite(date.getTime()) ? date : null
                };
            });

            if (!records.length) {
                container.innerHTML = '<div class="empty-state"><p class="empty-state-desc">Ainda não há versões salvas para este produto ou serviço.</p></div>';
                return;
            }

            const validValues = records.flatMap(record => [record.price, record.cost])
                .filter(value => value !== null);
            if (!validValues.length) {
                container.innerHTML = '<div class="empty-state"><p class="empty-state-desc">Há versões salvas, mas ainda não existem preços ou custos válidos para desenhar este gráfico.</p></div>';
                return;
            }

            const width = Math.max(340, Math.min(920, container.clientWidth || 580));
            const height = 310;
            const pad = { top: 24, right: 24, bottom: 58, left: 78 };
            const innerW = width - pad.left - pad.right;
            const innerH = height - pad.top - pad.bottom;
            const maxVal = Math.max(...validValues, 10) * 1.12;
            const getX = index => records.length > 1
                ? pad.left + index * (innerW / (records.length - 1))
                : pad.left + innerW / 2;
            const getY = value => pad.top + innerH - (value / maxVal) * innerH;
            const makeLinePath = field => {
                let path = '';
                let active = false;
                records.forEach((record, index) => {
                    const value = record[field];
                    if (value === null) { active = false; return; }
                    path += (active ? ' L ' : ' M ') + getX(index) + ',' + getY(value);
                    active = true;
                });
                return path.trim();
            };

            const areaPolygons = [];
            for (let index = 0; index < records.length - 1; index++) {
                const a = records[index], b = records[index + 1];
                if (a.price === null || a.cost === null || b.price === null || b.cost === null) continue;
                const x1 = getX(index), x2 = getX(index + 1);
                const p1 = { x: x1, y: getY(a.price) }, c1 = { x: x1, y: getY(a.cost) };
                const p2 = { x: x2, y: getY(b.price) }, c2 = { x: x2, y: getY(b.cost) };
                const d1 = a.price - a.cost, d2 = b.price - b.cost;
                const polygon = (points, color) => areaPolygons.push(
                    '<polygon points="' + points.map(point => point.x + ',' + point.y).join(' ') +
                    '" fill="' + color + '" fill-opacity="0.2" />'
                );
                if (d1 === 0 && d2 === 0) continue;
                if (d1 === 0 || d2 === 0 || Math.sign(d1) === Math.sign(d2)) {
                    polygon([p1, p2, c2, c1], d1 + d2 >= 0 ? '#55D6A0' : '#E87979');
                } else {
                    const ratio = d1 / (d1 - d2);
                    const cross = {
                        x: x1 + (x2 - x1) * ratio,
                        y: getY(a.price + (b.price - a.price) * ratio)
                    };
                    polygon([p1, cross, cross, c1], d1 > 0 ? '#55D6A0' : '#E87979');
                    polygon([cross, p2, c2, cross], d2 > 0 ? '#55D6A0' : '#E87979');
                }
            }

            const labelFor = (record, index) => {
                const version = Number(record.item.versao);
                return Number.isInteger(version) && version > 0 ? 'V' + version : 'Registro ' + (index + 1);
            };
            const labelIndexes = new Set();
            const maxLabels = Math.max(2, Math.floor(innerW / 76));
            const labelStep = Math.max(1, Math.ceil(records.length / maxLabels));
            records.forEach((record, index) => {
                if (index % labelStep === 0 || index === records.length - 1) labelIndexes.add(index);
            });
            const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
                const value = maxVal * ratio;
                const y = getY(value);
                return '<line x1="' + pad.left + '" y1="' + y + '" x2="' + (width - pad.right) + '" y2="' + y + '" stroke="rgba(168,181,199,0.16)" stroke-dasharray="3,3" />' +
                    '<text x="' + (pad.left - 9) + '" y="' + (y + 4) + '" text-anchor="end" fill="#A8B5C7" font-size="11" font-family="JetBrains Mono, monospace">' + Formatter.brl(value) + '</text>';
            }).join('');
            const xLabels = [...labelIndexes].map(index =>
                '<text x="' + getX(index) + '" y="' + (height - 18) + '" text-anchor="middle" fill="#A8B5C7" font-size="11" font-family="Inter, sans-serif">' +
                Formatter.escapeHtml(labelFor(records[index], index)) + '</text>'
            ).join('');
            const pricePath = makeLinePath('price');
            const costPath = makeLinePath('cost');

            container.innerHTML = `
                <div class="analysis-evolution-chart-scroll">
                    <svg class="chart-svg analysis-evolution-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolução do preço sugerido, custo total e margem bruta do item selecionado">
                        ${yTicks}
                        ${areaPolygons.join('')}
                        ${pricePath ? '<path d="' + pricePath + '" fill="none" stroke="#3986D8" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />' : ''}
                        ${costPath ? '<path d="' + costPath + '" fill="none" stroke="#A8B5C7" stroke-width="2.6" stroke-dasharray="7,5" stroke-linejoin="round" stroke-linecap="round" />' : ''}
                        ${records.map((record, index) => {
                            const x = getX(index);
                            const pricePoint = record.price === null ? '' : '<circle class="analysis-evolution-point" data-idx="' + index + '" cx="' + x + '" cy="' + getY(record.price) + '" r="5.5" fill="#3986D8" stroke="#FFFFFF" stroke-width="1.5" tabindex="0" role="button" aria-label="Preço sugerido: ' + Formatter.brl(record.price) + '" />';
                            const costPoint = record.cost === null ? '' : '<circle class="analysis-evolution-point" data-idx="' + index + '" cx="' + x + '" cy="' + getY(record.cost) + '" r="5" fill="#A8B5C7" stroke="#FFFFFF" stroke-width="1.5" tabindex="0" role="button" aria-label="Custo total: ' + Formatter.brl(record.cost) + '" />';
                            return pricePoint + costPoint;
                        }).join('')}
                        ${xLabels}
                    </svg>
                </div>
                <div class="chart-legend analysis-evolution-legend">
                    <span class="chart-legend-entry"><span class="legend-swatch" style="background:#3986D8"></span> Preço sugerido</span>
                    <span class="chart-legend-entry"><span class="legend-swatch" style="background:#A8B5C7"></span> Custo total (tracejado)</span>
                    <span class="chart-legend-entry"><span class="legend-swatch" style="background:#55D6A0"></span> Margem bruta positiva</span>
                    <span class="chart-legend-entry"><span class="legend-swatch" style="background:#E87979"></span> Margem bruta negativa</span>
                </div>
                <p class="analysis-evolution-note">Eixo horizontal por versão. A área verde/vermelha mostra a diferença entre preço e custo (margem bruta), não o lucro líquido.</p>
            `;

            const tooltipFor = (record, event) => {
                const grossMargin = record.price !== null && record.cost !== null ? record.price - record.cost : null;
                const marginPercent = grossMargin !== null && record.price > 0 ? (grossMargin / record.price) * 100 : null;
                const dateLabel = record.date
                    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(record.date)
                    : 'Data indisponível';
                showChartTooltip(event, `
                    <strong>${Formatter.escapeHtml(record.item.itemNome || 'Item')} · V${record.item.versao}</strong><br>
                    Data/hora: <span class="mono">${dateLabel}</span><br>
                    Preço sugerido: <span class="mono">${record.price === null ? '—' : Formatter.brl(record.price)}</span><br>
                    Custo total: <span class="mono">${record.cost === null ? '—' : Formatter.brl(record.cost)}</span><br>
                    Markup (preço ÷ custo): <span class="mono">${Formatter.multiplier(record.item.markup)}</span><br>
                    Margem bruta: <span class="mono">${grossMargin === null ? '—' : Formatter.brl(grossMargin)}</span> (${marginPercent === null ? '—' : Formatter.percent(marginPercent)})<br>
                    Margem planejada: <span class="mono">${formatNullablePercent(record.item.margemPlanejada)}</span><br>
                    Impostos e taxas: <span class="mono">${formatNullablePercent(record.item.percentualImpostosTaxas)}</span>
                `);
            };
            container.querySelectorAll('.analysis-evolution-point').forEach(point => {
                const record = records[Number(point.dataset.idx)];
                point.addEventListener('pointerenter', event => tooltipFor(record, event));
                point.addEventListener('pointermove', event => tooltipFor(record, event));
                point.addEventListener('pointerleave', hideChartTooltip);
                point.addEventListener('click', event => tooltipFor(record, event));
                point.addEventListener('focus', () => {
                    const rect = point.getBoundingClientRect();
                    tooltipFor(record, { clientX: rect.left + rect.width / 2, clientY: rect.top });
                });
                point.addEventListener('blur', hideChartTooltip);
                point.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        const rect = point.getBoundingClientRect();
                        tooltipFor(record, { clientX: rect.left + rect.width / 2, clientY: rect.top });
                    }
                });
            });
        },

        renderPriceEvolutionOverviewChart(container, pricings) {
            const records = [...pricings].filter(p => {
                const date = new Date(p.criadoEm).getTime();
                const price = nullableFiniteNumber(p.precoSugerido);
                const cost = nullableFiniteNumber(p.custoTotal);
                return Number.isFinite(date) && ((price !== null && price >= 0) || (cost !== null && cost >= 0));
            }).sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));

            if (!records.length) {
                container.innerHTML = '<div class="empty-state"><p class="empty-state-desc">Ainda não há preços ou custos válidos nos registros dos itens ativos.</p></div>';
                return;
            }

            const grouped = new Map();
            records.forEach((record, index) => {
                const key = String(record.catalogItemId || record.itemNome || 'item-sem-identificacao');
                if (!grouped.has(key)) {
                    const palette = ['#3986D8', '#55D6A0', '#D69B45', '#A78BFA', '#E879A9', '#22B8A8', '#E07A5F', '#8BABC8'];
                    grouped.set(key, { name: record.itemNome || 'Item sem nome', records: [], color: palette[grouped.size % palette.length] });
                }
                grouped.get(key).records.push({ record, index });
            });
            const groups = Array.from(grouped.values());
            const values = records.flatMap(p => [nullableFiniteNumber(p.precoSugerido), nullableFiniteNumber(p.custoTotal)])
                .filter(value => value !== null && value >= 0);
            const minDate = new Date(records[0].criadoEm).getTime();
            const maxDate = new Date(records[records.length - 1].criadoEm).getTime();
            const width = 920, height = 340;
            const pad = { top: 24, right: 28, bottom: 48, left: 82 };
            const innerW = width - pad.left - pad.right;
            const innerH = height - pad.top - pad.bottom;
            const maxVal = Math.max(...values, 10) * 1.15;
            const x = date => maxDate === minDate ? pad.left + innerW / 2 : pad.left + ((date - minDate) / (maxDate - minDate)) * innerW;
            const y = value => pad.top + innerH - (value / maxVal) * innerH;
            const pathFor = (items, field) => items
                .map(item => ({ x: x(new Date(item.record.criadoEm).getTime()), value: nullableFiniteNumber(item.record[field]) }))
                .filter(point => point.value !== null && point.value >= 0)
                .map((point, index) => (index ? 'L ' : 'M ') + point.x + ',' + y(point.value))
                .join(' ');
            const ticks = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
                const value = maxVal * ratio;
                return '<line x1="' + pad.left + '" y1="' + y(value) + '" x2="' + (width - pad.right) + '" y2="' + y(value) + '" stroke="rgba(168,181,199,0.16)" stroke-dasharray="3,3" />' +
                    '<text x="' + (pad.left - 10) + '" y="' + (y(value) + 4) + '" text-anchor="end" fill="#A8B5C7" font-size="14.3" font-family="JetBrains Mono, monospace">' + Formatter.brl(value) + '</text>';
            }).join('');
            const dateTicks = [];
            const tickCount = Math.min(5, records.length);
            for (let i = 0; i < tickCount; i++) {
                const date = minDate === maxDate ? minDate : minDate + ((maxDate - minDate) * i / Math.max(1, tickCount - 1));
                dateTicks.push('<text x="' + x(date) + '" y="' + (height - 14) + '" text-anchor="middle" fill="#A8B5C7" font-size="14.3" font-family="Inter, sans-serif">' + Formatter.dateShort(new Date(date).toISOString()).slice(0, 5) + '</text>');
            }
            const series = groups.map(group => {
                const pricePath = pathFor(group.records, 'precoSugerido');
                const costPath = pathFor(group.records, 'custoTotal');
                const spreadMarkers = group.records.map(item => {
                    const record = item.record;
                    const price = nullableFiniteNumber(record.precoSugerido);
                    const cost = nullableFiniteNumber(record.custoTotal);
                    if (price === null || cost === null || price < 0 || cost < 0) return '';
                    const cx = x(new Date(record.criadoEm).getTime());
                    const spreadColor = price >= cost ? '#55D6A0' : '#E87979';
                    return '<line x1="' + cx + '" y1="' + y(price) + '" x2="' + cx + '" y2="' + y(cost) + '" stroke="' + spreadColor + '" stroke-opacity="0.62" stroke-width="7" stroke-linecap="round" />';
                }).join('');
                const lines = (pricePath ? '<path d="' + pricePath + '" fill="none" stroke="' + group.color + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />' : '') +
                    (costPath ? '<path d="' + costPath + '" fill="none" stroke="' + group.color + '" stroke-opacity="0.82" stroke-width="2.5" stroke-dasharray="6,4" stroke-linejoin="round" stroke-linecap="round" />' : '');
                const dots = group.records.map(item => {
                    const record = item.record, cx = x(new Date(record.criadoEm).getTime());
                    const price = nullableFiniteNumber(record.precoSugerido), cost = nullableFiniteNumber(record.custoTotal);
                    return (cost !== null && cost >= 0 ? '<circle class="chart-overview-point" data-idx="' + item.index + '" data-kind="cost" cx="' + cx + '" cy="' + y(cost) + '" r="5.5" fill="' + group.color + '" fill-opacity="0.82" stroke="#101827" stroke-width="1.5" />' : '') +
                        (price !== null && price >= 0 ? '<circle class="chart-overview-point" data-idx="' + item.index + '" data-kind="price" cx="' + cx + '" cy="' + y(price) + '" r="7" fill="' + group.color + '" stroke="#101827" stroke-width="2" />' : '');
                }).join('');
                return spreadMarkers + lines + dots;
            }).join('');

            container.innerHTML = '<svg class="chart-svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Visão geral da evolução dos preços sugeridos e custos de todos os itens ativos. Cada cor representa um item; linhas contínuas representam preço e tracejadas representam custo.">' +
                ticks + dateTicks.join('') + series + '</svg>' +
                '<div class="chart-legend"><span class="chart-legend-entry">Linha contínua: preço sugerido</span><span class="chart-legend-entry">Linha tracejada: custo total</span><span class="chart-legend-entry">Faixa verde: preço acima do custo; faixa vermelha: custo acima do preço. A diferença não representa lucro líquido.</span><span class="chart-legend-entry">Cada cor identifica um item; pontos isolados representam itens com uma versão.</span></div>' +
                '<div class="chart-legend">' + groups.map(group => '<span class="chart-legend-entry"><span class="legend-swatch" style="background:' + group.color + '"></span>' + Formatter.escapeHtml(group.name) + ' (' + group.records.length + ' registro(s))</span>').join('') + '</div>';

            container.querySelectorAll('.chart-overview-point').forEach(dot => {
                dot.addEventListener('mouseenter', event => {
                    const item = records[Number(dot.dataset.idx)];
                    showChartTooltip(event, '<strong>' + Formatter.escapeHtml(item.itemNome || 'Item') + ' (v' + item.versao + ')</strong><br>Preço sugerido: ' + Formatter.brl(item.precoSugerido) + '<br>Custo total: ' + Formatter.brl(item.custoTotal) + '<br>Lucro estimado: ' + Formatter.brl(item.lucroEstimado) + '<br>Data: ' + Formatter.dateShort(item.criadoEm));
                });
                dot.addEventListener('mousemove', event => showChartTooltip(event, tooltipEl.innerHTML));
                dot.addEventListener('mouseleave', hideChartTooltip);
            });
        },

        renderCostDistributionChart(container, categorias, totalCusto) {
            const total = nullableFiniteNumber(totalCusto);
            const validCategories = Array.isArray(categorias)
                ? categorias.filter(category => category && typeof category.nome === 'string' &&
                    nullableFiniteNumber(category.valor) !== null && Number(category.valor) > 0)
                : [];
            if (total === null || total <= 0 || !validCategories.length) {
                const message = total === null || total <= 0
                    ? 'O custo total desta versão não está disponível para análise.'
                    : 'O custo total está registrado, mas a composição por categoria não está disponível.';
                container.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-state-desc">${message}</p>
                    </div>`;
                return;
            }

            const colors = ['#3986D8', '#55D6A0', '#F59E0B', '#A8B5C7'];
            const maxVal = Math.max(...validCategories.map(c => Number(c.valor)), 1);

            container.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:14px;">
                    ${validCategories.map((cat, idx) => {
                        const pct = (Number(cat.valor) / total) * 100;
                        const barW = Math.max(4, (Number(cat.valor) / maxVal) * 100);
                        const color = colors[idx % colors.length];
                        return `
                            <div>
                                <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;font-size:16.9px;">
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
            // Seleciona a última versão de cada item; margem ausente não herda valor antigo.
            const latestByItem = new Map();
            [...pricings].sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm)).forEach(p => {
                latestByItem.set(getPricingItemKey(p), p);
            });
            const rows = Array.from(latestByItem.values())
                .filter(p => {
                    const margin = nullableFiniteNumber(p.margemPlanejada);
                    return margin !== null && margin >= 0 && margin < 100;
                })
                .slice(-6);
            if (!rows.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-state-desc">Nenhuma margem planejada válida disponível nas últimas versões dos itens ativos. Registros antigos sem informação suficiente aparecem como indisponíveis.</p>
                    </div>`;
                return;
            }

            const parsedTarget = nullableFiniteNumber(targetMargin);
            const hasTarget = parsedTarget !== null && parsedTarget >= 0 && parsedTarget < 100;
            if (!hasTarget) {
                container.innerHTML = `
                    <div style="display:flex;flex-direction:column;gap:12px;">
                        ${rows.map(r => `
                            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:var(--border-hairline);">
                                <span style="color:var(--color-cloud);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Formatter.escapeHtml(r.itemNome)}</span>
                                <strong class="mono" style="color:var(--color-blue);white-space:nowrap;">${Formatter.percent(r.margemPlanejada)}</strong>
                            </div>
                        `).join('')}
                    </div>
                    <p class="chart-legend">Valores informativos, sem barra de progresso porque não existe uma meta definida para servir de referência.</p>
                `;
                return;
            }

            const maxMargin = Math.max(parsedTarget, ...rows.map(r => Number(r.margemPlanejada)), 1);
            container.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:14px;">
                    ${rows.map(r => {
                        const belowTarget = Number(r.margemPlanejada) < parsedTarget;
                        const color = belowTarget ? 'var(--color-warning)' : 'var(--color-emerald)';
                        const barW = Math.min(100, Math.max(0, (r.margemPlanejada / maxMargin) * 100));
                        const targetPos = Math.min(100, (parsedTarget / maxMargin) * 100);
                        return `
                            <div>
                                <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:5px;font-size:16.9px;">
                                    <span style="color:var(--color-cloud);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Formatter.escapeHtml(r.itemNome)}</span>
                                    <span class="mono" style="color:${color};font-weight:600;">${Formatter.percent(r.margemPlanejada)} · ${belowTarget ? 'Abaixo da meta' : 'Na meta ou acima'}</span>
                                </div>
                                <div style="position:relative;height:10px;border-radius:999px;background:var(--color-midnight);border:var(--border-hairline);">
                                    <div class="chart-bar-anim" style="width:${barW}%;height:100%;background:${color};border-radius:999px;"></div>
                                    <div title="Meta: ${Formatter.percent(parsedTarget, 0)}" style="position:absolute;top:-3px;bottom:-3px;left:${targetPos}%;width:2px;background:var(--color-cloud);opacity:0.75;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="chart-legend">
                    <span class="chart-legend-entry"><span class="legend-swatch" style="background:#55D6A0"></span> Margem planejada dentro ou acima da meta</span>
                    <span class="chart-legend-entry"><span class="legend-swatch" style="background:#F59E0B"></span> Abaixo da meta (${Formatter.percent(parsedTarget, 0)})</span>
                </div>
            `;
        }
    };

    /* =========================================================================
       6. NOTIFICAÇÕES E INSIGHTS DERIVADOS DE DADOS REAIS
       ========================================================================= */
    function getPricingItemKey(pricing) {
        if (pricing.catalogItemId) return `id:${pricing.catalogItemId}`;
        return `name:${String(pricing.itemNome || '').trim().toLocaleLowerCase('pt-BR')}`;
    }

    function getActivePricingRecords(pricings, catalog) {
        const catalogById = new Map(catalog.filter(item => item.id).map(item => [item.id, item]));
        return pricings.filter(pricing => {
            // Sem vínculo não é possível provar que o item continua ativo.
            // Esses registros permanecem no Histórico, mas não entram nos indicadores atuais.
            if (!pricing.catalogItemId) return false;
            const catalogItem = catalogById.get(pricing.catalogItemId);
            return Boolean(catalogItem && catalogItem.status !== 'Arquivado');
        });
    }

    function getLatestPricingPerItem(pricings) {
        const latestByItem = new Map();
        [...pricings].sort((a, b) => {
            const dateA = new Date(a.criadoEm).getTime();
            const dateB = new Date(b.criadoEm).getTime();
            const safeA = Number.isFinite(dateA) ? dateA : 0;
            const safeB = Number.isFinite(dateB) ? dateB : 0;
            if (safeA !== safeB) return safeA - safeB;
            return (Number(a.versao) || 0) - (Number(b.versao) || 0);
        }).forEach(pricing => latestByItem.set(getPricingItemKey(pricing), pricing));
        return Array.from(latestByItem.values());
    }

    function computeDerivedInsights() {
        const { catalog, pricings, business } = WorkspaceStore.state;
        const rawTarget = business.margemMeta;
        const parsedTarget = rawTarget === null || rawTarget === '' || rawTarget === undefined ? null : Number(rawTarget);
        const target = Number.isFinite(parsedTarget) && parsedTarget >= 0 && parsedTarget < 100 ? parsedTarget : null;
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

        const activePricingRecords = getActivePricingRecords(pricings, catalog);
        const latestPricings = getLatestPricingPerItem(activePricingRecords);
        const validMarginPricings = latestPricings.filter(p => {
            const margin = nullableFiniteNumber(p.margemPlanejada);
            return margin !== null && margin >= 0 && margin < 100;
        });
        const avgMargin = validMarginPricings.length
            ? validMarginPricings.reduce((sum, p) => sum + Number(p.margemPlanejada), 0) / validMarginPricings.length
            : null;
        const belowTarget = target === null ? null : validMarginPricings.filter(p => Number(p.margemPlanejada) < target);
        const missingMarginCount = latestPricings.filter(p => {
            const margin = nullableFiniteNumber(p.margemPlanejada);
            return margin === null || margin < 0 || margin >= 100;
        }).length;
        const missingCostCount = latestPricings.filter(p => {
            const cost = nullableFiniteNumber(p.custoTotal);
            return cost === null || cost <= 0;
        }).length;
        if (missingMarginCount > 0 || missingCostCount > 0) {
            const gaps = [];
            if (missingCostCount > 0) gaps.push(`${missingCostCount} ${missingCostCount === 1 ? 'item sem custo total válido' : 'itens sem custo total válido'}`);
            if (missingMarginCount > 0) gaps.push(`${missingMarginCount} ${missingMarginCount === 1 ? 'item sem margem planejada válida' : 'itens sem margem planejada válida'}`);
            insights.push({
                tone: 'warning',
                title: 'Há indicadores incompletos nas últimas versões',
                desc: `${gaps.join(' e ')}. Esses itens ficam fora das médias e comparações correspondentes até que os dados sejam revisados.`
            });
        }

        if (belowTarget && belowTarget.length > 0) {
            const lowest = [...belowTarget].sort((a, b) => Number(a.margemPlanejada) - Number(b.margemPlanejada))[0];
            insights.push({
                tone: 'warning',
                title: `${belowTarget.length} ${belowTarget.length === 1 ? 'item com margem planejada abaixo da meta' : 'itens com margem planejada abaixo da meta'}`,
                desc: `"${lowest.itemNome}" está com ${Formatter.percent(lowest.margemPlanejada)} frente à meta de ${Formatter.percent(target, 0)}. Avalie os custos e as condições de venda antes de decidir uma alteração.`
            });
            notifications.push({
                title: 'Margem abaixo da meta configurada',
                desc: `${lowest.itemNome} registra ${Formatter.percent(lowest.margemPlanejada)} planejada.`,
                actionNav: 'analises'
            });
        }

        const validCostPricings = latestPricings.filter(p => {
            const cost = nullableFiniteNumber(p.custoTotal);
            return cost !== null && cost > 0;
        });
        const highestCost = [...validCostPricings].sort((a, b) => Number(b.custoTotal) - Number(a.custoTotal))[0];
        if (highestCost) {
            insights.push({
                tone: 'info',
                title: 'Maior custo unitário registrado entre os itens ativos',
                desc: `"${highestCost.itemNome}" possui custo de ${Formatter.brl(highestCost.custoTotal)} por ${highestCost.unidade || 'unidade de comercialização'} e preço sugerido de ${Formatter.brl(highestCost.precoSugerido)}. É o maior valor unitário registrado; unidades de comercialização diferentes não são diretamente comparáveis e isso não representa gasto total do negócio.`
            });
        }

        // Compara somente as duas versões mais recentes de cada item ativo.
        const versionsByItem = new Map();
        [...activePricingRecords].sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm)).forEach(p => {
            const key = getPricingItemKey(p);
            if (!versionsByItem.has(key)) versionsByItem.set(key, []);
            versionsByItem.get(key).push(p);
        });
        versionsByItem.forEach(list => {
            if (list.length < 2) return;
            const prev = list[list.length - 2];
            const curr = list[list.length - 1];
            const previousCost = nullableFiniteNumber(prev.custoTotal);
            const currentCost = nullableFiniteNumber(curr.custoTotal);
            if (previousCost === null || currentCost === null || previousCost <= 0) return;
            const diffPct = ((currentCost - previousCost) / previousCost) * 100;
            if (Math.abs(diffPct) >= 5) {
                insights.push({
                    tone: diffPct > 0 ? 'warning' : 'success',
                    title: `Variação de custo em "${curr.itemNome}"`,
                    desc: `O custo unitário/por atendimento variou ${diffPct > 0 ? '+' : ''}${Formatter.percent(diffPct)} entre a v${prev.versao} (${Formatter.brl(previousCost)}) e a v${curr.versao} (${Formatter.brl(currentCost)}). A comparação mostra a diferença, mas não identifica sua causa.`
                });
            }
        });

        const latestKeys = new Set(latestPricings.map(getPricingItemKey));
        const unpriced = catalog.filter(c => c.status !== 'Arquivado' && !latestKeys.has(c.id ? `id:${c.id}` : `name:${String(c.nome || '').trim().toLocaleLowerCase('pt-BR')}`));
        if (unpriced.length > 0) {
            insights.push({
                tone: 'info',
                title: `${unpriced.length} ${unpriced.length === 1 ? 'item aguardando precificação' : 'itens aguardando precificação'}`,
                desc: `"${unpriced[0].nome}" está no catálogo, mas ainda não possui uma precificação salva.`
            });
        }

        return {
            insights,
            notifications,
            belowTargetCount: belowTarget === null ? null : belowTarget.length,
            avgMargin,
            latestPricings,
            activePricingCount: validMarginPricings.length
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
        analysisEvolutionSelectedItemId: null,
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
            viewport.dataset.view = this.currentView;
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
        const { insights, belowTargetCount, avgMargin, latestPricings, activePricingCount } = computeDerivedInsights();
        const activeItems = catalog.filter(c => c.status !== 'Arquivado');
        const rawTarget = business.margemMeta;
        const parsedTarget = rawTarget === null || rawTarget === '' || rawTarget === undefined ? null : Number(rawTarget);
        const target = Number.isFinite(parsedTarget) && parsedTarget >= 0 && parsedTarget < 100 ? parsedTarget : null;
        const archivedItemsCount = catalog.length - activeItems.length;

        const saudacaoNome = business.empreendedor?.trim() || business.nomeNegocio?.trim();
        const saudacaoTitulo = saudacaoNome ? `${Formatter.greeting()}, ${Formatter.escapeHtml(saudacaoNome)}` : `${Formatter.greeting()}!`;

        const activePricingRecords = getActivePricingRecords(pricings, catalog);
        const recentPricings = [...activePricingRecords]
            .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
            .slice(0, 5);
        const latestSavedPricing = recentPricings[0] || null;

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
                        <div class="notice-bar-text"><strong>Você está vendo dados de exemplo</strong> — este negócio e suas precificações são fictícios e servem para apresentar os indicadores do ValorizAI.</div>
                        <div class="notice-bar-sub">Remova os exemplos quando quiser começar a cadastrar as informações do seu negócio.</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" id="dash-clear-demo-btn">Remover dados de exemplo</button>
                </div>
            ` : ''}

            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-label">Produtos e serviços cadastrados</div>
                    <div class="kpi-value">${activeItems.length}</div>
                    <div class="kpi-meta">${activeItems.length === 0 ? 'Nenhum item ativo no catálogo' : `${archivedItemsCount} arquivado(s)`}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Versões em itens ativos</div>
                    <div class="kpi-value">${activePricingRecords.length}</div>
                    <div class="kpi-meta">${activePricingRecords.length === 0 ? 'Nenhuma versão vinculada a item ativo' : `Atualizada em ${Formatter.dateShort(latestSavedPricing.criadoEm)}`}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Margem planejada média</div>
                    <div class="kpi-value ${avgMargin === null || target === null ? '' : (avgMargin >= target ? 'positive' : 'warning')}">
                        ${avgMargin === null ? '—' : Formatter.percent(avgMargin)}
                    </div>
                    <div class="kpi-meta">${avgMargin === null ? 'Sem margem planejada válida nas últimas versões' : 'Média simples das margens válidas nas últimas versões · não representa vendas'}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">${target === null ? 'Meta de margem' : `Margem abaixo da meta (${Formatter.percent(target, 0)})`}</div>
                    <div class="kpi-value ${target === null ? '' : (belowTargetCount > 0 ? 'warning' : (activePricingCount > 0 ? 'positive' : ''))}">
                        ${target === null || activePricingCount === 0 ? '—' : belowTargetCount}
                    </div>
                    <div class="kpi-meta">${target === null ? 'Defina uma meta em Meu negócio' : (activePricingCount === 0 ? 'Sem margens válidas para comparar' : (belowTargetCount === 0 ? 'Todos os itens com margem válida estão na meta ou acima' : 'Itens que merecem revisão'))}</div>
                </div>
            </div>

            <div class="dashboard-bottom-grid">
                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">Atividade recente</h2>
                            <p class="card-subtitle">Últimas versões salvas em produtos e serviços ativos.</p>
                        </div>
                        <button type="button" class="btn btn-ghost btn-sm" id="dash-history-btn">Ver histórico</button>
                    </div>
                    <div class="table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Item / versão</th>
                                    <th>Data</th>
                                    <th class="num">Preço sugerido</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentPricings.length ? recentPricings.map(p => `
                                    <tr>
                                        <td>${Formatter.escapeHtml(p.itemNome)} <span class="mono" style="color:var(--color-silver);">v${p.versao}</span></td>
                                        <td>${Formatter.dateTime(p.criadoEm)}</td>
                                        <td class="num">${Formatter.brl(p.precoSugerido)}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="3">Nenhuma precificação vinculada a item ativo.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    <p class="card-subtitle" style="margin-top:12px;">A atividade mostra registros salvos; não representa vendas ou faturamento.</p>
                </section>

                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">Insights do seu negócio</h2>
                            <p class="card-subtitle">Leituras objetivas com base nas informações cadastradas no negócio.</p>
                        </div>
                    </div>
                    <div id="dash-insights-content"></div>
                </section>
            </div>
        `;

        document.getElementById('dash-history-btn')?.addEventListener('click', () => UI.navigate('historico'));

        const insightsContainer = document.getElementById('dash-insights-content');
        if (activePricingRecords.length === 0) {
            insightsContainer.innerHTML = `
                <div class="nilo-spotlight" style="border:0;padding:8px 0;background:transparent;">
                    <div class="nilo-avatar-box">
                        <img src="${NILO_ASSETS.boasVindas}" alt="Nilo dando boas-vindas" class="nilo-figure nilo-float">
                    </div>
                    <div>
                        <h3 style="font-size:20.8px;font-weight:600;margin-bottom:6px;">Olá! Sou o Nilo, seu apoio analítico.</h3>
                        <p style="font-size:16.9px;color:var(--color-silver);margin-bottom:14px;">
                            Cadastre sua primeira precificação para acompanhar custos, margens planejadas e recomendações do negócio.
                        </p>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            <button type="button" class="btn btn-primary btn-sm" id="dash-empty-start">Criar primeira precificação</button>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('dash-empty-start')?.addEventListener('click', () => UI.navigate('precificacao'));
        } else {
            const niloPose = belowTargetCount > 0 ? NILO_ASSETS.recomendacao : NILO_ASSETS.analisando;
            insightsContainer.innerHTML = `
                <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px;">
                    <div class="nilo-avatar-box-sm">
                        <img src="${niloPose}" alt="Nilo analisando indicadores" class="nilo-figure nilo-float">
                    </div>
                    <p style="font-size:16.9px;color:var(--color-silver);padding-top:6px;">
                        ${belowTargetCount > 0
                            ? 'Identifiquei pontos de atenção nas suas margens planejadas. Vale revisar os itens destacados antes de atualizar sua tabela de vendas.'
                            : (activePricingCount === 0
                                ? 'Ainda não há margens planejadas válidas nas últimas versões dos itens ativos para fazer essa leitura.'
                                : (belowTargetCount === null
                                    ? 'As margens planejadas dos itens ativos estão disponíveis para acompanhamento. Defina uma meta em Meu negócio se quiser compará-las.'
                                    : 'As margens planejadas dos itens ativos estão na meta ou acima dela. Isso não representa vendas realizadas.'))}
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

            <form id="business-form" class="surface-card" novalidate>
                <div style="margin-bottom:22px;">
                    <div class="field-label" style="margin-bottom:10px;">Segmento principal de atuação</div>
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
                        <label class="field-label" for="biz-margem-meta"><span>Meta de margem da empresa (%)</span>${fieldInfoIcon('Defina uma meta de margem para acompanhar seus resultados. Se não tiver uma meta, deixe em branco.')}</label>
                        <input id="biz-margem-meta" class="field-input mono" type="text" inputmode="decimal" value="${b.margemMeta ?? ''}" placeholder="Ex: 25">
                                            </div>
                    <div class="form-field">
                        <label class="field-label" for="biz-nome">Nome do negócio ${fieldRequiredMark(true)}</label>
                        <input id="biz-nome" class="field-input" type="text" required maxlength="160" value="${Formatter.escapeHtml(b.nomeNegocio)}" placeholder="Ex: Padaria Trigo & Cia ou Studio Silva">
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
                        <label class="field-label" for="biz-regime"><span>Enquadramento / Regime (informativo)</span>${fieldInfoIcon('Informe seu enquadramento apenas para referência. O ValorizAI não presume alíquotas nem substitui orientação contábil.')}</label>
                        <input id="biz-regime" class="field-input" type="text" value="${Formatter.escapeHtml(b.regimeInformativo)}" placeholder="Ex: MEI, Simples Nacional, Autônomo">
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

        document.getElementById('business-form').addEventListener('submit', async e => {
            e.preventDefault();
            const form = e.currentTarget;
            const submitButton = form.querySelector('button[type="submit"]');
            const nomeNegocio = document.getElementById('biz-nome').value.trim();
            const margemMeta = Formatter.parseNumber(document.getElementById('biz-margem-meta').value);
            if (!nomeNegocio) {
                UI.toast('Informe o nome do negócio para continuar.', 'error');
                document.getElementById('biz-nome').focus();
                return;
            }
            if (margemMeta !== null && (!Number.isFinite(margemMeta) || margemMeta < 0 || margemMeta >= 100)) {
                UI.toast('Informe uma meta entre 0% e 99%, ou deixe o campo vazio.', 'error');
                return;
            }

            const businessPayload = {
                nomeNegocio,
                empreendedor: document.getElementById('biz-empreendedor').value.trim(),
                margemMeta,
                segmento: selectedSegment,
                modeloOperacao: document.getElementById('biz-modelo').value,
                regimeInformativo: document.getElementById('biz-regime').value.trim(),
                descricao: document.getElementById('biz-descricao').value.trim(),
                cidadeUf: document.getElementById('biz-cidade').value.trim(),
                observacoes: document.getElementById('biz-obs').value.trim()
            };
            const config = window.VALORIZAI_CONFIG || {};
            const authClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
            submitButton.disabled = true;
            submitButton.textContent = 'Salvando…';

            try {
                const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
                const session = sessionData?.session;
                if (sessionError || !session?.access_token) throw new Error('Sua sessão expirou. Entre novamente.');

                const response = await fetch('/api/business/profile', {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: businessPayload.nomeNegocio,
                        sector: businessPayload.segmento || null,
                        description: businessPayload.descricao || null,
                        operating_model: businessPayload.modeloOperacao || null,
                        target_margin_percent: businessPayload.margemMeta,
                        additional_data: {
                            entrepreneur_name: businessPayload.empreendedor || null,
                            tax_regime: businessPayload.regimeInformativo || null,
                            location_text: businessPayload.cidadeUf || null,
                            notes: businessPayload.observacoes || null
                        }
                    })
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || !result.success || !result.data?.business) {
                    throw new Error(result.error?.message || 'Não foi possível salvar seu perfil agora.');
                }

                const saved = result.data.business;
                const additional = saved.additional_data || {};
                WorkspaceStore.state.business = {
                    ...WorkspaceStore.state.business,
                    nomeNegocio: saved.name || '',
                    empreendedor: additional.entrepreneur_name || '',
                    margemMeta: saved.target_margin_percent ?? null,
                    segmento: saved.sector === 'servicos' ? 'servico' : (saved.sector || ''),
                    modeloOperacao: saved.operating_model || '',
                    regimeInformativo: additional.tax_regime || '',
                    descricao: saved.description || '',
                    cidadeUf: additional.location_text || '',
                    observacoes: additional.notes || '',
                    atualizadoEm: saved.updated_at || new Date().toISOString()
                };
                const locallySaved = WorkspaceStore.save();
                UI.updateChrome();
                UI.renderCurrentView();
                UI.toast(
                    locallySaved
                        ? 'Perfil salvo na sua conta.'
                        : 'Perfil salvo na sua conta. Não foi possível atualizar a cópia deste navegador.',
                    locallySaved ? 'success' : 'info'
                );
            } catch (error) {
                UI.toast(error.message || 'Não foi possível salvar seu perfil. Tente novamente.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Salvar informações';
            }
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
                                            <div style="font-size:15.6px;color:var(--color-silver);">${Formatter.escapeHtml(item.categoria || 'Sem categoria')} · Cadastro ${Formatter.dateShort(item.criadoEm)}</div>
                                        </td>
                                        <td>
                                            <div>${SETORES[item.setor]?.nome || item.setor}</div>
                                            <div style="font-size:15.6px;color:var(--color-silver);">${Formatter.escapeHtml(item.tipo || '—')}</div>
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
                        <label class="field-label" for="modal-item-nome">Nome do produto ou serviço ${fieldRequiredMark(true)}</label>
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
                body.querySelector('#cat-item-form').addEventListener('submit', async e => {
                    e.preventDefault();
                    const submit = body.querySelector('button[type="submit"]');
                    const nome = body.querySelector('#modal-item-nome').value.trim();
                    const errEl = body.querySelector('#err-item-nome');
                    if (!nome) {
                        errEl.textContent = 'Informe o nome do produto ou serviço.';
                        errEl.classList.remove('hidden');
                        body.querySelector('#modal-item-nome').classList.add('has-error');
                        return;
                    }
                    const statusLabel = body.querySelector('#modal-item-status').value;
                    const payload = {
                        name: nome,
                        sector: setorSelect.value === 'servico' ? 'servicos' : setorSelect.value,
                        item_type: setorSelect.value === 'servico' ? 'servico' : 'produto',
                        category: body.querySelector('#modal-item-categoria').value.trim() || null,
                        unit: unidadeInput.value.trim() || SETORES[setorSelect.value].unidadePadrao,
                        description: body.querySelector('#modal-item-desc').value.trim() || null,
                        status: statusLabel === 'Arquivado' ? 'archived' : 'active',
                        additional_data: {
                            subtype: tipoInput.value.trim() || SETORES[setorSelect.value].itemTipoPadrao,
                            status_label: statusLabel === 'Em revisão' ? 'Em revisão' : (statusLabel === 'Arquivado' ? 'Arquivado' : 'Ativo')
                        }
                    };
                    submit.disabled = true;
                    try {
                        const saved = isEdit
                            ? await ApiService.updateProduct(existing.id, payload)
                            : await ApiService.createProduct(payload);
                        const item = mapProductFromApi(saved);
                        if (isEdit) {
                            Object.assign(existing, item);
                            UI.toast('Item atualizado no catálogo.', 'success');
                        } else {
                            WorkspaceStore.state.catalog.unshift(item);
                            UI.toast('Item adicionado ao catálogo.', 'success');
                        }
                        WorkspaceStore.save();
                        UI.closeModal();
                        UI.updateChrome();
                        UI.renderCurrentView();
                    } catch (error) {
                        UI.toast(error.message || 'Não foi possível salvar o item. Seus dados locais foram preservados.', 'error');
                    } finally {
                        submit.disabled = false;
                    }
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

            <h3 style="font-size:19.5px;font-weight:600;margin-bottom:10px;">Histórico preservado de precificações (${itemPricings.length})</h3>
            ${itemPricings.length === 0 ? `
                <p style="font-size:16.9px;color:var(--color-silver);margin-bottom:16px;">Este item ainda não possui precificações salvas.</p>
            ` : `
                <div class="table-wrap" style="margin-bottom:16px;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Versão</th>
                                <th>Data</th>
                                <th class="num">Custo</th>
                                <th class="num">Preço</th>
                                <th class="num" title="Percentual definido como objetivo na formação do preço. Não é a margem bruta calculada sobre o preço de venda.">Margem planejada</th>
                                <th class="num" title="(Preço sugerido − Custo total) ÷ Preço sugerido.">Margem bruta</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemPricings.map(p => {
                                const price = nullableFiniteNumber(p.precoSugerido);
                                const cost = nullableFiniteNumber(p.custoTotal);
                                const grossMargin = price !== null && price > 0 && cost !== null
                                    ? ((price - cost) / price) * 100
                                    : null;
                                const grossMarginColor = grossMargin === null
                                    ? 'var(--text-secondary)'
                                    : (grossMargin >= 0 ? '#55D6A0' : '#E87979');
                                return `
                                    <tr>
                                        <td class="mono">v${p.versao}</td>
                                        <td>${Formatter.dateShort(p.criadoEm)}</td>
                                        <td class="num">${Formatter.brl(p.custoTotal)}</td>
                                        <td class="num" style="color:var(--color-emerald);font-weight:600;">${Formatter.brl(p.precoSugerido)}</td>
                                        <td class="num" title="Percentual planejado na formação do preço">${Formatter.percent(p.margemPlanejada)}</td>
                                        <td class="num mono" style="color:${grossMarginColor};font-weight:600;" title="Margem bruta = (preço sugerido − custo total) ÷ preço sugerido">${grossMargin === null ? '—' : Formatter.percent(grossMargin)}</td>
                                    </tr>
                                `;
                            }).join('')}
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
                    <button type="button" class="btn btn-ghost btn-sm" id="wiz-reset-btn" title="Limpa o rascunho atual e volta à primeira etapa. Não altera precificações salvas." aria-label="Limpar e recomeçar a precificação">Limpar e recomeçar</button>
                </div>
            </div>

            ${hasPendingDraftBanner ? `
                <div class="notice-bar">
                    <div>
                        <div class="notice-bar-text"><strong>Rascunho encontrado:</strong> ${Formatter.escapeHtml(savedDraft.itemNome || 'Precificação em andamento')} (Etapa ${savedDraft.step} de 5)</div>
                        <div class="notice-bar-sub">Última atualização: ${Formatter.dateTime(savedDraft.updatedAt)}</div>
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
            const confirmed = window.confirm('Deseja limpar os dados desta precificação e começar novamente? O rascunho atual será descartado, mas as precificações já salvas no histórico não serão alteradas.');
            if (!confirmed) return;
            UI.wizard = defaultWizardDraft();
            DraftStore.clear();
            renderWizard(root);
            UI.toast('Formulário limpo. Você pode começar uma nova precificação.', 'info');
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
                            <label class="field-label" for="wiz-catalog-select"><span>Item do catálogo</span> ${fieldInfoIcon('Selecione o produto ou serviço que já está cadastrado. O ValorizAI usará os dados de identificação existentes para criar uma nova versão de precificação.')} ${fieldRequiredMark(true)}</label>
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
                        <div class="field-label" style="margin-bottom:8px;"><span>Setor da operação</span> ${fieldInfoIcon('Escolha a atividade principal relacionada a este item: Comércio para revenda, Indústria para fabricação ou Serviços para trabalhos e atendimentos.')} ${fieldRequiredMark(true)}</div>
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
                            <label class="field-label" for="wiz-item-nome"><span>Nome do produto ou serviço</span> ${fieldInfoIcon('Digite o nome pelo qual você identifica e vende este item. Exemplo: Café especial 250 g ou Instalação elétrica residencial.')} ${fieldRequiredMark(true)}</label>
                            <input id="wiz-item-nome" class="field-input" type="text" value="${Formatter.escapeHtml(w.itemNome)}" placeholder="Ex: Café especial 250g ou Revisão elétrica">
                            <span class="field-error hidden" id="err-s1-nome"></span>
                        </div>
                        <div class="form-field">
                            <label class="field-label" for="wiz-item-unidade"><span>Unidade de comercialização</span> ${fieldInfoIcon('É a unidade usada para vender ou cobrar o item. Exemplos: Unidade, Caixa, Quilograma, Hora, Diária ou Projeto. Use a mesma unidade ao informar os custos e definir o preço.')} ${fieldRequiredMark(true)}</label>
                            <input id="wiz-item-unidade" class="field-input" type="text" value="${Formatter.escapeHtml(w.unidade || SETORES[w.setor].unidadePadrao)}" placeholder="Ex: Unidade, Hora, Projeto, Caixa">
                            <span class="field-error hidden" id="err-s1-unidade"></span>
                        </div>
                        <div class="form-field form-field-full">
                            <label class="field-label" for="wiz-item-desc"><span>Descrição complementar</span> ${fieldInfoIcon('Adicione detalhes que ajudem a diferenciar este item de outros parecidos, como tamanho, material, modelo ou tipo de atendimento. Este campo é opcional.')}</label>
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

        container.innerHTML = `
            <div class="surface-card">
                <div class="card-header">
                    <div>
                        <h2 class="card-title">Etapa 2 — Estrutura de custos (${sectorCfg.nome})</h2>
                        <p class="card-subtitle">Item: <strong>${Formatter.escapeHtml(w.itemNome)}</strong> · Unidade: ${Formatter.escapeHtml(w.unidade)}. ${Formatter.escapeHtml(sectorCfg.orientacaoCustos)}</p>
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
                                    <span>${Formatter.escapeHtml(field.label)}</span>
                                    ${fieldInfoIcon(field.help)}
                                    ${fieldRequiredMark(field.obrigatorio)}
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
                <p style="font-size:16.9px;color:var(--color-silver);margin-bottom:16px;">Informe o total de despesas fixas mensais (aluguel, energia, sistemas) e a quantidade média de unidades vendidas no mês para preencher o rateio por unidade sem misturar períodos.</p>
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
                <div id="aux-preview" style="margin-top:16px;font-size:18.2px;color:var(--color-emerald);" class="mono"></div>
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
                label: 'Quanto do preço de venda você quer manter como lucro? (%)',
                obrigatorio: true,
                placeholder: 'Ex: 20',
                help: 'É a parte do preço final que deve sobrar como lucro estimado depois de pagar os custos, impostos e taxas informados. Exemplo: em uma venda de R$ 100, uma margem de 20% representa R$ 20 de lucro estimado. Não é o mesmo que markup.'
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
                                <span>${Formatter.escapeHtml(f.label)}</span>
                                ${fieldInfoIcon(f.help)}
                                ${fieldRequiredMark(f.obrigatorio)}
                            </label>
                            <div class="input-with-prefix">
                                <input id="tax-${f.id}" class="field-input mono has-suffix" type="text" inputmode="decimal" data-tax-field="${f.id}" value="${Formatter.escapeHtml(t[f.id] ?? '')}" placeholder="${f.placeholder}">
                                <span class="input-suffix">%</span>
                            </div>
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
                            <h3 style="font-size:19.5px;font-weight:600;">Identificação</h3>
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
                            <h3 style="font-size:19.5px;font-weight:600;">Impostos, taxas e margem</h3>
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
                        <h3 style="font-size:19.5px;font-weight:600;">Custos declarados por categoria</h3>
                        <button type="button" class="btn btn-ghost btn-sm" data-goto-step="2">Editar custos</button>
                    </div>
                    <div class="grid-2">
                        ${Array.from(grouped.entries()).map(([catName, fields]) => `
                            <div>
                                <div style="font-size:15.6px;font-weight:600;color:var(--color-blue);margin-bottom:8px;">${catName}</div>
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

            try {
                const { costs, taxes } = normalizeNumericInputsForCalculation(w.setor, w.costs, w.taxes);
                const result = await ApiService.calcularPreviaPrecificacao({ setor: w.setor, costs, taxes });
                w.previewResult = { ...result, costsNormalized: costs, taxesNormalized: taxes };
                w.step = 5;
                DraftStore.save(w);
                renderWizard(document.getElementById('main-viewport'));
            } catch (error) {
                UI.toast(error.message || 'Não foi possível calcular a precificação.', 'error');
                btn.disabled = false;
                btn.textContent = 'Calcular recomendação de preço';
            }
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
                    <div class="notice-bar-text"><strong>Prévia de preço calculada</strong> com base nas informações preenchidas. Revise os valores antes de usar esta recomendação.</div>
                    <div class="notice-bar-sub">A margem é calculada sobre o preço de venda, não sobre o custo. Neste resultado, ${Formatter.percent(r.margemPlanejada)} de margem representam ${Formatter.brl(r.lucroEstimado)} de lucro estimado por ${Formatter.escapeHtml(w.unidade)}.</div>
                </div>
            </div>

            <div class="grid-2" style="margin-bottom:20px;">
                <section class="surface-card pricing-result-metrics">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px;">
                        <div>
                            <div class="kpi-label">Preço de venda sugerido · ${Formatter.escapeHtml(w.unidade)}</div>
                            <div class="mono" style="font-size:44.2px;font-weight:700;color:var(--color-emerald);line-height:1.15;margin-top:4px;">${Formatter.brl(r.precoSugerido)}</div>
                            <div style="font-size:16.9px;color:var(--color-silver);margin-top:6px;">Item: <strong style="color:var(--color-cloud);">${Formatter.escapeHtml(w.itemNome)}</strong> · ${SETORES[w.setor]?.nome}</div>
                        </div>
                        <div class="nilo-avatar-box-sm">
                            <img src="${targetMargin === null ? NILO_ASSETS.analisando : (healthyMargin ? NILO_ASSETS.comemorando : NILO_ASSETS.recomendacao)}" alt="Nilo resultado da precificação" class="nilo-figure nilo-enter">
                        </div>
                    </div>

                    <div class="grid-2" style="gap:12px;">
                        <div class="pricing-result-metric-card" style="padding:14px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                            <div class="kpi-label">Custo total unitário</div>
                            <div class="kpi-value" style="font-size:26.0px;margin-top:4px;">${Formatter.brl(r.custoTotal)}</div>
                        </div>
                        <div class="pricing-result-metric-card" style="padding:14px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                            <div class="kpi-label">Multiplicador (Markup)</div>
                            <div class="kpi-value" style="font-size:26.0px;color:var(--color-blue);margin-top:4px;">${r.markup.toFixed(2)}x</div>
                        </div>
                        <div class="pricing-result-metric-card" style="padding:14px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                            <div class="kpi-label">Impostos e taxas (${Formatter.percent(r.percentualImpostosTaxas)})</div>
                            <div class="kpi-value warning" style="font-size:26.0px;margin-top:4px;">${Formatter.brl(r.valorImpostosTaxas)}</div>
                        </div>
                        <div class="pricing-result-metric-card" style="padding:14px;border-radius:var(--radius-md);background:var(--color-midnight);border:var(--border-hairline);">
                            <div class="kpi-label">Lucro estimado / unidade (${Formatter.percent(r.margemPlanejada)})</div>
                            <div class="kpi-value positive" style="font-size:26.0px;margin-top:4px;">${Formatter.brl(r.lucroEstimado)}</div>
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
                            <span class="mono" style="font-size:15.6px;">${Formatter.brl(r.custoTotal)} (${Formatter.percent(pctCusto)})</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-label"><span class="legend-swatch" style="background:#EF4444"></span> Impostos</span>
                            <span class="mono" style="font-size:15.6px;">${Formatter.brl(r.valorImpostos)} (${Formatter.percent(pctImposto)})</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-label"><span class="legend-swatch" style="background:#F59E0B"></span> Taxas e comissões</span>
                            <span class="mono" style="font-size:15.6px;">${Formatter.brl(r.valorTaxasComissoes)} (${Formatter.percent(pctTaxas)})</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-label"><span class="legend-swatch" style="background:#55D6A0"></span> Lucro estimado</span>
                            <span class="mono" style="font-size:15.6px;">${Formatter.brl(r.lucroEstimado)} (${Formatter.percent(pctLucro)})</span>
                        </div>
                    </div>

                    ${warnings.length ? `
                        <div style="margin-top:18px;padding-top:14px;border-top:var(--border-hairline);">
                            <div style="font-size:15.6px;font-weight:600;color:var(--color-warning);margin-bottom:6px;">Indicadores de atenção</div>
                            <ul style="margin:0;padding-left:18px;font-size:16.9px;color:var(--color-silver);display:flex;flex-direction:column;gap:4px;">
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

        document.getElementById('wiz-s5-save').addEventListener('click', async () => {
            const saveButton = document.getElementById('wiz-s5-save');
            saveButton.disabled = true;
            try {
            const savedPricing = await persistPricingToWorkspace({
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
            } catch (error) {
                UI.toast(error.message || 'Não foi possível salvar a precificação. O histórico local foi preservado.', 'error');
            } finally {
                saveButton.disabled = false;
            }
        });
    }

    async function persistPricingToWorkspace({ catalogItemId, itemNome, setor, unidade, descricao, result, pricingType = 'full' }) {
        let item = catalogItemId
            ? WorkspaceStore.state.catalog.find(c => c.id === catalogItemId)
            : null;

        if (!item) {
            const created = await ApiService.createProduct({
                name: itemNome,
                description: descricao || null,
                category: 'Geral',
                item_type: setor === 'servico' ? 'servico' : 'produto',
                sector: setor === 'servico' ? 'servicos' : setor,
                unit: unidade || SETORES[setor]?.unidadePadrao || 'Unidade',
                status: 'active',
                additional_data: { subtype: SETORES[setor]?.itemTipoPadrao || 'Item', status_label: 'Ativo' }
            });
            item = mapProductFromApi(created);
        }

        const existingVersions = WorkspaceStore.state.pricings.filter(p => p.catalogItemId === item.id);
        const nextVersion = existingVersions.length ? Math.max(...existingVersions.map(p => p.versao)) + 1 : 1;
        const createdAt = new Date().toISOString();
        const uiRecord = {
            versao: nextVersion,
            custoTotal: result.custoTotal,
            precoSugerido: result.precoSugerido,
            markup: result.markup,
            margemPlanejada: result.margemPlanejada,
            percentualImpostosTaxas: result.percentualImpostosTaxas,
            valorImpostosTaxas: result.valorImpostosTaxas,
            lucroEstimado: result.lucroEstimado,
            fonteCalculo: result.fonteCalculo,
            categoriasCusto: result.categoriasCusto
        };
        const saved = await ApiService.createPricing({
            product_id: item.id,
            pricing_type: pricingType,
            unit: item.unidade,
            quantity: 1,
            custo_total: result.custoTotal,
            preco_sugerido: result.precoSugerido,
            markup: result.markup,
            margem_lucro: result.margemPlanejada,
            impostos: result.percentualImpostosTaxas,
            setor: setor === 'servico' ? 'servicos' : setor,
            desired_margin_percent: result.taxesNormalized?.margemDesejada ?? null,
            input_snapshot: {
                item_name: item.nome,
                sector: setor,
                costs: result.costsNormalized || {},
                taxes: result.taxesNormalized || {},
                created_at: createdAt
            },
            result_snapshot: { ui_record: uiRecord },
            calculation_version: 'frontend-preview-v1'
        });
        if (!WorkspaceStore.state.catalog.some(c => c.id === item.id)) WorkspaceStore.state.catalog.unshift(item);
        const authoritative = saved.result_snapshot?.server_calculation || {};
        const record = {
            id: String(saved.id),
            catalogItemId: item.id,
            itemNome: item.nome,
            versao: nextVersion,
            setor,
            unidade: item.unidade,
            criadoEm: saved.data_criacao || createdAt,
            custoTotal: nullableFiniteNumber(saved.custo_total),
            precoSugerido: nullableFiniteNumber(saved.preco_sugerido),
            markup: nullableFiniteNumber(saved.markup),
            margemBrutaValor: getGrossMargin({ precoSugerido: saved.preco_sugerido, custoTotal: saved.custo_total }).amount,
            margemBruta: getGrossMargin({ precoSugerido: saved.preco_sugerido, custoTotal: saved.custo_total }).percent,
            margemPlanejada: nullableFiniteNumber(saved.desired_margin_percent ?? saved.margem_lucro),
            percentualImpostosTaxas: nullableFiniteNumber(saved.impostos),
            valorImpostosTaxas: nullableFiniteNumber(authoritative.valorImpostosTaxas),
            lucroEstimado: nullableFiniteNumber(authoritative.lucroEstimado),
            fonteCalculo: saved.calculation_version || 'server-v1',
            categoriasCusto: Array.isArray(authoritative.categoriasCusto) ? authoritative.categoriasCusto : [],
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
                    <p class="page-subtitle">Compare cenários de preço sem alterar seu histórico. Você escolhe se deseja salvar um resultado no catálogo.</p>
                </div>
            </div>

            <div class="notice-bar">
                <div class="notice-bar-text"><strong>Simulação não salva automaticamente:</strong> os resultados só entram no histórico se você decidir adicioná-los ao catálogo.</div>
            </div>

            <div class="grid-2">
                <section class="surface-card">
                    <h2 class="card-title" style="margin-bottom:14px;">Parâmetros da hipótese</h2>
                    <p class="card-subtitle" style="margin-bottom:14px;">${Formatter.escapeHtml(sectorCfg.orientacaoCustos)} Na simulação rápida, são exibidos os principais campos de cada setor.</p>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label" for="sim-nome">Nome da simulação</label>
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
                                <label class="field-label" for="sim-cost-${f.id}"><span>${Formatter.escapeHtml(f.label)}</span>${fieldInfoIcon(f.help)}</label>
                                <input id="sim-cost-${f.id}" class="field-input mono" type="text" inputmode="decimal" data-sim-cost="${f.id}" value="${Formatter.escapeHtml(sim.costs[f.id] ?? '')}" placeholder="${f.placeholder}">
                            </div>
                        `).join('')}

                        <div class="form-field">
                            <label class="field-label" for="sim-taxas"><span>Impostos e taxas sobre a venda (%)</span>${fieldInfoIcon('Some os percentuais cobrados sobre cada venda, como imposto, maquininha, comissão e taxa de aplicativo. Exemplo: 6% + 3% = 9%.')}</label>
                            <input id="sim-taxas" class="field-input mono" type="text" inputmode="decimal" value="${Formatter.escapeHtml(sim.taxasTotais)}" placeholder="Ex: 10">
                        </div>
                        <div class="form-field">
                            <label class="field-label" for="sim-margem"><span>Quanto você quer ganhar sobre o preço de venda? (%)</span>${fieldInfoIcon('É a parte do preço que deve sobrar como lucro estimado. Exemplo: em R$ 100 de venda, 20% de margem representam R$ 20.')}${fieldRequiredMark(true)}</label>
                            <input id="sim-margem" class="field-input mono" type="text" inputmode="decimal" value="${Formatter.escapeHtml(sim.margemDesejada)}" placeholder="Ex: 20">
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
                        <div class="mono" style="font-size:41.6px;font-weight:700;color:var(--color-emerald);margin-top:4px;">${Formatter.brl(res.precoSugerido)}</div>
                        <div style="font-size:15.6px;color:var(--color-silver);margin-top:4px;">Não salvo no catálogo nem no histórico</div>
                    </div>
                    <div class="nilo-avatar-box-sm">
                        <img src="${NILO_ASSETS.recomendacao}" alt="Nilo recomendando" class="nilo-figure nilo-enter">
                    </div>
                </div>

                <div class="kv-list simulation-result-details" style="margin-bottom:14px;">
                    <div class="kv-row"><span class="kv-key">Custo total considerado</span><span class="kv-val mono">${Formatter.brl(res.custoTotal)}</span></div>
                    <div class="kv-row"><span class="kv-key">Markup (multiplicador do custo)</span><span class="kv-val mono">${Formatter.multiplier(res.markup)}</span></div>
                    <div class="kv-row"><span class="kv-key">Impostos e taxas (${Formatter.percent(res.percentualImpostosTaxas)})</span><span class="kv-val mono" style="color:var(--color-warning);">${Formatter.brl(res.valorImpostosTaxas)}</span></div>
                    <div class="kv-row"><span class="kv-key">Lucro estimado (${Formatter.percent(res.margemPlanejada)})</span><span class="kv-val mono" style="color:var(--color-emerald);">${Formatter.brl(res.lucroEstimado)}</span></div>
                </div>

                <p class="simulation-result-explainer">A margem mostra quanto do preço de venda fica como lucro estimado. Já o markup mostra quantas vezes o custo foi multiplicado para chegar ao preço.</p>

                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button type="button" class="btn btn-primary" id="sim-promote-btn">Adicionar ao catálogo e salvar no histórico</button>
                    <button type="button" class="btn btn-secondary" id="sim-ai-btn">Analisar simulação com Consultor IA</button>
                </div>
            `;

            document.getElementById('sim-promote-btn').addEventListener('click', async () => {
                const promoteButton = document.getElementById('sim-promote-btn');
                promoteButton.disabled = true;
                const nomeFinal = sim.nome.trim() || `Item simulado (${SETORES[sim.setor].nome})`;
                try {
                    const saved = await persistPricingToWorkspace({
                        catalogItemId: '',
                        itemNome: nomeFinal,
                        setor: sim.setor,
                        unidade: SETORES[sim.setor].unidadePadrao,
                        descricao: 'Originado de simulação rápida.',
                        result: res,
                        pricingType: 'quick'
                    });
                    UI.updateChrome();
                    UI.toast(`"${saved.itemNome}" adicionado ao catálogo e salvo no histórico.`, 'success');
                    UI.navigate('historico');
                } catch (error) {
                    UI.toast(error.message || 'Não foi possível salvar a simulação.', 'error');
                } finally {
                    promoteButton.disabled = false;
                }
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
            const runButton = document.getElementById('sim-run-btn');
            runButton.disabled = true;
            try {
                const res = await ApiService.calcularPreviaPrecificacao({ setor: sim.setor, costs, taxes });
                UI.simulacaoResult = { ...res, costsNormalized: costs, taxesNormalized: taxes };
                renderSimResult();
            } catch (error) {
                UI.toast(error.message || 'Não foi possível calcular a simulação.', 'error');
            } finally {
                const currentButton = document.getElementById('sim-run-btn');
                if (currentButton) currentButton.disabled = false;
            }
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
                                <th class="num">Margem bruta</th>
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
                                    <td class="num" title="Markup = preço sugerido dividido pelo custo total. Não é um percentual de margem.">${Formatter.multiplier(p.markup)}</td>
                                    <td class="num">${formatNullablePercent(getGrossMargin(p).percent)}</td>
                                    <td class="num" style="${target === null || p.margemPlanejada === null ? '' : `color:${p.margemPlanejada < target ? 'var(--color-warning)' : 'var(--color-emerald)'};`}">${formatNullablePercent(p.margemPlanejada)}</td>
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
                <div class="kv-row"><span class="kv-key" title="Preço sugerido dividido pelo custo total; não representa margem percentual.">Markup (preço ÷ custo)</span><span class="kv-val mono">${Formatter.multiplier(p.markup)}</span></div>
                <div class="kv-row"><span class="kv-key">Margem bruta</span><span class="kv-val mono">${formatNullablePercent(getGrossMargin(p).percent)} (${getGrossMargin(p).amount === null ? '—' : Formatter.brl(getGrossMargin(p).amount)})</span></div>
                <div class="kv-row"><span class="kv-key">Margem planejada</span><span class="kv-val mono">${formatNullablePercent(p.margemPlanejada)}</span></div>
                <div class="kv-row"><span class="kv-key">Impostos e taxas (${Formatter.percent(p.percentualImpostosTaxas)})</span><span class="kv-val mono">${Formatter.brl(p.valorImpostosTaxas)}</span></div>
                <div class="kv-row"><span class="kv-key">Lucro estimado / unidade</span><span class="kv-val mono">${Formatter.brl(p.lucroEstimado)}</span></div>
            </div>

            <h3 style="font-size:18.2px;font-weight:600;margin-bottom:10px;">Composição dos custos</h3>
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
        const parsedTarget = nullableFiniteNumber(business.margemMeta);
        const target = parsedTarget !== null && parsedTarget >= 0 && parsedTarget < 100 ? parsedTarget : null;
        const activePricingRecords = getActivePricingRecords(pricings, catalog);
        const activeCatalogItems = catalog.filter(item => item.status !== 'Arquivado');
        const itemsWithPricing = activeCatalogItems.filter(item => activePricingRecords.some(p => p.catalogItemId === item.id));

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Custos e rentabilidade</h1>
                    <p class="page-subtitle">Indicadores calculados a partir dos custos e das precificações cadastradas. Não incluem vendas realizadas ou faturamento.</p>
                </div>
            </div>
            <div id="analises-body"></div>
        `;

        const body = document.getElementById('analises-body');
        if (activePricingRecords.length === 0) {
            body.innerHTML = `
                <div class="surface-card empty-state">
                    <div class="empty-state-nilo">
                        <img src="${NILO_ASSETS.analisando}" alt="Nilo" class="nilo-figure nilo-float">
                    </div>
                    <h2 class="empty-state-title">Sem precificações de itens ativos</h2>
                    <p class="empty-state-desc">As análises atuais consideram apenas itens ativos do catálogo. Os registros de itens arquivados continuam disponíveis no Histórico.</p>
                    <div class="empty-state-actions">
                        <button type="button" class="btn btn-primary" id="ana-start-btn">Ir para Produtos e serviços</button>
                    </div>
                </div>
            `;
            document.getElementById('ana-start-btn').addEventListener('click', () => UI.navigate('catalogo'));
            return;
        }

        let selectedId = UI.analysisSelectedItemId;
        if (selectedId !== 'all' && !itemsWithPricing.some(item => item.id === selectedId)) {
            selectedId = 'all';
            UI.analysisSelectedItemId = 'all';
        }
        const filteredPricings = selectedId === 'all'
            ? activePricingRecords
            : activePricingRecords.filter(p => p.catalogItemId === selectedId);

        const ordered = [...filteredPricings].sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
        const latestFocus = ordered[ordered.length - 1];
        const latestItem = [...itemsWithPricing].map(item => ({
            item,
            latest: activePricingRecords.filter(p => p.catalogItemId === item.id)
                .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm)).at(-1)
        })).filter(entry => entry.latest)
            .sort((a, b) => new Date(b.latest.criadoEm) - new Date(a.latest.criadoEm))[0]?.item;
        let evolutionSelectedId = UI.analysisEvolutionSelectedItemId;
        if (!itemsWithPricing.some(item => item.id === evolutionSelectedId)) {
            evolutionSelectedId = latestItem?.id || itemsWithPricing[0]?.id || null;
            UI.analysisEvolutionSelectedItemId = evolutionSelectedId;
        }
        const evolutionPricings = activePricingRecords
            .filter(p => p.catalogItemId === evolutionSelectedId)
            .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
        const evolutionItem = itemsWithPricing.find(item => item.id === evolutionSelectedId);

        body.innerHTML = `
            <div class="surface-card" style="margin-bottom:20px;">
                <div class="toolbar" style="margin-bottom:0;">
                    <div class="toolbar-group">
                        <label for="ana-item-select" style="font-size:16.9px;font-weight:500;color:var(--color-silver);">Escopo geral:</label>
                        <select id="ana-item-select" class="field-select" style="width:auto;min-width:240px;">
                            <option value="all" ${selectedId === 'all' ? 'selected' : ''}>Todos os itens ativos (${activePricingRecords.length} registros)</option>
                            ${itemsWithPricing.map(item => `<option value="${item.id}" ${selectedId === item.id ? 'selected' : ''}>${Formatter.escapeHtml(item.nome)}</option>`).join('')}
                        </select>
                    </div>
                    <span style="font-size:15.6px;color:var(--color-silver);">Controla composição de custos, margens planejadas e histórico abaixo.</span>
                </div>
            </div>

            <div class="grid-2" style="margin-bottom:20px;">
                <section class="surface-card">
                    <div class="card-header analysis-evolution-header">
                        <div class="analysis-evolution-heading">
                            <h2 class="card-title">Evolução de preços e custos</h2>
                            <p class="card-subtitle">Selecione um item independentemente do escopo geral. Compare preço e custo por versão.</p>
                        </div>
                        <label class="analysis-evolution-select-wrap" for="ana-evolution-item-select">
                            <span>Item deste gráfico</span>
                            <select id="ana-evolution-item-select" class="field-select" aria-label="Selecionar produto ou serviço para o gráfico">
                                ${itemsWithPricing.map(item => `<option value="${Formatter.escapeHtml(item.id)}" ${evolutionSelectedId === item.id ? 'selected' : ''}>${Formatter.escapeHtml(item.nome)}</option>`).join('')}
                            </select>
                        </label>
                    </div>
                    <div id="ana-chart-evo"></div>
                </section>

                <section class="surface-card">
                    <div class="card-header">
                        <div>
                            <h2 class="card-title">Composição de custos por categoria</h2>
                            <p class="card-subtitle">${selectedId === 'all' ? 'Selecione um item para consultar a composição da sua versão mais recente.' : `Referência: ${Formatter.escapeHtml(latestFocus.itemNome)} (v${latestFocus.versao})`}</p>
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
                            <h2 class="card-title">Histórico de versões</h2>
                            <p class="card-subtitle">Registros do escopo selecionado; compare versões do mesmo item.</p>
                        </div>
                    </div>
                    <div class="table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Item / Versão</th>
                                    <th>Data e hora</th>
                                    <th class="num">Custo</th>
                                    <th class="num">Preço</th>
                                    <th class="num">Markup</th>
                                    <th class="num">Margem bruta</th>
                                    <th class="num">Margem planejada</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${[...ordered].reverse().slice(0, 8).map(p => `
                                    <tr>
                                        <td>${Formatter.escapeHtml(p.itemNome)} <span class="mono" style="color:var(--color-silver);">V${p.versao}</span></td>
                                        <td>${Formatter.dateTime(p.criadoEm)}</td>
                                        <td class="num">${Formatter.brl(p.custoTotal)}</td>
                                        <td class="num" style="color:var(--color-emerald);">${Formatter.brl(p.precoSugerido)}</td>
                                        <td class="num">${Formatter.multiplier(p.markup)}</td>
                                        <td class="num">${formatNullablePercent(getGrossMargin(p).percent)}</td>
                                        <td class="num">${formatNullablePercent(p.margemPlanejada)}</td>
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

        ChartRenderer.renderPriceEvolutionChart(document.getElementById('ana-chart-evo'), evolutionPricings);
        document.getElementById('ana-evolution-item-select').addEventListener('change', event => {
            UI.analysisEvolutionSelectedItemId = event.target.value;
            const selectedPricings = activePricingRecords
                .filter(p => p.catalogItemId === UI.analysisEvolutionSelectedItemId)
                .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
            ChartRenderer.renderPriceEvolutionChart(document.getElementById('ana-chart-evo'), selectedPricings);
        });

        if (selectedId === 'all') {
            document.getElementById('ana-chart-comp').innerHTML = '<div class="empty-state"><p class="empty-state-desc">A composição é exibida por item. Selecione um produto ou serviço para consultar sua versão mais recente.</p></div>';
        } else {
            ChartRenderer.renderCostDistributionChart(document.getElementById('ana-chart-comp'), latestFocus.categoriasCusto, latestFocus.custoTotal);
        }
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
                <aside class="surface-card nilo-profile-card">
                    <div class="nilo-profile-heading">
                        <div class="nilo-profile-avatar">
                            <img src="${UI.chatSending ? NILO_ASSETS.processando : NILO_ASSETS.apresentacao}" alt="Nilo, assistente do ValorizAI" class="nilo-figure ${UI.chatSending ? '' : 'nilo-float'}" id="ai-nilo-avatar">
                        </div>
                        <div class="nilo-profile-copy">
                            <h2>Nilo</h2>
                            <span>Assistente do ValorizAI</span>
                            <p>${ctx.setor && SETORES[ctx.setor] ? `Contexto atual: ${SETORES[ctx.setor].nome}` : 'Apoio para dúvidas sobre gestão, custos e decisões do negócio.'}</p>
                        </div>
                    </div>

                    <div class="form-field" style="margin-bottom:16px;">
                        <label class="field-label" for="ai-ctx-select">Contexto financeiro enviado</label>
                        <select id="ai-ctx-select" class="field-select">
                            ${contextOptions.map(opt => `<option value="${opt.id}" ${UI.activeConsultorContextId === opt.id ? 'selected' : ''}>${Formatter.escapeHtml(opt.text)}</option>`).join('')}
                        </select>
                    </div>

                    <div style="padding:14px;border-radius:var(--radius-md);background:var(--app-background);border:1px solid var(--border);">
                        <div style="font-size:15.6px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;">Contexto enviado à IA</div>
                        ${ctx.resumoFinanceiro ? `
                            <div class="kv-list">
                                <div class="kv-row"><span class="kv-key">Preço sugerido</span><span class="kv-val mono">${ctx.resumoFinanceiro.precoSugerido}</span></div>
                                <div class="kv-row"><span class="kv-key">Custo total</span><span class="kv-val mono">${ctx.resumoFinanceiro.totalCustos}</span></div>
                                <div class="kv-row"><span class="kv-key">Markup</span><span class="kv-val mono">${ctx.resumoFinanceiro.markup}</span></div>
                                <div class="kv-row"><span class="kv-key">Impostos e taxas</span><span class="kv-val mono">${ctx.resumoFinanceiro.taxaPercentual}</span></div>
                                <div class="kv-row"><span class="kv-key">Margem desejada</span><span class="kv-val mono">${ctx.resumoFinanceiro.margemPercentual}</span></div>
                            </div>
                        ` : '<p style="font-size:15.6px;color:var(--text-secondary);">Nenhum dado financeiro será enviado. O Nilo pode responder normalmente a perguntas gerais.</p>'}
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
            WorkspaceStore.state.niloConversationId = null;
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
                const data = await ApiService.enviarPerguntaIA({
                    pergunta,
                    setor: ctx.setor,
                    resumoFinanceiro: ctx.resumoFinanceiro,
                    detalhesCustos: ctx.detalhesCustos,
                    conversation_id: WorkspaceStore.state.niloConversationId
                });
                if (data.conversation_id) WorkspaceStore.state.niloConversationId = data.conversation_id;

                WorkspaceStore.state.chatHistory.push({
                    role: 'assistant',
                    text: data.resposta || 'Não houve retorno textual do consultor.',
                    at: new Date().toISOString()
                });
            } catch (err) {
                WorkspaceStore.state.chatHistory.push({
                    role: 'error',
                    text: 'Não foi possível responder agora. Verifique sua conexão e tente novamente em instantes.',
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
                    <p class="card-subtitle" id="account-user-email">Carregando informações da conta</p>
                </div>
            </section>
            <section class="surface-card account-details">
                <h2 class="card-title">Acesso e segurança</h2>
                <p class="card-subtitle">Sua senha não fica armazenada nem visível no ValorizAI.</p>
                <div class="account-detail-row"><span>Status do acesso</span><strong id="account-session-status">Verificando…</strong></div>
            </section>
        `;

        if (!supabaseLib?.createClient || !config.supabaseUrl || !config.supabaseAnonKey) {
            document.getElementById('account-user-name').textContent = 'Conta indisponível';
            document.getElementById('account-user-email').textContent = 'Não foi possível carregar as informações da conta.';
            document.getElementById('account-session-status').textContent = 'Não verificada';
            return;
        }

        const client = supabaseLib.createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        client.auth.getUser().then(({ data, error }) => {
            if (error || !data?.user) {
                document.getElementById('account-user-name').textContent = 'Acesso não confirmado';
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
        const { settings } = WorkspaceStore.state;

        root.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-heading">Configurações</h1>
                    <p class="page-subtitle">Personalize os alertas e a experiência durante o preenchimento das suas informações.</p>
                </div>
            </div>

            <div style="margin-bottom:20px;">
                <form id="settings-form" class="surface-card">
                    <h2 class="card-title" style="margin-bottom:6px;">Metas e preferências da interface</h2>
                    <p class="card-subtitle" style="margin-bottom:18px;">Ajuste os parâmetros de leitura de margem e salvamento automático de rascunhos.</p>

                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label" for="set-carga-alerta"><span>Alerta de impostos + taxas (%)</span>${fieldInfoIcon('Destaca quando a soma percentual sobre o preço atingir este limiar. Deixe vazio para não ativar esse alerta.')}</label>
                            <input id="set-carga-alerta" class="field-input mono" type="text" inputmode="decimal" value="${settings.alertaCargaTributaria ?? ''}">
                                                    </div>

                        <div class="form-field form-field-full">
                            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:18.2px;">
                                <input id="set-rascunho" type="checkbox" ${settings.salvarRascunhoAutomatico ? 'checked' : ''} style="width:16px;height:16px;">
                                <span>Salvar rascunho automaticamente se você sair antes de concluir</span>
                            </label>
                        </div>
                    </div>

                    <div class="wizard-footer">
                        <button type="submit" class="btn btn-primary">Salvar preferências</button>
                    </div>
                </form>

            </div>

            <section class="surface-card">
                <h2 class="card-title" style="margin-bottom:6px;">Seus dados</h2>
                <p class="card-subtitle" style="margin-bottom:16px;">Baixe uma cópia das suas informações, experimente o ValorizAI com dados de exemplo ou apague os dados salvos neste dispositivo.</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button type="button" class="btn btn-secondary" id="set-export-btn">Baixar uma cópia dos meus dados</button>
                    <button type="button" class="btn btn-secondary" id="set-demo-btn">Carregar dados de exemplo</button>
                    <button type="button" class="btn btn-danger-ghost" id="set-clear-btn">Apagar dados salvos</button>
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
            UI.toast('Dados de exemplo carregados.', 'success');
        });

        document.getElementById('set-clear-btn').addEventListener('click', () => {
            UI.openModal(
                'Confirmar exclusão de dados',
                `
                <p style="font-size:18.2px;color:var(--color-silver);margin-bottom:18px;">
                    Esta ação apaga o perfil do negócio, o catálogo, o histórico de precificações, os rascunhos e as conversas salvos neste dispositivo. Não será possível desfazer. Deseja continuar?
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
    async function init() {
        const config = window.VALORIZAI_CONFIG || {};
        if (!window.supabase?.createClient || !config.supabaseUrl || !config.supabaseAnonKey) {
            window.location.replace('/auth.html?setup=1');
            return;
        }

        const authClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
        const session = sessionData?.session;
        if (sessionError || !session?.access_token || !session.user?.id) {
            window.location.replace('/auth.html');
            return;
        }

        configureUserStorage(session.user.id);
        // Mostra primeiro o cache local: a navegação não deve esperar a rede.
        WorkspaceStore.load();
        UI.updateChrome();
        UI.renderCurrentView();

        let remoteBusinessProfile = null;
        let remoteProducts = null;
        let remotePricings = null;
        let profileLoadError = null;
        let operationalLoadError = null;

        // O perfil depende do ensure; catálogo e precificações não dependem dele.
        const profilePromise = (async () => {
            const ensureResponse = await fetch('/api/business/ensure', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            const ensureResult = await ensureResponse.json().catch(() => ({}));
            if (!ensureResponse.ok || !ensureResult.success) {
                throw new Error(ensureResult.error?.message || 'Não foi possível preparar o perfil.');
            }

            const profileResponse = await fetch('/api/business/profile', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const profileResult = await profileResponse.json().catch(() => ({}));
            if (!profileResponse.ok || !profileResult.success || !profileResult.data?.business) {
                throw new Error(profileResult.error?.message || 'Não foi possível carregar o perfil.');
            }
            return profileResult.data.business;
        })();

        const operationsPromise = Promise.all([
            ApiService.listProducts(),
            ApiService.listPricings()
        ]);

        const dataSyncPromise = Promise.allSettled([
            profilePromise,
            operationsPromise
        ]).then(([profileResult, operationsResult]) => {
            if (profileResult.status === 'fulfilled') {
                remoteBusinessProfile = profileResult.value;
            } else {
                profileLoadError = profileResult.reason;
                console.error('Não foi possível sincronizar o perfil do negócio.', profileLoadError);
            }

            if (operationsResult.status === 'fulfilled') {
                const [products, pricings] = operationsResult.value;
                remoteProducts = products.map(mapProductFromApi);
                remotePricings = pricings.map(mapPricingFromApi);
            } else {
                operationalLoadError = operationsResult.reason;
                console.error('Não foi possível sincronizar catálogo e histórico.', operationalLoadError);
            }

            if (remoteProducts !== null) WorkspaceStore.state.catalog = remoteProducts;
            if (remotePricings !== null) WorkspaceStore.state.pricings = remotePricings;
            if (remoteBusinessProfile) {
                const additional = remoteBusinessProfile.additional_data || {};
                WorkspaceStore.state.business = {
                    ...WorkspaceStore.state.business,
                    nomeNegocio: remoteBusinessProfile.name || '',
                    segmento: remoteBusinessProfile.sector === 'servicos' ? 'servico' : (remoteBusinessProfile.sector || ''),
                    descricao: remoteBusinessProfile.description || '',
                    modeloOperacao: remoteBusinessProfile.operating_model || '',
                    margemMeta: remoteBusinessProfile.target_margin_percent ?? null,
                    empreendedor: additional.entrepreneur_name || '',
                    regimeInformativo: additional.tax_regime || '',
                    cidadeUf: additional.location_text || '',
                    observacoes: additional.notes || '',
                    atualizadoEm: remoteBusinessProfile.updated_at || null
                };
                WorkspaceStore.save();
            }

            if (UI.currentView === 'dashboard') UI.renderCurrentView();
            if (profileLoadError) {
                UI.toast('Não foi possível sincronizar o perfil com sua conta. Suas informações locais foram preservadas; tente novamente mais tarde.', 'error');
            }
            if (operationalLoadError) {
                UI.toast('Não foi possível atualizar catálogo e histórico. Os dados locais foram preservados.', 'error');
            }
        });
        const shell = document.getElementById('app-shell');
        const mobileMenuButton = document.getElementById('mobile-menu-btn');
        const isMobileNavigation = () => window.matchMedia('(max-width: 960px)').matches;

        const setDesktopSidebarCollapsed = (collapsed) => {
            shell.classList.toggle('sidebar-collapsed', collapsed);
            localStorage.setItem(STORAGE_KEYS.SIDEBAR, collapsed ? '1' : '0');
            mobileMenuButton.setAttribute('aria-expanded', String(!collapsed));
            mobileMenuButton.setAttribute('aria-label', collapsed ? 'Expandir menu' : 'Recolher menu');
            mobileMenuButton.title = collapsed ? 'Expandir menu' : 'Recolher menu';
        };

        const setMobileDrawerOpen = (open) => {
            shell.classList.toggle('mobile-drawer-open', open);
            mobileMenuButton.setAttribute('aria-expanded', String(open));
            mobileMenuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
        };

        // Aplica o estado local imediatamente; a preferência da conta sincroniza em seguida.
        setDesktopSidebarCollapsed(localStorage.getItem(STORAGE_KEYS.SIDEBAR) === '1');

        const getSidebarSession = async () => {
            const { data, error } = await authClient.auth.getSession();
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

        // O único controle da navegação é o hamburger da barra superior.
        mobileMenuButton.addEventListener('click', () => {
            if (isMobileNavigation()) {
                setMobileDrawerOpen(!shell.classList.contains('mobile-drawer-open'));
                return;
            }
            const collapsed = !shell.classList.contains('sidebar-collapsed');
            setDesktopSidebarCollapsed(collapsed);
            saveSidebarPreference(collapsed);
        });
        document.getElementById('sidebar-backdrop').addEventListener('click', () => setMobileDrawerOpen(false));
        loadSidebarPreference();

        // Nilo é global: abrir o painel preserva a tela atual.
        const niloLauncher = document.getElementById('nilo-launcher');
        const niloFab = document.getElementById('nilo-fab');
        const niloHelpBubble = document.getElementById('nilo-help-bubble');
        const niloPanel = document.getElementById('nilo-panel');
        const niloPanelContent = document.getElementById('nilo-panel-content');
        const closeNilo = () => {
            UI.niloOpen = false;
            niloPanel.hidden = true;
            niloLauncher.hidden = false;
            niloFab.setAttribute('aria-expanded', 'false');
            niloHelpBubble.hidden = false;
        };
        let niloHistoryLoaded = false;
        let niloHistoryLoading = false;
        const loadNiloHistory = async () => {
            if (niloHistoryLoaded || niloHistoryLoading) return;
            niloHistoryLoading = true;
            try {
                const remoteChat = WorkspaceStore.state.niloConversationId
                    ? await ApiService.getNiloConversation(WorkspaceStore.state.niloConversationId)
                    : await ApiService.getLatestNiloConversation();
                if (remoteChat.conversation?.id) {
                    WorkspaceStore.state.niloConversationId = remoteChat.conversation.id;
                    WorkspaceStore.state.chatHistory = (remoteChat.messages || []).map(message => ({
                        role: message.role,
                        text: message.content,
                        at: message.created_at
                    }));
                    WorkspaceStore.save();
                }
                niloHistoryLoaded = true;
            } catch (error) {
                console.warn('Não foi possível sincronizar o histórico do Nilo.', error);
            } finally {
                niloHistoryLoading = false;
                if (UI.niloOpen) renderConsultor(niloPanelContent);
            }
        };
        const openNilo = () => {
            UI.niloOpen = true;
            niloPanel.hidden = false;
            niloLauncher.hidden = true;
            niloFab.setAttribute('aria-expanded', 'true');
            niloHelpBubble.hidden = true;
            renderConsultor(niloPanelContent);
            loadNiloHistory();
            document.getElementById('ai-question-input')?.focus();
        };
        niloFab.addEventListener('click', () => {
            if (UI.niloOpen) {
                closeNilo();
            } else {
                openNilo();
            }
        });
        niloHelpBubble.addEventListener('click', openNilo);
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
        // Sincronização continua em segundo plano, sem bloquear navegação ou interação.
        dataSyncPromise;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
