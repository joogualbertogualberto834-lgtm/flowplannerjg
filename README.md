# MED-Flow - Guia de Instalação para Mac

Este aplicativo foi desenvolvido para ajudar nos seus estudos médicos com repetição espaçada e gestão de flashcards. Tudo o que você fizer ficará salvo no arquivo `database.sqlite` na pasta do projeto.

## Pré-requisitos

1. **Node.js**: Você precisa ter o Node.js instalado no seu Mac.
   - Baixe em: [nodejs.org](https://nodejs.org/) (recomenda-se a versão LTS).

## Como rodar o App no seu Mac

1. **Baixe o código**: Clique no botão de download do projeto no AI Studio para baixar o arquivo ZIP com todos os arquivos.
2. **Extraia o arquivo**: Abra o ZIP e coloque a pasta em um local de sua preferência (ex: Documentos).
3. **Abra o Terminal**:
   - Pressione `Command + Espaço` e digite "Terminal".
4. **Navegue até a pasta**:
   - No terminal, digite `cd ` (com um espaço no final) e arraste a pasta do projeto para dentro da janela do terminal. Pressione `Enter`.
5. **Instale as dependências**:
   - Digite o comando abaixo e aguarde:
     ```bash
     npm install
     ```
6. **Inicie o aplicativo**:
   - Digite o comando:
     ```bash
     npm run dev
     ```
7. **Acesse no navegador**:
   - O terminal mostrará um link (geralmente `http://localhost:3000`). Abra este link no seu navegador (Safari ou Chrome).

## Como garantir que os dados fiquem salvos

- O aplicativo utiliza um banco de dados local chamado `database.sqlite`.
- **Não delete este arquivo**, pois é nele que estão salvos todos os seus temas, revisões e flashcards.
- Para fazer um backup, basta copiar o arquivo `database.sqlite` para outro lugar.

## Dicas de Uso

- **Flashcards**: Use o botão "Estudar Pendentes" para sua meta diária.
- **Revisões**: Acompanhe o cronograma mensal na aba "Revisões".
- **Caderno de Erros**: Salve cards difíceis diretamente no caderno durante o estudo.

---
Desenvolvido com foco em alta performance para estudantes de medicina.
