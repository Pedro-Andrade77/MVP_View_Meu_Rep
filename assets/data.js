// ======================
// STORAGE
// ======================
const S = {
    g: k => JSON.parse(localStorage.getItem('rOS_'+k)||'null'),
    s: (k,v) => localStorage.setItem('rOS_'+k, JSON.stringify(v)),
    d: k => localStorage.removeItem('rOS_'+k),
    users: () => S.g('users')||[],
    addUser: u => { const a=S.users(); a.push(u); S.s('users',a); },
    findUser: (e,p) => S.users().find(u=>u.email===e&&u.pass===p),
    session: () => S.g('session'),
    login: u => S.s('session',u),
    logout: () => S.d('session'),
    clients: () => S.g('clients')||[],
    setClients: a => S.s('clients',a),
    orders: () => S.g('orders')||[],
    addOrder: o => { const a=S.orders(); a.unshift(o); S.s('orders',a); },
    tasks: () => S.g('tasks')||[],
    setTasks: a => S.s('tasks',a),
    visits: () => S.g('visits')||[],
    setVisits: a => S.s('visits',a),
    addVisit: v => { const a=S.visits(); a.push(v); S.s('visits',a); },
    goals: () => S.g('goals')||{revenueTarget:28000,visitsTarget:80},
    setGoals: g => S.s('goals',g),
    settings: () => S.g('settings')||{notifications:true,darkTheme:false,commissionRate:0.04},
    setSettings: x => S.s('settings',x),
    notes: () => S.g('notes')||[],
    setNotes: a => S.s('notes',a),
    routePlan: date => S.g('routePlan_'+date)||null,
    setRoutePlan: (date,ids) => S.s('routePlan_'+date, ids),
    clearRoutePlan: date => S.d('routePlan_'+date),
    orgs: () => S.g('orgs')||[],
    setOrgs: a => S.s('orgs',a),
    leads: () => S.g('leads')||[],
    setLeads: a => S.s('leads',a),
    supReps: () => S.g('supReps')||[],
    setSupReps: a => S.s('supReps',a),
    channels: () => S.g('channels')||{tiktok:false, mercadolivre:true, shopify:false},
    setChannels: c => S.s('channels',c),
    customProducts: () => S.g('customProducts')||[],
    setCustomProducts: a => S.s('customProducts',a),
    // ---- Equipes (times de representantes) ----
    teams: () => S.g('teams')||[],
    setTeams: a => S.s('teams',a),
    // ---- Permissões por equipe: { [teamId]: { [viewerId]: { tarefas:[...], clientes:[...], visitas:[...] } } } ----
    teamPerms: () => S.g('teamPerms')||{},
    setTeamPerms: p => S.s('teamPerms',p),
    // ---- Metas individuais por equipe: { [memberId]: { revenueTarget, visitsTarget } } ----
    memberGoals: teamId => S.g('memberGoals_'+teamId)||{},
    setMemberGoals: (teamId, g) => S.s('memberGoals_'+teamId, g),
    memberGrants: teamId => S.g('memberGrants_'+teamId)||{},
    setMemberGrants: (teamId, g) => S.s('memberGrants_'+teamId, g),
    calColors: () => S.g('calColors')||{visitText:'#1D4ED8',visitBg:'#DBEAFE',taskText:'#15803D',taskBg:'#DCFCE7'},
    setCalColors: c => S.s('calColors',c),
    // ---- Chat de suporte por usuário ----
    supportChat: uid => S.g('supportChat_'+uid)||[],
    setSupportChat: (uid,msgs) => S.s('supportChat_'+uid,msgs),
    // ---- Configuração de campos do catálogo por organização (fornecedor) ----
    productFields: orgId => S.g('productFields_'+orgId)||DEFAULT_PRODUCT_FIELDS,
    setProductFields: (orgId,fields) => S.s('productFields_'+orgId,fields),
    // ---- Tokens de formulário público já utilizados (garante envio único por link) ----
    usedFormTokens: () => S.g('usedFormTokens')||[],
    markFormTokenUsed: token => { const a=S.usedFormTokens(); if(!a.includes(token)){ a.push(token); S.s('usedFormTokens',a); } },
};

// ======================
// STATE
// ======================
let currentClient = null;
let fromClient = false;
let cwFilter = 'all';
let cwScope = 'team';
let pdScope = 'team';
let leadsScope = 'team';
let tfFilter = 'all';
let cart = {};
let cartDiscounts = {};
let pdFilter = 'all';
let shareFlowPending = false;
let formsCart = {};
let formsProdCatFilter = '';
let prodFilter = '';
let prodCatFilter = '';
let editingTaskId = null;
let pedStep = 1;
let lastConfirmedOrder = null;

// ======================
// CATALOG / SUPPLIERS
// ======================
const IND = { alimentos:'Alimentos Brasil', bebidas:'Sul Bebidas', higiene:'Higiene & Cia', refer:'Refer Distribuidora' };

const DEFAULT_PRODUCT_FIELDS = [
    {key:'name',     label:'Nome do Produto',               required:true,  active:true},
    {key:'sku',      label:'SKU',                            required:true,  active:true},
    {key:'ean',      label:'EAN',                            required:false, active:true},
    {key:'categoria',label:'Categoria',                      required:true,  active:true},
    {key:'unit',     label:'Unidade',                        required:false, active:true},
    {key:'priceSN',  label:'Preço Simples Nacional',         required:true,  active:true},
    {key:'priceLR',  label:'Preço Lucro Real/Presumido',     required:true,  active:true},
];

const PRODS_GENERIC = [
    {id:1, ind:'alimentos', sku:'ALM-001', name:'Arroz Branco 5kg',        categoria:'Grãos',      unit:'cx 12un', priceSN:28.90, priceLR:31.90},
    {id:2, ind:'alimentos', sku:'ALM-002', name:'Feijão Carioca 1kg',      categoria:'Grãos',      unit:'cx 20un', priceSN:9.50,  priceLR:10.40},
    {id:3, ind:'alimentos', sku:'ALM-003', name:'Óleo de Soja 900ml',      categoria:'Óleos',      unit:'cx 24un', priceSN:7.80,  priceLR:8.60},
    {id:4, ind:'alimentos', sku:'ALM-004', name:'Açúcar Refinado 1kg',     categoria:'Açúcar',     unit:'cx 30un', priceSN:5.20,  priceLR:5.75},
    {id:5, ind:'alimentos', sku:'ALM-005', name:'Macarrão Espaguete 500g', categoria:'Massas',     unit:'cx 24un', priceSN:4.90,  priceLR:5.40},
    {id:6, ind:'alimentos', sku:'ALM-006', name:'Farinha de Trigo 1kg',    categoria:'Farináceos', unit:'cx 20un', priceSN:4.50,  priceLR:4.95},
    {id:7, ind:'bebidas',   sku:'BEB-001', name:'Refrigerante Cola 2L',    categoria:'Refrigerante',unit:'cx 6un', priceSN:6.90,  priceLR:7.60},
    {id:8, ind:'bebidas',   sku:'BEB-002', name:'Cerveja Pilsen 350ml',    categoria:'Cerveja',    unit:'cx 12un', priceSN:3.40,  priceLR:3.75},
    {id:9, ind:'bebidas',   sku:'BEB-003', name:'Água Mineral 500ml',      categoria:'Água',       unit:'cx 12un', priceSN:1.80,  priceLR:2.00},
    {id:10,ind:'bebidas',   sku:'BEB-004', name:'Suco de Uva 1L',          categoria:'Suco',       unit:'cx 12un', priceSN:5.50,  priceLR:6.05},
    {id:11,ind:'higiene',   sku:'HIG-001', name:'Sabão em Pó 1kg',         categoria:'Limpeza',    unit:'cx 12un', priceSN:8.90,  priceLR:9.80},
    {id:12,ind:'higiene',   sku:'HIG-002', name:'Papel Higiênico (pack 4)',categoria:'Papel',      unit:'cx 16un', priceSN:12.50, priceLR:13.80},
];

