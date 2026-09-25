// LÓGICA DO PROFISSIONAL (profissional.js)
// OBJETIVO: Gerenciar o feed e o aceite de chamados.
// O QUE FAZER AQUI:
// - Função para buscar pedidos na tabela 'pedidos' onde status == 'aberto'.
// - Lógica do botão "Aceitar Serviço": atualiza o pedido para status = 'em_andamento' e preenche profissional_id com o ID do usuário logado.


// Cor e sigla de cada categoria (mesmas cores dos protótipos)
const CATEGORIAS = {
    encanador:   { sigla: 'EN', cor: '#13695f' },
    eletricista: { sigla: 'EL', cor: '#d0901f' },
    chaveiro:    { sigla: 'CH', cor: '#4c5aa8' },
    pedreiro:    { sigla: 'PD', cor: '#b8532e' },
    pintor:      { sigla: 'PT', cor: '#8b4775' },
    gesseiro:    { sigla: 'GS', cor: '#47707e' },
};

let usuarioLogado = null;   // { id, categoria }

// ==========================================
// MODO DEMONSTRAÇÃO
// true  = pula o login e mostra pedidos fictícios (para pré-visualizar a tela)
// false = funcionamento real com o Supabase
// ==========================================
const MODO_DEMONSTRACAO = true;

// Pedidos fictícios usados no modo demonstração
const minutosAtras = (min) => new Date(Date.now() - min * 60000).toISOString();

const PEDIDOS_FICTICIOS = [
    { id: 1, cliente_nome: 'Mariana Souza',   categoria: 'encanador',   created_at: minutosAtras(4),    descricao: 'Vazamento embaixo da pia da cozinha, a água está escorrendo pelo armário.', endereco: 'Rua das Palmeiras, 152 - Centro' },
    { id: 2, cliente_nome: 'Carlos Henrique', categoria: 'eletricista', created_at: minutosAtras(18),   descricao: 'Disjuntor desarma toda vez que ligo o chuveiro. Preciso de uma avaliação.', endereco: 'Av. Brasil, 2300 - Jardim América' },
    { id: 3, cliente_nome: 'Fernanda Lima',   categoria: 'chaveiro',    created_at: minutosAtras(35),   descricao: 'Perdi a chave de casa e estou do lado de fora. Urgente!', endereco: 'Rua Sete de Setembro, 89 - Vila Nova' },
    { id: 4, cliente_nome: 'João Pedro Alves', categoria: 'pintor',     created_at: minutosAtras(130),  descricao: 'Pintura de dois quartos (aprox. 12 m² cada), paredes já lixadas.', endereco: 'Rua Ipê Amarelo, 45 - Parque das Flores' },
    { id: 5, cliente_nome: 'Ana Beatriz Costa', categoria: 'pedreiro',  created_at: minutosAtras(300),  descricao: 'Rachadura no muro dos fundos e alguns azulejos soltos no banheiro.', endereco: 'Travessa São José, 12 - Bela Vista' },
    { id: 6, cliente_nome: 'Roberto Nunes',   categoria: 'gesseiro',    created_at: minutosAtras(1500), descricao: 'Instalar forro de gesso na sala e fazer uma sanca com iluminação.', endereco: 'Rua Dom Pedro II, 780 - Santa Mônica' },
];

document.addEventListener('DOMContentLoaded', async () => {

    if (MODO_DEMONSTRACAO) {
        renderizarPedidos(PEDIDOS_FICTICIOS);
        document.getElementById('btn-atualizar').addEventListener('click', () => renderizarPedidos(PEDIDOS_FICTICIOS));
        document.getElementById('btn-sair').addEventListener('click', () => { window.location.href = 'index.html'; });
        return;
    }

    // ==========================================
    // PROTEÇÃO DA PÁGINA
    // Só profissional aprovado pode ver o feed
    // ==========================================
    const { data: sessao } = await supabaseClient.auth.getSession();

    if (!sessao.session) {
        window.location.href = 'index.html';
        return;
    }

    const uid = sessao.session.user.id;

    const { data: perfil, error: perfilError } = await supabaseClient
        .from('usuarios')
        .select('*')
        .eq('id', uid)
        .single();

    if (perfilError || perfil.tipo_usuario !== 'profissional') {
        window.location.href = 'index.html';
        return;
    }

    if (perfil.status_aprovacao !== 'aprovado') {
        window.location.href = 'bloqueio.html';
        return;
    }

    // Se a tabela 'usuarios' tiver a coluna 'categoria', o feed filtra por ela
    usuarioLogado = { id: uid, categoria: perfil.categoria || null };

    // ==========================================
    // FEED DE OPORTUNIDADES
    // ==========================================
    if (document.getElementById('lista-pedidos')) {
        await carregarPedidos();

        document.getElementById('btn-atualizar').addEventListener('click', carregarPedidos);

        // Tempo real: recarrega o feed quando um pedido é criado ou alterado
        supabaseClient
            .channel('feed-pedidos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, carregarPedidos)
            .subscribe();
    }

    // ==========================================
    // BOTÃO SAIR
    // ==========================================
    const btnSair = document.getElementById('btn-sair');

    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }
});


