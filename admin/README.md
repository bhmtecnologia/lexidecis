# LexiDecis Admin

## Estrutura de Pastas

```
admin/
  assets/
    css/         # Arquivos de estilos (CSS)
    js/          # Scripts JavaScript (modularizados)
    img/         # Imagens usadas no admin
  index.html     # Página inicial do painel admin
  login.html     # Página de login
  users.html     # Gerenciamento de usuários
  units.html     # Gerenciamento de unidades
  gpts.html      # Gerenciamento de GPTs
  ...
```

## Como rodar o admin localmente

1. Abra o projeto em um servidor local (ex: VSCode Live Server, http-server, XAMPP, etc).
2. Acesse `http://localhost:PORT/admin/login.html` para iniciar.
3. Faça login com um usuário válido do Firebase Auth.

## Como adicionar novas páginas/scripts

- Crie o HTML na raiz de `admin/`.
- Coloque scripts JS em `admin/assets/js/` e importe-os como módulos ES6 (`type="module"`).
- Coloque estilos em `admin/assets/css/`.
- Use o cabeçalho e rodapé padrão (injetados por `layout.js`).

## Autenticação e proteção de rotas

- O acesso ao admin é protegido por autenticação Firebase (verificação em `auth-guard.js`).
- Apenas usuários autenticados podem acessar as páginas do admin.
- O login/logout é sincronizado automaticamente.

## Boas práticas

- Sempre use imports relativos corretos nos módulos JS.
- Prefira `<script type="module">` para scripts modernos.
- Comente funções e blocos importantes nos JS.
- Mantenha a estrutura de pastas organizada.
- Use o arquivo `admin/assets/css/admin.css` para estilos globais.

## Padronização de código

- Recomenda-se o uso de [ESLint](https://eslint.org/) e [Prettier](https://prettier.io/) para manter o código limpo e padronizado.
- Exemplo de configuração pode ser adicionado ao projeto se desejar.

---

Dúvidas ou sugestões? Fale com o responsável pelo projeto ou consulte este README! 