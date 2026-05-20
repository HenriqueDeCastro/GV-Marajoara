import { writeFileSync, mkdirSync } from 'fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Erro: variáveis SUPABASE_URL e SUPABASE_KEY não definidas.');
  process.exit(1);
}

mkdirSync('src/environments', { recursive: true });

const template = (prod) => `export const environment = {
  production: ${prod},
  supabaseUrl: '${url}',
  supabaseKey: '${key}',
};
`;

writeFileSync('src/environments/environment.prod.ts', template(true));
writeFileSync('src/environments/environment.ts', template(false));

console.log('Arquivos de environment gerados com sucesso.');