// Catálogo real da Refer Distribuidora (extraído de TABELA DE PREÇO SIMPLES NACIONAL.xlsx /
// TABELA DE PREÇOS LUCRO REAL E PRESUMIDO.xlsx) — fornecedor de demonstração.
const PRODS_REFER = [
    {id:100, ind:'refer', sku:'AMD-5239', ean:7896852627310, codFab:1361, linha:"Oxidantes 75", name:'Agua Oxigenada 10 Volumes Amend Color Intensy 75Ml', categoria:'Água Oxigenada', unit:'un', priceSN:7.48, priceLR:6.38},
    {id:101, ind:'refer', sku:'AMD-5235', ean:7896852627273, codFab:1357, linha:"Oxidantes 950", name:'Agua Oxigenada 10 Volumes Amend Color Intensy 950Ml', categoria:'Água Oxigenada', unit:'un', priceSN:32.91, priceLR:28.05},
    {id:102, ind:'refer', sku:'AMD-5179', ean:7896852627372, codFab:1406, linha:"Oxidantes 75", name:'Agua Oxigenada 20 Volumes Color Delicate 75Ml', categoria:'Água Oxigenada', unit:'un', priceSN:7.87, priceLR:6.70},
    {id:103, ind:'refer', sku:'AMD-5177', ean:7896852627358, codFab:1404, linha:"Oxidantes 950", name:'Agua Oxigenada 20 Volumes Color Delicate 950Ml', categoria:'Água Oxigenada', unit:'un', priceSN:32.91, priceLR:28.05},
    {id:104, ind:'refer', sku:'AMD-5249', ean:7896852629031, codFab:'1379-1', linha:"Amend", name:'Ampolas Superdoses De Reparação Amend Essencial Cronograma Capilar', categoria:'Ampola', unit:'un', priceSN:33.59, priceLR:28.62},
    {id:105, ind:'refer', sku:'AMD-5342', ean:7896852625255, codFab:1330, linha:"Amend Millenar", name:'Balm Amend Millenar Óleos Gregos', categoria:'Balm', unit:'un', priceSN:42.28, priceLR:36.03},
    {id:106, ind:'refer', sku:'AMD-5288', ean:7896852630617, codFab:'1618-1', linha:"Amend Millenar", name:'Balm Selante Nutritivo Amend Millenar Óleos Árabes 180ML', categoria:'Balm', unit:'un', priceSN:36.89, priceLR:31.44},
    {id:107, ind:'refer', sku:'AMD-5416', ean:7896852628843, codFab:'1386-1', linha:"Amend Millenar", name:'Balm Selante Millenar Óleos Japoneses 180ML', categoria:'Balm', unit:'un', priceSN:36.89, priceLR:31.44},
    {id:108, ind:'refer', sku:'AMD-5332', ean:7896852618998, codFab:'1244-1', linha:"Amend Millenar", name:'Balm Oleos Indianos Millenar 180G', categoria:'Balm', unit:'un', priceSN:36.89, priceLR:31.44},
    {id:109, ind:'refer', sku:'AMD-5229', ean:7896852613931, codFab:'975-1', linha:"Color Intensy", name:'Coloracao 0.2 Violeta Intencificador Amend Color Intensy 50G', categoria:'Coloração', unit:'un', priceSN:22.64, priceLR:19.30},
    {id:110, ind:'refer', sku:'AMD-5232', ean:7896852618080, codFab:'987-1', linha:"Color Intensy", name:'Coloracao 0.43 Cobre Intencificador Amend Color Intensy 50G', categoria:'Coloração', unit:'un', priceSN:22.64, priceLR:19.30},
    {id:111, ind:'refer', sku:'AMD-5227', ean:7896852613047, codFab:'973-1', linha:"Color Intensy", name:'Coloracao 0.6 Vermelho Intensificador Amend Color Intensy 50G', categoria:'Coloração', unit:'un', priceSN:22.64, priceLR:19.30},
    {id:112, ind:'refer', sku:'AMD-5228', ean:7896852613894, codFab:'974-1', linha:"Color Intensy", name:'Coloracao 01 Cinza Intensificador Amend Color Intensy 50G', categoria:'Coloração', unit:'un', priceSN:22.64, priceLR:19.30},
    {id:113, ind:'refer', sku:'AMD-5372', ean:7896852628324, codFab:'1378-1', linha:"Expertise", name:'Condicionador Equilibrante Expertise Oleosidade Equilibrada 250ML', categoria:'Condicionadores', unit:'un', priceSN:38.59, priceLR:32.89},
    {id:114, ind:'refer', sku:'AMD-5389', ean:7896852628683, codFab:'1397-1', linha:"Expertise", name:'Condicionador Doador De Volume Expertise Volume Absoluto 250ML', categoria:'Condicionadores', unit:'un', priceSN:38.59, priceLR:32.89},
    {id:115, ind:'refer', sku:'AMD-5358', ean:7896852627907, codFab:'1368-1', linha:"Expertise", name:'Condicionador Hidratante E Fortalecedor Amend Expertise Hidratação & Força 250ML', categoria:'Condicionadores', unit:'un', priceSN:35.88, priceLR:30.58},
    {id:116, ind:'refer', sku:'AMD-5374', ean:7896852616079, codFab:'1116-1', linha:"Expertise", name:'Condicionador Intensificador Pos Progressiva Expertise 250Ml', categoria:'Condicionadores', unit:'un', priceSN:35.88, priceLR:30.58},
    {id:117, ind:'refer', sku:'AMD-4020', ean:7896852612804, codFab:'413-1', linha:"Gold Black", name:'Creme Relaxante Cabelos Cacheados Ou Crespos Gold Black 500G', categoria:'Cremes', unit:'un', priceSN:69.83, priceLR:59.51},
    {id:118, ind:'refer', sku:'AMD-5397', ean:7896852628645, codFab:'1607-1', linha:"Gold Black", name:'Creme Para Pentear Gold Black Hidratação Nutritiva 250ML', categoria:'Cremes', unit:'un', priceSN:17.87, priceLR:15.23},
    {id:119, ind:'refer', sku:'AMD-5376', ean:7896852616437, codFab:'1118-1', linha:"Expertise", name:'Creme De Pentear Defrizante Pos Progressiva Expertise 180G', categoria:'Cremes', unit:'un', priceSN:35.57, priceLR:30.32},
    {id:120, ind:'refer', sku:'AMD-5369', ean:7896852616215, codFab:'1123-1', linha:"Expertise", name:'Creme Disciplinante Nutritivo Marula Fabulous Expertise 180G', categoria:'Cremes', unit:'un', priceSN:35.57, priceLR:30.32},
    {id:121, ind:'refer', sku:'AMD-5164', ean:7896852627433, codFab:'1366-1', linha:"Amend", name:'Fluido Antiumidade Amend Blindagem Essencial 180Ml', categoria:'Fluídos', unit:'un', priceSN:71.53, priceLR:60.97},
    {id:122, ind:'refer', sku:'AMD-5292', ean:7896852628102, codFab:'1365-1', linha:"Amend", name:'Fluído Restaurador Amend Essencial Multibenefícios 180ML', categoria:'Fluídos', unit:'un', priceSN:71.53, priceLR:60.97},
    {id:123, ind:'refer', sku:'AMD-5175', ean:7896852630556, codFab:'1391-1', linha:"Cachos", name:'Fluído Revitalizante Day After Amend Cachos 180ML', categoria:'Fluídos', unit:'un', priceSN:29.85, priceLR:25.45},
    {id:124, ind:'refer', sku:'AMD-5408', ean:7896852622322, codFab:'1311-1', linha:"Luxe Creations", name:'Fluido Reconstrutor Luxe Creations Blonde Care 180Ml', categoria:'Fluídos', unit:'un', priceSN:39.29, priceLR:33.49},
    {id:125, ind:'refer', sku:'AMD-5338', ean:7896852619407, codFab:1270, linha:"Amend Millenar", name:'Hair Butter Mascara Amend Millenar Oleos De Madagascar 300G', categoria:'Hair Butter e Spray', unit:'un', priceSN:48.97, priceLR:41.74},
    {id:126, ind:'refer', sku:'AMD-5335', ean:7896852619025, codFab:'1247-1', linha:"Amend Millenar", name:'Hair Butter Mascara Oleos Marroquinos 300G', categoria:'Hair Butter e Spray', unit:'un', priceSN:48.73, priceLR:41.53},
    {id:127, ind:'refer', sku:'AMD-5419', ean:7896852611548, codFab:350, linha:"Valorize", name:'Hair Spray Forte Valorize 400Ml', categoria:'Hair Butter e Spray', unit:'un', priceSN:38.24, priceLR:32.59},
    {id:128, ind:'refer', sku:'AMD-5420', ean:7896852611555, codFab:351, linha:"Valorize", name:'Hair Spray Ultraforte Valorize 400Ml', categoria:'Hair Butter e Spray', unit:'un', priceSN:37.83, priceLR:32.24},
    {id:129, ind:'refer', sku:'AMD-4021', ean:7896852612583, codFab:'426-1', linha:"Gold Black", name:'Kit Guanidina 1 Aplicação Ou 2 Retoques Gold Black', categoria:'Kit', unit:'un', priceSN:49.25, priceLR:41.98},
    {id:130, ind:'refer', sku:'AMD-5393', ean:7896852612798, codFab:'433-1', linha:"Gold Black", name:'Kit Creme Alisante Essência Flores Gold Black', categoria:'Kit', unit:'un', priceSN:31.67, priceLR:26.99},
    {id:131, ind:'refer', sku:'AMD-5172', ean:7896852618004, codFab:'1200-1', linha:"Cachos", name:'Leave-In Cachos + Fechados Amend Cachos 250G', categoria:'Leave-in', unit:'un', priceSN:34.67, priceLR:29.55},
    {id:132, ind:'refer', sku:'AMD-5171', ean:7896852617991, codFab:'1199-1', linha:"Cachos", name:'Leave-In Ondulador E Cachos Abertos Amend Cachos 250G', categoria:'Leave-in', unit:'un', priceSN:34.67, priceLR:29.55},
    {id:133, ind:'refer', sku:'AMD-5250', ean:7896852629086, codFab:'1387-1', linha:"Amend", name:'Leave-In Finalizador Amend Essencial Seca Sem Frizz 180ML', categoria:'Leave-in', unit:'un', priceSN:36.40, priceLR:31.02},
    {id:134, ind:'refer', sku:'AMD-5380', ean:7896852631454, codFab:'1634-1', linha:"Expertise", name:'Leave-in Expertise 40+ 180G', categoria:'Leave-in', unit:'un', priceSN:41.31, priceLR:35.20},
    {id:135, ind:'refer', sku:'AMD-5396', ean:7896852628638, codFab:'1606-1', linha:"Gold Black", name:'Máscara Gold Black Hidratação Nutritiva 250G', categoria:'Máscara', unit:'un', priceSN:19.67, priceLR:16.76},
    {id:136, ind:'refer', sku:'AMD-5368', ean:7896852616208, codFab:'1122-1', linha:"Expertise", name:'Máscara Nutritiva Marula Fabulous Expertise 300G', categoria:'Máscara', unit:'un', priceSN:40.12, priceLR:34.19},
    {id:137, ind:'refer', sku:'AMD-5390', ean:7896852628690, codFab:'1398-1', linha:"Expertise", name:'Máscara Doadora De Volume Expertise Volume Absoluto 300G', categoria:'Máscara', unit:'un', priceSN:41.97, priceLR:35.77},
    {id:138, ind:'refer', sku:'AMD-5359', ean:7896852627914, codFab:'1369-1', linha:"Expertise", name:'Máscara Hidratante E Fortalecedora Amend Expertise Hidratação & Força 300G', categoria:'Máscara', unit:'un', priceSN:41.33, priceLR:35.23},
    {id:139, ind:'refer', sku:'AMD-5421', ean:7896852611524, codFab:'352-1', linha:"Valorize", name:'Mousse Modeladora Valorize 140G', categoria:'Mousse', unit:'un', priceSN:33.63, priceLR:28.66},
    {id:140, ind:'refer', sku:'AMD-5391', ean:7896852628706, codFab:'1399-1', linha:"Expertise", name:'Mousse Doadora De Volume Expertise Volume Absoluto 140G', categoria:'Mousse', unit:'un', priceSN:35.60, priceLR:30.34},
    {id:141, ind:'refer', sku:'AMD-5289', ean:7896852625347, codFab:'1337-1', linha:"Amend Millenar", name:'Óleo De Monoi Propriedades Protetoras Amend Millenar Oil 60Ml', categoria:'Óleos', unit:'un', priceSN:41.37, priceLR:35.26},
    {id:142, ind:'refer', sku:'AMD-5290', ean:7896852625378, codFab:'1338-1', linha:"Amend Millenar", name:'Óleo De Inchi Propriedades Restauradoras Amend Millenar Oil 60Ml', categoria:'Óleos', unit:'un', priceSN:41.37, priceLR:35.26},
    {id:143, ind:'refer', sku:'AMD-5291', ean:7896852625385, codFab:'1339-1', linha:"Amend Millenar", name:'Óleo De Moringa Propriedades Revitalizantes Amend Millenar Oil 60Ml', categoria:'Óleos', unit:'un', priceSN:41.37, priceLR:35.26},
    {id:144, ind:'refer', sku:'AMD-5370', ean:7896852625330, codFab:'1335-1', linha:"Expertise", name:'Óleo Nutritivo Amend Expertise Marula Fabulous Nutrition 60Ml', categoria:'Óleos', unit:'un', priceSN:43.05, priceLR:36.69},
    {id:145, ind:'refer', sku:'AMD-5409', ean:7896852625033, codFab:1320, linha:"Luxe Creations", name:'Pó Descolorante Amend Luxe Creations Blonde Care (Pouch) 300G', categoria:'Pó Descolorante', unit:'un', priceSN:56.68, priceLR:48.31},
    {id:146, ind:'refer', sku:'AMD-5156', ean:7896852627440, codFab:1356, linha:"Descolorante Pouch", name:'Pó Descolorante Com Combinação De 12 Óleos Amend 300G', categoria:'Pó Descolorante', unit:'un', priceSN:39.99, priceLR:34.08},
    {id:147, ind:'refer', sku:'AMD-5162', ean:7896852628010, codFab:1376, linha:"Luxe Creations", name:'Pó Descolorante Rápido Aloe Vera e Silicone 300G', categoria:'Pó Descolorante', unit:'un', priceSN:39.99, priceLR:34.08},
    {id:148, ind:'refer', sku:'AMD-5160', ean:7896852627983, codFab:1374, linha:"Descolorante", name:'Pó Descolorante Óleos De Camomila E Aloe Vera E Silicone 300G', categoria:'Pó Descolorante', unit:'un', priceSN:42.59, priceLR:36.30},
    {id:149, ind:'refer', sku:'AMD-5246', ean:7896852629024, codFab:'1603-1', linha:"Amend", name:'Serum Pro-Volume Amend Essencial Antiqueda', categoria:'Sérum', unit:'un', priceSN:42.05, priceLR:35.84},
    {id:150, ind:'refer', sku:'AMD-5165', ean:7896852621486, codFab:'1279-1', linha:"Botanic Beauty", name:'Shampoo Amend Botanic Beauty Óleo De Monoi E Extratos De Alecrim E Gengibre 250Ml', categoria:'Shampoo', unit:'un', priceSN:38.64, priceLR:32.93},
    {id:151, ind:'refer', sku:'AMD-5168', ean:7896852617960, codFab:'1196-1', linha:"Cachos", name:'Shampoo Amend Cachos 250Ml', categoria:'Shampoo', unit:'un', priceSN:44.87, priceLR:38.24},
    {id:152, ind:'refer', sku:'AMD-5243', ean:7896852628997, codFab:'1600-1', linha:"Amend", name:'Shampoo Fortificante Amend Essencial Antiqueda', categoria:'Shampoo', unit:'un', priceSN:47.52, priceLR:40.50},
    {id:153, ind:'refer', sku:'AMD-5285', ean:7896852630563, codFab:'1615-1', linha:"Amend Millenar", name:'Shampoo Nutritivo Amend Millenar Óleos Árabes', categoria:'Shampoo', unit:'un', priceSN:50.57, priceLR:43.10},
];

