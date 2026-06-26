// ======================
// NAVIGATION
// ======================
const NAV_IDS = {
    dashboard: ['bn-dash','sb-dash'],
    carteira:  ['bn-cw','sb-cw'],
    leads:     ['bn-leads','sb-leads'],
    tarefas:   ['bn-tf','sb-tf'],
    rota:      ['bn-rt','sb-rt'],
    pedido:    ['bn-pd','sb-pd'],
    config:    ['sb-cfg'],
    financeiro:['sb-fin'],
    equipe:    ['sb-equipe'],
    anotacoes: ['sb-notes'],
    'sup-dash':    ['bn-sup-dash','sb-sup-dash'],
    'sup-catalogo':['bn-sup-cat','sb-sup-cat'],
};
const NO_BNAV_SCREENS = ['ok','config','detail','financeiro','equipe','anotacoes'];
const AUTH_SCREENS = ['dashboard','carteira','detail','rota','pedido','ok','tarefas','config','financeiro','equipe','anotacoes','leads','sup-dash','sup-catalogo'];

function applyAccountNav() {
    const u = S.session();
    const isSup = u && u.accountType==='fornecedor';
    document.querySelectorAll('.nav-rep').forEach(el=>el.style.display = isSup ? 'none' : 'flex');
    document.querySelectorAll('.nav-sup').forEach(el=>el.style.display = isSup ? 'flex' : 'none');
    const navRep = document.getElementById('sidebar-nav-rep'); if (navRep) navRep.style.display = isSup ? 'none' : 'flex';
    const navSup = document.getElementById('sidebar-nav-sup'); if (navSup) navSup.style.display = isSup ? 'flex' : 'none';
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-'+name)?.classList.add('active');
    applyAccountNav();

    const isAuth = AUTH_SCREENS.includes(name);
    document.getElementById('app').classList.toggle('auth', isAuth);
    toggleSupportFab(isAuth);
    if (!isAuth) closeSupportChat();

    const bnav = document.getElementById('bnav');
    const showNav = isAuth && !NO_BNAV_SCREENS.includes(name);
    bnav.style.display = showNav ? 'flex' : 'none';

    document.querySelectorAll('.bnav-item, .sidebar-item').forEach(b => b.classList.remove('active'));
    (NAV_IDS[name]||[]).forEach(id => document.getElementById(id)?.classList.add('active'));

    const u = S.session();
    const sbu = document.getElementById('sb-username');
    if (sbu) sbu.textContent = u ? u.name : '';
    const sbr = document.getElementById('sb-userrole');
    if (sbr && u) {
        const roleLabel = { gestor:'Gestor', colaborador:'Colaborador', membro:'Membro de equipe' }[u.role] || '';
        sbr.textContent = (u.accountType==='fornecedor' ? 'Distribuidora' : 'Representante') + (roleLabel?' · '+roleLabel:'');
    }

    window.scrollTo(0,0);

    const loaders = {
        dashboard: loadDash, carteira: loadCW, rota: loadRota, pedido: loadPedido,
        tarefas: loadTarefas, config: loadConfig, financeiro: loadFinanceiro, equipe: loadEquipe, anotacoes: loadNotes,
        register: resetRegisterWizard, leads: loadLeads,
        'sup-dash': loadSupDash, 'sup-catalogo': loadSupCatalogo,
    };
    loaders[name]?.();
}

function openMoreMenu() { document.getElementById('modal-more').classList.add('show'); }
function closeMoreMenu() { document.getElementById('modal-more').classList.remove('show'); }

// ======================
// AUTH
// ======================
function homeScreenFor(u) {
    return u && u.accountType==='fornecedor' ? 'sup-dash' : 'dashboard';
}
function goHome() { showScreen(homeScreenFor(S.session())); }

function fillDemo(email, pass) {
    document.getElementById('li-email').value = email;
    document.getElementById('li-pass').value = pass;
    handleLogin();
}

function handleLogin() {
    const e = document.getElementById('li-email').value.trim();
    const p = document.getElementById('li-pass').value;
    if (!e||!p) return toast('Preencha todos os campos');
    const u = S.findUser(e,p);
    if (!u) return toast('E-mail ou senha incorretos');
    S.login(u);
    showScreen(homeScreenFor(u));
}

// ======================
// CADASTRO (wizard 3 etapas)
// ======================
let rgAccountType = null;
let rgOrgMode = null;

