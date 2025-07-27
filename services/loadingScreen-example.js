// loadingScreen-example.js - Exemplos de uso do LoadingScreen melhorado

import LoadingScreen from './loadingScreen.js';

// Exemplo 1: Uso básico com configuração padrão
async function exemploBasico() {
    const loadingScreen = new LoadingScreen();
    
    const etapas = [
        'Verificar Status do Sistema',
        'Autenticação',
        'Carregar Endpoints',
        'Pré-carregar GPTs',
        'Inicializar Chatbot'
    ];
    
    await loadingScreen.show(etapas);
    
    // Simular carregamento das etapas
    for (const etapa of etapas) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadingScreen.loadModel(etapa);
    }
    
    await loadingScreen.hide();
}

// Exemplo 2: Uso com configuração customizada
async function exemploCustomizado() {
    const loadingScreen = new LoadingScreen({
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        appName: 'Meu App',
        logoUrl: 'https://exemplo.com/logo.png',
        animationDuration: 500,
        showTimeEstimate: true,
        enableKeyboardShortcuts: true
    });
    
    const etapas = ['Etapa 1', 'Etapa 2', 'Etapa 3'];
    await loadingScreen.show(etapas);
    
    // Simular etapas com diferentes estados
    await loadingScreen.loadModel('Etapa 1', { loading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await loadingScreen.loadModel('Etapa 1');
    
    await loadingScreen.loadModel('Etapa 2', { loading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await loadingScreen.loadModel('Etapa 2', { error: true }); // Simular erro
    
    await loadingScreen.loadModel('Etapa 3');
    
    await loadingScreen.hide();
}

// Exemplo 3: Uso com event listeners
async function exemploComEventos() {
    const loadingScreen = new LoadingScreen();
    
    // Escutar eventos
    document.addEventListener('loadingScreen:show', (e) => {
        console.log('Loading screen foi exibido:', e.detail);
    });
    
    document.addEventListener('loadingScreen:hide', (e) => {
        console.log('Loading screen foi ocultado');
    });
    
    document.addEventListener('loadingScreen:retry', (e) => {
        console.log('Usuário clicou em tentar novamente:', e.detail);
        // Reiniciar o processo de carregamento
        reiniciarCarregamento();
    });
    
    await loadingScreen.show(['Etapa 1', 'Etapa 2']);
    
    // Simular erro
    await loadingScreen.loadModel('Etapa 1', { error: true });
    
    // Aguardar usuário clicar em "Tentar Novamente"
    // O evento loadingScreen:retry será disparado
}

// Exemplo 4: Uso com tratamento de erros
async function exemploComTratamentoDeErros() {
    const loadingScreen = new LoadingScreen();
    
    const etapas = ['Conectar API', 'Carregar Dados', 'Processar Informações'];
    await loadingScreen.show(etapas);
    
    try {
        // Simular conexão com API
        await loadingScreen.loadModel('Conectar API', { loading: true });
        const apiConnected = await conectarAPI();
        
        if (!apiConnected) {
            await loadingScreen.loadModel('Conectar API', { error: true });
            throw new Error('Falha na conexão com API');
        }
        
        await loadingScreen.loadModel('Conectar API');
        
        // Carregar dados
        await loadingScreen.loadModel('Carregar Dados', { loading: true });
        const dados = await carregarDados();
        await loadingScreen.loadModel('Carregar Dados');
        
        // Processar informações
        await loadingScreen.loadModel('Processar Informações', { loading: true });
        await processarInformacoes(dados);
        await loadingScreen.loadModel('Processar Informações');
        
    } catch (error) {
        console.error('Erro durante carregamento:', error);
        // O loading screen já mostrará o erro na etapa específica
    } finally {
        await loadingScreen.hide();
    }
}

// Exemplo 5: Uso com múltiplas instâncias
async function exemploMultiplasInstancias() {
    // Loading screen principal
    const loadingPrincipal = new LoadingScreen({
        appName: 'Sistema Principal',
        primaryColor: '#28a745'
    });
    
    // Loading screen secundário
    const loadingSecundario = new LoadingScreen({
        appName: 'Módulo Secundário',
        primaryColor: '#007bff',
        maxWidth: '300px'
    });
    
    await loadingPrincipal.show(['Inicializar Sistema', 'Carregar Módulos']);
    await loadingSecundario.show(['Configurar Módulo', 'Testar Funcionalidades']);
    
    // Simular carregamento paralelo
    await Promise.all([
        carregarSistema(loadingPrincipal),
        carregarModulo(loadingSecundario)
    ]);
    
    await loadingSecundario.hide();
    await loadingPrincipal.hide();
}

// Exemplo 6: Uso com métodos utilitários
async function exemploMetodosUtilitarios() {
    const loadingScreen = new LoadingScreen();
    
    const etapas = ['Etapa A', 'Etapa B', 'Etapa C', 'Etapa D'];
    await loadingScreen.show(etapas);
    
    // Verificar progresso
    console.log('Progresso:', loadingScreen.getProgress()); // 0.0
    
    await loadingScreen.loadModel('Etapa A');
    console.log('Progresso:', loadingScreen.getProgress()); // 0.25
    
    // Verificar etapas restantes
    console.log('Etapas restantes:', loadingScreen.getRemainingSteps());
    
    // Verificar se está completo
    console.log('Está completo:', loadingScreen.isComplete()); // false
    
    // Verificar se há erros
    console.log('Tem erros:', loadingScreen.hasErrors()); // false
    
    await loadingScreen.loadModel('Etapa B');
    await loadingScreen.loadModel('Etapa C');
    await loadingScreen.loadModel('Etapa D');
    
    console.log('Está completo:', loadingScreen.isComplete()); // true
    
    await loadingScreen.hide();
}

// Exemplo 7: Uso com modo escuro automático
async function exemploModoEscuro() {
    const loadingScreen = new LoadingScreen({
        // O CSS já inclui suporte automático para modo escuro
        // via @media (prefers-color-scheme: dark)
    });
    
    await loadingScreen.show(['Carregando em modo escuro']);
    await loadingScreen.loadModel('Carregando em modo escuro');
    await loadingScreen.hide();
}

// Exemplo 8: Uso com acessibilidade
async function exemploAcessibilidade() {
    const loadingScreen = new LoadingScreen({
        // Já inclui atributos ARIA e suporte a leitores de tela
    });
    
    // O loading screen já tem:
    // - role="dialog"
    // - aria-labelledby
    // - aria-describedby
    // - aria-modal="true"
    // - role="progressbar" na barra de progresso
    // - Foco automático para navegação por teclado
    
    await loadingScreen.show(['Etapa Acessível']);
    await loadingScreen.loadModel('Etapa Acessível');
    await loadingScreen.hide();
}

// Funções auxiliares para os exemplos
async function conectarAPI() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return Math.random() > 0.3; // 70% de chance de sucesso
}

async function carregarDados() {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return ['dado1', 'dado2', 'dado3'];
}

async function processarInformacoes(dados) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return dados.map(d => d.toUpperCase());
}

async function carregarSistema(loadingScreen) {
    await loadingScreen.loadModel('Inicializar Sistema');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await loadingScreen.loadModel('Carregar Módulos');
}

async function carregarModulo(loadingScreen) {
    await loadingScreen.loadModel('Configurar Módulo');
    await new Promise(resolve => setTimeout(resolve, 800));
    await loadingScreen.loadModel('Testar Funcionalidades');
}

async function reiniciarCarregamento() {
    console.log('Reiniciando processo de carregamento...');
}

// Exportar exemplos para uso
export {
    exemploBasico,
    exemploCustomizado,
    exemploComEventos,
    exemploComTratamentoDeErros,
    exemploMultiplasInstancias,
    exemploMetodosUtilitarios,
    exemploModoEscuro,
    exemploAcessibilidade
}; 