const PRODS = [...PRODS_GENERIC, ...PRODS_REFER];

// Leads reais extraídos de planilha de clientes — prospects ainda não convertidos
// em clientes, usados para alimentar o módulo de Leads/CRM do representante.
const LEADS_REFER_SEED = [
    {razaoSocial:'Bazar Miyuki Ltda', nomeFantasia:'Bazar Miyuki', cnpj:'52.995.875/0001-74', addr:'Rua Otelo Augusto Ribeiro, 335', cep:'08412-000', bairro:'Guaianazes', city:'São Paulo', state:'SP', phone:'(11) 98749-7693', contact:'Lindassi', email:null, notes:'Responsável por compras Lindassi, atende das 10h às 11h e das 14h às 17h. Atualmente compra de distribuidor — catálogo e tabela já enviados.', region:'Zona Leste'},
    {razaoSocial:'Disprobelle Com. de Cosméticos Ltda ME', nomeFantasia:'Bella', cnpj:'03.954.536/0001-34', addr:'Av Flamingo, 234', cep:'08031-000', bairro:'Vila Curuçá', city:'São Paulo', state:'SP', phone:'(11) 98659-1461', contact:'José', email:null, notes:null, region:'Zona Leste'},
    {razaoSocial:'Espaço Mulher Cosméticos Ltda', nomeFantasia:'Espaço Mulher', cnpj:'71.525.711/0001-28', addr:'Rua Antonio de Barros, 219', cep:'03089-000', bairro:'Tatuapé', city:'São Paulo', state:'SP', phone:'(11) 3804-3571', contact:null, email:'ncmocontabil@hotmail.com', notes:null, region:'Zona Leste'},
    {razaoSocial:'Lais Satye Goya Cosméticos Eireli-EPP', nomeFantasia:'Perfumaria Goya', cnpj:'20.341.598/0001-90', addr:'Avenida São Miguel, 4260', cep:'03870-000', bairro:'Vila Rio Branco', city:'São Paulo', state:'SP', phone:'(11) 2501-2435', contact:null, email:'goya.xml@gmail.com', notes:'Cliente possui acordo de não troca, com desconto em títulos a cada pedido.', region:'Zona Leste'},
    {razaoSocial:'Magia e Beleza Perf Ltda', nomeFantasia:'Magia e Blz', cnpj:'03.418.839/0001-32', addr:'Av Amador Bueno da Veiga, 1340', cep:'03636-100', bairro:'Vila Esperança', city:'São Paulo', state:'SP', phone:'(11) 98707-4225', contact:'Josy', email:null, notes:null, region:'Zona Leste'},
    {razaoSocial:'Perfumaria Cheirosinha Ltda - EPP', nomeFantasia:'Cheirosinha', cnpj:'61.827.556/0001-40', addr:'Av Waldemar Carlos Pereira, 323', cep:'03533-001', bairro:'Vila Talarico', city:'São Paulo', state:'SP', phone:'(11) 97110-1214', contact:'Bia', email:null, notes:null, region:'Zona Leste'},
    {razaoSocial:'Perfumaria Melissa', nomeFantasia:'Melissa', cnpj:'04.152.673/0001-18', addr:'Rua Costa Rego, 38', cep:'03542-030', bairro:'Vila Guilhermina', city:'São Paulo', state:'SP', phone:'(11) 99829-3044', contact:'Bete', email:'perfumariamelissa@gmail.com', notes:null, region:'Zona Leste'},
    {razaoSocial:'Perfumaria Moça Bonita', nomeFantasia:'Moça Bonita', cnpj:'03.399.815/0001-83', addr:'R Ponte Rasa, 1141', cep:'03884-060', bairro:'Ponte Rasa', city:'São Paulo', state:'SP', phone:'(11) 97989-7965', contact:'Bianca', email:null, notes:null, region:'Zona Leste'},
    {razaoSocial:'A.M.Pacheco - Comércio de Cosméticos e Perfumaria', nomeFantasia:'AMP - Unika Cosméticos e Perfumaria', cnpj:'34.852.435/0001-86', addr:'Avenida Nordestina, Casa 02', cep:'08431-165', bairro:'Jardim Aurora', city:'São Paulo', state:'SP', phone:null, contact:null, email:null, notes:null, region:'Zona Leste'},
    {razaoSocial:'Atos Armarinhos', nomeFantasia:'Atos', cnpj:'52.355.231/0001-11', addr:'Rua Doutor Campos de Moura, 238', cep:'03568-010', bairro:'Artur Alvim', city:'São Paulo', state:'SP', phone:null, contact:null, email:null, notes:null, region:'Zona Leste'},
    {razaoSocial:'Bazar e Perfumaria Mulher Bela Eireli', nomeFantasia:'Bazar e Perfumaria Mulher Bela', cnpj:'07.020.065/0001-48', addr:'Rua Raimundo de Paulo Freitas, 1556', cep:'08150-260', bairro:'Jardim Robru', city:'São Paulo', state:'SP', phone:null, contact:null, email:null, notes:null, region:'Zona Leste'},
    {razaoSocial:'Carlos Hidenori Sakihama Bazar', nomeFantasia:'Carlos Hidenori Sakihama Bazar', cnpj:'01.286.826/0001-21', addr:'Avenida Moacir Danta de Itapicuru, 894', cep:'08042-290', bairro:'Cidade Nova S. Miguel', city:'São Paulo', state:'SP', phone:null, contact:null, email:null, notes:null, region:'Zona Leste'},
    {razaoSocial:'Celso Akira Goya ME', nomeFantasia:'Perfumaria Atos', cnpj:'00.965.101/0001-05', addr:'Rua Doutor Campos de Moura, 30', cep:'03568-010', bairro:'Artur Alvim', city:'São Paulo', state:'SP', phone:null, contact:null, email:null, notes:null, region:'Zona Leste'},
    {razaoSocial:'Central Fraldas Perfumaria e Cosméticos Unipessoal Ltda', nomeFantasia:'Central Fraldas', cnpj:'27.140.446/0001-78', addr:'R Aleia, 811', cep:'08226-015', bairro:'Cidade Antônio Estevão de Carvalho', city:'São Paulo', state:'SP', phone:null, contact:null, email:null, notes:null, region:'Zona Leste'},
    {razaoSocial:'Claudenia Maria de Souza ME', nomeFantasia:'Ella', cnpj:'14.089.923/0001-76', addr:'Av Águia de Haia, 3856', cep:'03694-000', bairro:'Jardim Soraia', city:'São Paulo', state:'SP', phone:null, contact:null, email:null, notes:null, region:'Zona Leste'},
];

