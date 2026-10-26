# Monolito em arquivo único

Esta pasta contém o modelo de página monolítica, em que toda a estrutura html, o estilo css e os scripts javascript ficam reunidos em um único arquivo index.html.

## Arquivos desta pasta

- index.html: arquivo completo com html, estilo dentro da tag style e lógica dentro da tag script.
- Dockerfile: imagem mínima com nginx para publicação em servidores de contêineres.

## Como funciona o formato monolítico

Quando você quiser criar uma nova landing page ou ferramenta web monolítica:

1. Estruture a página no arquivo index.html.
2. Coloque todo o css dentro da tag style no head.
3. Coloque todo o javascript dentro da tag script antes do fechamento do body.
4. Utilize fontes públicas via link ou fontes do sistema.
5. Em caso de consumo de dados externos, use chamadas fetch diretas ou proxies públicos para evitar bloqueios de cors.

## Como publicar no Easypanel

Existem duas formas simples de publicar no Easypanel:

### Método 1: serviço estático (sem dockerfile)

1. No Easypanel, crie um novo serviço do tipo static.
2. Aponte o repositório git ou faça o envio da pasta monolito.
3. Defina a pasta raiz do site como a pasta onde está o arquivo index.html.
4. O servidor do Easypanel servirá a página diretamente.

### Método 2: serviço via dockerfile

1. No Easypanel, crie um novo serviço do tipo app.
2. Aponte a pasta monolito como contexto de build.
3. O Easypanel detectará o Dockerfile com nginx:alpine.
4. Configure a porta interna para 80.
5. Defina o domínio desejado e clique em deploy.
