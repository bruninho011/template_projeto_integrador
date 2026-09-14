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