// Busca os pedidos abertos e desenha os cards
async function carregarPedidos() {
    const contador = document.getElementById('contador-pedidos');

    let consulta = supabaseClient
        .from('pedidos')
        .select('*')
        .eq('status', 'aberto')
        .order('created_at', { ascending: false });

    if (usuarioLogado.categoria) {
        consulta = consulta.eq('categoria', usuarioLogado.categoria);
    }

    const { data: pedidos, error } = await consulta;

    if (error) {
        console.error(error);
        contador.textContent = 'Não foi possível carregar os pedidos.';
        return;
    }

    renderizarPedidos(pedidos);
}


function renderizarPedidos(pedidos) {
    const lista = document.getElementById('lista-pedidos');
    const vazio = document.getElementById('feed-vazio');
    const contador = document.getElementById('contador-pedidos');
    const modelo = document.getElementById('modelo-card-pedido');

    lista.innerHTML = '';
    vazio.hidden = pedidos.length > 0;

    contador.textContent = pedidos.length === 1
        ? '1 pedido aberto aguardando profissional'
        : `${pedidos.length} pedidos abertos aguardando profissional`;

    pedidos.forEach((pedido) => {
        const card = modelo.content.cloneNode(true);
        const chave = (pedido.categoria || '').toLowerCase();
        const categoria = CATEGORIAS[chave] || { sigla: '??', cor: '#134e48' };

        const avatar = card.querySelector('.avatar-categoria');
        avatar.textContent = categoria.sigla;
        avatar.style.setProperty('--cor-categoria', categoria.cor);

        // textContent evita que texto digitado pelo cliente vire HTML
        card.querySelector('.badge-categoria').textContent = pedido.categoria || 'Serviço';
        card.querySelector('.card-tempo').textContent = tempoDesde(pedido.created_at);
        card.querySelector('.card-cliente').textContent = pedido.cliente_nome || '';
        card.querySelector('.card-descricao').textContent = pedido.descricao || 'Sem descrição.';
        card.querySelector('.texto-endereco').textContent = pedido.endereco || 'Endereço não informado';

        const botao = card.querySelector('.btn-aceitar');
        botao.addEventListener('click', () => aceitarPedido(pedido.id, botao));

        lista.appendChild(card);
    });
}


// Aceita o pedido: status -> 'em_andamento' e grava o profissional
async function aceitarPedido(pedidoId, botao) {
    botao.disabled = true;
    botao.textContent = 'Aceitando...';

    if (MODO_DEMONSTRACAO) {
        alert('Modo demonstração: pedido aceito (nada foi salvo no banco).');
        window.location.href = `servico-andamento.html?pedido=${pedidoId}`;
        return;
    }

    // O filtro status = 'aberto' impede que dois profissionais aceitem o mesmo pedido
    const { data, error } = await supabaseClient
        .from('pedidos')
        .update({ status: 'em_andamento', profissional_id: usuarioLogado.id })
        .eq('id', pedidoId)
        .eq('status', 'aberto')
        .select();

    if (error || !data || data.length === 0) {
        console.error(error);
        alert('Este pedido não está mais disponível. Talvez outro profissional já tenha aceitado.');
        await carregarPedidos();
        return;
    }

    window.location.href = `servico-andamento.html?pedido=${pedidoId}`;
}


// Ex.: "há 5 min", "há 2 h", "há 3 dias"
function tempoDesde(dataTexto) {
    if (!dataTexto) return '';

    const minutos = Math.floor((Date.now() - new Date(dataTexto).getTime()) / 60000);

    if (minutos < 1) return 'agora mesmo';
    if (minutos < 60) return `há ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `há ${horas} h`;

    const dias = Math.floor(horas / 24);
    return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}