function resetRegisterWizard() {
    rgAccountType = null; rgOrgMode = null;
    ['rg-name','rg-email','rg-phone','rg-pass','rg-org-name'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    document.querySelectorAll('.rg-type-card, .rg-org-card').forEach(b=>{ b.style.borderColor='#E5E5EA'; b.style.background='white'; });
    document.getElementById('rg-step2-next').disabled = true;
    document.getElementById('rg-org-join-select').style.display = 'none';
    rgGoStep(1, true);
}

function rgGoStep(n, skipHistory) {
    document.getElementById('rg-step-1').style.display = n===1 ? 'flex' : 'none';
    document.getElementById('rg-step-2').style.display = n===2 ? 'flex' : 'none';
    document.getElementById('rg-step-3').style.display = n===3 ? 'flex' : 'none';
    document.getElementById('rg-bar1').classList.toggle('done', n>=1);
    document.getElementById('rg-bar2').classList.toggle('done', n>=2);
    document.getElementById('rg-bar3').classList.toggle('done', n>=3);

    if (n===1) {
        document.getElementById('rg-step-title').textContent='Criar conta';
        document.getElementById('rg-step-sub').textContent='Sem cartão de crédito';
    } else if (n===2) {
        if (!document.getElementById('rg-name').value.trim() || !document.getElementById('rg-email').value.trim() || !document.getElementById('rg-pass').value) {
            toast('Preencha nome, e-mail e senha'); return rgGoStep(1);
        }
        document.getElementById('rg-step-title').textContent='Que tipo de conta é a sua?';
        document.getElementById('rg-step-sub').textContent='Isso muda o que você vê no RepOS';
    } else if (n===3) {
        document.getElementById('rg-step-title').textContent = rgAccountType==='fornecedor' ? 'Crie sua organização' : 'Carteira própria ou organização?';
        document.getElementById('rg-step-sub').textContent='Último passo';
        document.getElementById('rg-org-rep').style.display = rgAccountType==='representante' ? 'flex' : 'none';
        document.getElementById('rg-org-fornecedor').style.display = rgAccountType==='fornecedor' ? 'flex' : 'none';
        if (rgAccountType==='representante') {
            const sel = document.getElementById('rg-org-select');
            sel.innerHTML = S.orgs().filter(o=>o.joinable).map(o=>`<option value="${o.id}">${o.name}${o.type==='fornecedor'?' (fornecedor)':' (grupo)'}</option>`).join('');
        }
    }
    window.scrollTo(0,0);
}

function rgBack() {
    const step2visible = document.getElementById('rg-step-2').style.display==='flex';
    const step3visible = document.getElementById('rg-step-3').style.display==='flex';
    if (step3visible) rgGoStep(2);
    else if (step2visible) rgGoStep(1);
    else showScreen('login');
}

function selectAccountType(el) {
    rgAccountType = el.dataset.type;
    document.querySelectorAll('.rg-type-card').forEach(b=>{ b.style.borderColor='#E5E5EA'; b.style.background='white'; });
    el.style.borderColor='#16A34A'; el.style.background='#F0FDF4';
    document.getElementById('rg-step2-next').disabled = false;
}

function selectOrgMode(el) {
    rgOrgMode = el.dataset.org;
    document.querySelectorAll('.rg-org-card').forEach(b=>{ b.style.borderColor='#E5E5EA'; b.style.background='white'; });
    el.style.borderColor='#16A34A'; el.style.background='#F0FDF4';
    document.getElementById('rg-org-join-select').style.display = rgOrgMode==='join' ? 'block' : 'none';
}

function handleRegister() {
    const name = document.getElementById('rg-name').value.trim();
    const email = document.getElementById('rg-email').value.trim();
    const phone = document.getElementById('rg-phone').value.trim();
    const pass = document.getElementById('rg-pass').value;
    if (!name||!email||!pass) return toast('Preencha todos os campos');
    if (pass.length < 6) return toast('Senha deve ter mínimo 6 caracteres');
    if (S.users().find(u=>u.email===email)) return toast('E-mail já cadastrado');
    if (!rgAccountType) return toast('Selecione o tipo de conta');

    let orgId;
    if (rgAccountType==='fornecedor') {
        const orgName = document.getElementById('rg-org-name').value.trim();
        if (!orgName) return toast('Informe o nome da empresa');
        const orgIdNew = 'org-'+Date.now();
        const org = { id:orgIdNew, name:orgName, type:'fornecedor', supplierKey:orgIdNew, joinable:true };
        S.setOrgs([...S.orgs(), org]);
        orgId = org.id;
    } else {
        if (rgOrgMode==='join') {
            orgId = document.getElementById('rg-org-select').value;
            if (!orgId) return toast('Selecione uma organização');
        } else {
            const org = { id:'org-'+Date.now(), name:name+' (independente)', type:'representante', joinable:false };
            S.setOrgs([...S.orgs(), org]);
            orgId = org.id;
        }
    }

    const u = {id:Date.now(),name,email,phone,pass,accountType:rgAccountType,orgId};
    S.addUser(u); S.login(u);
    toast('Conta criada! Bem-vindo ao RepOS');
    setTimeout(()=>showScreen(homeScreenFor(u)),700);
}

function logout() {
    S.logout();
    showScreen('landing');
}

function priorityScore(c) {
    const days = Math.floor((Date.now()-new Date(lastOrderDate(c)||0))/864e5);
    return (c.cls==='A'?30:c.cls==='B'?20:10)+(c.owe>0?20:0)+days*0.4;
}

function clientOrders(clientId) {
    return S.orders().filter(o=>o.clientId===clientId).sort((a,b)=>new Date(b.date)-new Date(a.date));
}
function lastOrderDate(c) { const os=clientOrders(c.id); return os[0]?os[0].date:null; }
function lastOrderVal(c) { const os=clientOrders(c.id); return os[0]?os[0].total:0; }
function avgTicket(c) { const os=clientOrders(c.id); return os.length? os.reduce((s,o)=>s+o.total,0)/os.length : 0; }

function revenueForMonth(monthKey) {
    return S.orders().filter(o=>o.date.slice(0,7)===monthKey).reduce((s,o)=>s+o.total,0);
}
function commissionForMonth(monthKey) {
    return revenueForMonth(monthKey) * S.settings().commissionRate;
}

// ======================
// DASHBOARD
// ======================
function loadDash() {
    const u = S.session();
    if (!u) return showScreen('login');
    const clients = visibleClients();
    const orders = S.orders();
    const goals = S.goals();
    const today = new Date();
    const monthKey = today.toISOString().slice(0,7);

    document.getElementById('dash-name').textContent = u.name.split(' ')[0];
    document.getElementById('dash-date').textContent = today.toLocaleDateString('pt-BR',{day:'numeric',month:'short'});

    document.getElementById('dash-nc').textContent = clients.length;

    const monthOrders = orders.filter(o=>o.date.slice(0,7)===monthKey);
    document.getElementById('dash-np').textContent = monthOrders.length;
    const monthRevenue = monthOrders.reduce((s,o)=>s+o.total,0);

    const pct = Math.min(100, Math.round((monthRevenue/goals.revenueTarget)*100) || 0);
    document.getElementById('dash-mpct').textContent = pct+'%';
    document.getElementById('dash-mval').textContent = fmtMoney(monthRevenue)+' de '+fmtMoney(goals.revenueTarget);
    setTimeout(()=>{ document.getElementById('dash-mbar').style.width = pct+'%'; },100);

    const monthVisits = S.visits().filter(v=>v.date.slice(0,7)===monthKey).length;
    const vpct = Math.min(100, Math.round((monthVisits/goals.visitsTarget)*100) || 0);
    document.getElementById('dash-vpct').textContent = vpct+'%';
    document.getElementById('dash-vval').textContent = monthVisits+' de '+goals.visitsTarget;
    setTimeout(()=>{ document.getElementById('dash-vbar').style.width = vpct+'%'; },100);

    const visitsToday = S.visits().filter(v=>v.date===todayStr()).length;
    const dailyGoal = Math.max(1, Math.round(goals.visitsTarget/22));
    document.getElementById('dash-vhoje').textContent = visitsToday+'/'+dailyGoal;

    document.getElementById('dash-comm').textContent = fmtMoney(commissionForMonth(monthKey));

    const sorted = [...clients].sort((a,b)=>priorityScore(b)-priorityScore(a));
    const vl = document.getElementById('dash-vlist');
    vl.innerHTML = sorted.slice(0,3).map(c=>{
        const ld = lastOrderDate(c);
        const dd = ld ? Math.floor((Date.now()-new Date(ld))/864e5) : 999;
        const col = dd>30?'#DC2626':dd>14?'#D97706':'#059669';
        const bg  = dd>30?'#FEF2F2':dd>14?'#FFFBEB':'#F0FDF4';
        return `<div class="client-card" onclick="openClient(${c.id})">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <div style="width:38px;height:38px;background:${bg};border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-store" style="color:${col};font-size:15px;"></i></div>
                    <div style="min-width:0;">
                        <div style="font-size:14px;font-weight:600;color:#1D1D1F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.nomeFantasia}</div>
                        <div style="font-size:12px;color:#6E6E73;">${dd>=999?'Nunca comprou':'Sem compra há <b style=\"color:'+col+';\">'+dd+' dias</b>'}</div>
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
                    <span class="badge badge-${c.cls.toLowerCase()}">${c.cls}</span>
                    ${c.owe>0?`<span style="font-size:10px;color:#DC2626;font-weight:700;">Inadimplente</span>`:''}
                </div>
            </div>
        </div>`;
    }).join('');

    const al = document.getElementById('dash-alist');
    const ow = clients.filter(c=>c.owe>0);
    al.innerHTML = ow.length===0
        ? `<div style="text-align:center;padding:20px 0;color:#86868B;font-size:13px;"><i class="fas fa-check-circle" style="font-size:26px;color:#16A34A;display:block;margin-bottom:8px;"></i>Nenhuma inadimplência ativa</div>`
        : ow.map(c=>`<div class="overdue" onclick="openClient(${c.id})" style="cursor:pointer;">
            <div style="width:36px;height:36px;background:#FEE2E2;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-triangle-exclamation" style="color:#DC2626;font-size:14px;"></i></div>
            <div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:600;color:#1D1D1F;">${c.nomeFantasia}</div><div style="font-size:12px;color:#EF4444;margin-top:2px;">${fmtMoney(c.owe)} em aberto · ${c.oweDays} dias</div></div>
            <i class="fas fa-chevron-right" style="color:#C7C7CC;font-size:11px;"></i>
        </div>`).join('');

    const newLeads = S.leads().filter(l=>l.status==='novo').slice(0,3);
    const dl = document.getElementById('dash-leads');
    if (dl) {
        dl.innerHTML = newLeads.length===0
            ? `<p style="font-size:13px;color:#86868B;text-align:center;padding:10px 0;">Nenhum lead novo no momento.</p>`
            : newLeads.map(l=>`<div class="client-card" onclick="showScreen('leads')">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                        <div style="width:38px;height:38px;background:#F5F5F7;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-bullseye" style="color:#6E6E73;font-size:14px;"></i></div>
                        <div style="min-width:0;"><div style="font-size:14px;font-weight:600;color:#1D1D1F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.nomeFantasia}</div><div style="font-size:12px;color:#6E6E73;">${l.region||l.city||'sem região'}</div></div>
                    </div>
                    <span class="badge" style="background:#F5F5F7;color:#6E6E73;">Novo</span>
                </div>
            </div>`).join('');
    }
}

// ======================
// CARTEIRA
// ======================
function loadCW() {
    const clients = visibleClients();
    document.getElementById('cw-subtitle').textContent = clients.length + ' clientes na carteira';
    renderClients();
}

function renderClients() {
    const clients = visibleClients();
    const q = (document.getElementById('cw-search')?.value||'').toLowerCase();
    const list = document.getElementById('cw-list');

    const f = clients.filter(c=>{
        const mf = cwFilter==='all'||(cwFilter==='overdue'?c.owe>0:c.cls===cwFilter);
        const ms = !q||c.name.toLowerCase().includes(q)||c.nomeFantasia.toLowerCase().includes(q)||c.cnpj.includes(q);
        return mf&&ms;
    });

    if (!f.length) {
        list.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:50px 0;color:#86868B;"><i class="fas fa-users-slash" style="font-size:32px;margin-bottom:12px;display:block;"></i><div style="font-size:15px;font-weight:600;">Nenhum cliente encontrado</div></div>`;
        return;
    }

    const mid = currentMemberId();
    const showOwner = mid && new Set(f.map(c=>c.ownerId)).size>1;
    list.innerHTML = f.map(c=>{
        const ld = lastOrderDate(c);
        const dd = ld ? Math.floor((Date.now()-new Date(ld))/864e5) : 999;
        const dc = dd>30?'#DC2626':dd>14?'#D97706':'#059669';
        const tk = avgTicket(c);
        return `<div class="client-card" onclick="openClient(${c.id})">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
                        <span style="font-size:15px;font-weight:700;color:#1D1D1F;">${c.nomeFantasia}</span>
                        <span class="badge badge-${c.cls.toLowerCase()}">${c.cls}</span>
                        ${c.owe>0?`<span style="width:7px;height:7px;background:#EF4444;border-radius:50%;display:inline-block;"></span>`:''}
                        ${showOwner?`<span class="badge" style="background:#F5F5F7;color:#3A3A3C;"><span class="member-dot" style="background:${memberColor(c.ownerId)};width:7px;height:7px;margin-right:4px;"></span>${memberDisplayName(c.ownerId)}</span>`:''}
                    </div>
                    <div style="font-size:12px;color:#86868B;margin-bottom:8px;">${c.seg} · ${c.cnpj}</div>
                    <div style="display:flex;gap:20px;">
                        <div><div style="font-size:10px;color:#86868B;font-weight:600;">ÚLTIMO PEDIDO</div><div style="font-size:13px;font-weight:700;color:${dc};">${dd>=999?'Nunca':dd+' dias atrás'}</div></div>
                        ${c.owe>0
                            ?`<div><div style="font-size:10px;color:#86868B;font-weight:600;">EM ABERTO</div><div style="font-size:13px;font-weight:700;color:#DC2626;">${fmtMoney(c.owe)}</div></div>`
                            :`<div><div style="font-size:10px;color:#86868B;font-weight:600;">TICKET MÉDIO</div><div style="font-size:13px;font-weight:700;color:#1D1D1F;">${tk?fmtMoney(tk):'—'}</div></div>`
                        }
                    </div>
                </div>
                <i class="fas fa-chevron-right" style="color:#C7C7CC;font-size:11px;margin-top:4px;"></i>
            </div>
        </div>`;
    }).join('');
}

function setChip(f,el) {
    cwFilter=f;
    el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    renderClients();
}

// ======================
// ADD CLIENT
// ======================
function openAddClient() {
    const sel = document.getElementById('nc-supplier');
    sel.innerHTML = Object.entries(IND).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
    ['nc-cnpj','nc-name','nc-fantasia','nc-ie','nc-addr','nc-cep','nc-city','nc-state','nc-emailcompras','nc-phonecompras','nc-resp','nc-phone'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('modal-addclient').classList.add('show');
}
function closeAddClient() { document.getElementById('modal-addclient').classList.remove('show'); }

async function lookupCNPJ() {
    const raw = document.getElementById('nc-cnpj').value.replace(/\D/g,'');
    if (raw.length!==14) return toast('CNPJ inválido — informe os 14 dígitos');
    try {
        const res = await fetch('https://brasilapi.com.br/api/cnpj/v1/'+raw);
        if (!res.ok) throw new Error('not found');
        const j = await res.json();
        document.getElementById('nc-name').value = j.razao_social||'';
        document.getElementById('nc-fantasia').value = j.nome_fantasia||j.razao_social||'';
        document.getElementById('nc-addr').value = [j.logradouro,j.numero].filter(Boolean).join(', ');
        document.getElementById('nc-cep').value = j.cep||'';
        document.getElementById('nc-city').value = j.municipio||'';
        document.getElementById('nc-state').value = j.uf||'';
        toast('Dados encontrados na Receita Federal!');
    } catch(e) {
        toast('CNPJ não encontrado — preencha manualmente');
    }
}

function submitAddClient() {
    const name = document.getElementById('nc-name').value.trim();
    const cnpj = document.getElementById('nc-cnpj').value.trim();
    const addr = document.getElementById('nc-addr').value.trim();
    if (!cnpj) return toast('CNPJ é obrigatório');
    if (!name) return toast('Informe a razão social');
    if (!addr) return toast('Endereço é obrigatório — necessário para gerar rotas');
    const clients = S.clients();
    const c = {
        id: Date.now(),
        name, nomeFantasia: document.getElementById('nc-fantasia').value.trim()||name,
        cnpj, ie: document.getElementById('nc-ie').value.trim(),
        taxRegime: document.getElementById('nc-regime').value,
        cls: document.getElementById('nc-cls').value,
        seg: 'Cliente', supplier: document.getElementById('nc-supplier').value,
        addr,
        cep: document.getElementById('nc-cep').value.trim(),
        city: document.getElementById('nc-city').value.trim(),
        state: document.getElementById('nc-state').value.trim(),
        contact: document.getElementById('nc-resp').value.trim(),
        phone: document.getElementById('nc-phone').value.trim(),
        emailCompras: document.getElementById('nc-emailcompras').value.trim(),
        phoneCompras: document.getElementById('nc-phonecompras').value.trim(),
        owe:0, oweDays:0, promoters:[], trainings:[], orgId:'org-team', ownerId: currentMemberId()||'u1',
    };
    clients.push(c);
    S.setClients(clients);
    closeAddClient();
    toast('Cliente adicionado à carteira!');
    loadCW();
}

// ======================
// DETAIL / BRIEFING
// ======================
function openClient(id) {
    const c = S.clients().find(x=>x.id===id);
    if (!c) return;
    currentClient = c;

    const ld = lastOrderDate(c);
    const dd = ld ? Math.floor((Date.now()-new Date(ld))/864e5) : 999;

    document.getElementById('d-name').textContent = c.nomeFantasia;
    document.getElementById('d-seg').textContent = c.seg+' · '+c.city+' - '+c.state;
    const b = document.getElementById('d-badge');
    b.textContent='Curva '+c.cls; b.className='badge badge-'+c.cls.toLowerCase();
    document.getElementById('d-cnpj').textContent = c.cnpj;
    document.getElementById('d-contact').textContent = c.contact||'—';
    document.getElementById('d-phone').textContent = c.phone||'—';
    document.getElementById('d-addr').textContent = (c.addr||'—')+(c.cep?' · '+c.cep:'');
    document.getElementById('d-email').textContent = c.emailCompras||'—';
    document.getElementById('d-regime').textContent = c.taxRegime;
    document.getElementById('d-supplier').textContent = IND[c.supplier]||'—';

    const od = document.getElementById('d-overdue');
    if (c.owe>0) {
        od.style.display='flex';
        document.getElementById('d-ov-val').textContent=fmtMoney(c.owe)+' em aberto';
        document.getElementById('d-ov-days').textContent='Vencido há '+c.oweDays+' dias — aborde com cautela';
    } else od.style.display='none';

    document.getElementById('d-days').textContent = dd>=999?'—':dd;
    document.getElementById('d-lval').textContent = ld?fmtMoney(lastOrderVal(c)):'—';

    let sug;
    if (c.owe>0) sug='Cliente com saldo em aberto. Regularize antes de oferecer novo pedido.';
    else if (dd>30) sug='Sem compra há mais de 30 dias — risco de perda. Aborde com condição especial para reativar.';
    else if (dd>14) sug='Janela ideal para novo pedido. Apresente novidades e reposição dos itens anteriores.';
    else sug='Cliente ativo e em dia. Foque em ampliar mix de produtos e aumentar ticket médio.';
    document.getElementById('d-suggest').textContent=sug;

    const orders = clientOrders(c.id);
    const ordersBox = document.getElementById('d-orders');
    ordersBox.innerHTML = orders.length===0
        ? `<div style="padding:16px;text-align:center;color:#86868B;font-size:13px;">Nenhum pedido registrado.</div>`
        : orders.map(o=>`<div onclick="downloadOrderPdf('${o.id}')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 10px;border-bottom:1px solid #F5F5F7;cursor:pointer;">
            <div><div style="font-size:13px;font-weight:700;color:#1D1D1F;font-family:monospace;">${o.protocol}</div><div style="font-size:11px;color:#86868B;margin-top:2px;">${fmtDateBR(o.date)} · ${PAYMENTS.find(p=>p.value===o.paymentMethod)?.label||o.paymentMethod}</div></div>
            <div style="text-align:right;display:flex;align-items:center;gap:8px;"><span style="font-size:13px;font-weight:700;color:#15803D;">${fmtMoney(o.total)}</span><i class="fas fa-file-pdf" style="color:#86868B;font-size:13px;"></i></div>
        </div>`).join('');
    document.getElementById('d-ticket').innerHTML = orders.length
        ? `<span>Ticket médio (${orders.length} pedido${orders.length!==1?'s':''})</span><b>${fmtMoney(avgTicket(c))}</b>` : '';

    const pm = document.getElementById('d-promoters');
    pm.innerHTML = (c.promoters&&c.promoters.length)
        ? c.promoters.map(p=>`<div class="mini-row"><div style="display:flex;align-items:center;gap:10px;"><div style="width:34px;height:34px;background:${p.active?'#F0FDF4':'#F5F5F7'};border-radius:50%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="color:${p.active?'#16A34A':'#86868B'};font-size:13px;"></i></div><div><div style="font-size:13px;font-weight:600;color:#1D1D1F;">${p.name}</div><div style="font-size:11px;color:#86868B;">${p.days} · ${p.lastAction} (${fmtDateBR(p.lastActionDate)})</div></div></div><span class="badge" style="background:${p.active?'#DCFCE7':'#F5F5F7'};color:${p.active?'#15803D':'#6E6E73'};">${p.active?'Ativa':'Inativa'}</span></div>`).join('')
        : `<div style="padding:12px;text-align:center;color:#86868B;font-size:12px;background:#F5F5F7;border-radius:10px;">Nenhuma promotora alocada para este cliente.</div>`;

    const tr = document.getElementById('d-trainings');
    tr.innerHTML = (c.trainings&&c.trainings.length)
        ? c.trainings.map(t=>`<div class="mini-row"><div><div style="font-size:13px;font-weight:600;color:#1D1D1F;">${t.title}</div><div style="font-size:11px;color:#86868B;">${fmtDateBR(t.date)} · ${t.attendees} participante${t.attendees!==1?'s':''}</div></div><i class="fas fa-graduation-cap" style="color:#16A34A;"></i></div>`).join('')
        : `<div style="padding:12px;text-align:center;color:#86868B;font-size:12px;background:#F5F5F7;border-radius:10px;">Nenhum treinamento registrado.</div>`;

    const callBtn = document.getElementById('d-call-btn');
    callBtn.onclick = () => toast('Ligando para '+(c.contact||c.nomeFantasia)+'...');

    document.getElementById('detail-back').onclick = () => showScreen('carteira');
    showScreen('detail');
}

function registerVisit() {
    if (!currentClient) return;
    if (isVisitedToday(currentClient.id)) return toast('Visita de hoje já registrada para '+currentClient.nomeFantasia);
    S.addVisit({id:'v'+Date.now(), ownerId: currentMemberId(), clientId: currentClient.id, date: todayStr(), status:'realizada'});
    toast('Visita registrada para '+currentClient.nomeFantasia+'!');
}

function goOrder() {
    fromClient=true;
    showScreen('pedido');
    setTimeout(()=>{
        const sel=document.getElementById('ped-client');
        if(sel&&currentClient){ sel.value=currentClient.id; onPedClientChange(); }
    },50);
}

// ======================
// ROTA
// ======================
let routeStops = [];

function todayRouteStops() {
    const clients = visibleClients();
    const plan = S.routePlan(todayStr());
    if (plan && plan.length) {
        return plan.map(id=>clients.find(c=>c.id===id)).filter(Boolean);
    }
    return [...clients].sort((a,b)=>priorityScore(b)-priorityScore(a)).slice(0,4);
}

function isVisitedToday(clientId) {
    return S.visits().some(v=>v.clientId===clientId && v.date===todayStr());
}

const ROUTE_DISTS=['4,2 km','6,8 km','12,1 km','18,4 km','22,0 km','26,5 km'];
const ROUTE_TIMES=['09:00','10:30','12:00','14:30','16:00','17:30'];

function loadRota() {
    const today = new Date();
    document.getElementById('rota-date').textContent=today.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});

    routeStops = todayRouteStops();
    document.getElementById('rota-c').textContent=routeStops.length+' paradas';

    const plan = S.routePlan(todayStr());
    document.getElementById('rota-custom-tag').style.display = (plan && plan.length) ? 'block' : 'none';

    const goals = S.goals();
    const dailyGoal = Math.max(1, Math.round(goals.visitsTarget/22));
    const doneToday = routeStops.filter(c=>isVisitedToday(c.id)).length;
    document.getElementById('rota-goal-txt').textContent = doneToday+' de '+dailyGoal+' visitas concluídas';
    setTimeout(()=>{ document.getElementById('rota-goal-bar').style.width = Math.min(100,(doneToday/dailyGoal)*100)+'%'; },100);

    const dists = ROUTE_DISTS, times = ROUTE_TIMES;
    const totalKm = routeStops.reduce((s,_,i)=>s+(parseFloat((dists[i]||'0 km').replace(',','.'))||0),0);
    const distTotalEl = document.getElementById('rota-dist-total');
    if (distTotalEl) distTotalEl.textContent = routeStops.length ? totalKm.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' km' : '—';
    renderRotaMap();
    const nextIdx = routeStops.findIndex(c=>!isVisitedToday(c.id));

    document.getElementById('rota-list').innerHTML=routeStops.map((c,i)=>{
        const ld = lastOrderDate(c);
        const dd = ld ? Math.floor((Date.now()-new Date(ld))/864e5) : 999;
        const done = isVisitedToday(c.id);
        const isNext = i===nextIdx;
        return `<div class="ri" style="${isNext?'border-color:#16A34A;box-shadow:0 0 0 2px rgba(22,163,74,0.15);':''}">
            <button onclick="toggleVisited(${c.id})" title="Marcar como visitado" style="width:32px;height:32px;border-radius:50%;border:2px solid ${done?'#16A34A':'#D1D5DB'};background:${done?'#16A34A':'white'};display:flex;align-items:center;justify-content:center;color:white;font-size:14px;flex-shrink:0;cursor:pointer;">${done?'<i class="fas fa-check"></i>':''}</button>
            <div onclick="openClient(${c.id})" style="flex:1;min-width:0;cursor:pointer;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;"><span style="font-size:14px;font-weight:600;color:#1D1D1F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${done?'text-decoration:line-through;color:#86868B;':''}">${c.nomeFantasia}</span><span class="badge badge-${c.cls.toLowerCase()}">${c.cls}</span>${isNext?'<span class="badge" style="background:#DCFCE7;color:#15803D;">Próxima</span>':''}</div>
                <div style="font-size:12px;color:#86868B;">${c.addr||'Endereço não informado'} · ${dd>=999?'sem histórico':dd+'d sem compra'}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
                <div style="text-align:right;"><div style="font-size:13px;font-weight:700;color:#1D1D1F;">${times[i]||''}</div><div style="font-size:11px;color:#86868B;">${dists[i]||''}</div></div>
                <div style="display:flex;gap:6px;">
                    <a href="${wazeUrl(c)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="width:28px;height:28px;background:#F0FDF4;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#16A34A;text-decoration:none;"><i class="fab fa-waze" style="font-size:13px;"></i></a>
                    <button onclick="event.stopPropagation();goOrderFor(${c.id})" style="width:28px;height:28px;background:#F0FDF4;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#16A34A;"><i class="fas fa-cart-plus" style="font-size:11px;"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function toggleVisited(clientId) {
    const visits = S.visits();
    const existing = visits.find(v=>v.clientId===clientId && v.date===todayStr());
    if (existing) {
        S.s('visits', visits.filter(v=>v!==existing));
    } else {
        S.addVisit({id:'v'+Date.now(), ownerId: currentMemberId(), clientId, date: todayStr(), status:'realizada'});
        toast('Visita marcada ✓');
    }
    loadRota();
}

function goOrderFor(id) {
    currentClient = S.clients().find(c=>c.id===id);
    goOrder();
}

function hashPct(seed, min, max) {
    let h = 0;
    for (let i=0;i<seed.length;i++) h = (h*31 + seed.charCodeAt(i)) % 97;
    return min + (h % (max-min+1));
}

function renderRotaMap() {
    const pinsBox = document.getElementById('rota-map-pins');
    const linesBox = document.getElementById('rota-map-lines');
    if (!pinsBox || !linesBox) return;
    const origin = {x:8, y:88};

    if (!routeStops.length) {
        linesBox.innerHTML = '';
        pinsBox.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#16A34A;font-size:12px;font-weight:600;text-align:center;padding:0 20px;">Nenhuma parada na rota de hoje</div>`;
        return;
    }

    const nextIdx = routeStops.findIndex(c=>!isVisitedToday(c.id));
    const pts = routeStops.map((c,i)=>{
        const seed = (c.cnpj || String(c.id));
        return { x: hashPct(seed+'|x', 14, 88), y: hashPct(seed+'|y', 10, 78), c, i };
    });

    const chain = [origin, ...pts];
    linesBox.innerHTML = chain.slice(0,-1).map((p,i)=>{
        const n = chain[i+1];
        return `<line x1="${p.x}" y1="${p.y}" x2="${n.x}" y2="${n.y}" stroke="#16A34A" stroke-width="0.8" stroke-dasharray="2.4,2" opacity="0.55" vector-effect="non-scaling-stroke"/>`;
    }).join('');

    const depotPin = `<div style="position:absolute;left:${origin.x}%;top:${origin.y}%;transform:translate(-50%,-50%);" title="Ponto de partida">
        <div style="width:14px;height:14px;background:#16A34A;border-radius:50%;border:2.5px solid white;box-shadow:0 0 0 5px rgba(22,163,74,0.25);"></div>
    </div>`;

    const stopPins = pts.map(p=>{
        const done = isVisitedToday(p.c.id);
        const isNext = p.i===nextIdx;
        const bg = done ? '#15803D' : isNext ? '#16A34A' : '#94A3B8';
        return `<div class="map-pin" onclick="openClient(${p.c.id})" title="${p.c.nomeFantasia}" style="position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%,-100%);cursor:pointer;animation-delay:${p.i*70}ms;${isNext?'animation:pulseRing 1.6s ease-in-out infinite;':''}">
            <div style="width:28px;height:28px;background:${bg};border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(22,163,74,0.4);display:flex;align-items:center;justify-content:center;">
                <span style="transform:rotate(45deg);color:white;font-size:11px;font-weight:800;">${p.i+1}</span>
            </div>
        </div>`;
    }).join('');

    pinsBox.innerHTML = depotPin + stopPins;
}

function wazeUrl(client) {
    const q = encodeURIComponent(client.addr+', '+client.city+' - '+client.state);
    return 'https://www.waze.com/ul?q='+q+'&navigate=yes';
}

function clientsMissingAddress(list) {
    return list.filter(c=>!c.addr || !c.addr.trim());
}

function startRoute() {
    if (!routeStops.length) return toast('Nenhuma parada na rota de hoje');
    const missing = clientsMissingAddress(routeStops);
    if (missing.length) {
        return toast('Endereço obrigatório: cadastre o endereço de '+missing[0].nomeFantasia+' antes de iniciar a rota');
    }
    const next = routeStops.find(c=>!isVisitedToday(c.id));
    if (!next) return toast('Todas as paradas já foram visitadas hoje! 🎉');
    window.open(wazeUrl(next), '_blank');
}

// ======================
// MONTAR ROTA (seleção manual de clientes)
// ======================
function openBuildRoute() {
    const clients = visibleClients();
    const plan = S.routePlan(todayStr()) || [];
    document.getElementById('br-list').innerHTML = clients.map(c=>`
        <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid #E5E5EA;border-radius:12px;cursor:pointer;">
            <input type="checkbox" value="${c.id}" ${plan.includes(c.id)?'checked':''} style="width:18px;height:18px;accent-color:#16A34A;">
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;color:#1D1D1F;">${c.nomeFantasia} <span class="badge badge-${c.cls.toLowerCase()}">${c.cls}</span></div>
                <div style="font-size:11px;color:${c.addr?'#86868B':'#DC2626'};">${c.addr ? c.addr+' · '+c.city+' - '+c.state : 'Sem endereço cadastrado — não poderá iniciar rota'}</div>
            </div>
        </label>`).join('');
    document.getElementById('modal-buildroute').classList.add('show');
}
function closeBuildRoute() { document.getElementById('modal-buildroute').classList.remove('show'); }

function submitBuildRoute() {
    const ids = Array.from(document.querySelectorAll('#br-list input[type=checkbox]:checked')).map(i=>parseInt(i.value));
    if (!ids.length) return toast('Selecione ao menos um cliente');
    const clients = S.clients();
    const selected = ids.map(id=>clients.find(c=>c.id===id)).filter(Boolean);
    const missing = clientsMissingAddress(selected);
    if (missing.length) return toast('Endereço obrigatório: '+missing[0].nomeFantasia+' não tem endereço cadastrado');
    S.setRoutePlan(todayStr(), ids);
    closeBuildRoute();
    toast('Rota personalizada salva!');
    loadRota();
}

function clearCustomRoute() {
    S.clearRoutePlan(todayStr());
    toast('Voltando à sugestão automática de rota');
    loadRota();
}

// ======================
// PEDIDO
// ======================
let pedSupplierLocked = true;

function loadPedido() {
    cart={};
    pedStep=1;
    pedSupplierLocked=true;
    const sel=document.getElementById('ped-client');
    sel.innerHTML=visibleClients().map(c=>`<option value="${c.id}">${c.nomeFantasia}</option>`).join('');
    if(fromClient&&currentClient) sel.value=currentClient.id;
    document.getElementById('ped-back').onclick=()=>{
        if(fromClient&&currentClient){fromClient=false;showScreen('detail');}
        else showScreen('dashboard');
    };
    onPedClientChange();
    showPedStep(1);
}

function pedClient() {
    const id = parseInt(document.getElementById('ped-client').value);
    return S.clients().find(c=>c.id===id);
}

function onPedClientChange() {
    const c = pedClient();
    if (!c) return;
    pedSupplierLocked = true;
    document.getElementById('ped-ind-edit').textContent = 'Editar';
    const sel = document.getElementById('ped-ind');
    sel.innerHTML = Object.entries(IND).map(([k,v])=>`<option value="${k}" ${k===c.supplier?'selected':''}>${v}</option>`).join('');
    sel.disabled = true;
    cart={};
    prodFilter='';
    prodCatFilter='';
    document.getElementById('prod-search').value='';
    const repeatBtn = document.getElementById('ped-repeat-btn');
    repeatBtn.style.display = clientOrders(c.id).length ? 'inline-flex' : 'none';
    renderProds();
    updateCart();
}

function boughtProductIds(clientId) {
    const ids = new Set();
    clientOrders(clientId).forEach(o=>o.items.forEach(it=>ids.add(it.productId)));
    return ids;
}

function repeatLastOrder() {
    const c = pedClient();
    if (!c) return;
    const last = clientOrders(c.id)[0];
    if (!last) return;
    cart = {};
    last.items.forEach(it=>{ cart[it.productId] = it.qty; });
    renderProds();
    updateCart();
    toast('Itens do último pedido carregados — revise as quantidades');
}

function toggleIndEdit() {
    pedSupplierLocked = !pedSupplierLocked;
    document.getElementById('ped-ind').disabled = pedSupplierLocked;
    document.getElementById('ped-ind-edit').textContent = pedSupplierLocked ? 'Editar' : 'Bloquear';
}

function onPedIndChange() {
    cart={};
    renderProds();
    updateCart();
}

function renderProds() {
    const c = pedClient();
    if (!c) return;
    const indKey = document.getElementById('ped-ind').value;
    prodFilter=(document.getElementById('prod-search')?.value||'').toLowerCase();
    const bought = boughtProductIds(c.id);

    const cats = [...new Set(PRODS.filter(p=>p.ind===indKey).map(p=>p.categoria))];
    document.getElementById('prod-cats').innerHTML = ['Todas',...cats].map(cat=>{
        const val = cat==='Todas' ? '' : cat;
        const active = prodCatFilter===val;
        return `<button class="chip ${active?'active':''}" onclick="setProdCat('${val}')">${cat}</button>`;
    }).join('');

    const f=PRODS.filter(p=>p.ind===indKey
        && (!prodCatFilter||p.categoria===prodCatFilter)
        && (!prodFilter||p.name.toLowerCase().includes(prodFilter)||p.sku.toLowerCase().includes(prodFilter)));

    document.getElementById('prod-list').innerHTML=f.map(p=>{
        const price = effPrice(p, c.taxRegime);
        return `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #F5F5F7;">
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:14px;font-weight:600;color:#1D1D1F;">${p.name}</span>
                    ${bought.has(p.id)?'<span class="badge" style="background:#F0FDF4;color:#15803D;font-size:9px;">Comprado antes</span>':''}
                </div>
                <div style="font-size:11px;color:#86868B;">SKU ${p.sku} · ${p.unit}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <span style="font-size:14px;font-weight:700;color:#16A34A;">${fmtMoney(price)}</span>
                ${(cart[p.id]||0)===0
                    ?`<button onclick="addCart(${p.id})" style="width:30px;height:30px;background:#16A34A;color:white;border:none;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;line-height:1;">+</button>`
                    :`<div style="display:flex;align-items:center;gap:5px;">
                        <button onclick="rmCart(${p.id})" class="qbtn">−</button>
                        <span style="font-size:15px;font-weight:800;color:#1D1D1F;min-width:22px;text-align:center;">${cart[p.id]}</span>
                        <button onclick="addCart(${p.id})" class="qbtn" style="background:#F0FDF4;border-color:#BBF7D0;">+</button>
                    </div>`
                }
            </div>
        </div>`;
    }).join('');
}

function setProdCat(cat) {
    prodCatFilter = cat;
    renderProds();
}

function addCart(id){cart[id]=(cart[id]||0)+1;renderProds();updateCart();}
function rmCart(id){if(cart[id]>0)cart[id]--;if(cart[id]===0)delete cart[id];renderProds();updateCart();}

function cartSubtotal() {
    const c = pedClient();
    return Object.entries(cart).reduce((s,[id,qty])=>{
        const p=prod(parseInt(id));
        return s + effPrice(p,c.taxRegime)*qty;
    },0);
}

function updateCart() {
    const c = pedClient();
    const items=Object.entries(cart);
    const cw=document.getElementById('cart-wrap');
    if(!items.length){ if(cw) cw.style.display='none'; }
    else if (cw) cw.style.display='block';

    let sub=0;
    const cartItemsHtml = items.map(([id,qty])=>{
        const p=prod(parseInt(id));
        const price = effPrice(p,c.taxRegime);
        const t=price*qty; sub+=t;
        return `<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-size:13px;color:#3A3A3C;">${p.name} × ${qty}</span><span style="font-size:13px;font-weight:600;color:#1D1D1F;">${fmtMoney(t)}</span></div>`;
    }).join('');
    const cartItemsEl = document.getElementById('cart-items');
    if (cartItemsEl) cartItemsEl.innerHTML = cartItemsHtml;

    const pSub = document.getElementById('p-sub'); if (pSub) pSub.textContent = fmtMoney(sub);

    const discPct = (parseFloat(document.getElementById('ped-discount')?.value)||0)/100;
    const disc = sub*discPct;
    const total = sub-disc;

    const pSub2 = document.getElementById('p-sub2'); if (pSub2) pSub2.textContent = fmtMoney(sub);
    const pDisc = document.getElementById('p-disc'); if (pDisc) pDisc.textContent = '− '+fmtMoney(disc);
    const pTotal = document.getElementById('p-total'); if (pTotal) pTotal.textContent = fmtMoney(total);

    const mi=document.getElementById('mi');
    if (mi) {
        const icon=document.getElementById('mi-icon'), txt=document.getElementById('mi-text'), sub2=document.getElementById('mi-sub');
        if(total>500){ mi.className='mi mi-g'; icon.className='fas fa-circle-check'; txt.textContent='Margem excelente ✓'; sub2.textContent='Desconto dentro da política comercial'; }
        else if(total>150){ mi.className='mi mi-y'; icon.className='fas fa-triangle-exclamation'; txt.textContent='Margem aceitável ⚠'; sub2.textContent='Adicione mais itens para melhorar a margem'; }
        else { mi.className='mi mi-r'; icon.className='fas fa-circle-xmark'; txt.textContent='Abaixo do mínimo recomendado'; sub2.textContent='Valor mínimo recomendado: R$ 150,00'; }
    }
}

function showPedStep(n) {
    pedStep = n;
    document.getElementById('ped-step1').style.display = n===1?'block':'none';
    document.getElementById('ped-step1-head').style.display = n===1?'grid':'none';
    document.getElementById('ped-step2').style.display = n===2?'block':'none';
    document.getElementById('ped-step1-bar').classList.toggle('done', true);
    document.getElementById('ped-step2-bar').classList.toggle('done', n===2);
}

function goPedStep2() {
    if (!Object.keys(cart).length) return toast('Adicione produtos ao pedido');
    const opts = document.getElementById('pay-opts');
    opts.innerHTML = PAYMENTS.map((p,i)=>`<button class="pay-opt ${i===0?'active':''}" data-pm="${p.value}" onclick="selectPayment(this)">${p.label}</button>`).join('');
    document.getElementById('ped-discount').value = 0;
    document.getElementById('ped-delivery').value = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
    document.getElementById('ped-delivery').min = todayStr();
    document.getElementById('ped-notes').value = '';
    updateCart();
    showPedStep(2);
}
function backPedStep1() { showPedStep(1); }

function selectPayment(el) {
    el.parentElement.querySelectorAll('.pay-opt').forEach(b=>b.classList.remove('active'));
    el.classList.add('active');
}

function confirmOrder() {
    const items=Object.entries(cart);
    if(!items.length) return toast('Adicione produtos ao pedido');
    const c = pedClient();
    const indKey = document.getElementById('ped-ind').value;
    const pmEl = document.querySelector('.pay-opt.active');
    const paymentMethod = pmEl ? pmEl.dataset.pm : 'boleto';
    const discPct = (parseFloat(document.getElementById('ped-discount').value)||0)/100;

    const orderItems = items.map(([id,qty])=>{
        const p = prod(parseInt(id));
        return { productId:p.id, name:p.name, sku:p.sku, qty, price: effPrice(p,c.taxRegime), discountPct:0 };
    });

    const deliveryDate = document.getElementById('ped-delivery').value || null;
    const notes = document.getElementById('ped-notes').value.trim() || null;

    const o = buildOrder(c.id, indKey, paymentMethod, orderItems, discPct, 0, 'enviado', { deliveryDate, notes });
    S.addOrder(o);
    lastConfirmedOrder = o;

    document.getElementById('ok-prot').textContent = o.protocol;
    document.getElementById('ok-cli').textContent = c.nomeFantasia;
    document.getElementById('ok-ind').textContent = IND[indKey];
    document.getElementById('ok-total').textContent = fmtMoney(o.total);
    document.getElementById('ok-dt').textContent = new Date(o.date).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});

    cart={}; fromClient=false;
    showScreen('ok');
}

