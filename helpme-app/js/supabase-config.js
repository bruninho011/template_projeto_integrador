// CONFIGURAÇÃO DO SUPABASE (supabase-config.js)
// OBJETIVO: Conectar a aplicação web ao seu banco de dados PostgreSQL.
// O QUE FAZER AQUI:
// - Inserir a SUPABASE_URL e SUPABASE_KEY.
// - Inicializar o cliente com: const supabase = supabase.createClient(URL, KEY);
// - Este arquivo deve ser importado em TODAS as páginas HTML antes dos outros scripts.



// 1. Cole a URL do seu projeto Supabase aqui
const SUPABASE_URL = 'https://btjjbtjxcbvswgezpwgc.supabase.co';

// 2. Cole a Chave Pública (anon key) do seu projeto aqui
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0ampidGp4Y2J2c3dnZXpwd2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODYyMjIsImV4cCI6MjEwNDk2MjIyMn0.fgGA99SxR7pYcsg2Ezr6EKyi4PzelHaKP5Z-tcaWgn4';

// 3. Inicializa o banco de dados. 
// A variável 'supabase' ficará disponível para todas as outras telas usarem.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

//Nunca coloquem a chave "service_role" aqui, apenas a "anon public".