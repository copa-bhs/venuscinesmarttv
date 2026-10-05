# Vênus Cine Smart TV

Aplicação estática em HTML, CSS e JavaScript puro, otimizada para navegação por controle remoto.

## Publicar pela Vercel

1. Na Vercel, escolha **Add New → Project** e importe `copa-bhs/venuscinesmarttv` do GitHub.
2. Use **Other** como Framework Preset e `.` como Root Directory.
3. Não configure Build Command, Install Command nem Output Directory. O `index.html` da raiz é servido diretamente.
4. Clique em **Deploy**. Os próximos pushes para `main` gerarão novos deploys automaticamente.

O `vercel.json` mantém o fallback da SPA para `index.html`. A URL Xtream é configurada no próprio aparelho e não deve ser commitada no repositório.