// ======================
// PDF
// ======================
function generatePdf(order, client) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    const lm=15, rm=195, tw=rm-lm;
    let y=32;

    doc.setFillColor(22,163,74); doc.rect(0,0,210,22,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(255,255,255);
    doc.text('RepOS', lm, 14);
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('Pedido de Compra', rm, 14, {align:'right'});

    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(31,41,55);
    doc.text(order.protocol, lm, y);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(107,114,128);
    doc.text(fmtDateBR(order.date), rm, y, {align:'right'});
    y+=5;
    doc.text('Pagamento: '+(PAYMENTS.find(p=>p.value===order.paymentMethod)?.label||order.paymentMethod), lm, y);
    if (order.deliveryDate) { y+=4; doc.text('Entrega desejada: '+fmtDateBR(order.deliveryDate), lm, y); }
    y+=8;
    doc.setDrawColor(229,231,235); doc.line(lm,y,rm,y); y+=6;

    const halfW = tw/2-4;
    doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(107,114,128);
    doc.text('CLIENTE', lm, y); doc.text('FORNECEDOR', lm+halfW+8, y); y+=5;
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(31,41,55);
    doc.text(doc.splitTextToSize(client.nomeFantasia, halfW), lm, y);
    doc.text(doc.splitTextToSize(IND[order.supplier]||order.supplier, halfW), lm+halfW+8, y);
    y+=5;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(107,114,128);
    doc.text('CNPJ: '+client.cnpj, lm, y); y+=4;
    doc.text(client.taxRegime, lm, y); y+=4;
    doc.text(doc.splitTextToSize(client.addr||'', halfW), lm, y); y+=4;
    doc.text([client.city,client.state].filter(Boolean).join(' — '), lm, y);
    y+=10;
    doc.setDrawColor(229,231,235); doc.line(lm,y,rm,y); y+=6;

    doc.setFillColor(243,244,246); doc.rect(lm,y-4,tw,7,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(107,114,128);
    const c1=lm+2, c2=lm+tw*0.56, c3=lm+tw*0.68, c4=lm+tw*0.82, c5=rm-1;
    doc.text('PRODUTO / SKU', c1, y); doc.text('QTD', c2, y); doc.text('UNITÁRIO', c3, y); doc.text('DESCONTO', c4, y); doc.text('TOTAL', c5, y, {align:'right'});
    y+=5;

    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(31,41,55);
    let odd=false;
    order.items.forEach(item=>{
        if(odd){ doc.setFillColor(249,250,251); doc.rect(lm,y-4,tw,7,'F'); }
        odd=!odd;
        const lineTotal = item.price*item.qty*(1-(item.discountPct||0));
        doc.text(doc.splitTextToSize(item.name+' · '+item.sku, tw*0.53), c1, y);
        doc.text(String(item.qty), c2, y);
        doc.text(fmtMoney(item.price), c3, y);
        doc.text(item.discountPct>0 ? (item.discountPct*100).toFixed(1)+'%' : '—', c4, y);
        doc.setTextColor(31,41,55);
        doc.text(fmtMoney(lineTotal), c5, y, {align:'right'});
        y+=7;
        if (y>262){ doc.addPage(); y=20; }
    });

    y+=3; doc.setDrawColor(229,231,235); doc.line(lm,y,rm,y); y+=6;
    doc.setFontSize(9); doc.setTextColor(107,114,128);
    doc.text('Subtotal', c4, y); doc.text(fmtMoney(order.subtotal), rm, y, {align:'right'});
    if (order.discount>0) {
        y+=5;
        doc.text('Desconto ('+(order.discountPct*100).toFixed(1)+'%)', c4, y);
        doc.setTextColor(220,38,38); doc.text('- '+fmtMoney(order.discount), rm, y, {align:'right'});
    }
    y+=6; doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(15,118,54);
    doc.text('TOTAL', c4, y); doc.text(fmtMoney(order.total), rm, y, {align:'right'});

    if (order.notes) {
        y+=10;
        doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(107,114,128);
        doc.text('OBSERVAÇÕES', lm, y); y+=4;
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(31,41,55);
        doc.text(doc.splitTextToSize(order.notes, tw), lm, y);
    }

    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(156,163,175);
    doc.text('Documento gerado pelo RepOS · Não possui validade fiscal', lm, 288);
    doc.text(new Date().toLocaleString('pt-BR'), rm, 288, {align:'right'});

    doc.save('pedido-'+order.protocol+'.pdf');
}

function downloadOrderPdf(orderId) {
    const order = S.orders().find(o=>o.id===orderId);
    if (!order) return;
    const client = S.clients().find(c=>c.id===order.clientId);
    generatePdf(order, client);
    toast('PDF do pedido gerado!');
}

function downloadOkPdf() {
    if (!lastConfirmedOrder) return;
    const client = S.clients().find(c=>c.id===lastConfirmedOrder.clientId);
    generatePdf(lastConfirmedOrder, client);
    toast('PDF do pedido gerado!');
}

// ======================
// TAREFAS
// ======================
const TASK_TYPE_LABEL = { lembrete:'Lembrete', visita:'Visita', ligacao:'Ligação' };
const TASK_TYPE_ICON = { lembrete:'fa-bell', visita:'fa-location-dot', ligacao:'fa-phone' };
const TASK_STATUS_LABEL = { pendente:'Pendente', concluida:'Concluída', cancelada:'Cancelada', remarcada:'Remarcada' };

let tfView = 'calendar';
let tfCalDate = new Date();
let tfSelectedDay = todayStr();
let tfVisibleMembers = null;
const TASK_TYPE_DOT = { lembrete:'#2563EB', visita:'#16A34A', ligacao:'#9333EA' };

function tfVisibleTasks() {
    const mid = currentMemberId();
    if (!mid) return S.tasks(); // contas sem equipe (ex.: fornecedor) não filtram
    if (!tfVisibleMembers) tfVisibleMembers = allowedMemberIds('tarefas');
    return S.tasks().filter(t=>tfVisibleMembers.includes(t.ownerId||mid));
}

function renderTfMemberChips() {
    const box = document.getElementById('tf-member-chips');
    if (!box) return;
    const mid = currentMemberId();
    const allowed = mid ? allowedMemberIds('tarefas') : [];
    if (!mid || allowed.length<=1) { box.style.display='none'; return; }
    if (!tfVisibleMembers) tfVisibleMembers = [...allowed];
    box.style.display='flex';
    box.innerHTML = `<span style="font-size:11px;font-weight:700;color:#86868B;align-self:center;margin-right:2px;">Ver agenda de:</span>` +
        allowed.map(id=>`<button class="member-chip ${tfVisibleMembers.includes(id)?'active':''}" onclick="toggleTfMember('${id}')"><span class="member-dot" style="background:${memberColor(id)};"></span>${memberDisplayName(id)}${id===mid?' (você)':''}</button>`).join('');
}

function toggleTfMember(id) {
    if (!tfVisibleMembers) tfVisibleMembers = allowedMemberIds('tarefas');
    tfVisibleMembers = tfVisibleMembers.includes(id) ? tfVisibleMembers.filter(x=>x!==id) : [...tfVisibleMembers, id];
    if (!tfVisibleMembers.length) tfVisibleMembers = [currentMemberId()];
    renderTfMemberChips();
    renderTfView();
}

function loadTarefas() {
    const tasks = tfVisibleTasks();
    const pendCount = tasks.filter(t=>t.status==='pendente'||t.status==='remarcada').length;
    document.getElementById('tf-subtitle').textContent = pendCount+' pendente'+(pendCount!==1?'s':'');
    renderTfMemberChips();
    renderTfView();
}

function toggleTfView() {
    tfView = tfView==='calendar' ? 'list' : 'calendar';
    renderTfView();
}

function renderTfView() {
    const isCal = tfView==='calendar';
    document.getElementById('tf-calendar').style.display = isCal ? 'block' : 'none';
    document.getElementById('tf-cal-day-label').style.display = isCal ? 'block' : 'none';
    document.getElementById('tf-cal-day-list').style.display = isCal ? 'flex' : 'none';
    document.getElementById('tf-list').style.display = isCal ? 'none' : 'flex';
    document.getElementById('tf-chips-wrap').style.display = isCal ? 'none' : 'flex';
    document.getElementById('tf-view-btn').innerHTML = isCal
        ? '<i class="fas fa-list"></i> Ver em lista'
        : '<i class="fas fa-calendar-days"></i> Ver em calendário';
    if (isCal) renderTfCalendar();
    else renderTasks();
}

function tfCalMove(delta) {
    tfCalDate = new Date(tfCalDate.getFullYear(), tfCalDate.getMonth()+delta, 1);
    renderTfCalendar();
}

function tfTaskDateKey(t) {
    return (t.status==='remarcada' && t.rescheduledTo) ? t.rescheduledTo : t.dueDate;
}

function renderTfCalendar() {
    const year = tfCalDate.getFullYear(), month = tfCalDate.getMonth();
    document.getElementById('tf-cal-label').textContent = tfCalDate.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    const mid = currentMemberId();

    const byDate = {};
    tfVisibleTasks().forEach(t=>{
        const key = tfTaskDateKey(t);
        (byDate[key] = byDate[key]||[]).push(t);
    });

    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const cells = [];
    for (let i=0;i<firstDow;i++) cells.push(null);
    for (let dd=1; dd<=daysInMonth; dd++) cells.push(`${year}-${String(month+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`);

    document.getElementById('tf-cal-grid').innerHTML = cells.map(dateKey=>{
        if (!dateKey) return `<div></div>`;
        const dayTasks = (byDate[dateKey]||[]).slice().sort((a,b)=>(a.dueDate).localeCompare(b.dueDate));
        const isToday = dateKey===todayStr();
        const isSelected = dateKey===tfSelectedDay;
        const dayNum = parseInt(dateKey.slice(-2));
        const visible = dayTasks.slice(0,2);
        const overflow = dayTasks.length - visible.length;
        return `<button onclick="tfSelectDay('${dateKey}')" class="cal-cell ${isToday?'today':''} ${isSelected?'selected':''}">
            <span class="cal-daynum">${dayNum}</span>
            ${visible.map(t=>{
                const done = t.status==='concluida'||t.status==='cancelada';
                const ownerId = t.ownerId||mid;
                return `<span class="cal-evt" style="background:${done?'#C7C7CC':memberColor(ownerId)};${done?'text-decoration:line-through;':''}">${t.title}</span>`;
            }).join('')}
            ${overflow>0?`<span class="cal-evt-more">+${overflow}</span>`:''}
        </button>`;
    }).join('');

    tfRenderDayList();
}

function tfSelectDay(dateKey) {
    tfSelectedDay = dateKey;
    renderTfCalendar();
}

function tfRenderDayList() {
    document.getElementById('tf-cal-day-label').textContent = fmtDateBR(tfSelectedDay+'T00:00:00') + (tfSelectedDay===todayStr()?' · Hoje':'');
    const tasks = tfVisibleTasks().filter(t=>tfTaskDateKey(t)===tfSelectedDay);
    const list = document.getElementById('tf-cal-day-list');
    const clients = S.clients();
    const cmap = new Map(clients.map(c=>[c.id,c]));
    list.innerHTML = tasks.length===0
        ? `<p style="font-size:13px;color:#86868B;text-align:center;padding:16px 0;">Nenhuma tarefa neste dia.</p>`
        : tasks.map(t=>tfTaskCardHtml(t,cmap)).join('');
}

function tfTaskCardHtml(t, cmap) {
    const client = t.clientId ? cmap.get(t.clientId) : null;
    const overdue = t.dueDate < todayStr() && t.status==='pendente';
    const isDone = t.status==='concluida'||t.status==='cancelada';
    const bg = t.status==='remarcada' ? '#EFF6FF' : overdue ? '#FEF2F2' : 'white';
    const border = t.status==='remarcada' ? '#BFDBFE' : overdue ? '#FECACA' : '#F5F5F7';
    const mid = currentMemberId();
    const ownerId = t.ownerId || mid;
    const showOwner = mid && ownerId !== mid;
    const editable = !mid || ownerId === mid;
    return `<div class="card" style="padding:12px 14px;background:${bg};border-color:${border};${isDone?'opacity:.65;':''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
                    ${showOwner?`<span class="member-dot" style="background:${memberColor(ownerId)};"></span>`:''}
                    <span style="font-size:14px;font-weight:600;color:#1D1D1F;${isDone?'text-decoration:line-through;':''}">${t.title}</span>
                    <span class="badge" style="background:#F5F5F7;color:#3A3A3C;"><i class="fas ${TASK_TYPE_ICON[t.type]}" style="font-size:9px;margin-right:3px;"></i>${TASK_TYPE_LABEL[t.type]}</span>
                    ${showOwner?`<span class="badge" style="background:#F5F5F7;color:#3A3A3C;">${memberDisplayName(ownerId)}</span>`:''}
                </div>
                <div style="font-size:12px;color:${overdue?'#DC2626':'#86868B'};">
                    ${t.status==='remarcada'&&t.rescheduledTo ? 'Remarcada para '+fmtDateBR(t.rescheduledTo) : fmtDateBR(t.dueDate)+(t.dueDate===todayStr()?' — Hoje':overdue?' — Atrasada':'')}
                    ${client?' · '+client.nomeFantasia:''}
                </div>
                ${t.notes?`<div style="font-size:11px;color:#86868B;margin-top:4px;font-style:italic;">${t.notes}</div>`:''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                <select class="status-sel" onchange="changeTaskStatus('${t.id}', this.value)" ${editable?'':'disabled'}>
                    ${Object.entries(TASK_STATUS_LABEL).map(([v,l])=>`<option value="${v}" ${v===t.status?'selected':''}>${l}</option>`).join('')}
                </select>
                ${editable?`<button onclick="deleteTask('${t.id}')" style="background:none;border:none;cursor:pointer;color:#86868B;font-size:13px;padding:2px 4px;" title="Excluir tarefa"><i class="fas fa-trash"></i></button>`:''}
            </div>
        </div>
    </div>`;
}

function setTfChip(f,el) {
    tfFilter=f;
    el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    renderTasks();
}

function renderTasks() {
    const clients = S.clients();
    const cmap = new Map(clients.map(c=>[c.id,c]));
    let tasks = [...tfVisibleTasks()].sort((a,b)=>a.dueDate.localeCompare(b.dueDate));

    if (tfFilter==='hoje') tasks = tasks.filter(t=>t.dueDate===todayStr());
    else if (tfFilter==='pendente') tasks = tasks.filter(t=>t.status==='pendente'||t.status==='remarcada');
    else if (tfFilter==='concluida') tasks = tasks.filter(t=>t.status==='concluida'||t.status==='cancelada');

    const list = document.getElementById('tf-list');
    if (!tasks.length) { list.innerHTML = `<p style="text-align:center;color:#86868B;font-size:13px;padding:30px 0;">Nenhuma tarefa encontrada.</p>`; return; }
    list.innerHTML = tasks.map(t=>tfTaskCardHtml(t,cmap)).join('');
}

function deleteTask(id) {
    S.setTasks(S.tasks().filter(t=>t.id!==id));
    toast('Tarefa excluída');
    loadTarefas();
}

function changeTaskStatus(id, status) {
    if (status==='remarcada') {
        const newDate = prompt('Nova data para a tarefa (AAAA-MM-DD):', todayStr());
        if (!newDate) { renderTasks(); return; }
        updateTask(id, {status:'remarcada', rescheduledTo:newDate});
        return;
    }
    updateTask(id, {status, rescheduledTo:null});
    const t = S.tasks().find(x=>x.id===id);
    if (t && t.type==='visita' && status==='concluida' && t.clientId && !isVisitedToday(t.clientId)) {
        S.addVisit({id:'v'+Date.now(), ownerId: t.ownerId||currentMemberId(), clientId: t.clientId, date: todayStr(), status:'realizada'});
    }
}

function updateTask(id, patch) {
    const tasks = S.tasks().map(t=>t.id===id?{...t,...patch}:t);
    S.setTasks(tasks);
    loadTarefas();
}

function openNewTask() {
    document.getElementById('nt-title').value='';
    document.getElementById('nt-date').value=todayStr();
    document.getElementById('nt-notes').value='';
    const csel = document.getElementById('nt-client');
    csel.innerHTML = '<option value="">Sem cliente vinculado</option>'+visibleClients().map(c=>`<option value="${c.id}">${c.nomeFantasia}</option>`).join('');
    const opts = document.getElementById('nt-type-opts');
    let chosen='lembrete';
    opts.innerHTML = Object.entries(TASK_TYPE_LABEL).map(([v,l],i)=>`<button type="button" class="pay-opt ${i===0?'active':''}" data-type="${v}" onclick="this.parentElement.querySelectorAll('.pay-opt').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${l}</button>`).join('');
    document.getElementById('modal-newtask').classList.add('show');
}
function closeNewTask() { document.getElementById('modal-newtask').classList.remove('show'); }

function submitNewTask() {
    const title = document.getElementById('nt-title').value.trim();
    const date = document.getElementById('nt-date').value;
    if (!title || !date) return toast('Preencha título e data');
    const typeBtn = document.querySelector('#nt-type-opts .pay-opt.active');
    const type = typeBtn ? typeBtn.dataset.type : 'lembrete';
    const clientId = document.getElementById('nt-client').value;
    const notes = document.getElementById('nt-notes').value.trim();
    const tasks = S.tasks();
    tasks.push({ id:'t'+Date.now(), ownerId: currentMemberId(), clientId: clientId?parseInt(clientId):null, title, type, dueDate:date, status:'pendente', rescheduledTo:null, notes: notes||null });
    S.setTasks(tasks);
    closeNewTask();
    toast('Tarefa criada!');
    loadTarefas();
}

// ======================
// CONFIG
// ======================
function loadConfig() {
    const u = S.session();
    document.getElementById('cfg-name').value = u?.name||'';
    document.getElementById('cfg-phone').value = u?.phone||'';
    const g = S.goals();
    document.getElementById('cfg-goal-rev').value = g.revenueTarget;
    document.getElementById('cfg-goal-vis').value = g.visitsTarget;
    document.getElementById('cfg-comm-rate').value = (S.settings().commissionRate*100).toFixed(1);
    renderSettingsToggles();
}

function renderSettingsToggles() {
    const s = S.settings();
    document.getElementById('set-notif-toggle').classList.toggle('on', !!s.notifications);
    document.getElementById('set-theme-toggle').classList.toggle('on', !!s.darkTheme);
}

function toggleSetting(key) {
    const s = S.settings();
    s[key] = !s[key];
    S.setSettings(s);
    renderSettingsToggles();
    if (key==='darkTheme') applyTheme();
    const labels = { notifications:'Notificações push', darkTheme:'Tema escuro' };
    toast(labels[key]+(s[key]?' ativado':' desativado'));
}

function applyTheme() {
    const s = S.settings();
    document.documentElement.dataset.theme = s.darkTheme ? 'dark' : 'light';
}

function saveProfile() {
    const u = S.session();
    if (!u) return;
    u.name = document.getElementById('cfg-name').value.trim()||u.name;
    u.phone = document.getElementById('cfg-phone').value.trim();
    S.login(u);
    const users = S.users().map(x=>x.id===u.id?u:x);
    S.s('users', users);
    toast('Perfil atualizado!');
}

function saveGoals() {
    const revenueTarget = parseFloat(document.getElementById('cfg-goal-rev').value)||0;
    const visitsTarget = parseInt(document.getElementById('cfg-goal-vis').value)||0;
    S.setGoals({revenueTarget, visitsTarget});
    const commissionRate = (parseFloat(document.getElementById('cfg-comm-rate').value)||0)/100;
    S.setSettings({ ...S.settings(), commissionRate });
    toast('Metas e comissão atualizadas!');
}

// ======================
// FINANCEIRO
// ======================
function loadFinanceiro() {
    const clients = visibleClients();
    const goals = S.goals();
    const rate = S.settings().commissionRate;
    const today = new Date();
    const monthKey = today.toISOString().slice(0,7);
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();

    const monthRevenue = revenueForMonth(monthKey);
    const monthCommission = monthRevenue * rate;
    document.getElementById('fin-commission').textContent = fmtMoney(monthCommission);
    document.getElementById('fin-commission-sub').textContent = fmtMoney(monthRevenue)+' em vendas · taxa de '+(rate*100).toFixed(0)+'%';

    const projectedRevenue = dayOfMonth>0 ? (monthRevenue/dayOfMonth)*daysInMonth : 0;
    const projectedPct = Math.round((projectedRevenue/goals.revenueTarget)*100) || 0;
    document.getElementById('fin-projection').innerHTML = `No ritmo atual, sua projeção é fechar o mês em <b>${fmtMoney(projectedRevenue)}</b> (${projectedPct}% da meta de ${fmtMoney(goals.revenueTarget)}), gerando aproximadamente <b>${fmtMoney(projectedRevenue*rate)}</b> em comissão.`;

    const history = [];
    for (let i=2;i>=0;i--) {
        const dt = new Date(today.getFullYear(), today.getMonth()-i, 1);
        const key = dt.toISOString().slice(0,7);
        const rev = revenueForMonth(key);
        history.push({ label: dt.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}), commission: rev*rate });
    }
    document.getElementById('fin-history').innerHTML = history.map(h=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 10px;border-bottom:1px solid #F5F5F7;"><span style="font-size:13px;color:#3A3A3C;text-transform:capitalize;">${h.label}</span><span style="font-size:13px;font-weight:700;color:#15803D;">${fmtMoney(h.commission)}</span></div>`).join('');

    const overdue = clients.filter(c=>c.owe>0).sort((a,b)=>b.owe-a.owe);
    document.getElementById('fin-receivable-total').textContent = fmtMoney(overdue.reduce((s,c)=>s+c.owe,0));
    document.getElementById('fin-receivables').innerHTML = overdue.length===0
        ? `<div style="text-align:center;padding:20px 0;color:#86868B;font-size:13px;"><i class="fas fa-check-circle" style="font-size:26px;color:#16A34A;display:block;margin-bottom:8px;"></i>Nenhum valor em aberto</div>`
        : overdue.map(c=>`<div class="overdue" onclick="openClient(${c.id})" style="cursor:pointer;">
            <div style="width:36px;height:36px;background:#FEE2E2;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-triangle-exclamation" style="color:#DC2626;font-size:14px;"></i></div>
            <div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:600;color:#1D1D1F;">${c.nomeFantasia}</div><div style="font-size:12px;color:#EF4444;margin-top:2px;">${fmtMoney(c.owe)} · vencido há ${c.oweDays} dias</div></div>
            <i class="fas fa-chevron-right" style="color:#C7C7CC;font-size:11px;"></i>
        </div>`).join('');
}

