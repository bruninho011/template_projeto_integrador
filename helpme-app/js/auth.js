// LÓGICA DE AUTENTICAÇÃO E ROTAS (auth.js)
// OBJETIVO: Gerenciar cadastros, logins e redirecionamentos.
// O QUE FAZER AQUI:
// - Capturar evento de submit do formulário de Login e Cadastro.
// - Usar supabase.auth.signUp() e supabase.auth.signInWithPassword().
// - Buscar tipo_usuario e status_aprovacao na tabela 'usuarios'.
// - Redirecionar: Cliente -> home-cliente.html | Profissional Aprovado -> feed-profissional.html | Pendente -> bloqueio.html


document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // LÓGICA DA TELA DE CADASTRO
    // ==========================================
    const formCadastro = document.getElementById('form-cadastro');
    
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const nome = document.getElementById('nome').value;
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            const tipoUsuario = document.querySelector('input[name="tipo_usuario"]:checked').value; 

            try {
                // Passo 1: Cria o usuário (Usando supabaseClient)
                const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                    email: email,
                    password: senha,
                });

                if (authError) throw authError;

                const status = (tipoUsuario === 'cliente') ? 'aprovado' : 'pendente';

                // Passo 2: Salva os detalhes na tabela (Usando supabaseClient)
                const { error: dbError } = await supabaseClient.from('usuarios').insert([
                    { 
                        id: authData.user.id, 
                        nome: nome, 
                        tipo_usuario: tipoUsuario,
                        status_aprovacao: status 
                    }
                ]);

                if (dbError) throw dbError;

                alert('Conta criada com sucesso! Faça login para continuar.');
                window.location.href = 'index.html'; 

            } catch (erro) {
                console.error(erro);
                alert('Erro ao criar conta: ' + erro.message);
            }
        });
    }

    // ==========================================
    // LÓGICA DA TELA DE LOGIN
    // ==========================================
    const formLogin = document.getElementById('form-login');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;

            try {
                // Passo 1: Valida E-mail e Senha (Usando supabaseClient)
                const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: senha,
                });

                if (authError) throw new Error('E-mail ou senha incorretos.');

                const uid = authData.user.id;

                // Passo 2: Busca quem é essa pessoa (Usando supabaseClient)
                const { data: perfil, error: perfilError } = await supabaseClient
                    .from('usuarios')
                    .select('tipo_usuario, status_aprovacao')
                    .eq('id', uid)
                    .single(); 

                if (perfilError) throw new Error('Erro ao buscar perfil no banco.');

                if (perfil.tipo_usuario === 'cliente') {
                    window.location.href = 'home-cliente.html';
                } else if (perfil.tipo_usuario === 'profissional') {
                    if (perfil.status_aprovacao === 'aprovado') {
                        window.location.href = 'feed-profissional.html';
                    } else {
                        window.location.href = 'bloqueio.html';
                    }
                }

            } catch (erro) {
                console.error(erro);
                alert(erro.message);
            }
        });
    }
});


// js/auth.js

// 1. Configuração do Supabase (Substitua pelas suas chaves reais do painel do Supabase)
const SUPABASE_URL = 'https://SUA-URL-AQUI.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-CHAVE-ANON-AQUI';

// Inicializa o cliente do Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Mapeamento de Elementos do DOM
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const btnLogin = document.getElementById('btn-login');
const togglePasswordBtn = document.getElementById('toggle-password');

// 3. Interação de Interface (Mostrar/Ocultar Senha)
togglePasswordBtn.addEventListener('click', () => {
    const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
    senhaInput.setAttribute('type', type);
    
    // Troca o ícone (Olho aberto / fechado)
    const icon = togglePasswordBtn.querySelector('i');
    icon.classList.toggle('ph-eye');
    icon.classList.toggle('ph-eye-slash');
});

// 4. Lógica de Autenticação com Supabase
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que a página recarregue

    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    // Estado de Loading no botão
    const textOriginalBtn = btnLogin.innerHTML;
    btnLogin.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Entrando...';
    btnLogin.disabled = true;

    try {
        // Tenta fazer o login no Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) throw error;

        // Sucesso no login. Agora verificamos o tipo de usuário na sua tabela 'usuario' / 'profissional'
        const userId = data.user.id;

        // Busca na tabela profissional para saber se ele é prestador de serviço
        const { data: profData } = await supabase
            .from('profissional')
            .select('id_profissional')
            .eq('id_usuario', userId)
            .single();

        // Roteamento inteligente baseado no perfil
        if (profData) {
            // É um profissional, manda pro feed dele
            window.location.href = 'feed-profissional.html';
        } else {
            // É apenas cliente, manda pra home de solicitar serviço
            window.location.href = 'home-cliente.html';
        }

    } catch (error) {
        // Tratamento de erro elegante
        console.error("Erro no login:", error.message);
        alert("Falha no login. Verifique seu e-mail e senha.");
        
        // Restaura o botão
        btnLogin.innerHTML = textOriginalBtn;
        btnLogin.disabled = false;
    }
});