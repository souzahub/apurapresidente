# Template monolito para Easypanel

Esta pasta é o modelo padrão para publicação no Easypanel via Docker Compose.

## Estrutura da pasta

- index.html: arquivo único contendo html, css e javascript da página.
- Dockerfile: imagem nginx alpine configurada na porta 3000.
- docker-compose.yml: configuração pronta para o Easypanel.
- nginx.conf: servidor web configurado para servir arquivos estáticos na porta 3000.
- .dockerignore: exclusão de arquivos desnecessários na construção da imagem.

## Como usar para um novo site ou landing page

1. Copie o conteúdo desta pasta para um novo projeto ou repositório.
2. Substitua apenas o arquivo index.html pelo html da sua nova página (com estilo embutido na tag style e scripts na tag script).
3. No Easypanel, aponte para o repositório ou faça o deploy com Docker Compose.
4. O Easypanel subirá o serviço automaticamente na porta 3000 sem precisar de nenhuma alteração de configuração.