// ======================
// EQUIPE (times de representantes) — painel BI + gestão
// ======================
let equipeActiveTeamId = null;

function currentMemberId() {
    const u = S.session();
    return u && u.memberId ? u.memberId : null;
}

function memberDisplayName(id) {
    const u = S.users().find(x=>x.memberId===id);
    if (u) return u.name;
    return (TEAM_MEMBER_SEED[id] && TEAM_MEMBER_SEED[id].name) || id;
}

function memberColor(id) { return TEAM_MEMBER_COLORS[id] || '#6E6E73'; }

function memberStats(id) {
    if (id==='u1') {
        const goals = S.goals();
        const monthKey = new Date().toISOString().slice(0,7);
        return {
            id, name: memberDisplayName(id),
            revenue: revenueForMonth(monthKey), goalRevenue: goals.revenueTarget,
            visits: S.visits().filter(v=>v.ownerId==='u1' && v.date.slice(0,7)===monthKey).length, goalVisits: goals.visitsTarget,
            clients: S.clients().filter(c=>c.ownerId==='u1').length,
            pendingTasks: S.tasks().filter(t=>t.ownerId==='u1' && (t.status==='pendente'||t.status==='remarcada')).length,
        };
    }
    const seed = TEAM_MEMBER_SEED[id] || {id, revenue:0, goalRevenue:1, visits:0, goalVisits:1, clients:0, pendingTasks:0};
    return { ...seed, id, name: memberDisplayName(id) };
}

