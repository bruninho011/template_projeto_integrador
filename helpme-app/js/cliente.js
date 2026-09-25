// LÓGICA DO CLIENTE (cliente.js)
// OBJETIVO: Gerenciar a criação de pedidos e tela de espera.
// O QUE FAZER AQUI:
// - Função para salvar o pedido na tabela 'pedidos' com status 'aberto'.
// - Função com supabase.channel() em espera-cliente.html para escutar quando profissional_id for preenchido.


// Categorias de serviço (mesmas cores e siglas do profissional.js / protótipos)
const CATEGORIAS = {
    encanador:   { nome: 'Encanador',   sigla: 'EN', cor: '#13695f', descricao: 'Vazamentos, entupimentos, torneiras e instalações hidráulicas.' },
    eletricista: { nome: 'Eletricista', sigla: 'EL', cor: '#d0901f', descricao: 'Tomadas, disjuntores, chuveiros e instalações elétricas.' },
    chaveiro:    { nome: 'Chaveiro',    sigla: 'CH', cor: '#4c5aa8', descricao: 'Abertura de portas, cópias de chaves e troca de fechaduras.' },
    pedreiro:    { nome: 'Pedreiro',    sigla: 'PD', cor: '#b8532e', descricao: 'Reformas, rachaduras, pisos, azulejos e alvenaria.' },
    pintor:      { nome: 'Pintor',      sigla: 'PT', cor: '#8b4775', descricao: 'Pintura de paredes, portões, fachadas e acabamentos.' },
    gesseiro:    { nome: 'Gesseiro',    sigla: 'GS', cor: '#47707e', descricao: 'Forros, sancas, divisórias e reparos em gesso.' },
};

// Texto e página de cada status do pedido
const STATUS_PEDIDO = {
    aberto:       { texto: 'Procurando profissional', pagina: 'espera-cliente.html' },
    em_andamento: { texto: 'Em andamento',            pagina: 'servico-andamento.html' },
};

// ==========================================
// MODO DEMONSTRAÇÃO
// true  = pula o login e usa dados fictícios (para pré-visualizar a tela)
// false = funcionamento real com o Supabase
// ==========================================
const MODO_DEMONSTRACAO = true;

const CLIENTE_FICTICIO = { id: 'demo', nome: 'Ana Paula Rocha' };
const PEDIDO_FICTICIO = { id: 1, categoria: 'encanador', status: 'aberto', descricao: 'Vazamento embaixo da pia da cozinha.' };

let usuarioLogado = null;   // { id, nome }

document.addEventListener('DOMContentLoaded', async () => {

    // ==========================================
    // PROTEÇÃO DA PÁGINA
    // Só cliente logado pode ver as telas do cliente
    // ==========================================
    if (MODO_DEMONSTRACAO) {
        usuarioLogado = CLIENTE_FICTICIO;
    } else {
        usuarioLogado = await buscarClienteLogado();
        if (!usuarioLogado) return;
    }

    // ==========================================
    // HOME DO CLIENTE
    // ==========================================
    if (document.getElementById('lista-categorias')) {
        document.getElementById('nome-cliente').textContent = primeiroNome(usuarioLogado.nome);

        renderizarCategorias('');

        document.getElementById('busca-categoria').addEventListener('input', (e) => {
            renderizarCategorias(e.target.value);
        });

        await mostrarPedidoAtivo();
    }

    // ==========================================
    // BOTÃO SAIR
    // ==========================================
    const btnSair = document.getElementById('btn-sair');

    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            if (!MODO_DEMONSTRACAO) await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }
});


// Confere a sessão e o tipo de usuário. Retorna { id, nome } ou null (e redireciona)
async function buscarClienteLogado() {
    const { data: sessao } = await supabaseClient.auth.getSession();

    if (!sessao.session) {
        window.location.href = 'index.html';
        return null;
    }

    const uid = sessao.session.user.id;

    const { data: perfil, error } = await supabaseClient
        .from('usuarios')
        .select('nome, tipo_usuario')
        .eq('id', uid)
        .single();

    if (error || perfil.tipo_usuario !== 'cliente') {
        window.location.href = 'index.html';
        return null;
    }

    return { id: uid, nome: perfil.nome };
}


// Desenha os cards de categoria, filtrando pelo texto da busca
function renderizarCategorias(textoBusca) {
    const lista = document.getElementById('lista-categorias');
    const vazio = document.getElementById('categorias-vazio');
    const modelo = document.getElementById('modelo-card-categoria');
    const busca = normalizar(textoBusca);

    const encontradas = Object.entries(CATEGORIAS).filter(([, categoria]) =>
        normalizar(categoria.nome + ' ' + categoria.descricao).includes(busca)
    );

    lista.innerHTML = '';
    vazio.hidden = encontradas.length > 0;

    encontradas.forEach(([chave, categoria]) => {
        const card = modelo.content.cloneNode(true);

        // Cada card leva para o formulário já com a categoria escolhida
        card.querySelector('.card-categoria').href = `solicitar-pedido.html?categoria=${chave}`;

        const avatar = card.querySelector('.avatar-categoria');
        avatar.textContent = categoria.sigla;
        avatar.style.setProperty('--cor-categoria', categoria.cor);

        card.querySelector('.card-categoria-nome').textContent = categoria.nome;
        card.querySelector('.card-categoria-descricao').textContent = categoria.descricao;

        lista.appendChild(card);
    });
}


// Se o cliente já tiver um pedido aberto ou em andamento, mostra o aviso no topo
async function mostrarPedidoAtivo() {
    let pedido = null;

    if (MODO_DEMONSTRACAO) {
        pedido = PEDIDO_FICTICIO;
    } else {
        const { data, error } = await supabaseClient
            .from('pedidos')
            .select('id, categoria, status, descricao')
            .eq('cliente_id', usuarioLogado.id)
            .in('status', ['aberto', 'em_andamento'])
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error(error);
            return;
        }

        pedido = data[0] || null;
    }

    if (!pedido) return;

    const status = STATUS_PEDIDO[pedido.status];
    const categoria = CATEGORIAS[(pedido.categoria || '').toLowerCase()];

    document.getElementById('aviso-categoria').textContent = categoria ? categoria.nome : pedido.categoria;
    document.getElementById('aviso-descricao').textContent = pedido.descricao || '';

    const badge = document.getElementById('aviso-status');
    badge.textContent = status.texto;
    badge.classList.add(`status-${pedido.status}`);

    document.getElementById('aviso-link').href = `${status.pagina}?pedido=${pedido.id}`;
    document.getElementById('aviso-pedido').hidden = false;
}


// "Ana Paula Rocha" -> "Ana"
function primeiroNome(nome) {
    return (nome || 'cliente').trim().split(' ')[0];
}

// Deixa minúsculo e sem acento, para a busca achar "eletrica" em "Elétrica"
function normalizar(texto) {
    return (texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
