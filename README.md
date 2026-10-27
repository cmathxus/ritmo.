# ritmo.

Diário pessoal de refeições, calorias estimadas e atividades, com grupos de amigos e assistência por IA. Aplicação React/TypeScript publicada no [GitHub Pages](https://cmathxus.github.io/ritmo./), com Supabase para autenticação, banco e funções de IA.

## Desenvolvimento

Requer Node.js 24.

```sh
npm ci
npm run dev
npm test
npm run build
```

Copie `.env.example` para `.env.local` e configure as variáveis públicas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Sem configuração, o app abre uma demonstração local. Nunca coloque chaves privadas no frontend.

## Publicação

Pushes em `main` executam testes e build e publicam somente `dist/` pelo workflow `.github/workflows/pages.yml`. O Vite usa `/ritmo./` no GitHub Actions. Configure o GitHub Pages para publicar via Actions.

No Supabase, configure Site URL e Redirect URLs para `https://cmathxus.github.io/ritmo./`. Aplique `supabase/schema.sql` e as migrações de `supabase/migrations/` na ordem dos nomes para um banco novo. Os arquivos de banco, funções e testes são necessários para manter o projeto, mas não são publicados como arquivos do site.

A função `analyze-meal` usa os secrets `GEMINI_API_KEY` e, opcionalmente, `GEMINI_MODEL`. Configure `ALLOWED_ORIGINS` incluindo `https://cmathxus.github.io`. Ela verifica a sessão antes das consultas; a chave Gemini fica somente no servidor.

```sh
npx supabase login
npx supabase functions deploy analyze-meal --project-ref xgjgzkssjifhkezvzevd --use-api
```

Fotos têm limite de 20 análises por pessoa/dia; o chat tem limite próprio de 50 mensagens por pessoa/dia. O chat mantém contexto na memória da página e assume porções típicas explicitamente quando faltar o peso. Fotos não são armazenadas. As respostas são estimativas e não consultam rótulos atuais.

## PWA e identidade

O app pode ser instalado pelo navegador. No iPhone: Safari → Compartilhar → Adicionar à Tela de Início. O nome de instalação é **ritmo.**. Registros e IA exigem internet; o cache guarda apenas arquivos públicos da interface. Atualizações aguardam confirmação ou o fechamento das janelas antigas.

**`public/favicon.svg` é o ícone oficial e a fonte única de todos os ícones do projeto.** Mantenha essa escolha nos próximos ajustes. `npm run generate:icons` gera os PNGs de instalação e Apple Touch a partir dele; o processo também roda automaticamente antes de cada build. Não substitua esses ícones por outro símbolo. `public/ritmo-logo.png` é a versão completa da marca para os cabeçalhos.