function myTeams() {
    const mid = currentMemberId();
    if (!mid) return [];
    return S.teams().filter(t=>t.memberIds.includes(mid));
}

function joinableTeams() {
    const mid = currentMemberId();
    if (!mid) return [];
    return S.teams().filter(t=>t.joinable && !t.memberIds.includes(mid));
}

function loadEquipe() {
    const teams = myTeams();
    const noteam = document.getElementById('equipe-noteam');
    const content = document.getElementById('equipe-content');
    if (!teams.length) {
        noteam.style.display = 'block';
        content.style.display = 'none';
        renderEquipeTabs();
        return;
    }
    noteam.style.display = 'none';
    content.style.display = 'block';
    if (!equipeActiveTeamId || !teams.find(t=>t.id===equipeActiveTeamId)) equipeActiveTeamId = teams[0].id;
    renderEquipeTabs();
    renderEquipeDashboard();
}

function renderEquipeTabs() {
    const teams = myTeams();
    const mid = currentMemberId();
    document.getElementById('equipe-tabs').innerHTML = teams.map(t=>`
        <button class="team-tab ${t.id===equipeActiveTeamId?'active':''}" onclick="selectEquipeTeam('${t.id}')">${t.name}${t.adminId===mid?' <i class="fas fa-shield-halved" style="font-size:10px;"></i>':''}</button>`).join('') +
        `<button class="team-tab" onclick="openNewTeamModal()" style="border-style:dashed;"><i class="fas fa-plus"></i> Nova equipe</button>` +
        `<button class="team-tab" onclick="openJoinTeamModal()" style="border-style:dashed;"><i class="fas fa-right-to-bracket"></i> Entrar em equipe</button>`;
}

function selectEquipeTeam(id) { equipeActiveTeamId = id; renderEquipeDashboard(); }

