// LÓGICA DE AUTENTICAÇÃO E ROTAS (auth.js)
// OBJETIVO: Gerenciar cadastros, logins e redirecionamentos.
// O QUE FAZER AQUI:
// - Capturar evento de submit do formulário de Login e Cadastro.
// - Usar supabase.auth.signUp() e supabase.auth.signInWithPassword().
// - Buscar tipo_usuario e status_aprovacao na tabela 'usuarios'.
// - Redirecionar: Cliente -> home-cliente.html | Profissional Aprovado -> feed-profissional.html | Pendente -> bloqueio.html


// js/auth.js

// ==========================================
// 1. INICIALIZAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://btjjbtjxcbvswgezpwgc.supabase.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0ampidGp4Y2J2c3dnZXpwd2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODYyMjIsImV4cCI6MjEwNDk2MjIyMn0.fgGA99SxR7pYcsg2Ezr6EKyi4PzelHaKP5Z-tcaWgn4';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Aguarda o HTML carregar para buscar os elementos
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 2. INTERAÇÃO DA INTERFACE (MOSTRAR SENHA)
    // ==========================================
    const togglePasswordBtn = document.getElementById('toggle-password');
    const senhaInput = document.getElementById('senha');

    if (togglePasswordBtn && senhaInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
            senhaInput.setAttribute('type', type);
            
            const icon = togglePasswordBtn.querySelector('i');
            icon.classList.toggle('ph-eye');
            icon.classList.toggle('ph-eye-slash');
        });
    }

    // ==========================================
    // 3. LÓGICA DE CADASTRO (cadastro.html)
    // ==========================================
    const formCadastro = document.getElementById('form-cadastro');
    
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const btnCadastro = formCadastro.querySelector('button[type="submit"]');
            const textoOriginal = btnCadastro.innerHTML;
            btnCadastro.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Cadastrando...';
            btnCadastro.disabled = true;

            const nome = document.getElementById('nome').value;
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            // Pega o radio button selecionado (cliente ou profissional)
            const tipoUsuario = document.querySelector('input[name="tipo_usuario"]:checked').value; 

            try {
                // Passo 1: Cria o usuário na Autenticação (Isso vai acionar o Trigger do SQL automaticamente)
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: email,
                    password: senha,
                    options: {
                        data: { nome: nome } // Manda o nome para o Trigger usar
                    }
                });

                if (authError) throw authError;

                // Passo 2: Se for Profissional, cria o perfil dele na tabela 'profissional'
                if (tipoUsuario === 'profissional') {
                    const userId = authData.user.id;
                    
                    const { error: dbError } = await supabase.from('profissional').insert([
                        { id_usuario: userId }
                    ]);

                    if (dbError) throw dbError;
                }

                alert('Conta criada com sucesso! Faça login para continuar.');
                window.location.href = 'index.html'; 

            } catch (erro) {
                console.error("Erro no cadastro:", erro);
                alert('Erro ao criar conta: ' + erro.message);
                btnCadastro.innerHTML = textoOriginal;
                btnCadastro.disabled = false;
            }
        });
    }

    // ==========================================
    // 4. LÓGICA DE LOGIN (index.html)
    // ==========================================
    const formLogin = document.getElementById('login-form'); // ou 'form-login', verifique seu HTML

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btnLogin = formLogin.querySelector('button[type="submit"]');
            const textoOriginal = btnLogin.innerHTML;
            btnLogin.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Entrando...';
            btnLogin.disabled = true;

            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('senha').value.trim();

            try {
                // Passo 1: Valida E-mail e Senha
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: senha
                });

                if (authError) throw new Error('E-mail ou senha incorretos.');

                const userId = authData.user.id;

                // Passo 2: Verifica se o usuário tem registro na tabela 'profissional'
                const { data: profData, error: profError } = await supabase
                    .from('profissional')
                    .select('id_profissional')
                    .eq('id_usuario', userId)
                    .single(); 

                // Roteamento inteligente baseado no perfil
                if (profData) {
                    // Achou registro na tabela profissional = É prestador de serviço
                    window.location.href = 'feed-profissional.html';
                } else {
                    // Não achou registro na tabela profissional = É apenas cliente
                    window.location.href = 'home-cliente.html';
                }

            } catch (erro) {
                console.error("Erro no login:", erro);
                alert(erro.message);
                btnLogin.innerHTML = textoOriginal;
                btnLogin.disabled = false;
            }
        });
    }
});