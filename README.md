# Vênus Cine Smart TV

Aplicação estática em HTML, CSS e JavaScript puro, otimizada para navegação por controle remoto.

## Publicar pela Vercel

1. Na Vercel, escolha **Add New → Project** e importe `copa-bhs/venuscinesmarttv` do GitHub.
2. Use **Other** como Framework Preset e `.` como Root Directory.
3. Não configure Build Command, Install Command, Output Directory nem variáveis de ambiente. O `index.html` da raiz é servido como frontend estático.
4. Faça o deploy. Os próximos pushes para `main` gerarão novos deploys automaticamente.

O frontend consulta somente `https://cine.venusdev.xyz`: `/home` fornece os destaques, `/filmes` e `/series` as listas em páginas de 30 títulos, `/buscar` as pesquisas paginadas, `/categorias` os filtros e `/info/filme/{id}` e `/info/serie/{id}` os detalhes e episódios. A reprodução usa o campo `url_stream` retornado pela API sem montar URLs de provedor no cliente. Como a página é HTTPS, a API deve retornar URLs de stream HTTPS para evitar bloqueio de conteúdo misto pelo navegador.

Os metadados do catálogo são mantidos em IndexedDB por 15 minutos; o cache não guarda URLs de stream. A splash inicial exibe o V esmeralda até haver cache ou resposta de rede.