function renderEquipeDashboard() {
    const team = S.teams().find(t=>t.id===equipeActiveTeamId);
    if (!team) return;
    const mid = currentMemberId();
    const isAdmin = team.adminId === mid;
    const members = team.memberIds.map(memberStats)
        .map(m=>({ ...m, pct: Math.round((m.revenue/m.goalRevenue)*100) || 0 }))
        .sort((a,b)=>b.pct-a.pct);

    const totalRevenue = members.reduce((s,m)=>s+m.revenue,0);
    const totalClients = members.reduce((s,m)=>s+m.clients,0);
    const avgPct = Math.round(members.reduce((s,m)=>s+m.pct,0)/members.length) || 0;

    document.getElementById('equipe-team-header').innerHTML = `
        <div>
            <h2 style="font-size:18px;font-weight:800;color:#1D1D1F;margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">${team.name} ${isAdmin?'<span class="badge" style="background:#F0FDF4;color:#15803D;">Você é admin</span>':''}</h2>
            <div style="font-size:12px;color:#86868B;margin-top:2px;">${team.memberIds.length} membro${team.memberIds.length!==1?'s':''} · criada em ${fmtDateBR(team.createdAt||new Date().toISOString())}</div>
        </div>
        ${isAdmin ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="renameTeam('${team.id}')" class="btn-s" style="width:auto;padding:9px 14px;font-size:12px;"><i class="fas fa-pen"></i> Renomear</button>
            <button onclick="openTeamInvite('${team.id}')" class="btn-s" style="width:auto;padding:9px 14px;font-size:12px;color:#16A34A;border-color:#BBF7D0;"><i class="fas fa-user-plus"></i> Convidar</button>
            <button onclick="deleteTeam('${team.id}')" class="btn-s" style="width:auto;padding:9px 14px;font-size:12px;color:#DC2626;border-color:#FECACA;"><i class="fas fa-trash"></i> Excluir</button>
        </div>` : ''}
    `;

    document.getElementById('equipe-totals').innerHTML = `
        <div class="sc"><i class="fas fa-people-group" style="color:#16A34A;font-size:16px;margin-bottom:6px;display:block;"></i><div style="font-size:22px;font-weight:800;color:#1D1D1F;">${members.length}</div><div style="font-size:11px;color:#86868B;margin-top:3px;">Membros</div></div>
        <div class="sc"><i class="fas fa-sack-dollar" style="color:#16A34A;font-size:16px;margin-bottom:6px;display:block;"></i><div style="font-size:22px;font-weight:800;color:#1D1D1F;">${fmtMoney(totalRevenue)}</div><div style="font-size:11px;color:#86868B;margin-top:3px;">Faturamento (mês)</div></div>
        <div class="sc"><i class="fas fa-users" style="color:#16A34A;font-size:16px;margin-bottom:6px;display:block;"></i><div style="font-size:22px;font-weight:800;color:#1D1D1F;">${totalClients}</div><div style="font-size:11px;color:#86868B;margin-top:3px;">Clientes na carteira</div></div>
        <div class="sc"><i class="fas fa-bullseye" style="color:#16A34A;font-size:16px;margin-bottom:6px;display:block;"></i><div style="font-size:22px;font-weight:800;color:#1D1D1F;">${avgPct}%</div><div style="font-size:11px;color:#86868B;margin-top:3px;">Meta média atingida</div></div>
    `;

    const maxRevenue = Math.max(...members.map(m=>m.revenue),1);
    document.getElementById('equipe-bi-bars').innerHTML = members.map(m=>`
        <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-size:12px;font-weight:600;color:#1D1D1F;"><span class="member-dot" style="display:inline-block;background:${memberColor(m.id)};margin-right:6px;vertical-align:middle;"></span>${m.name}</span><span style="font-size:12px;font-weight:700;color:#15803D;">${fmtMoney(m.revenue)}</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${(m.revenue/maxRevenue)*100}%;background:${memberColor(m.id)};"></div></div>
        </div>`).join('');

    document.getElementById('equipe-list').innerHTML = members.map((r,i)=>`
        <div class="card" style="padding:14px;${r.id===mid?'border:1.5px solid #16A34A;':''}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:28px;height:28px;border-radius:50%;background:${i===0?'#FEF9C3':'#F5F5F7'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:${i===0?'#92400E':'#6E6E73'};">${i+1}</div>
                    <span style="font-size:14px;font-weight:700;color:#1D1D1F;">${r.name}${r.id===team.adminId?' <i class="fas fa-shield-halved" style="font-size:10px;color:#16A34A;"></i>':''}${r.id===mid?' (você)':''}</span>
                </div>
                <span style="font-size:14px;font-weight:800;color:${r.pct>=100?'#15803D':r.pct>=70?'#92400E':'#DC2626'};">${r.pct}%</span>
            </div>
            <div style="background:#F5F5F7;border-radius:4px;height:6px;overflow:hidden;margin-bottom:10px;">
                <div style="height:100%;background:${memberColor(r.id)};border-radius:4px;width:${Math.min(100,r.pct)}%;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#86868B;">
                <span>${fmtMoney(r.revenue)} de ${fmtMoney(r.goalRevenue)}</span>
                <span>${r.visits}/${r.goalVisits} visitas · ${r.clients} clientes · ${r.pendingTasks} tarefas pend.</span>
            </div>
        </div>`).join('');

    const invitesBox = document.getElementById('equipe-invites');
    if (isAdmin && team.pendingInvites && team.pendingInvites.length) {
        invitesBox.style.display = 'block';
        invitesBox.innerHTML = `<div class="slabel">Convites pendentes</div>` + team.pendingInvites.map(inv=>`
            <div class="mini-row">
                <div><div style="font-size:13px;font-weight:600;color:#1D1D1F;">${inv.name}</div><div style="font-size:11px;color:#86868B;">${inv.contact}</div></div>
                <button onclick="cancelTeamInvite('${team.id}','${inv.id}')" style="background:none;border:none;color:#86868B;cursor:pointer;font-size:13px;"><i class="fas fa-xmark"></i></button>
            </div>`).join('');
    } else { invitesBox.style.display = 'none'; invitesBox.innerHTML=''; }

    const permsBox = document.getElementById('equipe-perms');
    if (isAdmin) {
        permsBox.style.display = 'block';
        const teamPerms = S.teamPerms()[team.id] || {};
        permsBox.innerHTML = `<div class="slabel">Permissões — o que cada membro pode ver dos outros</div>
            <p style="font-size:11px;color:#86868B;margin:-4px 0 10px;">Defina, por membro, quem ele pode acompanhar em cada área da plataforma.</p>` +
            team.memberIds.filter(id=>id!==team.adminId).map(viewerId=>{
                const vperms = teamPerms[viewerId] || {};
                return `<div class="card" style="padding:12px 14px;margin-bottom:8px;">
                    <div style="font-size:13px;font-weight:700;color:#1D1D1F;margin-bottom:10px;">${memberDisplayName(viewerId)}</div>
                    ${PERM_CATEGORIES.map(cat=>{
                        const allowed = vperms[cat.key] || [viewerId];
                        return `<div style="margin-bottom:8px;">
                            <div style="font-size:11px;color:#6E6E73;font-weight:600;margin-bottom:5px;"><i class="${cat.icon}" style="width:13px;"></i> ${cat.label}</div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                ${team.memberIds.map(targetId=>`<button class="member-chip ${allowed.includes(targetId)?'active':''}" onclick="toggleTeamPerm('${team.id}','${viewerId}','${targetId}','${cat.key}')" ${targetId===viewerId?'disabled':''}><span class="member-dot" style="background:${memberColor(targetId)};"></span>${memberDisplayName(targetId)}</button>`).join('')}
                            </div>
                        </div>`;
                    }).join('')}
                </div>`;
            }).join('');
    } else { permsBox.style.display = 'none'; permsBox.innerHTML=''; }

    const activityBox = document.getElementById('equipe-activity');
    if (activityBox) {
        const allowedVisitas = allowedMemberIds('visitas').filter(id=>team.memberIds.includes(id));
        const cmap = new Map(S.clients().map(c=>[c.id,c]));
        const recentVisits = [...S.visits()]
            .filter(v=>allowedVisitas.includes(v.ownerId))
            .sort((a,b)=>new Date(b.date)-new Date(a.date))
            .slice(0,6);
        activityBox.innerHTML = recentVisits.length===0
            ? `<p style="font-size:12px;color:#86868B;text-align:center;padding:14px 0;">Nenhuma visita registrada por membros visíveis a você.</p>`
            : recentVisits.map(v=>{
                const client = cmap.get(v.clientId);
                return `<div class="mini-row">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="member-dot" style="background:${memberColor(v.ownerId)};width:11px;height:11px;"></span>
                        <div><div style="font-size:13px;font-weight:600;color:#1D1D1F;">${client?client.nomeFantasia:'Cliente removido'}</div><div style="font-size:11px;color:#86868B;">${memberDisplayName(v.ownerId)} · ${fmtDateBR(v.date+'T00:00:00')}</div></div>
                    </div>
                </div>`;
            }).join('');
    }
}

function openNewTeamModal() {
    document.getElementById('nt-team-name-input').value = '';
    document.getElementById('modal-new-team').classList.add('show');
}
function closeNewTeamModal() { document.getElementById('modal-new-team').classList.remove('show'); }
function submitNewTeam() {
    const name = document.getElementById('nt-team-name-input').value.trim();
    if (!name) return toast('Informe o nome da equipe');
    const mid = currentMemberId();
    const team = { id:'team-'+Date.now(), orgId:'org-team', name, adminId:mid, memberIds:[mid], pendingInvites:[], joinable:true, createdAt:new Date().toISOString() };
    S.setTeams([...S.teams(), team]);
    const perms = S.teamPerms(); perms[team.id] = { [mid]: { tarefas:[mid], clientes:[mid], visitas:[mid] } }; S.setTeamPerms(perms);
    closeNewTeamModal();
    equipeActiveTeamId = team.id;
    toast('Equipe criada! Você é o administrador.');
    loadEquipe();
}

function renameTeam(teamId) {
    const team = S.teams().find(t=>t.id===teamId);
    if (!team) return;
    const name = prompt('Novo nome da equipe:', team.name);
    if (!name || !name.trim()) return;
    S.setTeams(S.teams().map(t=>t.id===teamId?{...t,name:name.trim()}:t));
    toast('Equipe renomeada!');
    loadEquipe();
}

function deleteTeam(teamId) {
    const team = S.teams().find(t=>t.id===teamId);
    if (!team) return;
    if (!confirm('Excluir a equipe "'+team.name+'"? Essa ação não pode ser desfeita.')) return;
    S.setTeams(S.teams().filter(t=>t.id!==teamId));
    const perms = S.teamPerms(); delete perms[teamId]; S.setTeamPerms(perms);
    if (equipeActiveTeamId===teamId) equipeActiveTeamId = null;
    toast('Equipe excluída');
    loadEquipe();
}

let teamInviteCtx = null;
function openTeamInvite(teamId) {
    teamInviteCtx = teamId;
    document.getElementById('ti-name').value=''; document.getElementById('ti-contact').value='';
    document.getElementById('modal-team-invite').classList.add('show');
}
function closeTeamInvite() { document.getElementById('modal-team-invite').classList.remove('show'); }
function submitTeamInvite() {
    const name = document.getElementById('ti-name').value.trim();
    const contact = document.getElementById('ti-contact').value.trim();
    if (!name || !contact) return toast('Preencha nome e contato');
    S.setTeams(S.teams().map(t=>t.id===teamInviteCtx ? {...t, pendingInvites:[...(t.pendingInvites||[]), {id:'inv'+Date.now(), name, contact}]} : t));
    closeTeamInvite();
    toast('Convite enviado para '+contact+'!');
    loadEquipe();
}
function cancelTeamInvite(teamId, inviteId) {
    S.setTeams(S.teams().map(t=>t.id===teamId?{...t, pendingInvites:(t.pendingInvites||[]).filter(i=>i.id!==inviteId)}:t));
    toast('Convite cancelado');
    loadEquipe();
}

function openJoinTeamModal() {
    const list = joinableTeams();
    document.getElementById('jt-list').innerHTML = list.length===0
        ? `<p style="font-size:13px;color:#86868B;text-align:center;padding:16px 0;">Nenhuma outra equipe disponível para entrar agora.</p>`
        : list.map(t=>`<div class="mini-row"><div><div style="font-size:13px;font-weight:700;color:#1D1D1F;">${t.name}</div><div style="font-size:11px;color:#86868B;">${t.memberIds.length} membros · admin: ${memberDisplayName(t.adminId)}</div></div><button onclick="joinTeam('${t.id}')" class="btn-p" style="width:auto;padding:8px 14px;font-size:12px;"><i class="fas fa-right-to-bracket"></i> Entrar</button></div>`).join('');
    document.getElementById('modal-join-team').classList.add('show');
}
function closeJoinTeamModal() { document.getElementById('modal-join-team').classList.remove('show'); }
function joinTeam(teamId) {
    const mid = currentMemberId();
    S.setTeams(S.teams().map(t=>t.id===teamId && !t.memberIds.includes(mid) ? {...t, memberIds:[...t.memberIds, mid]} : t));
    const perms = S.teamPerms();
    perms[teamId] = perms[teamId] || {};
    perms[teamId][mid] = perms[teamId][mid] || { tarefas:[mid], clientes:[mid], visitas:[mid] };
    S.setTeamPerms(perms);
    closeJoinTeamModal();
    equipeActiveTeamId = teamId;
    tfVisibleMembers = null;
    toast('Você entrou na equipe!');
    loadEquipe();
}

const PERM_CATEGORIES = [
    { key:'tarefas',  label:'Tarefas e agenda',      icon:'fas fa-calendar-days' },
    { key:'clientes', label:'Clientes (carteira)',   icon:'fas fa-store' },
    { key:'visitas',  label:'Visitas registradas',   icon:'fas fa-location-dot' },
];

function toggleTeamPerm(teamId, viewerId, targetId, category) {
    const perms = S.teamPerms();
    perms[teamId] = perms[teamId] || {};
    perms[teamId][viewerId] = perms[teamId][viewerId] || { tarefas:[viewerId], clientes:[viewerId], visitas:[viewerId] };
    const cur = perms[teamId][viewerId][category] || [viewerId];
    let next = cur.includes(targetId) ? cur.filter(x=>x!==targetId) : [...cur, targetId];
    if (!next.includes(viewerId)) next = [...next, viewerId];
    perms[teamId][viewerId][category] = next;
    S.setTeamPerms(perms);
    tfVisibleMembers = null;
    renderEquipeDashboard();
}

function allowedMemberIds(category) {
    const mid = currentMemberId();
    if (!mid) return [];
    const perms = S.teamPerms();
    const set = new Set([mid]);
    myTeams().forEach(t=>{
        if (t.adminId===mid) { t.memberIds.forEach(id=>set.add(id)); return; }
        const viewerPerms = perms[t.id] && perms[t.id][mid];
        const allowed = (viewerPerms && viewerPerms[category]) || [mid];
        allowed.forEach(id=>set.add(id));
    });
    return [...set];
}

function visibleClients() {
    if (!currentMemberId()) return S.clients();
    const allowed = allowedMemberIds('clientes');
    return S.clients().filter(c=>allowed.includes(c.ownerId));
}

// ======================
// ANOTAÇÕES
// ======================
function loadNotes() {
    const notes = S.notes();
    document.getElementById('notes-subtitle').textContent = notes.length+' anotação'+(notes.length!==1?'ões':'');
    renderNotes();
}

function renderNotes() {
    const notes = [...S.notes()].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const cmap = new Map(S.clients().map(c=>[c.id,c]));
    const list = document.getElementById('notes-list');
    if (!notes.length) { list.innerHTML = `<p style="text-align:center;color:#86868B;font-size:13px;padding:30px 0;">Nenhuma anotação ainda.</p>`; return; }
    list.innerHTML = notes.map(n=>{
        const client = n.clientId ? cmap.get(n.clientId) : null;
        return `<div class="card" style="padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
                <div style="font-size:14px;font-weight:700;color:#1D1D1F;">${n.title}</div>
                <button onclick="deleteNote('${n.id}')" style="background:none;border:none;cursor:pointer;color:#86868B;font-size:13px;flex-shrink:0;"><i class="fas fa-trash"></i></button>
            </div>
            <p style="font-size:13px;color:#3A3A3C;line-height:1.5;margin:0 0 8px;">${n.text}</p>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:11px;color:#86868B;">${fmtDateBR(n.date)}${client?' · '+client.nomeFantasia:''}</span>
                <button onclick="generateReminderFromNote('${n.id}')" style="font-size:11px;font-weight:700;color:#16A34A;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:5px 10px;cursor:pointer;font-family:'Inter',sans-serif;"><i class="fas fa-bell"></i> Gerar lembrete</button>
            </div>
        </div>`;
    }).join('');
}

function openNewNote() {
    document.getElementById('nn-title').value='';
    document.getElementById('nn-text').value='';
    const sel = document.getElementById('nn-client');
    sel.innerHTML = '<option value="">Sem cliente vinculado</option>'+visibleClients().map(c=>`<option value="${c.id}">${c.nomeFantasia}</option>`).join('');
    document.getElementById('modal-newnote').classList.add('show');
}
function closeNewNote() { document.getElementById('modal-newnote').classList.remove('show'); }

function submitNewNote() {
    const title = document.getElementById('nn-title').value.trim();
    const text = document.getElementById('nn-text').value.trim();
    if (!title || !text) return toast('Preencha título e texto');
    const clientId = document.getElementById('nn-client').value;
    const notes = S.notes();
    notes.push({ id:'n'+Date.now(), title, text, clientId: clientId?parseInt(clientId):null, date: new Date().toISOString() });
    S.setNotes(notes);
    closeNewNote();
    toast('Anotação salva!');
    loadNotes();
}

function deleteNote(id) {
    S.setNotes(S.notes().filter(n=>n.id!==id));
    toast('Anotação excluída');
    loadNotes();
}

function generateReminderFromNote(noteId) {
    const note = S.notes().find(n=>n.id===noteId);
    if (!note) return;
    openNewTask();
    document.getElementById('nt-title').value = note.title;
    document.getElementById('nt-notes').value = note.text;
    if (note.clientId) document.getElementById('nt-client').value = String(note.clientId);
    toast('Lembrete pré-preenchido a partir da anotação — escolha a data e confirme');
}

// ======================
// LEADS (CRM)
// ======================
const LEAD_STATUS_LABEL = { novo:'Novo', contatado:'Contatado', qualificado:'Qualificado', convertido:'Convertido', perdido:'Perdido' };
const LEAD_STATUS_COLOR = { novo:'#6E6E73', contatado:'#2563EB', qualificado:'#9333EA', convertido:'#16A34A', perdido:'#DC2626' };
let leadChip = 'all';

function loadLeads() {
    const leads = S.leads();
    const open = leads.filter(l=>l.status!=='convertido' && l.status!=='perdido').length;
    document.getElementById('leads-subtitle').textContent = open+' em aberto · '+leads.length+' no total';
    renderLeads();
}

function setLeadChip(s,el) {
    leadChip = s;
    el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    renderLeads();
}

function renderLeads() {
    const q = (document.getElementById('leads-search')?.value||'').toLowerCase();
    let leads = [...S.leads()].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    if (leadChip!=='all') leads = leads.filter(l=>l.status===leadChip);
    if (q) leads = leads.filter(l=>(l.nomeFantasia||'').toLowerCase().includes(q) || (l.razaoSocial||'').toLowerCase().includes(q));
    const list = document.getElementById('leads-list');
    if (!leads.length) { list.innerHTML = `<p style="text-align:center;color:#86868B;font-size:13px;padding:30px 0;grid-column:1/-1;">Nenhum lead encontrado.</p>`; return; }
    list.innerHTML = leads.map(l=>{
        const converted = l.status==='convertido';
        return `<div class="card" style="padding:14px;${converted?'opacity:.7;':''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:700;color:#1D1D1F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.nomeFantasia}</div>
                    <div style="font-size:11px;color:#86868B;margin-top:2px;">${l.cnpj||'sem CNPJ'}</div>
                </div>
                <select class="status-sel" onchange="changeLeadStatus('${l.id}', this.value)" style="color:${LEAD_STATUS_COLOR[l.status]};flex-shrink:0;">
                    ${Object.entries(LEAD_STATUS_LABEL).map(([v,lb])=>`<option value="${v}" ${v===l.status?'selected':''}>${lb}</option>`).join('')}
                </select>
            </div>
            <div style="font-size:12px;color:#6E6E73;line-height:1.6;margin-bottom:8px;">
                ${l.addr?`<div><i class="fas fa-location-dot" style="width:14px;color:#86868B;"></i> ${l.addr}${l.city?', '+l.city+' - '+l.state:''}</div>`:''}
                ${l.phone?`<div><i class="fas fa-phone" style="width:14px;color:#86868B;"></i> ${l.phone}${l.contact?' ('+l.contact+')':''}</div>`:''}
                ${l.email?`<div><i class="fas fa-envelope" style="width:14px;color:#86868B;"></i> ${l.email}</div>`:''}
                ${l.region?`<div><i class="fas fa-map" style="width:14px;color:#86868B;"></i> ${l.region}</div>`:''}
            </div>
            ${l.notes?`<p style="font-size:11px;color:#86868B;font-style:italic;margin:0 0 10px;">${l.notes}</p>`:''}
            <div style="display:flex;gap:8px;">
                ${!converted?`<button onclick="convertLeadToClient('${l.id}')" style="flex:1;font-size:12px;font-weight:700;color:white;background:#16A34A;border:none;border-radius:8px;padding:8px;cursor:pointer;font-family:'Inter',sans-serif;"><i class="fas fa-user-plus"></i> Converter</button>`:`<span style="flex:1;font-size:12px;font-weight:700;color:#16A34A;text-align:center;padding:8px;"><i class="fas fa-check-circle"></i> Convertido</span>`}
                <button onclick="generateReminderFromLead('${l.id}')" style="font-size:12px;font-weight:700;color:#16A34A;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:8px 12px;cursor:pointer;font-family:'Inter',sans-serif;"><i class="fas fa-bell"></i></button>
                <button onclick="deleteLead('${l.id}')" style="font-size:12px;color:#86868B;background:none;border:none;cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

