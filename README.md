# 🔮 Dúvidas EDU - Quadro de Dúvidas Anônimo (Firebase Edition)

Um PWA (Progressive Web App) premium desenvolvido para facilitar a comunicação entre alunos e professores. Permite que alunos enviem dúvidas de forma totalmente anônima, com **sincronização em tempo real** via Firebase.

## ✨ Características Premium
- **🔥 Firebase Real-time**: Sincronização instantânea entre todos os dispositivos
- **🚪 Sistema de Salas**: Professor cria uma sala e compartilha o código com os alunos
- **🎨 Aesthetic UI**: Design moderno com Glassmorphism e Dark Mode
- **📱 PWA Ready**: Instale como um aplicativo nativo no Android, iOS ou Desktop
- **👤 Anonimato Real**: Nenhuma informação pessoal é coletada ou enviada
- **👨‍🏫 Painel do Professor**: Controle total para responder, editar e excluir dúvidas
- **⚡ Modo Offline**: Funciona sem internet usando Service Workers
- **👍 Votação**: Alunos podem votar em dúvidas relevantes para priorizá-las

## 🛠️ Tech Stack
- **Frontend**: HTML5 Semântico, Vanilla JavaScript (ES6+ Modules)
- **Styling**: CSS3 Customizado com Variáveis, Flexbox/Grid e Glassmorphism
- **Backend**: Firebase Realtime Database
- **Storage**: Firebase + LocalStorage (fallback)
- **PWA**: Manifest.json e Service Worker customizado

## 🚀 Como Usar

### Para o Professor:
1. Acesse o app
2. Clique em **"Criar Nova Sala"**
3. Copie o código gerado (ex: `ABC123`)
4. Compartilhe o código com os alunos
5. Ative o **Modo Professor** para responder às dúvidas

### Para os Alunos:
1. Acesse o app
2. Digite o código da sala fornecido pelo professor
3. Clique em **"Entrar"**
4. Envie suas dúvidas anonimamente!

## 🌐 Como Hospedar no GitHub Pages

1. **Crie um Repositório**: Vá ao seu GitHub e crie um novo repositório
2. **Suba os Arquivos**: Use o Git ou arraste os arquivos da pasta para o repositório
3. **Configure as Pages**:
   - Vá em **Settings** > **Pages**
   - Em **Build and deployment**, selecione o branch `main` e a pasta `/ (root)`
   - Clique em **Save**
4. **Pronto!** Em alguns minutos, seu app estará disponível em `https://seu-usuario.github.io/seu-repositorio/`

## 🔧 Configuração do Firebase

O app já está configurado com Firebase. Se quiser usar seu próprio projeto:

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative o **Realtime Database** em modo de teste
3. Copie as credenciais do Firebase Config
4. Substitua no arquivo `app.js` (linhas 4-11)

### Regras de Segurança Recomendadas:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

## 📦 Estrutura do Projeto

```
quadro_duvidas/
├── index.html          # Estrutura HTML
├── style.css           # Estilos Premium
├── app.js              # Lógica + Firebase
├── sw.js               # Service Worker
├── manifest.json       # PWA Manifest
├── icons/              # Ícones PWA (72px - 512px)
└── README.md           # Este arquivo
```

## 🎯 Funcionalidades

- ✅ Criação de salas com código único
- ✅ Sincronização em tempo real
- ✅ Votação em dúvidas
- ✅ Respostas do professor
- ✅ Filtros (todas, respondidas, não respondidas, mais votadas)
- ✅ Exportação de dúvidas em JSON
- ✅ Modo offline com Service Worker
- ✅ Instalação como PWA

## 📱 Compatibilidade

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ✅ Opera
- ✅ Samsung Internet

---

**Desenvolvido com 💜 por Sérgio Araújo** (Antigravity AI Assist) - 2026

🔗 **Deploy**: https://zonaeducacional.github.io/quadroduvidas/
