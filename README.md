# Ritmo

Diário pessoal de alimentação e atividade para duas pessoas. Interface em português, responsiva, sem upload, sem servidor próprio. React + TypeScript + Vite; Supabase Auth e Postgres. Aproximadamente 145 kB de JavaScript comprimido no build inicial.

## O que está pronto

- Contas individuais com e-mail e senha, cadastro direto sem confirmação, recuperação e troca de senha.
- Cadastro aberto para qualquer e-mail. Diários privados por padrão; dupla conectada por convite, com no máximo duas pessoas.
- Registro, edição e exclusão de refeições em qualquer dia passado ou hoje.
- Soma de calorias, gasto habitual, gasto extra do dia e balanço consumo menos gasto.
- Base preservada nos dias já registrados, mesmo após alteração nas preferências.
- Repetição rápida de refeições recentes, histórico de 14 dias e gráfico semanal.
- Calendário próprio na paleta do app, seleção por mês/ano, navegação por teclado e marcação dos dias com refeições.
- Animações discretas em cartões, modais, números e gráficos, respeitando movimento reduzido.
- Visão da dupla: cada um lê os registros do outro e edita somente os próprios.
- Exportação completa dos próprios dados em JSON.
- Modo de demonstração local com exemplos, apenas quando não há variáveis do Supabase.

## Rodar localmente

Requer Node.js 22 ou superior.

```powershell
cd C:\Users\4TECH\4tech\personal\healthcare\ritmo
npm install
npm run dev
```

Sem `.env.local`, o site abre em demonstração. Os registros desse modo são exemplos salvos no localStorage; não há conta nem sincronização. Eles não são enviados automaticamente ao banco quando você conectar o Supabase. Não use a demonstração como arquivo definitivo: limpar os dados do navegador apaga os exemplos e alterações.

## Conectar o Supabase (configuração única)

1. Crie um projeto em https://supabase.com/dashboard.
2. Abra `supabase/schema.sql`. Execute o arquivo inteiro no SQL Editor de um projeto novo **antes de criar as contas**. Ele cria tabelas, índices, trigger de cadastro e políticas RLS. Não execute duas vezes: o script é uma migração inicial.
3. Em Authentication → URL Configuration, configure **Site URL** com a URL publicada e inclua essa URL e `http://localhost:5173` na lista de Redirect URLs. A recuperação de senha usa a origem atual como destino.
4. Mantenha o provedor Email ativo e senha mínima de 8 caracteres. Para cadastro direto, desative Confirm email em Authentication → Sign In / Providers (como neste projeto). Para entrega confiável de confirmação/recuperação, configure SMTP próprio. O serviço padrão tem restrições e limites; consulte a documentação de Auth do Supabase.
5. Em Project Settings → API, copie a URL do projeto e a **publishable key** (ou a chave pública `anon` de projetos legados). **Nunca use secret key ou service_role no frontend.**
6. Copie `.env.example` para `.env.local` e preencha:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

7. Reinicie `npm run dev`. Agora aparece a tela real de login. Cada um cria sua conta com qualquer e-mail, entra diretamente após criar a conta. Para conectar os diários: abra Nossa dupla → Convidar meu amigo e envie o link. Seu amigo aceita o convite depois de entrar. O perfil é criado pelo banco; nenhum usuário pode escolher ou sobrescrever o ID de outra pessoa.

O Supabase já foi conectado neste ambiente e o schema foi instalado no projeto em 26/10/2026. **Não execute o schema novamente neste banco.** O script continua disponível para projetos novos. A senha administrativa do Postgres não faz parte do app, do repositório nem da hospedagem; o frontend usa apenas a chave pública.

O usuário autorizou cadastro aberto, sem allowlist. Cada conta começa em um espaço privado. A função de convite limita a dupla a dois membros; terceiros cadastrados não podem ler seus registros. A aceitação também compartilha o histórico existente entre as duas pessoas, conforme avisado na interface. A participação não pode ser alterada diretamente pelo frontend.

**Configuração ainda necessária no painel do Supabase:** Authentication → URL Configuration → Site URL e Redirect URLs devem incluir a URL publicada. A confirmação de e-mail foi desativada a pedido do usuário; o cadastro já retorna uma sessão. A recuperação de senha continua usando e-mail. Sem essa configuração, o Supabase pode enviar links de recuperação para seu Site URL anterior (por padrão, localhost). A configuração de Auth/SMTP não pode ser alterada usando a chave pública ou a conexão de banco.

## Publicar em hospedagem estática

O projeto funciona no Cloudflare Pages, Netlify ou Vercel, sem backend na hospedagem. A disponibilidade e limites dos planos gratuitos são definidos pelos provedores.

Opção simples: conecte este diretório a um repositório Git e importe no **Cloudflare Pages**:

| Campo | Valor |
| --- | --- |
| Root directory | `ritmo` se o repositório contém a pasta pai; `.` se contém apenas o app |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 22 ou superior |

Adicione as duas variáveis `VITE_SUPABASE_*` no painel de build da hospedagem **antes** de publicar. Elas são incorporadas no build; qualquer alteração exige rebuild. Com ambas ausentes o deploy é uma demonstração. Com configuração inválida o app exibe erro; não salva silenciosamente dados reais no modo local. Depois ajuste as URLs permitidas no Supabase para a URL final.

Outra opção: preencha `.env.local`, execute `npm run build` e envie `dist` como deploy estático manual. `.openai/hosting.json` pertence à prévia do Sites e pode ser ignorado em outros hosts.

## Regras dos cálculos e dados

- Gasto do dia = base habitual + extra. O treino habitual já está na base; use o extra apenas para o que saiu da rotina.
- Balanço = consumo − gasto. O app não define metas nutricionais nem classifica os resultados como vitória/derrota.
- A base do dia é congelada no primeiro registro de refeição ou atividade. Mudar a base nas preferências só afeta dias ainda não registrados. Até dias vazios no passado usam a base atual quando recebem seu primeiro registro.
- Atividade extra é o **total** do dia e substitui o valor anterior. Duas atividades devem ser somadas nesse campo; zero remove o gasto extra.
- Datas seguem o calendário local do dispositivo, sem conversão de dia para UTC.
- Cada carregamento consulta uma janela de 43 dias. O histórico mostra os 14 dias até a data selecionada; escolha outra data para navegar. A exportação pagina todos os próprios registros em lotes de 500, além da janela exibida na interface.
- Sem polling, rastreadores, analytics, fotos ou tabelas de nutrientes. Dados do amigo atualizam ao trocar de data/reabrir a página.
- RLS bloqueia acesso anônimo, edição de dados do amigo, leitura por pessoas fora da dupla, mudança direta de dupla e alteração retroativa da base diária pelo cliente.

## Verificação

```powershell
npm test
npm run build
```

Antes do uso real, com o Supabase conectado: crie as duas contas, teste cadastro direto e recuperação, registre uma refeição e uma atividade, confirme os valores na outra conta e confirme que uma terceira conta consegue se cadastrar, mas não entra em uma dupla cheia nem lê os dados de outra dupla. Teste chamadas diretas ao banco para conferir que a conta A não consegue alterar dados de B.

Documentação: [Supabase Auth](https://supabase.com/docs/guides/auth), [senhas e recuperação](https://supabase.com/docs/guides/auth/passwords), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Cloudflare Pages build](https://developers.cloudflare.com/pages/configuration/build-configuration/).