function changeLeadStatus(id, status) {
    S.setLeads(S.leads().map(l=>l.id===id?{...l,status}:l));
    loadLeads();
}

function convertLeadToClient(id) {
    const lead = S.leads().find(l=>l.id===id);
    if (!lead) return;
    if (!lead.addr) toast('Lead sem endereço — edite o cliente na Carteira depois de converter');
    const clients = S.clients();
    clients.push({
        id: Date.now(), orgId:'org-team',
        name: lead.razaoSocial||lead.nomeFantasia, nomeFantasia: lead.nomeFantasia,
        cnpj: lead.cnpj||'', ie:'', taxRegime:'Simples Nacional', cls:'C', seg:'Cliente', supplier:'refer',
        addr: lead.addr||'', cep: lead.cep||'', city: lead.city||'', state: lead.state||'',
        contact: lead.contact||'', phone: lead.phone||'', emailCompras: lead.email||'', phoneCompras: lead.phone||'',
        owe:0, oweDays:0, promoters:[], trainings:[], ownerId: currentMemberId()||'u1',
    });
    S.setClients(clients);
    S.setLeads(S.leads().map(l=>l.id===id?{...l,status:'convertido'}:l));
    toast(lead.nomeFantasia+' convertido em cliente!');
    loadLeads();
}

function generateReminderFromLead(id) {
    const lead = S.leads().find(l=>l.id===id);
    if (!lead) return;
    openNewTask();
    document.getElementById('nt-title').value = 'Follow-up: '+lead.nomeFantasia;
    document.getElementById('nt-notes').value = lead.notes||('Contato: '+(lead.phone||lead.email||'sem contato cadastrado'));
    toast('Lembrete pré-preenchido a partir do lead — escolha a data e confirme');
}

function deleteLead(id) {
    S.setLeads(S.leads().filter(l=>l.id!==id));
    toast('Lead removido');
    loadLeads();
}

