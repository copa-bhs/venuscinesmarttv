# Vênus Cine Smart TV

Aplicação estática em HTML, CSS e JavaScript puro, otimizada para navegação por controle remoto.

## Publicar pela Vercel

1. Na Vercel, escolha **Add New → Project** e importe `copa-bhs/venuscinesmarttv` do GitHub.
2. Use **Other** como Framework Preset e `.` como Root Directory.
3. Não configure Build Command, Install Command nem Output Directory. O `index.html` da raiz é servido diretamente e a função em `api/` é publicada como `/api/xtream`.
4. Em **Settings → Environment Variables**, cadastre `XTREAM_BASE_URL`, `XTREAM_USERNAME` e `XTREAM_PASSWORD` para Production (e Preview, se necessário). Use os dados Xtream do provedor; o valor base deve ser apenas o host, por exemplo `https://provedor.example:8080`.
5. Faça um novo deploy. Os próximos pushes para `main` gerarão novos deploys automaticamente.

O endpoint serverless `/api/xtream` usa essas variáveis para consultar catálogo, detalhes e streams. Assim, a conexão é configurada uma única vez na Vercel e nenhuma TV precisa inserir a URL. Não coloque usuário ou senha no código, em variáveis `VITE_*`/`NEXT_PUBLIC_*` ou em commits públicos.