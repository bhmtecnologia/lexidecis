// script.js
const video = document.getElementById('videoInput');
const canvasOutput = document.getElementById('canvasOutput');
const ctxOutput = canvasOutput.getContext('2d');
const statusElement = document.getElementById('status');

const CASCADE_FILE_NAME = 'haarcascade_frontalface_default.xml';
const CASCADE_FILE_URL = CASCADE_FILE_NAME; // Assumindo que está na mesma pasta

// Variáveis globais para objetos do OpenCV para fácil limpeza
let src = null;
let gray = null;
let faces = null;
let faceCascade = null;

// Esta função é chamada pelo atributo onload no script tag do opencv.js
function onOpenCvReady() {
    statusElement.textContent = 'OpenCV.js carregado. Inicializando runtime...';
    // cv é o objeto global do OpenCV.js
    // Espera o runtime ser inicializado
    cv.onRuntimeInitialized = () => {
        statusElement.textContent = 'Runtime do OpenCV inicializado.';
        main(); // Inicia a lógica principal
    };
}

async function main() {
    try {
        statusElement.textContent = 'Acessando câmera...';
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = stream;

        // Espera o vídeo carregar os metadados para obter as dimensões corretas
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                video.width = video.videoWidth;
                video.height = video.videoHeight;
                canvasOutput.width = video.width;
                canvasOutput.height = video.height;
                resolve();
            };
        });

        statusElement.textContent = `Carregando classificador Haar Cascade: ${CASCADE_FILE_NAME}...`;
        const response = await fetch(CASCADE_FILE_URL);
        if (!response.ok) {
            throw new Error(`Falha ao carregar ${CASCADE_FILE_URL}: ${response.statusText}`);
        }
        const cascadeFileContent = await response.text();

        // Cria um arquivo virtual no sistema de arquivos em memória do OpenCV.js
        cv.FS_createDataFile('/', CASCADE_FILE_NAME, cascadeFileContent, true, false, false);

        // Inicializa os objetos do OpenCV
        src = new cv.Mat(video.height, video.width, cv.CV_8UC4); // RGBA
        gray = new cv.Mat(video.height, video.width, cv.CV_8UC1); // Escala de Cinza
        faces = new cv.RectVector();
        faceCascade = new cv.CascadeClassifier();

        // Carrega o classificador do arquivo virtual
        if (!faceCascade.load(CASCADE_FILE_NAME)) {
            throw new Error(`Erro ao carregar o classificador Haar Cascade: ${CASCADE_FILE_NAME}`);
        }
        statusElement.textContent = 'Classificador carregado. Iniciando detecção...';

        const FPS = 20; // Quadros por segundo para processar (ajuste conforme necessário)
        processVideoFrame(); // Inicia o loop de processamento

    } catch (err) {
        console.error("Erro na inicialização (main):", err);
        statusElement.textContent = `Erro: ${err.message}. Verifique o console.`;
        cleanupCvObjects(); // Limpa objetos do OpenCV em caso de erro
    }
}

function processVideoFrame() {
    if (video.paused || video.ended) {
        cleanupCvObjects();
        statusElement.textContent = 'Detecção parada.';
        return;
    }

    let begin = Date.now();

    try {
        // Desenha o quadro atual do vídeo no canvas (e no Mat 'src')
        ctxOutput.drawImage(video, 0, 0, video.width, video.height);
        src.data.set(ctxOutput.getImageData(0, 0, video.width, video.height).data);

        // Converte para escala de cinza
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // Parâmetros para detectMultiScale:
        // imagem, vetor de objetos, scaleFactor, minNeighbors, flags, minSize, maxSize
        let minSize = new cv.Size(30, 30); // Tamanho mínimo do rosto a ser detectado
        faceCascade.detectMultiScale(gray, faces, 1.1, 5, 0, minSize, new cv.Size());
        minSize.delete();

        // Desenha retângulos ao redor dos rostos detectados
        for (let i = 0; i < faces.size(); ++i) {
            const rect = faces.get(i);
            ctxOutput.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Verde
            ctxOutput.lineWidth = 3;
            ctxOutput.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }

    } catch (err) {
        console.error("Erro no processVideoFrame:", err);
        statusElement.textContent = `Erro no processamento: ${err.message}.`;
        // Não paramos o loop aqui, mas logamos o erro.
        // Para erros graves, pode ser necessário parar e limpar.
    }

    // Agenda o próximo quadro
    let delay = 1000 / FPS - (Date.now() - begin);
    setTimeout(processVideoFrame, Math.max(0, delay));
}

function cleanupCvObjects() {
    if (src && !src.isDeleted()) src.delete();
    if (gray && !gray.isDeleted()) gray.delete();
    if (faces && !faces.isDeleted()) faces.delete();
    if (faceCascade && !faceCascade.isDeleted()) faceCascade.delete();
    src = gray = faces = faceCascade = null; // Limpa as referências
    console.log("Objetos do OpenCV limpos.");
}

// Certifique-se de que onOpenCvReady é global se o HTML espera chamá-la assim.
// O atributo `onload` no `<script>` tag do opencv.js fará isso.