function openNewLead() {
    ['nl-name','nl-cnpj','nl-phone','nl-region','nl-notes'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('modal-newlead').classList.add('show');
}
function closeNewLead() { document.getElementById('modal-newlead').classList.remove('show'); }

function submitNewLead() {
    const name = document.getElementById('nl-name').value.trim();
    if (!name) return toast('Informe o nome do lead');
    const leads = S.leads();
    leads.push({
        id:'lead'+Date.now(), orgId:'org-team', status:'novo', createdAt: new Date().toISOString(),
        razaoSocial:name, nomeFantasia:name, cnpj: document.getElementById('nl-cnpj').value.trim(),
        phone: document.getElementById('nl-phone').value.trim(), region: document.getElementById('nl-region').value.trim(),
        notes: document.getElementById('nl-notes').value.trim()||null,
        addr:null, cep:null, city:null, state:null, contact:null, email:null,
    });
    S.setLeads(leads);
    closeNewLead();
    toast('Lead adicionado!');
    loadLeads();
}

// ======================
// FORNECEDOR — DASHBOARD
// ======================
function currentOrg() {
    const u = S.session();
    return u ? S.orgs().find(o=>o.id===u.orgId) : null;
}

const CHANNEL_META = {
    tiktok: {label:'TikTok Shop', icon:'fa-brands fa-tiktok'},
    mercadolivre: {label:'Mercado Livre', icon:'fa-solid fa-cart-shopping'},
    shopify: {label:'Shopify', icon:'fa-brands fa-shopify'},
};

const SUP_TOP_PRODUCTS = [
    {name:'Máscara Hidratante e Fortalecedora Expertise', units:412},
    {name:'Pó Descolorante Luxe Creations Blonde Care', units:356},
    {name:'Shampoo Nutritivo Amend Millenar', units:298},
    {name:'Balm Selante Nutritivo Millenar Óleos Árabes', units:251},
    {name:'Coloração Color Intensy (linha completa)', units:204},
];

function loadSupDash() {
    const org = currentOrg();
    document.getElementById('sup-org-name').textContent = org?org.name:'Fornecedor';
    const reps = S.supReps();
    const totalRevenue = reps.reduce((s,r)=>s+r.revenue,0);
    document.getElementById('sup-reps-count').textContent = reps.length;
    document.getElementById('sup-revenue').textContent = fmtMoney(totalRevenue);
    document.getElementById('sup-sku-count').textContent = PRODS.filter(p=>p.ind===(org?org.supplierKey:'refer')).length;

    // Tendência dos últimos 4 meses (fictícia, crescendo até o valor atual do mês)
    const monthFactors = [0.72, 0.81, 0.91, 1];
    const trend = monthFactors.map(f=>totalRevenue*f);
    const growthPct = trend[0]>0 ? Math.round(((trend[3]-trend[0])/trend[0])*100) : 0;
    document.getElementById('sup-growth').textContent = (growthPct>=0?'+':'')+growthPct+'%';

    const channels = S.channels();
    document.getElementById('sup-channels').innerHTML = Object.entries(CHANNEL_META).map(([k,m])=>{
        const on = channels[k];
        return `<button onclick="toggleChannel('${k}')" class="card" style="padding:14px;text-align:left;border:1.5px solid ${on?'#16A34A':'transparent'};cursor:pointer;font-family:'Inter',sans-serif;">
            <i class="${m.icon}" style="font-size:18px;color:${on?'#16A34A':'#86868B'};margin-bottom:8px;display:block;"></i>
            <div style="font-size:13px;font-weight:700;color:#1D1D1F;">${m.label}</div>
            <div style="font-size:11px;color:${on?'#16A34A':'#86868B'};font-weight:600;margin-top:2px;">${on?'Conectado ✓':'Conectar via OAuth'}</div>
        </button>`;
    }).join('');

    document.getElementById('sup-reps-list').innerHTML = reps.length===0
        ? `<p style="font-size:13px;color:#86868B;text-align:center;padding:16px 0;">Nenhum representante ainda.</p>`
        : reps.map(r=>`
        <div class="mini-row">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;background:${r.active?'#F0FDF4':'#F5F5F7'};border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-user" style="color:${r.active?'#16A34A':'#86868B'};font-size:13px;"></i></div>
                <div><div style="font-size:13px;font-weight:600;color:#1D1D1F;">${r.name}</div><div style="font-size:11px;color:#86868B;">${r.active?(r.region+' · '+r.clients+' clientes · '+r.pedidos+' pedidos/mês'):'Convite pendente · '+(r.contact||'')}</div></div>
            </div>
            <span style="font-size:13px;font-weight:700;color:#15803D;">${r.active?fmtMoney(r.revenue):'—'}</span>
        </div>`).join('');

    // --- Indicadores elaborados ---
    document.getElementById('sup-trend-pct').innerHTML = `<i class="fas fa-arrow-trend-${growthPct>=0?'up':'down'}"></i> ${growthPct>=0?'+':''}${growthPct}% vs. 4 meses atrás`;
    document.getElementById('sup-trend-pct').className = growthPct>=0 ? 'kpi-trend-up' : 'kpi-trend-down';
    const maxTrend = Math.max(...trend, 1);
    const monthLabels = [3,2,1,0].map(i=>{
        const dt = new Date(); dt.setMonth(dt.getMonth()-i);
        return dt.toLocaleDateString('pt-BR',{month:'short'}).replace('.','');
    });
    document.getElementById('sup-month-trend').innerHTML = trend.map((v,i)=>`
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%;">
            <div style="width:100%;max-width:36px;background:${i===3?'#16A34A':'#DCFCE7'};border-radius:8px 8px 3px 3px;height:${Math.max(8,(v/maxTrend)*100)}%;transition:height .6s cubic-bezier(.16,1,.3,1);"></div>
            <span style="font-size:10px;color:#86868B;font-weight:600;text-transform:capitalize;">${monthLabels[i]}</span>
        </div>`).join('');

    const maxRepRevenue = Math.max(...reps.map(r=>r.revenue), 1);
    document.getElementById('sup-rep-bars').innerHTML = [...reps].sort((a,b)=>b.revenue-a.revenue).map(r=>`
        <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-size:12px;font-weight:600;color:#1D1D1F;">${r.name}</span><span style="font-size:12px;font-weight:700;color:#15803D;">${fmtMoney(r.revenue)}</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${(r.revenue/maxRepRevenue)*100}%;"></div></div>
        </div>`).join('');

    const maxUnits = Math.max(...SUP_TOP_PRODUCTS.map(p=>p.units), 1);
    document.getElementById('sup-top-prods').innerHTML = SUP_TOP_PRODUCTS.map(p=>`
        <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-size:12px;font-weight:600;color:#1D1D1F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%;">${p.name}</span><span style="font-size:12px;font-weight:700;color:#1D1D1F;">${p.units} un.</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${(p.units/maxUnits)*100}%;background:#1D1D1F;"></div></div>
        </div>`).join('');

    const regionTotals = {};
    reps.forEach(r=>{ if(r.active) regionTotals[r.region] = (regionTotals[r.region]||0) + r.revenue; });
    const maxRegion = Math.max(...Object.values(regionTotals), 1);
    document.getElementById('sup-region-bars').innerHTML = Object.entries(regionTotals).length===0
        ? `<p style="font-size:12px;color:#86868B;">Sem dados regionais ainda.</p>`
        : Object.entries(regionTotals).sort((a,b)=>b[1]-a[1]).map(([region,val])=>`
        <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-size:12px;font-weight:600;color:#1D1D1F;">${region}</span><span style="font-size:12px;font-weight:700;color:#15803D;">${fmtMoney(val)}</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${(val/maxRegion)*100}%;"></div></div>
        </div>`).join('');
}

// ---- Conexão de canal via OAuth 2.0 (simulado) ----
let oauthChannelKey = null;

function toggleChannel(key) {
    const ch = S.channels();
    if (ch[key]) {
        ch[key] = false;
        S.setChannels(ch);
        toast(CHANNEL_META[key].label+' desconectado');
        loadSupDash();
        return;
    }
    openOauth(key);
}

function openOauth(key) {
    oauthChannelKey = key;
    const m = CHANNEL_META[key];
    document.getElementById('oauth-icon').innerHTML = `<i class="${m.icon}" style="color:#1D1D1F;font-size:22px;"></i>`;
    document.getElementById('oauth-title').textContent = m.label;
    document.getElementById('oauth-email').value = '';
    document.getElementById('oauth-pass').value = '';
    document.getElementById('modal-oauth').classList.add('show');
}
function closeOauth() { document.getElementById('modal-oauth').classList.remove('show'); }

function submitOauth() {
    const email = document.getElementById('oauth-email').value.trim();
    const pass = document.getElementById('oauth-pass').value;
    if (!email || !pass) return toast('Informe e-mail e senha para autorizar o acesso');
    const btn = document.getElementById('oauth-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Conectando...';
    setTimeout(()=>{
        const ch = S.channels();
        ch[oauthChannelKey] = true;
        S.setChannels(ch);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-lock"></i>Autorizar acesso';
        const label = CHANNEL_META[oauthChannelKey].label;
        closeOauth();
        toast(label+' conectado via OAuth 2.0! Sincronizando catálogo...');
        loadSupDash();
    }, 900);
}

function openInviteRep() {
    ['ir-name','ir-contact','ir-region'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('modal-invite-rep').classList.add('show');
}
function closeInviteRep() { document.getElementById('modal-invite-rep').classList.remove('show'); }

function submitInviteRep() {
    const name = document.getElementById('ir-name').value.trim();
    const contact = document.getElementById('ir-contact').value.trim();
    if (!name) return toast('Informe o nome do representante');
    if (!contact) return toast('Informe um e-mail ou telefone para o convite');
    const reps = S.supReps();
    reps.push({id:'r'+Date.now(), name, contact, region: document.getElementById('ir-region').value.trim()||'A definir', clients:0, revenue:0, pedidos:0, active:false});
    S.setSupReps(reps);
    closeInviteRep();
    toast('Convite enviado para '+contact+'!');
    loadSupDash();
}

// ======================
// FORNECEDOR — CATÁLOGO
// ======================
let supCatFilter = '';

function loadSupCatalogo() {
    const org = currentOrg();
    const supKey = org ? org.supplierKey : 'refer';
    const isGestor = S.session()?.role === 'gestor';
    document.querySelectorAll('.sup-cat-gestor-only').forEach(el=>el.style.display = isGestor ? 'inline-flex' : 'none');
    const referProds = PRODS.filter(p=>p.ind===supKey);
    document.getElementById('sup-cat-subtitle').textContent = referProds.length+' produtos cadastrados';
    const cats = [...new Set(referProds.map(p=>p.categoria))];
    document.getElementById('sup-cat-chips').innerHTML = ['Todas',...cats].map(cat=>{
        const val = cat==='Todas' ? '' : cat;
        return `<button class="chip ${supCatFilter===val?'active':''}" onclick="setSupCat('${val}')">${cat}</button>`;
    }).join('');
    renderSupCatalogo();
}

function setSupCat(cat) { supCatFilter = cat; loadSupCatalogo(); }

function renderSupCatalogo() {
    const org = currentOrg();
    const supKey = org ? org.supplierKey : 'refer';
    const q = (document.getElementById('sup-cat-search')?.value||'').toLowerCase();
    let prods = PRODS.filter(p=>p.ind===supKey);
    if (supCatFilter) prods = prods.filter(p=>p.categoria===supCatFilter);
    if (q) prods = prods.filter(p=>p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || String(p.ean||'').includes(q));
    document.getElementById('sup-cat-list').innerHTML = prods.length===0
        ? `<p style="text-align:center;color:#86868B;font-size:13px;padding:30px 0;">Nenhum produto encontrado.</p>`
        : prods.map(p=>`
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #F5F5F7;">
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;color:#1D1D1F;">${p.name}</div>
                <div style="font-size:11px;color:#86868B;">SKU ${p.sku} · EAN ${p.ean||'—'} · ${p.categoria}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:12px;font-weight:700;color:#16A34A;">SN ${fmtMoney(p.priceSN)}</div>
                <div style="font-size:11px;color:#86868B;">LR/LP ${fmtMoney(p.priceLR)}</div>
            </div>
        </div>`).join('');
}

function openAddProduct() {
    const supKey = (currentOrg()||{}).supplierKey || 'refer';
    ['ap-name','ap-cat','ap-ean','ap-sn','ap-lr'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('ap-sku').value = supKey.toUpperCase()+'-'+(1000+PRODS.filter(p=>p.ind===supKey).length);
    document.getElementById('modal-add-product').classList.add('show');
}
function closeAddProduct() { document.getElementById('modal-add-product').classList.remove('show'); }

function submitAddProduct() {
    const supKey = (currentOrg()||{}).supplierKey || 'refer';
    const name = document.getElementById('ap-name').value.trim();
    const cat = document.getElementById('ap-cat').value.trim();
    const priceSN = parseFloat(document.getElementById('ap-sn').value)||0;
    const priceLR = parseFloat(document.getElementById('ap-lr').value)||priceSN;
    if (!name) return toast('Informe o nome do produto');
    if (!cat) return toast('Informe a categoria');
    if (!priceSN) return toast('Informe o preço Simples Nacional');
    const product = {
        id: Date.now(), ind:supKey, sku: document.getElementById('ap-sku').value,
        ean: document.getElementById('ap-ean').value.trim()||null, name, categoria: cat,
        unit:'un', priceSN, priceLR,
    };
    PRODS.push(product);
    S.setCustomProducts([...S.customProducts(), product]);
    closeAddProduct();
    toast('Produto adicionado ao catálogo!');
    loadSupCatalogo();
}

// ======================
// CONFIGURAÇÃO DE CAMPOS DO CATÁLOGO + IMPORTAÇÃO DE PLANILHA
// ======================
function openProductFields() {
    const org = currentOrg();
    if (!org) return;
    const fields = S.productFields(org.id);
    document.getElementById('pf-rows').innerHTML = fields.map((f,i)=>`
        <div class="card" style="padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <input type="text" class="inp" data-idx="${i}" data-role="label" value="${f.label}" style="flex:1;min-width:160px;padding:9px 10px;font-size:13px;" ${f.key==='name'?'disabled':''}>
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#6E6E73;white-space:nowrap;"><input type="checkbox" data-idx="${i}" data-role="active" ${f.active?'checked':''} ${f.key==='name'?'disabled':''}> Ativo</label>
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#6E6E73;white-space:nowrap;"><input type="checkbox" data-idx="${i}" data-role="required" ${f.required?'checked':''} ${f.key==='name'?'disabled':''}> Obrigatório</label>
        </div>`).join('');
    document.getElementById('modal-product-fields').classList.add('show');
}
function closeProductFields() { document.getElementById('modal-product-fields').classList.remove('show'); }

function submitProductFields() {
    const org = currentOrg();
    if (!org) return;
    const fields = S.productFields(org.id);
    const updated = fields.map((f,i)=>{
        if (f.key==='name') return f;
        const labelEl = document.querySelector(`[data-idx="${i}"][data-role="label"]`);
        const activeEl = document.querySelector(`[data-idx="${i}"][data-role="active"]`);
        const reqEl = document.querySelector(`[data-idx="${i}"][data-role="required"]`);
        const active = activeEl.checked;
        return { ...f, label: labelEl.value.trim()||f.label, active, required: active && reqEl.checked };
    });
    S.setProductFields(org.id, updated);
    closeProductFields();
    toast('Campos do catálogo atualizados! A planilha de importação agora deve seguir esse padrão.');
}

function downloadFieldTemplate() {
    const org = currentOrg();
    if (!org) return;
    const fields = S.productFields(org.id).filter(f=>f.active);
    const header = fields.map(f=>f.label).join(';');
    const blob = new Blob(['﻿'+header+'\n'], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'modelo-catalogo-'+(org.supplierKey||'produtos')+'.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function openImportExcel() {
    document.getElementById('ie-file').value = '';
    document.getElementById('ie-status').innerHTML = '';
    document.getElementById('modal-import-excel').classList.add('show');
}
function closeImportExcel() { document.getElementById('modal-import-excel').classList.remove('show'); }

function handleImportExcel() {
    const org = currentOrg();
    if (!org) return;
    const fileInput = document.getElementById('ie-file');
    const file = fileInput.files[0];
    const statusEl = document.getElementById('ie-status');
    if (!file) return toast('Selecione um arquivo');
    if (typeof XLSX === 'undefined') return toast('Biblioteca de planilhas não carregou — verifique sua conexão');

    const fields = S.productFields(org.id).filter(f=>f.active);
    const requiredFields = fields.filter(f=>f.required);

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, {type:'array'});
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
            if (!rows.length) throw new Error('Planilha vazia');
            const headerRow = rows[0].map(h=>String(h||'').trim().toLowerCase());
            const missing = requiredFields.filter(f=>!headerRow.includes(f.label.trim().toLowerCase()));
            if (missing.length) {
                statusEl.innerHTML = `<div style="color:#DC2626;font-size:12px;"><i class="fas fa-triangle-exclamation"></i> Faltam colunas obrigatórias: <b>${missing.map(f=>f.label).join(', ')}</b>. Baixe o modelo atualizado e use exatamente os mesmos nomes de coluna.</div>`;
                return;
            }
            const colIndex = {};
            fields.forEach(f=>{ colIndex[f.key] = headerRow.indexOf(f.label.trim().toLowerCase()); });

            const existing = PRODS.filter(p=>p.ind===org.supplierKey).length;
            const newProducts = [];
            for (let r=1; r<rows.length; r++) {
                const row = rows[r];
                if (!row || row.every(c=>String(c).trim()==='')) continue;
                const get = key => colIndex[key]>=0 ? String(row[colIndex[key]]||'').trim() : '';
                const name = get('name');
                if (!name) continue;
                const parsePrice = v => parseFloat(String(v).replace(/[^\d,.-]/g,'').replace(',','.'))||0;
                newProducts.push({
                    id: Date.now()+r, ind: org.supplierKey, name,
                    sku: get('sku') || (org.supplierKey.toUpperCase()+'-'+(existing+newProducts.length+1)),
                    ean: get('ean') || null,
                    categoria: get('categoria') || 'Geral',
                    unit: get('unit') || 'un',
                    priceSN: parsePrice(get('priceSN')),
                    priceLR: parsePrice(get('priceLR')) || parsePrice(get('priceSN')),
                });
            }
            if (!newProducts.length) {
                statusEl.innerHTML = `<div style="color:#DC2626;font-size:12px;">Nenhum produto válido encontrado na planilha.</div>`;
                return;
            }
            PRODS.push(...newProducts);
            S.setCustomProducts([...S.customProducts(), ...newProducts]);
            statusEl.innerHTML = `<div style="color:#15803D;font-size:12px;"><i class="fas fa-check-circle"></i> ${newProducts.length} produto(s) importado(s) com sucesso!</div>`;
            toast(newProducts.length+' produtos importados!');
            setTimeout(()=>{ closeImportExcel(); loadSupCatalogo(); }, 900);
        } catch (err) {
            statusEl.innerHTML = `<div style="color:#DC2626;font-size:12px;">Erro ao ler a planilha — verifique o formato do arquivo.</div>`;
        }
    };
    reader.readAsArrayBuffer(file);
}

// ======================
// CHAT DE SUPORTE
// ======================
const SUPPORT_AUTOREPLIES = [
    'Recebemos sua mensagem! Nosso time de suporte vai responder em breve. 🙌',
    'Obrigado pelo feedback — isso ajuda muito a melhorar o RepOS!',
    'Anotado! Vamos avaliar essa sugestão com o time de produto.',
    'Valeu por reportar. Um especialista vai revisar e te retorna por aqui.',
];

function supportChatKey() {
    const u = S.session();
    return u ? u.id : 'anon';
}

function openSupportChat() {
    document.getElementById('support-chat-panel').classList.add('show');
    document.getElementById('support-chat-fab').classList.add('hide');
    renderSupportChat();
    setTimeout(()=>document.getElementById('sc-input')?.focus(),150);
}
function closeSupportChat() {
    document.getElementById('support-chat-panel').classList.remove('show');
    document.getElementById('support-chat-fab').classList.remove('hide');
}

function renderSupportChat() {
    const u = S.session();
    const msgs = S.supportChat(supportChatKey());
    const box = document.getElementById('sc-messages');
    if (!box) return;
    if (!msgs.length) {
        box.innerHTML = `<div style="text-align:center;color:#86868B;font-size:12px;padding:24px 10px;">
            <i class="fas fa-headset" style="font-size:24px;color:#16A34A;display:block;margin-bottom:8px;"></i>
            Oi${u?', '+u.name.split(' ')[0]:''}! Conte pra gente sua dúvida, elogio ou problema com a plataforma.
        </div>`;
    } else {
        box.innerHTML = msgs.map(m=>`
            <div style="display:flex;${m.from==='user'?'justify-content:flex-end;':''}margin-bottom:8px;">
                <div style="max-width:80%;padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.45;${
                    m.from==='user' ? 'background:#16A34A;color:white;border-radius:14px 14px 4px 14px;' : 'background:#F5F5F7;color:#1D1D1F;border-radius:14px 14px 14px 4px;'
                }">${m.text}</div>
            </div>`).join('');
    }
    box.scrollTop = box.scrollHeight;
}

function sendSupportChat() {
    const input = document.getElementById('sc-input');
    const text = input.value.trim();
    if (!text) return;
    const key = supportChatKey();
    const msgs = S.supportChat(key);
    msgs.push({from:'user', text, date:new Date().toISOString()});
    S.setSupportChat(key, msgs);
    input.value = '';
    renderSupportChat();
    setTimeout(()=>{
        const m2 = S.supportChat(key);
        m2.push({from:'support', text: SUPPORT_AUTOREPLIES[Math.floor(Math.random()*SUPPORT_AUTOREPLIES.length)], date:new Date().toISOString()});
        S.setSupportChat(key, m2);
        renderSupportChat();
    }, 900);
}

function toggleSupportFab(show) {
    const fab = document.getElementById('support-chat-fab');
    if (fab) fab.style.display = show ? 'flex' : 'none';
}

// ======================
// TOAST
// ======================
function toast(msg) {
    const t=document.getElementById('toast');
    t.textContent=msg; t.classList.add('show');
    clearTimeout(t._timer);
    t._timer=setTimeout(()=>t.classList.remove('show'),2500);
}

// Clicar fora da caixa de qualquer modal fecha o modal.
document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); });
});

// ======================
// INIT
// ======================
seed();
applyTheme();
PRODS.push(...S.customProducts());
const u=S.session();
showScreen(u ? homeScreenFor(u) : 'landing');