const PAYMENTS = [
    {value:'boleto',   label:'Boleto'},
    {value:'pix',      label:'PIX'},
    {value:'prazo_30', label:'Prazo 30 dias'},
    {value:'prazo_60', label:'Prazo 60 dias'},
    {value:'prazo_90', label:'Prazo 90 dias'},
    {value:'cheque',   label:'Cheque'},
];

function effPrice(p, taxRegime) { return (taxRegime==='Simples Nacional'||taxRegime==='MEI') ? p.priceSN : p.priceLR; }
function d(n) { return new Date(Date.now()-n*864e5).toISOString(); }
function todayStr() { return new Date().toISOString().slice(0,10); }
function fmtMoney(v) { return 'R$ '+(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtDateBR(iso) { return new Date(iso).toLocaleDateString('pt-BR'); }
function genProtocol() { return 'RP-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase(); }

function buildOrder(clientId, supplier, paymentMethod, items, discountPct, daysAgo, status, extra) {
    const subtotal = items.reduce((s,it)=>s+it.price*it.qty*(1-(it.discountPct||0)),0);
    const discount = subtotal*discountPct;
    return {
        id: 'o'+Math.random().toString(36).slice(2,9),
        protocol: genProtocol(),
        clientId, supplier, paymentMethod, items,
        subtotal, discount, discountPct, total: subtotal-discount,
        date: d(daysAgo), status,
        deliveryDate: (extra&&extra.deliveryDate) || null,
        notes: (extra&&extra.notes) || null,
        ownerId: (extra&&extra.ownerId) || null,
        source: (extra&&extra.source) || 'rep',
        clientSnapshot: (extra&&extra.clientSnapshot) || null,
    };
}

function prod(id){ return PRODS.find(p=>p.id===id); }
function mkItems(client, list) {
    return list.map(([pid,qty,disc])=>{
        const p = prod(pid);
        return { productId:p.id, name:p.name, sku:p.sku, qty, price: effPrice(p, client.taxRegime), discountPct: disc||0 };
    });
}

// ======================
// EQUIPES — membros de demonstração (alguns são contas reais, outros fictícios)
// ======================
const TEAM_MEMBER_COLORS = { u1:'#16A34A', u2:'#2563EB', m3:'#9333EA', m4:'#D97706', m5:'#DB2777', m6:'#0EA5E9' };
const TEAM_MEMBER_SEED = {
    u1: { id:'u1', name:'Marcos Andrade', revenue:0, goalRevenue:28000, visits:0, goalVisits:80, clients:0, pendingTasks:0 },
    u2: { id:'u2', name:'Patrícia Nunes',  revenue:14750, goalRevenue:20000, visits:48, goalVisits:60, clients:21, pendingTasks:4 },
    m3: { id:'m3', name:'Mariana Costa',   revenue:31200, goalRevenue:30000, visits:64, goalVisits:70, clients:18, pendingTasks:3 },
    m4: { id:'m4', name:'Eduardo Pires',   revenue:19800, goalRevenue:25000, visits:48, goalVisits:60, clients:14, pendingTasks:7 },
    m5: { id:'m5', name:'Larissa Fontes',  revenue:27650, goalRevenue:28000, visits:71, goalVisits:70, clients:20, pendingTasks:2 },
    m6: { id:'m6', name:'Diego Araújo',    revenue:9100,  goalRevenue:18000, visits:31, goalVisits:50, clients:19, pendingTasks:11 },
};

const SEED_VERSION = 10;

function seed() {
    if (S.g('seeded') === SEED_VERSION) return;

    // Esquema de dados mudou desde a última versão — limpa tudo para evitar
    // registros antigos sem os campos novos (apareciam como "undefined" na UI).
    ['clients','orders','tasks','visits','goals','settings','notes','orgs','leads','users','session','supReps','channels','customProducts','teams','calendarPerms','teamPerms']
        .forEach(k=>S.d(k));

    S.setOrgs([
        {id:'org-team',  name:'Grupo União Representantes', type:'representante', joinable:true},
        {id:'org-refer', name:'Refer Distribuidora', type:'fornecedor', supplierKey:'refer', joinable:true},
    ]);

    // ---- 4 contas de demonstração ----
    S.addUser({id:1, name:'Marcos Andrade',  email:'gestor.representante@reposapp.com', pass:'gestor123', phone:'(11) 99999-0001', accountType:'representante', role:'gestor',      orgId:'org-team',  memberId:'u1'});
    S.addUser({id:2, name:'Patrícia Nunes',  email:'membro.representante@reposapp.com', pass:'membro123', phone:'(11) 99999-0002', accountType:'representante', role:'membro',      orgId:'org-team',  memberId:'u2'});
    S.addUser({id:3, name:'Refer Distribuidora — Gestor', email:'gestor.distribuidora@reposapp.com', pass:'gestor123', phone:'(11) 4002-8922', accountType:'fornecedor', role:'gestor',      orgId:'org-refer'});
    S.addUser({id:4, name:'Carlos Mendes',   email:'colaborador.distribuidora@reposapp.com', pass:'colab123',  phone:'(11) 4002-8933', accountType:'fornecedor', role:'colaborador', orgId:'org-refer'});

    const clients = [
        {id:1, name:'Mercado São João Comércio de Alimentos Ltda', nomeFantasia:'Mercado São João', cnpj:'12.345.678/0001-90', ie:'123.456.789.110', taxRegime:'Simples Nacional', cls:'A', seg:'Supermercado', supplier:'alimentos', addr:'Rua das Flores, 123', cep:'01310-100', city:'São Paulo', state:'SP', contact:'Carlos Mendes', phone:'(11) 99123-4567', emailCompras:'compras@saojoao.com.br', phoneCompras:'(11) 3322-1100', owe:0, oweDays:0,
            promoters:[{name:'Fernanda Costa', days:'Ter/Qui', active:true, lastAction:'Reposição de gôndola', lastActionDate:d(3)}],
            trainings:[{title:'Treinamento linha Arroz Premium', date:d(40), attendees:2}]},
        {id:2, name:'Supermercado Central Distribuição S.A.', nomeFantasia:'Supermercado Central', cnpj:'98.765.432/0001-10', ie:'987.654.321.114', taxRegime:'Lucro Presumido', cls:'A', seg:'Supermercado', supplier:'alimentos', addr:'Av. Principal, 456', cep:'04567-200', city:'São Paulo', state:'SP', contact:'Ana Paula', phone:'(11) 98765-4321', emailCompras:'compras@central.com.br', phoneCompras:'(11) 3344-5566', owe:1200, oweDays:12,
            promoters:[{name:'Juliana Alves', days:'Seg/Qua/Sex', active:true, lastAction:'Degustação de produtos', lastActionDate:d(7)}],
            trainings:[{title:'Treinamento atendimento ao cliente', date:d(60), attendees:5}]},
        {id:3, name:'Padaria Bella Vista Ltda', nomeFantasia:'Padaria Bella Vista', cnpj:'11.222.333/0001-44', ie:'112.223.334.119', taxRegime:'MEI', cls:'B', seg:'Padaria', supplier:'alimentos', addr:'Rua do Pão, 789', cep:'02233-300', city:'São Paulo', state:'SP', contact:'José Silva', phone:'(11) 97654-3210', emailCompras:'jose@bellavista.com.br', phoneCompras:'(11) 3211-9988', owe:0, oweDays:0,
            promoters:[{name:'Renata Souza', days:'Sáb', active:false, lastAction:'Ação encerrada — contrato finalizado', lastActionDate:d(90)}],
            trainings:[]},
        {id:4, name:'Mercearia do Bairro Comércio Ltda', nomeFantasia:'Mercearia do Bairro', cnpj:'55.666.777/0001-22', ie:'556.667.778.122', taxRegime:'Simples Nacional', cls:'C', seg:'Mercearia', supplier:'alimentos', addr:'Rua Pequena, 10', cep:'03344-400', city:'São Paulo', state:'SP', contact:'Maria Santos', phone:'(11) 96543-2109', emailCompras:'maria@mercearia.com.br', phoneCompras:'(11) 3299-1010', owe:350, oweDays:8,
            promoters:[], trainings:[]},
        {id:5, name:'Bar e Distribuidora do Zé Ltda', nomeFantasia:'Bar do Zé', cnpj:'33.444.555/0001-66', ie:'334.445.556.130', taxRegime:'Simples Nacional', cls:'B', seg:'Bar', supplier:'bebidas', addr:'Av. das Águas, 200', cep:'05566-500', city:'São Paulo', state:'SP', contact:'Marcos Lima', phone:'(11) 95555-1234', emailCompras:'marcos@bardoze.com.br', phoneCompras:'(11) 3455-2233', owe:0, oweDays:0,
            promoters:[{name:'Marcos Lima', days:'Qui/Sáb', active:true, lastAction:'Reposição de geladeira', lastActionDate:d(1)}],
            trainings:[{title:'Treinamento portfólio de bebidas', date:d(20), attendees:1}]},
        {id:6, name:'Distribuidora Higiene Total Ltda', nomeFantasia:'Higiene Total', cnpj:'77.888.999/0001-12', ie:'778.889.991.135', taxRegime:'Lucro Real', cls:'A', seg:'Distribuidora', supplier:'higiene', addr:'Rod. dos Limpos, km 5', cep:'06677-600', city:'Guarulhos', state:'SP', contact:'Patrícia Gomes', phone:'(11) 94444-5678', emailCompras:'patricia@higienetotal.com.br', phoneCompras:'(11) 2400-7766', owe:0, oweDays:0,
            promoters:[{name:'Patrícia Gomes', days:'Seg a Sex', active:true, lastAction:'Organização de prateleira', lastActionDate:d(2)}],
            trainings:[{title:'Treinamento técnico — linha higiene', date:d(10), attendees:3}]},
        {id:7, name:'Restaurante Sabor Caseiro Refeições Ltda', nomeFantasia:'Sabor Caseiro', cnpj:'22.333.444/0001-77', ie:'223.334.445.140', taxRegime:'Simples Nacional', cls:'B', seg:'Restaurante', supplier:'alimentos', addr:'Rua da Cozinha, 55', cep:'07788-700', city:'Osasco', state:'SP', contact:'Beatriz Lima', phone:'(11) 93333-2222', emailCompras:'beatriz@saborcaseiro.com.br', phoneCompras:'(11) 3600-4400', owe:0, oweDays:0,
            promoters:[], trainings:[{title:'Treinamento harmonização de pratos', date:d(50), attendees:2}]},
        {id:8, name:'Drogaria Vida Saudável Farmacêutica Ltda', nomeFantasia:'Vida Saudável', cnpj:'44.555.666/0001-88', ie:'445.556.667.155', taxRegime:'Lucro Presumido', cls:'A', seg:'Drogaria', supplier:'higiene', addr:'Av. da Saúde, 900', cep:'08899-800', city:'São Paulo', state:'SP', contact:'Roberto Alves', phone:'(11) 92222-1111', emailCompras:'roberto@vidasaudavel.com.br', phoneCompras:'(11) 3700-5500', owe:480, oweDays:5,
            promoters:[{name:'Camila Rocha', days:'Seg/Qui', active:true, lastAction:'Reposição de vitrine', lastActionDate:d(4)}],
            trainings:[]},
    ];
    const CLIENT_OWNER_MAP = {1:'u1', 2:'u1', 3:'u2', 4:'u2', 5:'u1', 6:'m3', 7:'m3', 8:'m4'};
    clients.forEach(c=>{ c.orgId='org-team'; c.ownerId = CLIENT_OWNER_MAP[c.id]||'u1'; });
    S.setClients(clients);

    const orders = [];
    function addOrders(client, list) { list.forEach(o=>orders.push(buildOrder(client.id, client.supplier, o.pm, mkItems(client,o.items), o.disc, o.days, o.status, {ownerId: client.ownerId, source:'rep'}))); }

    addOrders(clients[0], [
        {pm:'pix',      items:[[1,4,0],[2,6,0],[3,12,0.02]], disc:0.02, days:15, status:'confirmado'},
        {pm:'boleto',   items:[[1,2,0],[4,10,0]],            disc:0,    days:42, status:'confirmado'},
        {pm:'prazo_30', items:[[5,8,0],[6,6,0]],             disc:0.01, days:70, status:'confirmado'},
    ]);
    addOrders(clients[1], [
        {pm:'prazo_60', items:[[1,20,0.03],[2,30,0.03],[3,24,0]], disc:0.03, days:45, status:'confirmado'},
        {pm:'boleto',   items:[[4,40,0]],                         disc:0,    days:80, status:'confirmado'},
    ]);
    addOrders(clients[2], [
        {pm:'pix', items:[[5,4,0],[6,3,0]], disc:0, days:5, status:'confirmado'},
    ]);
    addOrders(clients[3], [
        {pm:'boleto', items:[[1,1,0],[2,2,0]], disc:0, days:30, status:'confirmado'},
    ]);
    addOrders(clients[4], [
        {pm:'pix',    items:[[7,10,0],[8,24,0.02],[9,12,0]], disc:0.02, days:3,  status:'confirmado'},
        {pm:'cheque', items:[[10,6,0]],                       disc:0,    days:35, status:'confirmado'},
    ]);
    addOrders(clients[5], [
        {pm:'prazo_30', items:[[11,18,0.02],[12,10,0]], disc:0.02, days:2,  status:'confirmado'},
        {pm:'boleto',   items:[[11,12,0]],                disc:0,    days:25, status:'confirmado'},
    ]);
    addOrders(clients[6], [
        {pm:'pix',    items:[[1,6,0],[3,10,0]],   disc:0,    days:1,  status:'confirmado'},
        {pm:'boleto', items:[[5,12,0],[6,8,0]],   disc:0.01, days:18, status:'confirmado'},
    ]);
    addOrders(clients[7], [
        {pm:'prazo_30', items:[[11,30,0.03],[12,20,0]], disc:0.03, days:5,  status:'confirmado'},
        {pm:'boleto',   items:[[11,15,0]],                disc:0,    days:28, status:'confirmado'},
    ]);
    // Pedidos recentes adicionais — deixam o painel do mês com volume realista
    addOrders(clients[0], [{pm:'pix',    items:[[1,3,0],[2,4,0]],  disc:0, days:0, status:'confirmado'}]);
    addOrders(clients[1], [{pm:'boleto', items:[[3,15,0]],          disc:0, days:1, status:'confirmado'}]);
    addOrders(clients[4], [{pm:'pix',    items:[[8,30,0]],          disc:0, days:0, status:'confirmado'}]);
    addOrders(clients[5], [{pm:'boleto', items:[[12,8,0]],          disc:0, days:1, status:'confirmado'}]);
    // ---- Pedidos "em aberto" vindos do formulário público (demonstração) ----
    // O formulário não identifica a empresa — só o link já direciona para a conta do representante.
    const formSnapshotSN = { nomeFantasia:'Pedido via formulário', razaoSocial:'', cnpj:'', taxRegime:'Simples Nacional', email:'', phone:'(11) 97110-1214' };
    orders.unshift(buildOrder(null, 'refer', 'boleto',
        mkItems(formSnapshotSN, [[100,2,0],[150,1,0]]), 0, 0, 'aberto',
        {source:'forms', ownerId:'u1', clientSnapshot: formSnapshotSN, notes:'Pedido recebido pelo formulário público de pedidos'}));

    const formSnapshotLR = { nomeFantasia:'Pedido via formulário', razaoSocial:'', cnpj:'', taxRegime:'Lucro Presumido', email:'', phone:'(11) 97110-1214' };
    orders.unshift(buildOrder(null, 'refer', 'boleto',
        mkItems(formSnapshotLR, [[145,3,0],[153,2,0]]), 0, 0, 'aberto',
        {source:'forms', ownerId:'u1', clientSnapshot: formSnapshotLR, notes:'Pedido recebido pelo formulário público de pedidos'}));

    S.s('orders', orders.sort((a,b)=>new Date(b.date)-new Date(a.date)));

    // ---- Tarefas distribuídas entre membros da equipe (alimenta o calendário multiusuário) ----
    const tasks = [
        {id:'t1', ownerId:'u1', clientId:1, title:'Ligar para confirmar reposição', type:'ligacao', dueDate:todayStr(), status:'pendente', rescheduledTo:null, notes:'Confirmar quantidade de arroz 5kg'},
        {id:'t2', ownerId:'u1', clientId:5, title:'Visitar Bar do Zé — novidades bebidas', type:'visita', dueDate:todayStr(), status:'pendente', rescheduledTo:null, notes:null},
        {id:'t3', ownerId:'u1', clientId:6, title:'Visita técnica linha higiene', type:'visita', dueDate:todayStr(), status:'concluida', rescheduledTo:null, notes:'Realizada pela manhã'},
        {id:'t4', ownerId:'u1', clientId:2, title:'Cobrar título em aberto', type:'lembrete', dueDate: new Date(Date.now()-2*864e5).toISOString().slice(0,10), status:'pendente', rescheduledTo:null, notes:'R$ 1.200,00 vencido há 12 dias'},
        {id:'t5', ownerId:'u1', clientId:4, title:'Negociar parcelamento do débito', type:'ligacao', dueDate: new Date(Date.now()-1*864e5).toISOString().slice(0,10), status:'remarcada', rescheduledTo: new Date(Date.now()+2*864e5).toISOString().slice(0,10), notes:null},
        {id:'t6', ownerId:'u1', clientId:3, title:'Apresentar novo mix de massas', type:'visita', dueDate: new Date(Date.now()+1*864e5).toISOString().slice(0,10), status:'pendente', rescheduledTo:null, notes:null},
        {id:'t7', ownerId:'u1', clientId:1, title:'Agendar treinamento promotora', type:'lembrete', dueDate: new Date(Date.now()+3*864e5).toISOString().slice(0,10), status:'pendente', rescheduledTo:null, notes:null},
        {id:'t8', ownerId:'u1', clientId:2, title:'Visita de relacionamento mensal', type:'visita', dueDate: new Date(Date.now()+5*864e5).toISOString().slice(0,10), status:'pendente', rescheduledTo:null, notes:null},
        {id:'t9', ownerId:'u1', clientId:6, title:'Ligar para renovar contrato anual', type:'ligacao', dueDate: new Date(Date.now()-5*864e5).toISOString().slice(0,10), status:'cancelada', rescheduledTo:null, notes:'Cliente renovou direto com a indústria'},
        {id:'t10', ownerId:'u1', clientId:7, title:'Degustar novo prato com representante', type:'visita', dueDate:todayStr(), status:'pendente', rescheduledTo:null, notes:null},
        {id:'t11', ownerId:'u1', clientId:8, title:'Cobrar título em aberto — Vida Saudável', type:'lembrete', dueDate: new Date(Date.now()-1*864e5).toISOString().slice(0,10), status:'pendente', rescheduledTo:null, notes:'R$ 480,00 vencido há 5 dias'},
        {id:'t12', ownerId:'u2', clientId:5, title:'Visita conjunta — Bar do Zé', type:'visita', dueDate:todayStr(), status:'pendente', rescheduledTo:null, notes:null},
        {id:'t13', ownerId:'u2', clientId:null, title:'Atualizar planilha de metas da equipe', type:'lembrete', dueDate: new Date(Date.now()+1*864e5).toISOString().slice(0,10), status:'pendente', rescheduledTo:null, notes:null},
        {id:'t14', ownerId:'u2', clientId:null, title:'Reunião semanal de alinhamento', type:'lembrete', dueDate: new Date(Date.now()+2*864e5).toISOString().slice(0,10), status:'pendente', rescheduledTo:null, notes:null},
        {id:'t15', ownerId:'m3', clientId:null, title:'Visita — Zona Norte (carteira própria)', type:'visita', dueDate:todayStr(), status:'pendente', rescheduledTo:null, notes:null},
        {id:'t16', ownerId:'m3', clientId:null, title:'Treinamento de produto — equipe', type:'lembrete', dueDate: new Date(Date.now()+1*864e5).toISOString().slice(0,10), status:'pendente', rescheduledTo:null, notes:null},
        {id:'t17', ownerId:'m4', clientId:null, title:'Follow-up de propostas em aberto', type:'ligacao', dueDate: new Date(Date.now()+1*864e5).toISOString().slice(0,10), status:'pendente', rescheduledTo:null, notes:null},
    ];
    S.setTasks(tasks);

    S.s('visits', [
        {id:'v1', ownerId:'m3', clientId:6, date:todayStr(), status:'realizada'},
        {id:'v2', ownerId:'u2', clientId:3, date: new Date(Date.now()-1*864e5).toISOString().slice(0,10), status:'realizada'},
        {id:'v3', ownerId:'u1', clientId:5, date: new Date(Date.now()-2*864e5).toISOString().slice(0,10), status:'realizada'},
        {id:'v4', ownerId:'u1', clientId:1, date: new Date(Date.now()-3*864e5).toISOString().slice(0,10), status:'realizada'},
        {id:'v5', ownerId:'m4', clientId:8, date: new Date(Date.now()-1*864e5).toISOString().slice(0,10), status:'realizada'},
    ]);

    S.setNotes([
        {id:'n1', title:'Ideia: kit promocional arroz + feijão', text:'Sugerir kit combinado para o Mercado São João na próxima visita, com 5% de desconto para fechamento até o fim do mês.', clientId:1, date:d(2)},
        {id:'n2', title:'Cliente comentou sobre concorrente', text:'Supermercado Central mencionou proposta de outro representante. Validar preços antes da próxima visita.', clientId:2, date:d(1)},
        {id:'n3', title:'Oportunidade linha higiene', text:'Higiene Total pode ampliar o mix com papel higiênico premium — levar catálogo atualizado.', clientId:6, date:d(0)},
    ]);

    S.setGoals({revenueTarget:28000, visitsTarget:80});
    S.setSettings({notifications:true, darkTheme:false, commissionRate:0.04});

    S.setSupReps([
        {id:'r1', name:'Fernando Lacerda', region:'Zona Leste/SP', clients:34, revenue:18200, pedidos:21, active:true},
        {id:'r2', name:'Patrícia Nunes', region:'Zona Norte/SP', clients:28, revenue:14750, pedidos:17, active:true},
        {id:'r3', name:'Diego Araújo', region:'ABC Paulista', clients:19, revenue:9100, pedidos:11, active:true},
    ]);
    S.setChannels({tiktok:false, mercadolivre:true, shopify:false});

    // ---- Equipes de representantes (BI + gestão de membros) ----
    S.setTeams([
        { id:'team-leste', orgId:'org-team', name:'Equipe Zona Leste', adminId:'u1', memberIds:['u1','u2','m3','m4'], pendingInvites:[], joinable:true, createdAt:d(120) },
        { id:'team-norte', orgId:'org-team', name:'Equipe Zona Norte', adminId:'m5', memberIds:['m5','m6','u2'],      pendingInvites:[{id:'inv1', name:'Renata Souza', contact:'renata@email.com'}], joinable:true, createdAt:d(60) },
    ]);

    // Admin de cada equipe vê todos os membros em todas as categorias por padrão; membros começam só
    // com os próprios dados, mas aqui já concedemos visibilidade extra à Patrícia (u2) em algumas
    // categorias para demonstrar o controle granular do gestor (tarefas, clientes e visitas).
    S.setTeamPerms({
        'team-leste': {
            u1: { tarefas:['u1','u2','m3','m4'], clientes:['u1','u2','m3','m4'], visitas:['u1','u2','m3','m4'] },
            u2: { tarefas:['u2','u1','m3'],      clientes:['u2','u1'],           visitas:['u2','u1'] },
            m3: { tarefas:['m3'],                clientes:['m3'],               visitas:['m3'] },
            m4: { tarefas:['m4'],                clientes:['m4'],               visitas:['m4'] },
        },
        'team-norte': {
            m5: { tarefas:['m5','m6','u2'], clientes:['m5','m6','u2'], visitas:['m5','m6','u2'] },
            m6: { tarefas:['m6'],           clientes:['m6'],           visitas:['m6'] },
            u2: { tarefas:['u2'],           clientes:['u2'],           visitas:['u2'] },
        },
    });

    // Leads ficam vinculados à carteira da equipe de representantes (org-team).
    const leadStatusCycle = ['novo','novo','contatado','contatado','novo','qualificado','novo','novo','novo','novo','novo','novo','contatado','novo'];
    const leadOwnerCycle = ['u1','u1','u2','u2','u1','m3','m3','m4','u1','u2','u1','m3','u2','u1'];
    S.setLeads(LEADS_REFER_SEED.map((l,i)=>({
        id: 'lead'+(i+1), orgId:'org-team', status: leadStatusCycle[i]||'novo',
        ownerId: leadOwnerCycle[i]||'u1',
        createdAt: d(Math.floor(Math.random()*25)+1), ...l,
    })));

    S.setProductFields('org-refer', DEFAULT_PRODUCT_FIELDS);

    S.s('seeded', SEED_VERSION);
}

function resetDemoData() {
    ['seeded','clients','orders','tasks','visits','goals','settings','notes','orgs','leads','users','session','supReps','channels','customProducts','teams','calendarPerms','teamPerms']
        .forEach(k=>S.d(k));
    seed();
    applyTheme();
    toast('Dados de demonstração restaurados!');
    showScreen('login');
}
