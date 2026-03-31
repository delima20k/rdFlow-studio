import { ScreenCaptureService } from "./services/screen-capture-service.js?v=20260331p";
import { WebcamCaptureService } from "./services/webcam-capture-service.js";
import { PhoneCameraService } from "./services/phone-camera-service.js";
import { RecordingService } from "./services/recording-service.js";
import { streamApiService } from "./services/stream-api-service.js";
import { VideoConverterService, videoConverterService } from "./services/video-converter-service.js?v=20260331p";
import {
  EditorEngine,
  RenderCanvasEngine,
  ExportManager,
  VideoLayer,
  WebcamLayer,
  CameraFrameStyle,
  CameraShapeRenderer,
  CameraOverlayLayer,
  WebcamTopLayer,
  OverlayLayer,
  BackgroundBarLayer,
  EXPORT_CONFIG,
  EXPORT_EXT
} from "./video-editor-engine.js?v=20260331p";

const API_BASE_URL = window.location.origin;

const screenService = new ScreenCaptureService();
const webcamService = new WebcamCaptureService();
const phoneService = new PhoneCameraService(API_BASE_URL);
const recordingService = new RecordingService();

const elements = {
  screenPreview: document.getElementById("screen-preview"),
  webcamPreview: document.getElementById("webcam-preview"),
  phonePreview: document.getElementById("phone-preview"),
  mainPreview: document.getElementById("main-preview"),
  webcamSelect: document.getElementById("webcam-select"),
  resolutionSelect: document.getElementById("resolution-select"),
  startRecording: document.getElementById("start-recording"),
  stopRecording: document.getElementById("stop-recording"),
  downloadRecording: document.getElementById("download-recording"),
  recordingIndicator: document.getElementById("recording-indicator"),
  recordingTime: document.getElementById("recording-time"),
  stopAll: document.getElementById("stop-all"),
  qrModal: document.getElementById("qr-modal"),
  qrCanvas: document.getElementById("qr-canvas"),
  closeQr: document.getElementById("close-qr"),
  connectionUrl: document.getElementById("connection-url"),
  copyUrlBtn: document.getElementById("copy-url-btn"),
  qrStatus: document.getElementById("qr-status"),
  footerStatus: document.getElementById("footer-status"),
  toggleControls: document.getElementById("toggle-controls"),
  drawerScrim: document.getElementById("drawer-scrim"),
  // Network info modal
  networkInfoModal: document.getElementById("network-info-modal"),
  showNetworkInfo: document.getElementById("show-network-info"),
  closeNetworkInfo: document.getElementById("close-network-info"),
  networkUrl: document.getElementById("network-url"),
  copyNetworkUrl: document.getElementById("copy-network-url"),
  // Device modals
  webcamModal: document.getElementById("webcam-modal"),
  microphoneModal: document.getElementById("microphone-modal"),
  audioOutputModal: document.getElementById("audio-output-modal"),
  webcamList: document.getElementById("webcam-list"),
  microphoneList: document.getElementById("microphone-list"),
  audioOutputList: document.getElementById("audio-output-list"),
  closeWebcamModal: document.getElementById("close-webcam-modal"),
  closeMicrophoneModal: document.getElementById("close-microphone-modal"),
  closeAudioOutputModal: document.getElementById("close-audio-output-modal"),
  reloadWebcam: document.getElementById("reload-webcam"),
  reloadMicrophone: document.getElementById("reload-microphone"),
  reloadAudioOutput: document.getElementById("reload-audio-output"),
  applyWebcam: document.getElementById("apply-webcam"),
  applyMicrophone: document.getElementById("apply-microphone"),
  applyAudioOutput: document.getElementById("apply-audio-output"),
  // Audio meters
  inputMeter: document.getElementById("input-meter"),
  inputPeak: document.getElementById("input-peak"),
  inputDb: document.getElementById("input-db"),
  inputVolume: document.getElementById("input-volume"),
  inputMute: document.getElementById("input-mute"),
  inputPercentage: document.getElementById("input-percentage"),
  outputMeter: document.getElementById("output-meter"),
  outputPeak: document.getElementById("output-peak"),
  outputDb: document.getElementById("output-db"),
  outputVolume: document.getElementById("output-volume"),
  outputMute: document.getElementById("output-mute"),
  outputPercentage: document.getElementById("output-percentage"),
  // Webcam overlay
  webcamOverlay: document.getElementById("webcam-overlay"),
  overlayVideo: document.getElementById("overlay-video"),
  overlayConfigBtn: document.getElementById("overlay-config-btn"),
  overlayClose: document.getElementById("overlay-close"),
  // resize-handle: removido — OverlayResizeController usa [data-resize-dir] nos 4 cantos
  // Screen format modal
  screenFormatModal: document.getElementById("screen-format-modal"),
  applyScreenFormat: document.getElementById("apply-screen-format"),
  closeScreenFormat: document.getElementById("close-screen-format"),
  formatIndicator: document.getElementById("format-indicator"),
  mainPreview: document.getElementById("main-preview")
};

let currentStream = null;
let recordingBlob = null;
let webcamRecordingBlob = null; // Gravação separada da webcam
let webcamRecorder = null; // MediaRecorder da webcam
let webcamRecordingChunks = []; // Chunks da gravação da webcam
let compositionCanvas = null;
let compositionContext = null;
let compositionAnimationFrame = null;
let compositionFrameCallbackId = null;
let compositionScreenVideo = null;
let compositionWebcamVideo = null;
let recordingTimer = null;
let isStoppingRecording = false;
let activeSources = new Set();
let controlsOpen = true;
let selectedWebcamId = null;
let selectedMicrophoneId = null;
let selectedAudioOutputId = null;
let availableDevices = { webcams: [], microphones: [], audioOutputs: [] };
let webcamsDetected = false; // Flag para controlar se já detectou webcams
let audioContext = null;
let audioAnalyser = null;
let audioDataArray = null;
let inputGain = null;
let outputGain = null;
let inputMuted = false;
let outputMuted = false;
let peakInputLevel = 0;
let peakOutputLevel = 0;
let customDeviceNames = {
  webcams: {},
  microphones: {},
  audioOutputs: {}
};
let micMonitoring = {
  active: false,
  streams: new Map(),
  analysers: new Map(),
  dataArrays: new Map(),
  rafId: null,
  tempContext: null
};

// Estado do overlay webcam (drag/resize encapsulados em OverlayMoveController / OverlayResizeController)
let overlayState = {
  enabled: false
};

// Formato de captura de tela
let screenCaptureFormat = 'youtube'; // 'youtube' (horizontal) ou 'tiktok' (vertical)

/**
 * SISTEMA DE DETECÇÃO INTELIGENTE DE DISPOSITIVOS
 * 
 * Detecta automaticamente:
 * 
 * MICROFONES:
 * - Fabricante (Logitech, Blue, Rode, HyperX, etc)
 * - Chipset (Realtek HD Audio, Conexant, VIA, etc)
 * - Localização física (Placa-Mãe Traseiro, Gabinete Frontal, USB)
 * - Porta USB (quando disponível)
 * - Recursos (Array, Estéreo, Cancelamento de Ruído, Beamforming)
 * 
 * WEBCAMS:
 * - Fabricante (Logitech, Microsoft, Razer, etc)
 * - Resolução (4K UHD, Full HD 1080p, HD 720p, SD 480p)
 * - Tipo (Integrada, USB, IP/Rede)
 * - Porta USB (quando disponível)
 * - Recursos (Ultra Wide, AutoFocus, IR, Reconhecimento Facial)
 * 
 * Exemplo de saída:
 * 
 * 🎤 Mic Placa-Mãe
 *    📝 Original: Realtek Audio
 *    📍 Placa-Mãe (Onboard) • Painel Traseiro
 *    📍 Chipset: Realtek HD Audio
 *    📍 Recursos: Array de Microfones, Cancelamento de Eco
 *    ID: 1a2b3c4d5e6f...
 * 
 * 📹 Webcam Logitech C920
 *    📍 Webcam USB • USB
 *    📍 Fabricante: 🔵 Logitech
 *    📍 Porta: USB Port 3
 *    📍 Resolução: Full HD (1080p)
 *    📍 Recursos: AutoFocus, Microfone Estéreo
 *    ID: 9f8e7d6c5b4a...
 */

// Carregar nomes personalizados do localStorage
function loadCustomNames() {
  try {
    const saved = localStorage.getItem('customDeviceNames');
    if (saved) {
      customDeviceNames = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Erro ao carregar nomes personalizados:', error);
  }
}

// Salvar nomes personalizados no localStorage
function saveCustomNames() {
  try {
    localStorage.setItem('customDeviceNames', JSON.stringify(customDeviceNames));
  } catch (error) {
    console.error('Erro ao salvar nomes personalizados:', error);
  }
}

// Obter informações detalhadas sobre o dispositivo
async function getDeviceInfo(device) {
  const info = {
    type: 'Desconhecido',
    connection: 'Não identificado',
    manufacturer: null,
    port: null,
    features: [],
    chipset: null,
    resolution: null,
    id: device.deviceId.substring(0, 12) + '...'
  };
  
  const label = device.label.toLowerCase();
  
  // ===== DETECÇÃO DE FABRICANTES =====
  const manufacturers = {
    'logitech': '🔵 Logitech',
    'microsoft': '🟢 Microsoft',
    'razer': '🟢 Razer',
    'creative': '🔴 Creative',
    'blue': '🎙️ Blue Microphones',
    'hyperx': '⚡ HyperX',
    'corsair': '⚫ Corsair',
    'steelseries': '⚪ SteelSeries',
    'trust': '🔷 Trust',
    'genius': '💡 Genius',
    'a4tech': '🔶 A4Tech',
    'audio-technica': '🎧 Audio-Technica',
    'rode': '🎤 Røde',
    'shure': '🎵 Shure',
    'behringer': '🎛️ Behringer',
    'sony': '📷 Sony',
    'canon': '📸 Canon',
    'hp': '🖥️ HP',
    'dell': '💻 Dell',
    'lenovo': '🎯 Lenovo',
    'asus': '⚙️ ASUS',
    'acer': '🌐 Acer'
  };
  
  for (const [key, value] of Object.entries(manufacturers)) {
    if (label.includes(key)) {
      info.manufacturer = value;
      break;
    }
  }
  
  // ===== DETECÇÃO DE CHIPSETS DE ÁUDIO =====
  const chipsets = {
    'realtek': 'Realtek HD Audio',
    'conexant': 'Conexant Audio',
    'via': 'VIA HD Audio',
    'idt': 'IDT High Definition Audio',
    'creative': 'Creative Sound Blaster',
    'c-media': 'C-Media',
    'ess': 'ESS Technology'
  };
  
  for (const [key, value] of Object.entries(chipsets)) {
    if (label.includes(key)) {
      info.chipset = value;
      break;
    }
  }
  
  // ===== DETECÇÃO DE PORTA USB =====
  // Tenta extrair informações de porta do deviceId ou label
  const usbPortMatch = label.match(/usb[:\s-]?(\d+[-.]?\d*)/i);
  if (usbPortMatch) {
    info.port = `USB Port ${usbPortMatch[1]}`;
  } else if (label.match(/\((\d+[-:]\d+[-:]\d+)\)/)) {
    const portInfo = label.match(/\((\d+[-:]\d+[-:]\d+)\)/)[1];
    info.port = `USB ${portInfo}`;
  }
  
  // ===== DETECÇÃO DE TIPO DE CONEXÃO =====
  if (label.includes('usb') || label.includes('webcam')) {
    info.connection = 'USB';
  } else if (label.includes('built-in') || label.includes('integrad') || label.includes('internal')) {
    info.connection = 'Integrado';
  } else if (label.includes('front') || label.includes('frontal')) {
    info.connection = 'Painel Frontal';
  } else if (label.includes('rear') || label.includes('traseira') || label.includes('back')) {
    info.connection = 'Painel Traseiro';
  } else if (label.includes('headset') || label.includes('fone')) {
    info.connection = 'Fone de Ouvido';
  } else if (label.includes('line in') || label.includes('line-in')) {
    info.connection = 'Entrada de Linha';
  } else if (label.includes('bluetooth') || label.includes('bt')) {
    info.connection = 'Bluetooth';
  } else if (label.includes('wireless') || label.includes('sem fio')) {
    info.connection = 'Sem Fio';
  }
  
  // ===== DETECÇÃO ESPECÍFICA PARA MICROFONES =====
  if (device.kind === 'audioinput') {
    // Tipo de dispositivo
    if (info.chipset) {
      info.type = 'Placa-Mãe (Onboard)';
    } else if (label.includes('front') || info.connection === 'Painel Frontal') {
      info.type = 'Gabinete (Frontal)';
    } else if (label.includes('rear') || info.connection === 'Painel Traseiro') {
      info.type = 'Placa-Mãe (Traseiro)';
    } else if (label.includes('usb') || info.connection === 'USB') {
      info.type = 'Dispositivo USB';
    } else if (label.includes('headset') || label.includes('headphone')) {
      info.type = 'Headset/Fone de Ouvido';
    } else if (label.includes('wireless') || label.includes('bluetooth')) {
      info.type = 'Microfone Sem Fio';
    } else {
      info.type = 'Entrada de Áudio';
    }
    
    // Características especiais
    if (label.includes('array')) {
      info.features.push('Array de Microfones');
    }
    if (label.includes('stereo')) {
      info.features.push('Estéreo');
    }
    if (label.includes('mono')) {
      info.features.push('Mono');
    }
    if (label.includes('noise cancelling') || label.includes('noise-cancelling')) {
      info.features.push('Cancelamento de Ruído');
    }
    if (label.includes('echo cancelling') || label.includes('echo-cancelling')) {
      info.features.push('Cancelamento de Eco');
    }
    if (label.includes('beamforming')) {
      info.features.push('Beamforming');
    }
  }
  
  // ===== DETECÇÃO ESPECÍFICA PARA WEBCAMS =====
  if (device.kind === 'videoinput') {
    // Tipo de dispositivo
    if (label.includes('integrated') || label.includes('built-in') || label.includes('internal')) {
      info.type = 'Câmera Integrada';
    } else if (label.includes('usb') || info.connection === 'USB') {
      info.type = 'Webcam USB';
    } else if (label.includes('ip camera') || label.includes('network')) {
      info.type = 'Câmera IP/Rede';
    } else {
      info.type = 'Câmera de Vídeo';
    }
    
    // Detecção de resolução
    if (label.includes('4k') || label.includes('uhd') || label.includes('2160p')) {
      info.resolution = '4K UHD (2160p)';
    } else if (label.includes('1080p') || label.includes('fhd') || label.includes('full hd')) {
      info.resolution = 'Full HD (1080p)';
    } else if (label.includes('720p') || label.includes('hd')) {
      info.resolution = 'HD (720p)';
    } else if (label.includes('480p') || label.includes('sd')) {
      info.resolution = 'SD (480p)';
    }
    
    // Características especiais
    if (label.includes('wide') || label.includes('ultrawide')) {
      info.features.push('Ultra Wide');
    }
    if (label.includes('autofocus') || label.includes('auto focus')) {
      info.features.push('AutoFocus');
    }
    if (label.includes('ir') || label.includes('infrared')) {
      info.features.push('Infravermelho');
    }
    if (label.includes('face detection') || label.includes('windows hello')) {
      info.features.push('Reconhecimento Facial');
    }
    if (label.includes('stereo') && device.kind === 'videoinput') {
      info.features.push('Microfone Estéreo');
    }
  }
  
  // ===== DETECÇÃO ESPECÍFICA PARA SAÍDA DE ÁUDIO =====
  if (device.kind === 'audiooutput') {
    // Tipo de dispositivo
    if (label.includes('headphones') || label.includes('headset') || label.includes('fone')) {
      info.type = 'Fones de Ouvido';
    } else if (label.includes('speakers') || label.includes('alto-falante') || label.includes('caixa')) {
      info.type = 'Caixas de Som';
    } else if (label.includes('built-in') || label.includes('internal') || label.includes('integrad')) {
      info.type = 'Alto-Falantes Integrados';
    } else if (label.includes('hdmi') || label.includes('displayport')) {
      info.type = 'Monitor/TV (HDMI)';
    } else if (label.includes('bluetooth') || label.includes('bt')) {
      info.type = 'Dispositivo Bluetooth';
    } else {
      info.type = 'Saída de Áudio';
    }
    
    // Características especiais
    if (label.includes('surround') || label.includes('5.1') || label.includes('7.1')) {
      info.features.push('Surround Sound');
    }
    if (label.includes('wireless') || label.includes('bluetooth')) {
      info.features.push('Sem Fio');
    }
  }
  
  // Tentar obter capacidades técnicas adicionais
  try {
    if (device.kind === 'videoinput' && !info.resolution) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: device.deviceId } }
      });
      
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      
      if (settings.width && settings.height) {
        const width = settings.width;
        const height = settings.height;
        
        if (width >= 3840 || height >= 2160) {
          info.resolution = '4K UHD';
        } else if (width >= 1920 || height >= 1080) {
          info.resolution = 'Full HD';
        } else if (width >= 1280 || height >= 720) {
          info.resolution = 'HD';
        } else {
          info.resolution = `${width}x${height}`;
        }
      }
      
      // Parar stream imediatamente
      stream.getTracks().forEach(track => track.stop());
    }
  } catch (error) {
    // Silenciosamente ignora se não conseguir obter capacidades
  }
  
  return info;
}

// Formatar informações do dispositivo para exibição
function formatDeviceInfo(info) {
  const parts = [];
  
  // Tipo e conexão
  parts.push(`${info.type} • ${info.connection}`);
  
  // Fabricante
  if (info.manufacturer) {
    parts.push(`Fabricante: ${info.manufacturer}`);
  }
  
  // Chipset
  if (info.chipset) {
    parts.push(`Chipset: ${info.chipset}`);
  }
  
  // Porta USB
  if (info.port) {
    parts.push(`Porta: ${info.port}`);
  }
  
  // Resolução
  if (info.resolution) {
    parts.push(`Resolução: ${info.resolution}`);
  }
  
  // Características
  if (info.features.length > 0) {
    parts.push(`Recursos: ${info.features.join(', ')}`);
  }
  
  return parts;
}

// Obter nome do dispositivo (personalizado ou padrão)
function getDeviceName(device, index, type) {
  const deviceId = device.deviceId;
  const customName = customDeviceNames[type][deviceId];
  
  if (customName) {
    return {
      custom: customName,
      original: device.label || `${type === 'webcams' ? 'Webcam' : 'Microfone'} ${index + 1}`
    };
  }
  
  return {
    custom: null,
    original: device.label || `${type === 'webcams' ? 'Webcam' : 'Microfone'} ${index + 1}`
  };
}

// Editar nome do dispositivo
function editDeviceName(deviceId, type, currentName) {
  return new Promise((resolve) => {
    const modal = type === 'webcams' ? elements.webcamModal : elements.microphoneModal;
    const option = modal.querySelector(`[data-device-id="${deviceId}"]`);
    
    if (!option) return resolve(null);
    
    const infoDiv = option.querySelector('.device-info');
    const originalHTML = infoDiv.innerHTML;
    const hasCustomName = customDeviceNames[type][deviceId];
    
    infoDiv.innerHTML = `
      <input type="text" class="device-name-input" value="${currentName}" placeholder="Nome personalizado" />
      <div class="device-name-actions">
        <button class="btn-success btn-save-name">Salvar</button>
        ${hasCustomName ? '<button class="btn-danger btn-clear-name">Remover Nome</button>' : ''}
        <button class="btn-secondary btn-cancel-name">Cancelar</button>
      </div>
    `;
    
    const input = infoDiv.querySelector('.device-name-input');
    const saveBtn = infoDiv.querySelector('.btn-save-name');
    const clearBtn = infoDiv.querySelector('.btn-clear-name');
    const cancelBtn = infoDiv.querySelector('.btn-cancel-name');
    
    input.focus();
    input.select();
    
    const cleanup = (newName) => {
      infoDiv.innerHTML = originalHTML;
      resolve(newName);
    };
    
    saveBtn.onclick = () => {
      const newName = input.value.trim();
      if (newName) {
        customDeviceNames[type][deviceId] = newName;
        saveCustomNames();
        cleanup(newName);
        // Re-renderizar a lista
        if (type === 'webcams') {
          renderWebcamList();
        } else {
          renderMicrophoneList();
        }
      } else {
        cleanup(null);
      }
    };
    
    if (clearBtn) {
      clearBtn.onclick = () => {
        delete customDeviceNames[type][deviceId];
        saveCustomNames();
        cleanup(null);
        // Re-renderizar a lista
        if (type === 'webcams') {
          renderWebcamList();
        } else {
          renderMicrophoneList();
        }
      };
    }
    
    cancelBtn.onclick = () => cleanup(null);
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        saveBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    };
  });
}

function updateControlsButton() {
  if (!elements.toggleControls) {
    return;
  }

  elements.toggleControls.textContent = controlsOpen ? "✕ Fechar" : "☰ Configurações";
}

// Funções de gerenciamento de dispositivos
async function loadDevices() {
  try {
    // Solicitar permissões temporárias para obter labels reais dos dispositivos
    let tempStream = null;
    try {
      tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (permError) {
      console.warn("Permissões negadas, labels podem estar limitados:", permError);
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // Fechar stream temporário
    if (tempStream) {
      tempStream.getTracks().forEach(track => track.stop());
    }
    
    availableDevices.webcams = devices.filter(d => d.kind === 'videoinput');
    availableDevices.microphones = devices.filter(d => d.kind === 'audioinput');
    availableDevices.audioOutputs = devices.filter(d => d.kind === 'audiooutput');
    
    console.log('Dispositivos detectados:', {
      webcams: availableDevices.webcams.length,
      microphones: availableDevices.microphones.length,
      audioOutputs: availableDevices.audioOutputs.length
    });
    
    return availableDevices;
  } catch (error) {
    console.error('Erro ao carregar dispositivos:', error);
    return { webcams: [], microphones: [], audioOutputs: [] };
  }
}

function renderWebcamList() {
  if (availableDevices.webcams.length === 0) {
    elements.webcamList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Nenhuma webcam detectada</p>';
    return;
  }

  elements.webcamList.innerHTML = '<p class="device-analyzing" style="color: var(--text-muted); text-align: center; font-size: 12px; margin-bottom: 12px;">🔍 Analisando dispositivos e detectando especificações...</p>';
  
  // Processar dispositivos de forma assíncrona
  Promise.all(availableDevices.webcams.map(async (device, index) => {
    const deviceInfo = await getDeviceInfo(device);
    const names = getDeviceName(device, index, 'webcams');
    const displayName = names.custom || names.original;
    const infoParts = formatDeviceInfo(deviceInfo);
    
    return { device, deviceInfo, names, displayName, infoParts, index };
  })).then(results => {
    elements.webcamList.innerHTML = '';
    
    results.forEach(({ device, deviceInfo, names, displayName, infoParts }) => {
      const option = document.createElement('div');
      option.className = 'device-option';
      option.dataset.deviceId = device.deviceId;
      
      if (device.deviceId === selectedWebcamId) {
        option.classList.add('selected');
      }
      
      let detailsHTML = '';
      if (names.custom) {
        detailsHTML += `<div class="device-details">📝 Original: ${names.original}</div>`;
      }
      
      infoParts.forEach(part => {
        detailsHTML += `<div class="device-details">📍 ${part}</div>`;
      });
      
      option.innerHTML = `
        <div class="device-radio"></div>
        <div class="device-info">
          <div class="device-title">
            <span class="${names.custom ? 'device-custom-name' : ''}">${displayName}</span>
            <span class="edit-name-icon" title="Renomear dispositivo">✏️</span>
          </div>
          ${detailsHTML}
          <div class="device-tech">ID: ${deviceInfo.id}</div>
        </div>
      `;
      
      // Click no dispositivo para seleção
      option.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-name-icon')) {
          document.querySelectorAll('#webcam-list .device-option').forEach(el => el.classList.remove('selected'));
          option.classList.add('selected');
          selectedWebcamId = device.deviceId;
        }
      });
      
      // Click no ícone de edição
      const editIcon = option.querySelector('.edit-name-icon');
      editIcon.addEventListener('click', async (e) => {
        e.stopPropagation();
        await editDeviceName(device.deviceId, 'webcams', displayName);
      });
      
      elements.webcamList.appendChild(option);
    });
  });
}

function renderMicrophoneList() {
  if (availableDevices.microphones.length === 0) {
    elements.microphoneList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Nenhum microfone detectado</p>';
    return;
  }

  elements.microphoneList.innerHTML = '<p class="device-analyzing" style="color: var(--text-muted); text-align: center; font-size: 12px; margin-bottom: 12px;">🔍 Analisando dispositivos e detectando especificações...</p>';
  
  // Processar dispositivos de forma assíncrona
  Promise.all(availableDevices.microphones.map(async (device, index) => {
    const deviceInfo = await getDeviceInfo(device);
    const names = getDeviceName(device, index, 'microphones');
    const displayName = names.custom || names.original;
    const infoParts = formatDeviceInfo(deviceInfo);
    
    return { device, deviceInfo, names, displayName, infoParts, index };
  })).then(results => {
    elements.microphoneList.innerHTML = '';
    
    results.forEach(({ device, deviceInfo, names, displayName, infoParts }) => {
      const option = document.createElement('div');
      option.className = 'device-option';
      option.dataset.deviceId = device.deviceId;
      
      if (device.deviceId === selectedMicrophoneId) {
        option.classList.add('selected');
      }
      
      let detailsHTML = '';
      if (names.custom) {
        detailsHTML += `<div class="device-details">📝 Original: ${names.original}</div>`;
      }
      
      infoParts.forEach(part => {
        detailsHTML += `<div class="device-details">📍 ${part}</div>`;
      });
      
      option.innerHTML = `
        <div class="device-radio"></div>
        <div class="device-info">
          <div class="device-title">
            <span class="${names.custom ? 'device-custom-name' : ''}">${displayName}</span>
            <span class="edit-name-icon" title="Renomear dispositivo">✏️</span>
          </div>
          ${detailsHTML}
          <div class="device-tech">ID: ${deviceInfo.id}</div>
          <div class="mini-audio-meter">
            <div class="mini-meter-label">
              <span>🎤</span>
              <span>Níveis de áudio ao vivo</span>
            </div>
            <div class="mini-meter-dots" data-device-id="${device.deviceId}">
              ${Array(10).fill(0).map((_, i) => `<div class="mini-meter-dot" data-dot-index="${i}"></div>`).join('')}
            </div>
          </div>
        </div>
      `;
      
      // Click no dispositivo para seleção
      option.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-name-icon')) {
          document.querySelectorAll('#microphone-list .device-option').forEach(el => el.classList.remove('selected'));
          option.classList.add('selected');
          selectedMicrophoneId = device.deviceId;
        }
      });
      
      // Click no ícone de edição
      const editIcon = option.querySelector('.edit-name-icon');
      editIcon.addEventListener('click', async (e) => {
        e.stopPropagation();
        await editDeviceName(device.deviceId, 'microphones', displayName);
      });
      
      elements.microphoneList.appendChild(option);
    });
    
    // Iniciar monitoramento de áudio após renderizar lista
    setTimeout(() => startMicrophoneMonitoring(), 300);
  });
}

// ===== SISTEMA DE MONITORAMENTO TEMPORÁRIO DE MICROFONES =====

async function startMicrophoneMonitoring() {
  if (micMonitoring.active) return;
  
  try {
    micMonitoring.active = true;
    micMonitoring.tempContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Para cada microfone disponível
    for (const device of availableDevices.microphones) {
      try {
        // Obter stream do dispositivo específico
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: device.deviceId } },
          video: false
        });
        
        // Criar analisador para este dispositivo
        const analyser = micMonitoring.tempContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Conectar stream ao analisador
        const source = micMonitoring.tempContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // Armazenar referencias
        micMonitoring.streams.set(device.deviceId, stream);
        micMonitoring.analysers.set(device.deviceId, analyser);
        micMonitoring.dataArrays.set(device.deviceId, dataArray);
      } catch (err) {
        console.warn(`Não foi possível monitorar microfone ${device.label}:`, err);
      }
    }
    
    // Iniciar loop de animação
    animateMicrophoneMeters();
  } catch (error) {
    console.error('Erro ao iniciar monitoramento de microfones:', error);
    micMonitoring.active = false;
  }
}

function animateMicrophoneMeters() {
  if (!micMonitoring.active) return;
  
  micMonitoring.rafId = requestAnimationFrame(animateMicrophoneMeters);
  
  // Para cada microfone sendo monitorado
  micMonitoring.analysers.forEach((analyser, deviceId) => {
    const dataArray = micMonitoring.dataArrays.get(deviceId);
    if (!dataArray) return;
    
    // Obter dados de frequência
    analyser.getByteFrequencyData(dataArray);
    
    // Calcular nível médio (0-255)
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const level = Math.min(100, (average / 255) * 100);
    
    // Atualizar dots visuais
    const dotsContainer = document.querySelector(`.mini-meter-dots[data-device-id="${deviceId}"]`);
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.mini-meter-dot');
      const activeDots = Math.ceil((level / 100) * dots.length);
      
      dots.forEach((dot, index) => {
        // Remover todas as classes ativas
        dot.classList.remove('active-green', 'active-yellow', 'active-red');
        
        // Aplicar classe baseada no índice
        if (index < activeDots) {
          if (index < 6) {
            dot.classList.add('active-green');
          } else if (index < 8) {
            dot.classList.add('active-yellow');
          } else {
            dot.classList.add('active-red');
          }
        }
      });
    }
  });
}

function stopMicrophoneMonitoring() {
  if (!micMonitoring.active) return;
  
  micMonitoring.active = false;
  
  // Cancelar animação
  if (micMonitoring.rafId) {
    cancelAnimationFrame(micMonitoring.rafId);
    micMonitoring.rafId = null;
  }
  
  // Parar todos os streams
  micMonitoring.streams.forEach(stream => {
    stream.getTracks().forEach(track => track.stop());
  });
  
  // Fechar contexto de áudio temporário
  if (micMonitoring.tempContext) {
    micMonitoring.tempContext.close();
    micMonitoring.tempContext = null;
  }
  
  // Limpar mapas
  micMonitoring.streams.clear();
  micMonitoring.analysers.clear();
  micMonitoring.dataArrays.clear();
}

function renderAudioOutputList() {
  if (availableDevices.audioOutputs.length === 0) {
    elements.audioOutputList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Nenhum dispositivo de saída detectado</p>';
    return;
  }

  elements.audioOutputList.innerHTML = '<p class="device-analyzing" style="color: var(--text-muted); text-align: center; font-size: 12px; margin-bottom: 12px;">🔍 Analisando dispositivos de saída...</p>';
  
  // Processar dispositivos de forma assíncrona
  Promise.all(availableDevices.audioOutputs.map(async (device, index) => {
    const deviceInfo = await getDeviceInfo(device);
    const names = getDeviceName(device, index, 'audioOutputs');
    const displayName = names.custom || names.original || `Saída ${index + 1}`;
    const infoParts = formatDeviceInfo(deviceInfo);
    
    return { device, deviceInfo, names, displayName, infoParts, index };
  })).then(results => {
    elements.audioOutputList.innerHTML = '';
    
    results.forEach(({ device, deviceInfo, names, displayName, infoParts }) => {
      const option = document.createElement('div');
      option.className = 'device-option';
      option.dataset.deviceId = device.deviceId;
      
      if (device.deviceId === selectedAudioOutputId) {
        option.classList.add('selected');
      }
      
      let detailsHTML = '';
      if (names.custom) {
        detailsHTML += `<div class="device-details">📝 Original: ${names.original}</div>`;
      }
      
      infoParts.forEach(part => {
        detailsHTML += `<div class="device-details">📍 ${part}</div>`;
      });
      
      option.innerHTML = `
        <div class="device-radio"></div>
        <div class="device-info">
          <div class="device-title">
            <span class="${names.custom ? 'device-custom-name' : ''}">${displayName}</span>
            <span class="edit-name-icon" title="Renomear dispositivo">✏️</span>
          </div>
          ${detailsHTML}
          <div class="device-tech">ID: ${deviceInfo.id}</div>
        </div>
      `;
      
      // Click no dispositivo para seleção
      option.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-name-icon')) {
          document.querySelectorAll('#audio-output-list .device-option').forEach(el => el.classList.remove('selected'));
          option.classList.add('selected');
          selectedAudioOutputId = device.deviceId;
        }
      });
      
      // Click no ícone de edição
      const editIcon = option.querySelector('.edit-name-icon');
      editIcon.addEventListener('click', async (e) => {
        e.stopPropagation();
        await editDeviceName(device.deviceId, 'audioOutputs', displayName);
      });
      
      elements.audioOutputList.appendChild(option);
    });
  });
}

// ===== SISTEMA DE MEDIDORES DE ÁUDIO =====

// Inicializa o contexto de áudio e análise
function initAudioAnalysis(stream) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Criar analisador para entrada
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 256;
    audioAnalyser.smoothingTimeConstant = 0.3;
    
    const bufferLength = audioAnalyser.frequencyBinCount;
    audioDataArray = new Uint8Array(bufferLength);
    
    // Criar ganho de entrada
    inputGain = audioContext.createGain();
    inputGain.gain.value = 1.0;
    
    // Conectar stream ao analisador
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(inputGain);
    inputGain.connect(audioAnalyser);
    
    // Iniciar animação dos medidores
    animateMeters();
  } catch (error) {
    console.error('Erro ao inicializar análise de áudio:', error);
  }
}

// Anima os medidores de volume em tempo real
function animateMeters() {
  if (!audioAnalyser || !audioDataArray) return;
  
  requestAnimationFrame(animateMeters);
  
  // Obter dados do analisador
  audioAnalyser.getByteFrequencyData(audioDataArray);
  
  // Calcular nível médio
  let sum = 0;
  for (let i = 0; i < audioDataArray.length; i++) {
    sum += audioDataArray[i];
  }
  const average = sum / audioDataArray.length;
  
  // Converter para porcentagem (0-100)
  const level = (average / 255) * 100;
  
  // Aplicar ganho de volume
  const inputVolume = parseFloat(elements.inputVolume.value) / 100;
  const adjustedInputLevel = inputMuted ? 0 : level * inputVolume;
  
  // Atualizar medidor de entrada
  updateMeter(elements.inputMeter, adjustedInputLevel);
  updatePeak(elements.inputPeak, adjustedInputLevel, 'input');
  updateDb(elements.inputDb, adjustedInputLevel);
  
  // Simular saída (baseado no preview principal)
  const outputVolume = parseFloat(elements.outputVolume.value) / 100;
  const outputLevel = outputMuted ? 0 : level * outputVolume * 0.8; // Simula saída
  
  updateMeter(elements.outputMeter, outputLevel);
  updatePeak(elements.outputPeak, outputLevel, 'output');
  updateDb(elements.outputDb, outputLevel);
}

// Atualiza a barra de medidor
function updateMeter(meterElement, level) {
  if (!meterElement) return;
  
  meterElement.style.width = `${Math.min(level, 100)}%`;
  
  // Mudar cor baseado no nível (estilo OBS)
  meterElement.classList.remove('warning', 'danger');
  if (level > 85) {
    meterElement.classList.add('danger');
  } else if (level > 70) {
    meterElement.classList.add('warning');
  }
}

// Atualiza o indicador de pico
function updatePeak(peakElement, level, type) {
  if (!peakElement) return;
  
  // Atualizar pico se nível atual for maior
  if (type === 'input') {
    if (level > peakInputLevel) {
      peakInputLevel = level;
    } else {
      // Decay do pico
      peakInputLevel *= 0.95;
    }
    peakElement.style.left = `${Math.min(peakInputLevel, 100)}%`;
  } else {
    if (level > peakOutputLevel) {
      peakOutputLevel = level;
    } else {
      // Decay do pico
      peakOutputLevel *= 0.95;
    }
    peakElement.style.left = `${Math.min(peakOutputLevel, 100)}%`;
  }
}

// Atualiza o valor em dB
function updateDb(dbElement, level) {
  if (!dbElement) return;
  
  if (level < 0.1) {
    dbElement.textContent = '-∞ dB';
  } else {
    // Converter para dB (aproximado)
    const db = 20 * Math.log10(level / 100);
    dbElement.textContent = `${db.toFixed(1)} dB`;
  }
}

// Controles de volume de entrada
elements.inputVolume.addEventListener('input', (e) => {
  const volume = e.target.value;
  elements.inputPercentage.textContent = `${volume}%`;
  
  if (inputGain) {
    inputGain.gain.value = volume / 100;
  }
});

elements.inputMute.addEventListener('click', () => {
  inputMuted = !inputMuted;
  elements.inputMute.textContent = inputMuted ? '🔇' : '🔈';
  elements.inputMute.title = inputMuted ? 'Ativar som' : 'Mudo';
  
  if (inputGain) {
    inputGain.gain.value = inputMuted ? 0 : parseFloat(elements.inputVolume.value) / 100;
  }
});

// Controles de volume de saída
elements.outputVolume.addEventListener('input', (e) => {
  const volume = e.target.value;
  elements.outputPercentage.textContent = `${volume}%`;
  
  if (elements.mainPreview) {
    elements.mainPreview.volume = volume / 100;
  }
  
  // Conectar áudio ao preview principal
  connectAudioToMainPreview();
});

elements.outputMute.addEventListener('click', () => {
  outputMuted = !outputMuted;
  elements.outputMute.textContent = outputMuted ? '🔇' : '🔊';
  elements.outputMute.title = outputMuted ? 'Ativar som' : 'Mudo';
  
  if (elements.mainPreview) {
    elements.mainPreview.muted = outputMuted;
  }
  
  // Conectar áudio ao preview principal
  connectAudioToMainPreview();
});

async function openWebcamModal() {
  await loadDevices();
  renderWebcamList();
  elements.webcamModal.classList.add('active');
}

async function openMicrophoneModal() {
  await loadDevices();
  renderMicrophoneList();
  elements.microphoneModal.classList.add('active');
}

function closeWebcamModal() {
  elements.webcamModal.classList.remove('active');
}

function closeMicrophoneModal() {
  stopMicrophoneMonitoring();
  elements.microphoneModal.classList.remove('active');
}

async function applyWebcamSelection() {
  if (selectedWebcamId) {
    try {
      if (webcamService.isCapturing()) {
        webcamService.stopWebcam();
      }
      
      const resolution = elements.resolutionSelect.value;
      const stream = await webcamService.captureWebcam(selectedWebcamId, resolution);
      elements.webcamPreview.srcObject = stream;
      
      // Garantir visibilidade do preview
      elements.webcamPreview.style.display = 'block';
      elements.webcamPreview.play().catch(err => console.warn('[Webcam] Erro ao tocar preview:', err));
      
      updateSourceStatus("webcam", "Ativo");
      updateMainPreview();
      updateStatus("Webcam configurada e ativada");
      
      // Ativar overlay automaticamente
      setTimeout(() => {
        if (!overlayState.enabled) {
          enableWebcamOverlay();
        }
      }, 500);
      
      closeWebcamModal();
    } catch (error) {
      updateStatus(error.message, "error");
    }
  }
}

async function applyMicrophoneSelection() {
  if (selectedMicrophoneId) {
    try {
      // Parar monitoramento temporário
      stopMicrophoneMonitoring();

      const stream = await screenService.captureMicrophone(selectedMicrophoneId);
      updateSourceStatus("microphone", "Ativo");
      updateStatus("Microfone configurado e ativado");
      
      // Iniciar análise de áudio
      initAudioAnalysis(stream);
      
      closeMicrophoneModal();
    } catch (error) {
      updateStatus(error.message, "error");
    }
  }
}

async function openAudioOutputModal() {
  await loadDevices();
  renderAudioOutputList();
  elements.audioOutputModal.classList.add('active');
}

function closeAudioOutputModal() {
  elements.audioOutputModal.classList.remove('active');
}

async function applyAudioOutputSelection() {
  if (selectedAudioOutputId) {
    try {
      // Aplicar saída de áudio ao elemento de vídeo principal
      if (typeof elements.mainPreview.setSinkId !== 'undefined') {
        await elements.mainPreview.setSinkId(selectedAudioOutputId);
        updateSourceStatus("audio-output", "Configurado");
        updateStatus("Saída de áudio configurada");
        closeAudioOutputModal();
      } else {
        updateStatus("Seu navegador não suporta seleção de saída de áudio", "error");
      }
    } catch (error) {
      updateStatus(`Erro ao configurar saída: ${error.message}`, "error");
    }
  }
}

// ===== MODAL DE FORMATO DE CAPTURA DE TELA =====

function openScreenFormatModal() {
  const modal = elements.screenFormatModal;
  if (!modal) return;

  // Marcar card do formato atual
  _syncFormatCards(screenCaptureFormat);

  // Interação visual: clicar no card alterna a classe
  modal.querySelectorAll('.format-card').forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type=radio]');
      if (radio) {
        radio.checked = true;
        _syncFormatCards(radio.value);
      }
    });
  });

  modal.classList.add('active');
}

function _syncFormatCards(format) {
  const modal = elements.screenFormatModal;
  if (!modal) return;
  const cardYt = modal.querySelector('#card-youtube');
  const cardTk = modal.querySelector('#card-tiktok');
  if (cardYt) {
    cardYt.classList.toggle('selected', format === 'youtube');
    cardYt.classList.remove('selected-tiktok');
  }
  if (cardTk) {
    cardTk.classList.remove('selected');
    cardTk.classList.toggle('selected-tiktok', format === 'tiktok');
  }
}

function closeScreenFormatModal() {
  elements.screenFormatModal.classList.remove('active');
}

async function applyScreenFormatSelection() {
  const selectedRadio = elements.screenFormatModal.querySelector('input[name="screen-format"]:checked');
  if (selectedRadio) {
    screenCaptureFormat = selectedRadio.value;
    console.log('Formato selecionado:', screenCaptureFormat);

    // Fechar modal
    closeScreenFormatModal();

    // Atualizar visual da interface (modo body, monitor strip, indicador)
    applyFormatStyles();

    // Iniciar captura de tela
    await handleScreenCapture();
  }
}

function applyFormatStyles() {
  const isVertical = screenCaptureFormat === 'tiktok';

  document.body.classList.toggle('mode-tiktok', isVertical);
  document.body.classList.toggle('mode-youtube', !isVertical);

  // Nota: o webcam-monitor-strip é controlado por enableWebcamOverlay/disableWebcamOverlay
  // (visível sempre que a câmera estiver ativa, independente do formato)

  const formatLabel = isVertical ? '📱 TikTok 9:16' : '🎬 YouTube 16:9';
  if (elements.formatIndicator) {
    elements.formatIndicator.textContent = formatLabel;
    elements.formatIndicator.style.background = isVertical
      ? 'linear-gradient(135deg, #ec4899, #8b5cf6)'
      : 'linear-gradient(135deg, #3b82f6, #10b981)';
    elements.formatIndicator.style.color = '#fff';
    elements.formatIndicator.style.borderRadius = '4px';
    elements.formatIndicator.style.padding = '4px 8px';
  }
}

async function initWebcamDevices() {
  try {
    // Primeiro solicitar permissão para acessar câmera
    // Isso permite que o navegador mostre labels corretos dos dispositivos
    console.log('📹 Solicitando permissão para acessar câmeras...');
    
    let tempStream = null;
    try {
      tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('✅ Permissão concedida');
    } catch (permError) {
      console.warn('❌ Permissão negada ou nenhuma câmera disponível:', permError);
      updateStatus('Permissão de câmera necessária. Clique em Permitir.', 'error');
      return;
    }
    
    // Agora enumerar dispositivos (com labels corretos)
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
    
    // Parar stream temporário
    if (tempStream) {
      tempStream.getTracks().forEach(track => track.stop());
    }
    
    // Armazenar webcams detectadas
    availableDevices.webcams = videoDevices;
    
    console.log(`📹 ${videoDevices.length} webcam(s) detectada(s) e em uso pelo SO:`);
    videoDevices.forEach((device, index) => {
      console.log(`  ${index + 1}. ${device.label || `Câmera ${index + 1}`} (${device.deviceId.substring(0, 20)}...)`);
    });

    elements.webcamSelect.innerHTML = '<option value="">Selecione webcam...</option>';

    videoDevices.forEach((device) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `Câmera ${videoDevices.indexOf(device) + 1}`;
      elements.webcamSelect.appendChild(option);
    });
    
    // Se houver múltiplas webcams, mostrar modal de seleção
    if (videoDevices.length > 1) {
      console.log('Múltiplas webcams detectadas, abrindo seletor...');
      showWebcamSelectionModal(videoDevices);
    } else if (videoDevices.length === 1) {
      // Se houver apenas uma, ativar diretamente
      const device = videoDevices[0];
      console.log('✅ Ativando única webcam:', device.label || device.deviceId);
      elements.webcamSelect.value = device.deviceId;
      
      const resolution = elements.resolutionSelect.value;
      const stream = await webcamService.captureWebcam(device.deviceId, resolution);
      elements.webcamPreview.srcObject = stream;
      
      // Garantir visibilidade do preview
      elements.webcamPreview.style.display = 'block';
      elements.webcamPreview.play().catch(err => console.warn('[Webcam] Erro ao tocar preview:', err));
      
      updateSourceStatus("webcam", "Ativo");
      updateMainPreview();
      updateStatus(`✅ Webcam ativada: ${device.label || 'Câmera 1'}`);
      
      // Ativar overlay automaticamente
      setTimeout(() => {
        if (!overlayState.enabled) {
          enableWebcamOverlay();
        }
      }, 500);
    } else {
      updateStatus('Nenhuma webcam detectada.', 'error');
    }
    
  } catch (error) {
    console.error('Erro ao inicializar webcams:', error);
    updateStatus(`Erro ao listar webcams: ${error.message}`, "error");
  }
}

/**
 * Mostra modal para seleção de webcam quando há múltiplas opções
 */
function showWebcamSelectionModal(devices) {
  const modal = document.createElement('div');
  modal.className = 'device-modal active';
  modal.style.zIndex = '4000';
  
  modal.innerHTML = `
    <div class="device-content" style="max-width: 500px;">
      <h3>📹 Selecionar Webcam</h3>
      <p style="color: var(--text-muted); margin-bottom: 20px; fontSize: 14px;">
        ${devices.length} webcams foram detectadas. Selecione qual deseja usar:
      </p>
      
      <div id="webcam-selection-list" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
        ${devices.map((device, index) => `
          <button class="webcam-selection-btn btn-secondary" data-device-id="${device.deviceId}" style="padding: 16px; text-align: left; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">📹</span>
            <div style="flex: 1;">
              <div style="font-weight: 600; margin-bottom: 4px;">${device.label || `Câmera ${index + 1}`}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${device.deviceId.substring(0, 20)}...</div>
            </div>
            <span style="font-size: 18px;">→</span>
          </button>
        `).join('')}
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
        <button id="cancel-webcam-selection" class="btn-secondary">❌ Cancelar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners para cada webcam
  modal.querySelectorAll('.webcam-selection-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const deviceId = btn.dataset.deviceId;
      const device = devices.find(d => d.deviceId === deviceId);
      
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Ativando...</span>';
      
      try {
        const resolution = elements.resolutionSelect.value;
        const stream = await webcamService.captureWebcam(deviceId, resolution);
        elements.webcamPreview.srcObject = stream;
        
        // Garantir visibilidade do preview
        elements.webcamPreview.style.display = 'block';
        elements.webcamPreview.play().catch(err => console.warn('[Webcam] Erro ao tocar preview:', err));
        
        elements.webcamSelect.value = deviceId;
        updateSourceStatus("webcam", "Ativo");
        updateMainPreview();
        updateStatus(`✅ Webcam ativada: ${device.label || 'Câmera'}`);
        
        // Ativar overlay automaticamente
        setTimeout(() => {
          if (!overlayState.enabled) {
            enableWebcamOverlay();
          }
        }, 500);
        
        document.body.removeChild(modal);
      } catch (error) {
        console.error('Erro ao ativar webcam:', error);
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalHtml;
        alert(`Erro ao ativar webcam: ${error.message}`);
      }
    });
    
    // Salvar HTML original para restaurar se houver erro
    btn.dataset.originalHtml = btn.innerHTML;
  });
  
  // Cancelar
  modal.querySelector('#cancel-webcam-selection').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

function updateStatus(message, type = "info") {
  elements.footerStatus.textContent = message;
  elements.footerStatus.style.color = type === "error" ? "var(--danger)" : "var(--text-muted)";
}

function setControlsOpen(isOpen) {
  controlsOpen = isOpen;
  document.body.classList.toggle("controls-open", isOpen);
  document.body.classList.toggle("controls-collapsed", !isOpen);
  updateControlsButton();
}

function updateSourceStatus(sourceName, status) {
  const sourceElement = document.querySelector(`[data-source="${sourceName}"]`);

  if (sourceElement) {
    const statusElement = sourceElement.querySelector(".source-status");
    statusElement.textContent = status;

    if (status.includes("Ativo")) {
      sourceElement.classList.add("active");
      activeSources.add(sourceName);
    } else {
      sourceElement.classList.remove("active");
      activeSources.delete(sourceName);
    }
  }
}

async function handleScreenCapture() {
  try {
    if (screenService.isCapturing()) {
      screenService.stopCapture();
      elements.screenPreview.srcObject = null;
      updateSourceStatus("screen", "Clique para ativar");
      updateMainPreview();
      return;
    }

    const stream = await screenService.captureScreen(true);
    if (!stream) {
      updateStatus("Captura de tela cancelada.", "warning");
      return;
    }
    elements.screenPreview.srcObject = stream;
    updateSourceStatus("screen", "Ativo");
    updateMainPreview();
    if (stream.getAudioTracks().length > 0) {
      updateStatus('✅ Captura ativada. Áudio do sistema será gravado, mas o preview local ficará mudo para evitar repetição.');
      return;
    }
    
    const formatLabel = screenCaptureFormat === 'youtube' ? '🎬 YouTube' : '📱 TikTok';
    updateStatus(`✅ Captura ativada - Formato preferido: ${formatLabel}`);
  } catch (error) {
    updateStatus(error.message, "error");
  }
}

async function handleWebcamCapture() {
  try {
    if (webcamService.isCapturing()) {
      webcamService.stopWebcam();
      elements.webcamPreview.srcObject = null;
      updateSourceStatus("webcam", "Clique para ativar");
      updateMainPreview();
      // Limpar seleção
      disableWebcamOverlay();
      return;
    }

    // Se ainda não detectou webcams, fazer detecção agora (apenas na primeira vez que clicar)
    if (!webcamsDetected) {
      console.log('🔍 Detectando webcams pela primeira vez...');
      webcamsDetected = true; // Marcar como detectado para não repetir
      await initWebcamDevices();
      // initWebcamDevices já ativa a webcam se houver apenas uma
      return;
    }

    const deviceId = elements.webcamSelect.value || null;
    
    if (!deviceId) {
      updateStatus('⚠️ Selecione uma webcam na lista', 'error');
      return;
    }
    
    const resolution = elements.resolutionSelect.value;

    const stream = await webcamService.captureWebcam(deviceId, resolution);
    elements.webcamPreview.srcObject = stream;
    
    // Garantir que o preview da webcam está visível e funcionando
    elements.webcamPreview.style.display = 'block';
    elements.webcamPreview.play().catch(err => {
      console.warn('[Webcam] Erro ao tocar preview:', err);
    });
    
    console.log('[Webcam] Preview configurado:', {
      srcObject: !!stream,
      videoTracks: stream.getVideoTracks().length,
      videoWidth: elements.webcamPreview.videoWidth,
      videoHeight: elements.webcamPreview.videoHeight
    });
    
    updateSourceStatus("webcam", "Ativo");
    updateMainPreview();
    updateStatus("Webcam ativada");
    
    // Ativar overlay automaticamente quando a webcam for ligada
    setTimeout(() => {
      if (!overlayState.enabled) {
        enableWebcamOverlay();
        console.log('[Webcam] Overlay ativado automaticamente');
      }
    }, 500);
  } catch (error) {
    updateStatus(error.message, "error");
  }
}

async function handleMicrophoneCapture() {
  try {
    if (screenService.audioStream) {
      screenService.stopMicrophone();
      updateSourceStatus("microphone", "Clique para ativar");
      updateStatus("Microfone desativado");
      return;
    }

    await screenService.captureMicrophone(selectedMicrophoneId);
    updateSourceStatus("microphone", "Ativo");
    updateStatus(selectedMicrophoneId ? "Microfone configurado ativado" : "Microfone ativado");
  } catch (error) {
    updateStatus(error.message, "error");
  }
}

async function handlePhoneCamera() {
  try {
    if (phoneService.isConnected()) {
      phoneService.disconnect();
      elements.phonePreview.srcObject = null;
      updateSourceStatus("phone", "Clique para conectar");
      elements.qrModal.classList.remove("active");
      updateMainPreview();
      return;
    }

    const session = await phoneService.createSession();

    // Gerar QR Code
    QRCode.toCanvas(elements.qrCanvas, session.connectionUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#000", light: "#fff" }
    });

    // Mostrar URL no input
    elements.connectionUrl.value = session.connectionUrl;
    
    // Resetar status
    elements.qrStatus.innerHTML = '⏳ Aguardando conexão...';
    elements.qrStatus.style.color = 'var(--accent)';

    // Abrir modal
    elements.qrModal.classList.add("active");
    updateSourceStatus("phone", "Aguardando conexão...");

    // Aguardar conexão
    await phoneService.waitForConnection((stream) => {
      elements.phonePreview.srcObject = stream;
      updateSourceStatus("phone", "✅ Conectado");
      elements.qrStatus.innerHTML = '✅ Conectado com sucesso!';
      elements.qrStatus.style.color = 'var(--success)';
      
      // Fechar modal após 2 segundos
      setTimeout(() => {
        elements.qrModal.classList.remove("active");
      }, 2000);
      
      updateMainPreview();
      updateStatus("Câmera do celular conectada");
    });
  } catch (error) {
    updateStatus(error.message, "error");
    elements.qrStatus.innerHTML = '❌ Erro ao conectar';
    elements.qrStatus.style.color = 'var(--danger)';
    setTimeout(() => {
      elements.qrModal.classList.remove("active");
    }, 2000);
  }
}

function updateMainPreview() {
  const screenStream = elements.screenPreview.srcObject;
  const webcamStream = elements.webcamPreview.srcObject;
  const phoneStream = elements.phonePreview.srcObject;
  
  const streams = [screenStream, webcamStream, phoneStream].filter(Boolean);

  if (streams.length > 0) {
    // Se tiver captura de tela ativa, usa como principal
    if (screenStream) {
      elements.mainPreview.srcObject = screenStream;
      // Webcam aparece na strip abaixo (apenas se webcam também ativa)
      if (webcamStream) {
        setTimeout(() => enableWebcamOverlay(), 300);
      } else {
        disableWebcamOverlay();
      }
    } else if (phoneStream) {
      elements.mainPreview.srcObject = phoneStream;
      // Webcam aparece na strip abaixo
      if (webcamStream) {
        setTimeout(() => enableWebcamOverlay(), 300);
      } else {
        disableWebcamOverlay();
      }
    } else {
      // Só webcam — aparece no preview principal, sem strip
      elements.mainPreview.srcObject = webcamStream;
      disableWebcamOverlay();
    }
    
    elements.mainPreview.style.display = "block";
    elements.mainPreview.parentElement.querySelector(".preview-placeholder").style.display = "none";
    
    setTimeout(() => connectAudioToMainPreview(), 100);
  } else {
    elements.mainPreview.srcObject = null;
    elements.mainPreview.style.display = "none";
    elements.mainPreview.parentElement.querySelector(".preview-placeholder").style.display = "block";
    disableWebcamOverlay();
  }
}

function getCombinedStream() {
  console.log('=== getCombinedStream ===');
  console.log('Screen stream:', !!elements.screenPreview.srcObject);
  console.log('Webcam stream:', !!elements.webcamPreview.srcObject);
  console.log('Phone stream:', !!elements.phonePreview.srcObject);
  console.log('Overlay enabled:', overlayState.enabled);
  
  // Quando a fonte principal é a tela, gravar o stream bruto do monitor.
  // A composição via canvas depende da aba do RDFlow ativa e pode perder
  // atualizações ao trocar para outras abas/janelas do Windows.
  if (overlayState.enabled && elements.screenPreview.srcObject && elements.webcamPreview.srcObject) {
    console.log('🖥️ Usando stream bruto da tela para gravar todas as janelas/abas do monitor selecionado');
    console.log('📹 Webcam será preservada na gravação separada para edição posterior no editor 9:16');
  }
  
  // Caso contrário, usar stream simples
  // Priorizar tela, depois webcam, depois celular para gravação
  const videoStream = elements.screenPreview.srcObject || 
                      elements.webcamPreview.srcObject || 
                      elements.phonePreview.srcObject;
  
  if (!videoStream) {
    console.error('❌ Nenhum stream de vídeo ativo para gravar');
    return null;
  }

  console.log('Stream de vídeo selecionado:', {
    tracks: videoStream.getTracks().length,
    video: videoStream.getVideoTracks().length,
    audio: videoStream.getAudioTracks().length
  });

  const audioStreams = [];
  
  // Pegar áudio do microfone configurado (se houver)
  if (screenService.audioStream) {
    console.log('✅ Adicionando áudio do microfone');
    audioStreams.push(screenService.audioStream);
  }
  
  // Pegar áudio da tela (se houver)
  if (elements.screenPreview.srcObject && elements.screenPreview.srcObject.getAudioTracks().length > 0) {
    console.log('✅ Adicionando áudio da tela');
    audioStreams.push(elements.screenPreview.srcObject);
  }
  
  // Pegar áudio do celular (se houver)
  if (elements.phonePreview.srcObject && elements.phonePreview.srcObject.getAudioTracks().length > 0) {
    console.log('✅ Adicionando áudio do celular');
    audioStreams.push(elements.phonePreview.srcObject);
  }
  
  console.log('Total de streams de áudio para mixagem:', audioStreams.length);

  const combinedStream = screenService.combineStreams(videoStream, audioStreams);
  
  if (combinedStream) {
    console.log('✅ Stream combinado criado:', {
      video: combinedStream.getVideoTracks().length,
      audio: combinedStream.getAudioTracks().length
    });
  } else {
    console.error('❌ Falha ao criar stream combinado');
  }
  
  return combinedStream;
}

function ensureCompositionVideoElement(existingElement, stream, label) {
  if (existingElement && existingElement.srcObject === stream) {
    return existingElement;
  }

  if (existingElement) {
    existingElement.pause();
    existingElement.srcObject = null;
  }

  const video = document.createElement('video');
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.style.cssText = 'position:fixed; width:1px; height:1px; opacity:0.01; left:-9999px; top:-9999px; pointer-events:none;';
  video.setAttribute('aria-hidden', 'true');
  video.dataset.compositionSource = label;
  video.srcObject = stream;
  document.body.appendChild(video);
  video.play().catch(err => {
    console.warn(`[Composição] Não foi possível iniciar vídeo auxiliar ${label}:`, err);
  });
  return video;
}

function scheduleCompositionFrame(sourceVideo, renderFrame) {
  if (!sourceVideo) return;

  if (typeof sourceVideo.requestVideoFrameCallback === 'function') {
    compositionFrameCallbackId = sourceVideo.requestVideoFrameCallback(() => {
      renderFrame();
      scheduleCompositionFrame(sourceVideo, renderFrame);
    });
    return;
  }

  compositionAnimationFrame = setTimeout(() => {
    renderFrame();
    scheduleCompositionFrame(sourceVideo, renderFrame);
  }, 1000 / 30);
}

/**
 * Cria stream de composição usando Canvas (Tela + Webcam Overlay)
 */
function createCompositionStream() {
  const screenStream = elements.screenPreview.srcObject;
  const webcamStream = elements.webcamPreview.srcObject;

  if (!screenStream) {
    console.warn('[Composição] Stream da tela não disponível.');
    return null;
  }

  compositionScreenVideo = ensureCompositionVideoElement(compositionScreenVideo, screenStream, 'screen');
  if (webcamStream) {
    compositionWebcamVideo = ensureCompositionVideoElement(compositionWebcamVideo, webcamStream, 'webcam');
  }

  const mainVideo = compositionScreenVideo;
  const overlayVideoElem = compositionWebcamVideo || elements.overlayVideo;

  if (!mainVideo.videoWidth) {
    console.warn('[Composição] Aguardando vídeo principal carregar...');
    return null;
  }

  // Criar canvas se não existir
  if (!compositionCanvas) {
    compositionCanvas = document.createElement('canvas');
    compositionContext = compositionCanvas.getContext('2d');
  }

  compositionCanvas.width  = mainVideo.videoWidth;
  compositionCanvas.height = mainVideo.videoHeight;

  console.log('📐 Canvas compositor criado:', {
    width: compositionCanvas.width,
    height: compositionCanvas.height
  });

  let frameCounter = 0;
  const renderFrame = () => {
    try {
      compositionContext.clearRect(0, 0, compositionCanvas.width, compositionCanvas.height);

      // Desenhar tela principal (sempre visível e decodificando)
      compositionContext.drawImage(mainVideo, 0, 0, compositionCanvas.width, compositionCanvas.height);

      if (frameCounter % 150 === 0) {
        console.log(`[Composição] Frame ${frameCounter} - Tela: ${mainVideo.videoWidth}x${mainVideo.videoHeight}`);
      }
      frameCounter++;
    } catch (error) {
      console.error('[Composição] Erro ao renderizar tela:', error);
    }

    // Desenhar webcam overlay se ativo
    if (overlayState.enabled && elements.webcamOverlay.classList.contains('active') && overlayVideoElem.videoWidth > 0) {
      try {
        const mainRect   = elements.mainPreview.getBoundingClientRect();
        const overlayRect = elements.webcamOverlay.getBoundingClientRect();

        const scaleX = compositionCanvas.width  / mainRect.width;
        const scaleY = compositionCanvas.height / mainRect.height;

        const ox = (overlayRect.left - mainRect.left) * scaleX;
        const oy = (overlayRect.top  - mainRect.top)  * scaleY;
        const ow = overlayRect.width  * scaleX;
        const oh = overlayRect.height * scaleY;

        // Obtém o CameraShapeRenderer a partir do estilo compartilhado
        const frameStyle = (typeof activeOverlayFrameStyle !== 'undefined')
          ? activeOverlayFrameStyle
          : null;

        const renderer = frameStyle ? new CameraShapeRenderer(frameStyle) : null;

        if (renderer) {
          // Glow (por baixo de tudo)
          renderer.renderGlow(compositionContext, ox, oy, ow, oh, compositionCanvas.width);

          // Clip + vídeo
          compositionContext.save();
          renderer.applyShadow(compositionContext, compositionCanvas.width);
          renderer.buildPath(compositionContext, ox, oy, ow, oh);
          compositionContext.clip();
          compositionContext.drawImage(overlayVideoElem, ox, oy, ow, oh);
          compositionContext.restore();

          // Borda
          renderer.renderBorder(compositionContext, ox, oy, ow, oh, compositionCanvas.width);

        } else {
          // Fallback básico se o sistema de estilo não estiver disponível
          compositionContext.save();
          compositionContext.shadowColor   = 'rgba(0,0,0,0.5)';
          compositionContext.shadowBlur    = 10;
          compositionContext.shadowOffsetY = 4;
          compositionContext.beginPath();
          compositionContext.rect(ox, oy, ow, oh);
          compositionContext.clip();
          compositionContext.drawImage(overlayVideoElem, ox, oy, ow, oh);
          compositionContext.strokeStyle = '#3b82f6';
          compositionContext.lineWidth   = 3;
          compositionContext.beginPath();
          compositionContext.rect(ox, oy, ow, oh);
          compositionContext.stroke();
          compositionContext.restore();
        }
      } catch (error) {
        console.error('[Composição] Erro ao renderizar overlay webcam:', error);
      }
    }

  };

  console.log('🎬 Iniciando composição contínua (30 FPS)...');
  renderFrame();
  scheduleCompositionFrame(mainVideo, renderFrame);

  const canvasStream = compositionCanvas.captureStream(30);

  const audioStreams = [];
  if (screenService.audioStream) audioStreams.push(screenService.audioStream);
  if (elements.screenPreview.srcObject && elements.screenPreview.srcObject.getAudioTracks().length > 0) {
    audioStreams.push(elements.screenPreview.srcObject);
  }

  const finalStream = screenService.combineStreams(canvasStream, audioStreams);
  console.log('✅ Stream de composição criado:', {
    video: finalStream.getVideoTracks().length,
    audio: finalStream.getAudioTracks().length
  });

  return finalStream;
}

/**
 * Para a renderização do canvas compositor
 */
function stopCompositionStream() {
  if (compositionAnimationFrame) {
    clearTimeout(compositionAnimationFrame);
    compositionAnimationFrame = null;
  }

  if (compositionScreenVideo && typeof compositionScreenVideo.cancelVideoFrameCallback === 'function' && compositionFrameCallbackId !== null) {
    compositionScreenVideo.cancelVideoFrameCallback(compositionFrameCallbackId);
    compositionFrameCallbackId = null;
  }

  [compositionScreenVideo, compositionWebcamVideo].forEach(video => {
    if (!video) return;
    video.pause();
    video.srcObject = null;
    if (video.parentNode) video.parentNode.removeChild(video);
  });
  compositionScreenVideo = null;
  compositionWebcamVideo = null;
  
  if (compositionCanvas) {
    const stream = compositionCanvas.captureStream();
    stream.getTracks().forEach(track => track.stop());
  }
  
  console.log('🛑 Composição parada');
}

function startRecordingTimer() {
  let seconds = 0;

  recordingTimer = setInterval(() => {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    elements.recordingTime.textContent = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, 1000);
}

function stopRecordingTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }

  elements.recordingTime.textContent = "00:00";
}

// ===== GRAVAÇÃO SEPARADA DA WEBCAM =====

function startWebcamRecording() {
  // Verificar se a webcam está ativa
  if (!elements.webcamPreview || !elements.webcamPreview.srcObject) {
    console.log('[Webcam Recording] Webcam não está ativa, pulando gravação separada');
    return;
  }
  
  try {
    console.log('[Webcam Recording] Iniciando gravação separada da webcam');
    
    const webcamStream = elements.webcamPreview.srcObject;
    
    // Resetar chunks
    webcamRecordingChunks = [];
    
    // Criar MediaRecorder para a webcam
    webcamRecorder = new MediaRecorder(webcamStream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000
    });
    
    webcamRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        webcamRecordingChunks.push(event.data);
      }
    };
    
    webcamRecorder.onstop = () => {
      console.log('[Webcam Recording] Gravação da webcam finalizada');
      
      // Criar blob com os chunks
      webcamRecordingBlob = new Blob(webcamRecordingChunks, { type: 'video/webm' });
      
      console.log('[Webcam Recording] Blob criado:', {
        size: (webcamRecordingBlob.size / 1024 / 1024).toFixed(2) + ' MB',
        type: webcamRecordingBlob.type
      });
    };
    
    // Iniciar gravação
    webcamRecorder.start();
    
    console.log('[Webcam Recording] ✅ Gravação da webcam iniciada com sucesso');
  } catch (error) {
    console.error('[Webcam Recording] Erro ao iniciar gravação da webcam:', error);
    webcamRecorder = null;
  }
}

function stopWebcamRecording() {
  if (webcamRecorder && webcamRecorder.state !== 'inactive') {
    console.log('[Webcam Recording] Parando gravação da webcam');
    webcamRecorder.stop();
  }
}

async function handleStartRecording() {
  try {
    console.log('=== INICIANDO GRAVAÇÃO ===');
    
    // Resetar gravação anterior da webcam
    webcamRecordingBlob = null;
    webcamRecorder = null;
    webcamRecordingChunks = [];
    
    // Verificar se há sources ativas
    if (activeSources.size === 0) {
      console.error('Nenhuma source ativa');
      updateStatus("❌ Ative pelo menos uma fonte de vídeo antes de gravar", "error");
      return;
    }
    
    console.log('Sources ativas:', Array.from(activeSources));
    
    // Diagnóstico do preview da webcam
    console.log('[Diagnóstico Webcam Preview]', {
      elementExists: !!elements.webcamPreview,
      srcObject: !!elements.webcamPreview?.srcObject,
      videoTracks: elements.webcamPreview?.srcObject?.getVideoTracks().length || 0,
      videoWidth: elements.webcamPreview?.videoWidth || 0,
      videoHeight: elements.webcamPreview?.videoHeight || 0,
      parentVisible: elements.webcamPreview?.parentElement?.offsetParent !== null
    });
    
    const stream = getCombinedStream();

    if (!stream) {
      console.error('Stream inválido para gravação');
      updateStatus("❌ Erro ao criar stream de gravação", "error");
      return;
    }

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    
    console.log('Stream obtido:', {
      videoTracks: videoTracks.length,
      audioTracks: audioTracks.length,
      videoTrack: videoTracks[0]?.label || 'nenhum',
      audioTrack: audioTracks[0]?.label || 'nenhum'
    });

    if (videoTracks.length === 0) {
      console.error('Stream sem vídeo');
      updateStatus("❌ Stream sem track de vídeo", "error");
      return;
    }

    recordingService.startRecording(stream, screenCaptureFormat);
    elements.recordingIndicator.classList.add("active");
    elements.startRecording.disabled = true;
    elements.stopRecording.disabled = false;
    startRecordingTimer();

    if (overlayState.enabled && elements.screenPreview.srcObject && elements.webcamPreview.srcObject) {
      updateStatus("🔴 Gravando tela completa do monitor. A webcam continua gravada separadamente para combinar depois no editor.");
    }
    
    // Gravar webcam separadamente se estiver ativa
    startWebcamRecording();

    console.log('✅ Gravação iniciada com sucesso');
    if (!(overlayState.enabled && elements.screenPreview.srcObject && elements.webcamPreview.srcObject)) {
      updateStatus("🔴 Gravação iniciada");
    }
  } catch (error) {
    console.error('Erro ao iniciar gravação:', error);
    updateStatus(`❌ Erro: ${error.message}`, "error");
  }
}

async function handleStopRecording() {
  if (isStoppingRecording) {
    console.warn('Parada da gravação já está em andamento');
    return;
  }

  try {
    isStoppingRecording = true;
    console.log('Parando gravação...');
    elements.stopRecording.disabled = true;
    elements.downloadRecording.disabled = true;

    const stoppedBlob = await recordingService.stopRecording();
    if (stoppedBlob) {
      recordingBlob = stoppedBlob;
    }
    
    // Parar composição do canvas se estiver ativa
    stopCompositionStream();
    
    // Parar gravação da webcam se estiver ativa
    stopWebcamRecording();

    if (!recordingBlob) {
      console.error('Nenhum blob de gravação criado');
      elements.startRecording.disabled = false;
      updateStatus("Erro ao parar gravação", "error");
      return;
    }

    console.log('Gravação finalizada:', {
      size: (recordingBlob.size / 1024 / 1024).toFixed(2) + ' MB',
      type: recordingBlob.type
    });
    
    // Log da gravação da webcam se existir
    if (webcamRecordingBlob) {
      console.log('Gravação da webcam disponível:', {
        size: (webcamRecordingBlob.size / 1024 / 1024).toFixed(2) + ' MB',
        type: webcamRecordingBlob.type
      });
    }

    elements.recordingIndicator.classList.remove("active");
    elements.startRecording.disabled = false;
    elements.stopRecording.disabled = true;
    elements.downloadRecording.disabled = false;
    stopRecordingTimer();

    updateStatus(`✅ Gravação finalizada (${(recordingBlob.size / 1024 / 1024).toFixed(2)} MB). Clique em Baixar para salvar.`);
  } catch (error) {
    console.error('Erro ao parar gravação:', error);
    updateStatus(error.message, "error");
    elements.startRecording.disabled = false;
    elements.stopRecording.disabled = true;
  } finally {
    isStoppingRecording = false;
  }
}

function handleDownloadRecording() {
  if (recordingBlob) {
    console.log('Abrindo opções de download...');
    showDownloadOptions();
  } else {
    console.error('Nenhuma gravação disponível para download');
    updateStatus("Nenhuma gravação disponível", "error");
  }
}

function showDownloadOptions() {
  const formatPreference = recordingService.recordingFormat || screenCaptureFormat;
  const formatEmoji = formatPreference === 'tiktok' ? '📱' : '🎬';
  
  // Criar modal de opções
  const modal = document.createElement('div');
  modal.className = 'device-modal active';
  modal.style.zIndex = '3000';
  
  modal.innerHTML = `
    <div class="device-content" style="max-width: 700px;">
      <h3>⬇️ Baixar Gravação em MP4</h3>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">
        Tamanho original: ${(recordingBlob.size / 1024 / 1024).toFixed(2)} MB • Formato preferido: ${formatEmoji}
      </p>
      
      <!-- Preview do vídeo -->
      <div style="background: #000; border-radius: 8px; margin-bottom: 20px; overflow: hidden;">
        <video id="preview-video" controls style="width: 100%; max-height: 350px; object-fit: contain;">
        </video>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">📊 Escolha o formato de saída:</label>
        <select id="format-select" style="width: 100%; padding: 12px; background: var(--panel-light); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: 14px;">
          <option value="original-webm">⚡ WebM Original (Download Instantâneo)</option>
          <option value="original">🎥 MP4 Original (Conversão Rápida)</option>
          <optgroup label="📺 Formato Horizontal (16:9)">
            <option value="youtube-1080p" ${formatPreference === 'youtube' ? 'selected' : ''}>🎬 YouTube 1920x1080 (Full HD)</option>
            <option value="youtube-720p">🎬 YouTube 1280x720 (HD)</option>
            <option value="youtube-480p">🎬 YouTube 854x480 (SD)</option>
            <option value="facebook-1080p">📘 Facebook 1920x1080 (Full HD)</option>
            <option value="facebook-720p">📘 Facebook 1280x720 (HD)</option>
            <option value="twitter-1080p">𝕏 Twitter/X 1920x1080 (Full HD)</option>
          </optgroup>
          <optgroup label="📱 Formato Vertical (9:16)">
            <option value="tiktok-1080p" ${formatPreference === 'tiktok' ? 'selected' : ''}>📱 TikTok 1080x1920 (Full HD)</option>
            <option value="tiktok-720p">📱 TikTok 720x1280 (HD)</option>
            <option value="instagram-reels">📸 Instagram Reels 1080x1920</option>
            <option value="instagram-stories">📸 Instagram Stories 1080x1920</option>
            <option value="youtube-shorts">🩳 YouTube Shorts 1080x1920</option>
          </optgroup>
        </select>
      </div>
      
      <!-- Aviso de conversão -->
      <div id="conversion-warning" style="display: none; background: rgba(251, 191, 36, 0.15); padding: 12px; border-radius: 8px; border-left: 3px solid #fbbf24; margin-bottom: 16px; font-size: 12px; color: var(--text);">
        ⚠️ <strong>Conversão MP4:</strong> Pode levar vários minutos dependendo do tamanho do vídeo.<br>
        💡 <strong>Dica:</strong> Para download instantâneo, escolha "WebM Original".
      </div>
      
      <!-- Info dinâmica do formato -->
      <div class="format-info-box" style="display: ${formatPreference === 'tiktok' ? 'block' : 'none'}; padding: 10px 12px; border-radius: 6px; border-left: 3px solid var(--success); background: rgba(16, 185, 129, 0.15); margin-bottom: 16px; font-size: 12px; color: var(--text);">
        ${formatPreference === 'tiktok' ? '📱 <strong>Formato Vertical 9:16:</strong> Centralizado no PC, tela cheia no celular (vertical)' : ''}
      </div>
      
      <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 8px; border-left: 3px solid var(--accent); margin-bottom: 16px;">
        <div style="font-size: 12px; line-height: 1.6; color: var(--text-muted);">
          <strong>💡 Sobre os formatos:</strong><br>
          • <strong>Original:</strong> Baixa o vídeo como foi gravado (sem conversão)<br>
          • <strong>Horizontal 16:9:</strong> Ideal para YouTube, Facebook, Twitter, TV<br>
          • <strong>Vertical 9:16:</strong> Ideal para TikTok, Instagram Reels/Stories, Shorts<br>
          <br>
          📐 <strong>Aspect Ratio:</strong><br>
          • No <strong>desktop/PC:</strong> Vídeo centralizado com barras pretas nas laterais/topo<br>
          • No <strong>celular:</strong> Vídeo ocupa tela cheia na orientação correta (vertical para TikTok, horizontal para YouTube)<br>
          <br>
          ⚙️ Conversão automática para <strong>MP4 (H.264)</strong>
        </div>
      </div>
      
      <!-- Botão de download -->
      <div style="display: grid; gap: 10px; margin-bottom: 16px;">
        <button class="btn-primary" id="download-video" style="width: 100%; padding: 16px; font-size: 15px; position: relative;">
          <span id="download-text">⬇️ Baixar Vídeo em MP4</span>
          <div id="conversion-status" style="font-size: 11px; opacity: 0.9; margin-top: 6px; display: none; font-weight: 500;"></div>
        </button>
      </div>
      
      <button class="btn-secondary" id="cancel-download" style="width: 100%;">Cancelar</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Preview do vídeo
  const previewVideo = modal.querySelector('#preview-video');
  previewVideo.src = URL.createObjectURL(recordingBlob);
  
  const formatSelect = modal.querySelector('#format-select');
  const downloadButton = modal.querySelector('#download-video');
  const downloadText = modal.querySelector('#download-text');
  const conversionStatus = modal.querySelector('#conversion-status');
  const conversionWarning = modal.querySelector('#conversion-warning');
  
  // Atualizar preview e avisos ao mudar formato
  formatSelect.addEventListener('change', () => {
    const selectedFormat = formatSelect.value;
    const infoBox = modal.querySelector('.format-info-box');
    
    // Atualizar texto do botão e avisos
    if (selectedFormat === 'original-webm') {
      downloadText.textContent = '⚡ Download Instantâneo (WebM)';
      if (conversionWarning) conversionWarning.style.display = 'none';
    } else if (selectedFormat === 'original') {
      downloadText.textContent = '⬇️ Baixar em MP4 (Conversão Rápida)';
      if (conversionWarning) {
        conversionWarning.style.display = 'block';
        conversionWarning.innerHTML = '⏱️ <strong>Conversão rápida:</strong> Pode levar alguns segundos.';
      }
    } else {
      downloadText.textContent = '⬇️ Baixar em MP4 (Com Conversão)';
      if (conversionWarning) {
        conversionWarning.style.display = 'block';
        conversionWarning.innerHTML = '⚠️ <strong>Conversão MP4:</strong> Pode levar vários minutos dependendo do tamanho do vídeo.<br>💡 <strong>Dica:</strong> Para download instantâneo, escolha "WebM Original".';
      }
    }
    
    // Atualizar preview do aspect ratio
    if (selectedFormat === 'original' || selectedFormat === 'original-webm') {
      previewVideo.style.aspectRatio = '';
      previewVideo.style.maxWidth = '';
      previewVideo.style.margin = '0';
      if (infoBox) infoBox.style.display = 'none';
    } else if (selectedFormat.startsWith('tiktok') || selectedFormat.startsWith('instagram') || selectedFormat.includes('shorts')) {
      // Formato vertical 9:16
      previewVideo.style.aspectRatio = '9/16';
      previewVideo.style.maxWidth = '300px';
      previewVideo.style.margin = '0 auto';
      if (infoBox) {
        infoBox.style.display = 'block';
        infoBox.innerHTML = '📱 <strong>Formato Vertical 9:16:</strong> Centralizado no PC, tela cheia no celular (vertical)';
        infoBox.style.background = 'rgba(16, 185, 129, 0.15)';
        infoBox.style.borderColor = 'var(--success)';
      }
    } else {
      // Formato horizontal 16:9
      previewVideo.style.aspectRatio = '16/9';
      previewVideo.style.maxWidth = '100%';
      previewVideo.style.margin = '0';
      if (infoBox) {
        infoBox.style.display = 'block';
        infoBox.innerHTML = '🎬 <strong>Formato Horizontal 16:9:</strong> Centralizado no PC, tela cheia no celular (horizontal)';
        infoBox.style.background = 'rgba(59, 130, 246, 0.15)';
        infoBox.style.borderColor = 'var(--accent)';
      }
    }
  });
  
  // Aplicar aspect ratio inicial baseado no formato preferido
  const infoBox = modal.querySelector('.format-info-box');
  if (formatPreference === 'tiktok') {
    previewVideo.style.aspectRatio = '9/16';
    previewVideo.style.maxWidth = '300px';
    previewVideo.style.margin = '0 auto';
    if (infoBox) {
      infoBox.style.display = 'block';
      infoBox.innerHTML = '📱 <strong>Formato Vertical 9:16:</strong> Centralizado no PC, tela cheia no celular (vertical)';
      infoBox.style.background = 'rgba(16, 185, 129, 0.15)';
      infoBox.style.borderColor = 'var(--success)';
    }
  } else if (formatPreference === 'youtube') {
    if (infoBox) {
      infoBox.style.display = 'block';
      infoBox.innerHTML = '🎬 <strong>Formato Horizontal 16:9:</strong> Centralizado no PC, tela cheia no celular (horizontal)';
      infoBox.style.background = 'rgba(59, 130, 246, 0.15)';
      infoBox.style.borderColor = 'var(--accent)';
    }
  }
  
  // Event listener - Download vídeo com conversão (ou abrir editor)
  downloadButton.addEventListener('click', async () => {
    const selectedFormat = formatSelect.value;
    
    // Verificar se é formato vertical (9:16) - abrir editor
    const verticalFormats = ['tiktok-1080p', 'tiktok-720p', 'instagram-reels', 'instagram-stories', 'youtube-shorts'];
    if (verticalFormats.includes(selectedFormat)) {
      // Fechar modal de download
      document.body.removeChild(modal);
      URL.revokeObjectURL(previewVideo.src);
      
      // Abrir editor de vídeo vertical
      await openVerticalVideoEditor(selectedFormat);
      return;
    }
    
    // Desabilitar botão durante conversão
    downloadButton.disabled = true;
    downloadButton.style.opacity = '0.6';
    downloadButton.style.cursor = 'not-allowed';
    formatSelect.disabled = true;
    
    // Atualizar texto do botão
    if (selectedFormat !== 'original') {
      downloadText.textContent = '⏳ Processando...';
    }
    
    try {
      await downloadVideoWithFormat(selectedFormat, conversionStatus);
      
      // Mostrar sucesso
      downloadText.textContent = '✅ Download iniciado!';
      if (conversionStatus) {
        conversionStatus.style.display = 'block';
        conversionStatus.textContent = 'Verifique sua pasta de downloads';
        conversionStatus.style.color = 'var(--success)';
      }
      
      // Fechar modal rapidamente
      setTimeout(() => {
        document.body.removeChild(modal);
        URL.revokeObjectURL(previewVideo.src);
      }, 800);
    } catch (error) {
      // Reabilitar botão em caso de erro
      downloadButton.disabled = false;
      downloadButton.style.opacity = '1';
      downloadButton.style.cursor = 'pointer';
      formatSelect.disabled = false;
      
      conversionStatus.style.display = 'block';
      
      // Mensagem de erro amigável
      let errorMessage = error.message;
      if (errorMessage.includes('FFmpeg') || errorMessage.includes('conversor')) {
        errorMessage = 'Falha ao carregar o conversor. Verifique sua conexão com a internet e tente novamente.';
      }
      
      conversionStatus.textContent = '❌ ' + errorMessage;
      conversionStatus.style.color = 'var(--danger)';
    }
  });
  
  modal.querySelector('#cancel-download').addEventListener('click', () => {
    document.body.removeChild(modal);
    URL.revokeObjectURL(previewVideo.src);
  });
  
  // Fechar ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
      URL.revokeObjectURL(previewVideo.src);
    }
  });
}

async function downloadVideoWithFormat(format, statusElement = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  try {
    // WebM Original - download instantâneo (SEM conversão)
    if (format === 'original-webm') {
      const filename = `gravacao-${timestamp}.webm`;
      recordingService.downloadRecording(recordingBlob, filename);
      updateStatus('⚡ Download instantâneo: WebM Original');
      return;
    }
    
    // MP4 Original - conversão simples (sem redimensionamento)
    if (format === 'original') {
      // Atualizar status: Carregando FFmpeg
      if (statusElement) {
        statusElement.style.display = 'block';
        statusElement.textContent = '⏳ Carregando conversor...';
        statusElement.style.color = 'var(--warning)';
      }
      updateStatus('⏳ Carregando FFmpeg.wasm...');
      
      const loadStartTime = Date.now();
      await videoConverterService.loadFFmpeg();
      const loadTime = ((Date.now() - loadStartTime) / 1000).toFixed(1);
      
      // Atualizar status: Convertendo
      if (statusElement) {
        statusElement.textContent = `⚙️ Convertendo para MP4 (conversão rápida)...`;
        statusElement.style.color = 'var(--accent)';
      }
      updateStatus('⚙️ Convertendo para MP4...');
      
      const startTime = Date.now();
      
      // Converter sem redimensionamento (mais rápido)
      const mp4Blob = await videoConverterService.convertWebMToMP4(recordingBlob, {
        // Sem width/height = conversão sem redimensionamento
      });
      
      const conversionTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Download] Conversão concluída em ${conversionTime}s`);
      
      const filename = `gravacao-MP4-${timestamp}.mp4`;
      const url = URL.createObjectURL(mp4Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      
      if (statusElement) {
        statusElement.textContent = `⬇️ Download iniciado!`;
        statusElement.style.color = 'var(--success)';
      }
      
      const mp4SizeMB = (mp4Blob.size / 1024 / 1024).toFixed(2);
      updateStatus(`⬇️ Download iniciado: MP4 (${mp4SizeMB} MB, ${conversionTime}s)`);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    
    // Obter preset de conversão (formatos específicos com redimensionamento)
    const preset = VideoConverterService.getPreset(format);
    
    if (!preset) {
      throw new Error('Formato inválido selecionado');
    }
    
    // Atualizar status: Carregando FFmpeg
    if (statusElement) {
      statusElement.style.display = 'block';
      statusElement.textContent = '⏳ Carregando conversor...';
      statusElement.style.color = 'var(--warning)';
    }
    updateStatus('⏳ Carregando FFmpeg.wasm...');
    
    const loadStartTime = Date.now();
    
    // Carregar FFmpeg (apenas primeira vez)
    await videoConverterService.loadFFmpeg();
    
    const loadTime = ((Date.now() - loadStartTime) / 1000).toFixed(1);
    if (loadTime > 0.5) {
      console.log(`[Download] FFmpeg carregado em ${loadTime}s`);
    }
    
    // Estimar tempo de conversão baseado no tamanho
    const inputSizeMB = recordingBlob.size / 1024 / 1024;
    const estimatedMinutes = Math.ceil(inputSizeMB * 1.5); // ~90 segundos por MB (mais realista)
    
    // Atualizar status: Convertendo com estimativa
    if (statusElement) {
      statusElement.textContent = `⚙️ Convertendo para ${preset.label}... (Estimativa: ${estimatedMinutes}min)`;
      statusElement.style.color = 'var(--accent)';
    }
    updateStatus(`⚙️ Convertendo para ${preset.label}... (pode demorar ~${estimatedMinutes}min)`);
    
    const startTime = Date.now();
    
    // Converter WebM para MP4
    const mp4Blob = await videoConverterService.convertWebMToMP4(recordingBlob, {
      width: preset.width,
      height: preset.height,
      bitrate: preset.bitrate,
      format: preset.format
    });
    
    const conversionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Download] Conversão concluída em ${conversionTime}s`);
    
    // Determinar nome do arquivo
    const platformName = format.split('-')[0].toUpperCase();
    const resolution = format.split('-')[1] || 'custom';
    const filename = `gravacao-${platformName}-${resolution}-${timestamp}.mp4`;
    
    // Download imediato do arquivo MP4
    const url = URL.createObjectURL(mp4Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    // Atualizar status
    if (statusElement) {
      statusElement.textContent = `⬇️ Download iniciado!`;
      statusElement.style.color = 'var(--success)';
    }
    
    const outputSizeMB = (mp4Blob.size / 1024 / 1024).toFixed(2);
    updateStatus(`⬇️ Download iniciado: ${preset.label} (${outputSizeMB} MB)`);
    
    // Limpar URL após um breve delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
  } catch (error) {
    console.error('[Download] Erro:', error);
    updateStatus(`❌ Erro ao processar vídeo: ${error.message}`, 'error');
    throw error; // Propagar erro para o event listener
  }
}

/**
 * Editor de Vídeo Vertical (9:16)
 * Permite editar vídeos verticais adicionando emojis, textos e webcam como elementos
 */
async function openVerticalVideoEditor(selectedFormat) {
  console.log('[Editor] Abrindo editor de vídeo vertical:', selectedFormat);
  
  const modal = document.createElement('div');
  modal.className = 'device-modal active';

  // Overlay escuro cobrindo tudo
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    overflow: hidden;
  `;

  modal.innerHTML = `
    <div style="
      width: min(1440px, 96vw);
      height: min(96vh, 940px);
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      border-radius: 12px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.7);
      box-sizing: border-box;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: clamp(10px,1.2vh,16px) clamp(14px,1.5vw,24px); background: var(--panel); border-bottom: 2px solid var(--border); flex-shrink: 0;">
        <div>
          <h3 style="font-size: clamp(13px,1.1vw,17px); margin: 0;">✨ Editor de Composição Vertical (9:16)</h3>
          <p style="color: var(--text-muted); font-size: clamp(11px,0.9vw,13px); margin-top: 4px;">
            📱 Posicione o vídeo e adicione elementos • ${selectedFormat} • Exportação: 1080x1920
          </p>
        </div>
        <button id="close-editor" class="btn-secondary" style="padding: clamp(6px,0.5vh,8px) clamp(12px,1vw,16px); font-size: clamp(11px,0.9vw,14px); margin: 0; flex-shrink: 0;">✖ Fechar</button>
      </div>
      
      <div style="flex: 1; display: grid; grid-template-columns: minmax(0, clamp(180px, 20vw, 280px)) 1fr minmax(0, clamp(160px, 17vw, 210px)); gap: clamp(6px,0.8vw,12px); overflow: hidden; padding: clamp(6px,0.8vh,12px); background: var(--bg); min-width: 0;">
        <!-- Painel Esquerdo: Elementos -->
        <div style="background: var(--panel-dark); border-radius: 12px; padding: 10px; overflow: hidden; display: flex; flex-direction: column; gap: 8px;">
          <h4 style="font-size: 13px; margin: 0;">📦 Elementos</h4>
          
          <!-- Emojis -->
          <div>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 4px;">Emojis:</p>
            <div id="emoji-list" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px;">
              <div class="draggable-element emoji-item" data-type="emoji" data-value="😀" style="font-size: 20px; text-align: center; cursor: grab; padding: 4px; background: var(--panel-light); border-radius: 6px;" draggable="true">😀</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="❤️" style="font-size: 20px; text-align: center; cursor: grab; padding: 4px; background: var(--panel-light); border-radius: 6px;" draggable="true">❤️</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="🔥" style="font-size: 20px; text-align: center; cursor: grab; padding: 4px; background: var(--panel-light); border-radius: 6px;" draggable="true">🔥</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="⭐" style="font-size: 20px; text-align: center; cursor: grab; padding: 4px; background: var(--panel-light); border-radius: 6px;" draggable="true">⭐</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="✨" style="font-size: 20px; text-align: center; cursor: grab; padding: 4px; background: var(--panel-light); border-radius: 6px;" draggable="true">✨</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="💯" style="font-size: 20px; text-align: center; cursor: grab; padding: 4px; background: var(--panel-light); border-radius: 6px;" draggable="true">💯</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="👍" style="font-size: 20px; text-align: center; cursor: grab; padding: 4px; background: var(--panel-light); border-radius: 6px;" draggable="true">👍</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="🎉" style="font-size: 20px; text-align: center; cursor: grab; padding: 4px; background: var(--panel-light); border-radius: 6px;" draggable="true">🎉</div>
            </div>
          </div>
          
          <!-- Texto -->
          <div>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 4px;">Texto:</p>
            <input type="text" id="text-input" placeholder="Digite seu texto..." style="width: 100%; padding: 6px 8px; background: var(--panel-light); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 12px; margin-bottom: 4px; box-sizing: border-box;">
            <button id="add-text-btn" class="btn-primary" style="width: 100%; padding: 6px; font-size: 12px; margin: 0;">➕ Adicionar Texto</button>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">
              Ajuste depois em Camadas com A- e A+
            </div>
          </div>
          
          <!-- Webcam Gravada -->
          <div>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 4px;">Webcam:</p>
            <button id="add-webcam-btn" class="btn-secondary" style="width: 100%; padding: 6px; font-size: 12px; margin: 0;">📹 Adicionar Webcam</button>
          </div>

          <div style="border-top: 1px solid var(--border); padding-top: 8px;">
            <h4 style="font-size: 12px; margin: 0 0 6px;">🎬 Vídeo Principal</h4>
            
            <!-- Zoom Extra -->
            <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 3px;">🔍 Zoom:</p>
            <input type="range" id="video-position-slider" min="0" max="50" value="0" step="1" style="width: 100%; margin-bottom: 4px; accent-color: var(--accent); height: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 8px;">
              <button id="position-top" class="btn-secondary" style="padding: 4px; font-size: 10px; margin: 0;">Normal</button>
              <button id="position-center" class="btn-secondary" style="padding: 4px; font-size: 10px; margin: 0;">+20%</button>
              <button id="position-bottom" class="btn-secondary" style="padding: 4px; font-size: 10px; margin: 0;">+50%</button>
            </div>
            
            <!-- Escala -->
            <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 3px;">📏 Escala:</p>
            <input type="range" id="video-scale-slider" min="50" max="150" value="100" step="1" style="width: 100%; margin-bottom: 4px; accent-color: var(--success); height: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 6px;">
              <button id="scale-small" class="btn-secondary" style="padding: 4px; font-size: 10px; margin: 0;">Menor</button>
              <button id="scale-normal" class="btn-secondary" style="padding: 4px; font-size: 10px; margin: 0;">Normal</button>
              <button id="scale-large" class="btn-secondary" style="padding: 4px; font-size: 10px; margin: 0;">Maior</button>
            </div>
            
            <div id="video-info" style="font-size: 10px; color: var(--text-muted); text-align: center; padding: 5px; background: rgba(59, 130, 246, 0.1); border-radius: 6px;">
              Zoom: <span id="video-y">100%</span> • Escala: <span id="video-scale">100%</span>
            </div>
          </div>
        </div>
        
        <!-- Área Central: Editor + Preview Canvas -->
        <div style="display: flex; flex-direction: column; background: var(--panel-dark); border-radius: 12px; overflow: hidden; padding: 12px; gap: 8px; height: 100%; box-sizing: border-box;">
          
          <!-- Título do Preview -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
            <div>
              <h4 style="margin: 0; font-size: 13px; color: var(--text);">📱 Editor</h4>
            </div>
            <div>
              <h4 style="margin: 0; font-size: 13px; color: var(--accent);">🎬 Preview Final</h4>
            </div>
          </div>
          
          <!-- Container com Phone-device e Canvas lado a lado -->
          <div style="display: flex; gap: clamp(8px,1.2vw,16px); align-items: stretch; justify-content: center; flex: 1; min-height: 0; width: 100%;">
            
            <!-- Phone-device (Referência Visual) -->
            <div id="phone-device" style="position: relative; aspect-ratio: 9/16; height: 100%; max-height: 100%; background: linear-gradient(145deg, #1a1a1a, #0a0a0a); border-radius: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.8), inset 0 0 0 3px #333, inset 0 0 0 8px #111; overflow: hidden; border: 4px solid #222; flex-shrink: 0;">
              <!-- Notch do celular -->
              <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 140px; height: 30px; background: #000; border-radius: 0 0 20px 20px; z-index: 100;"></div>
              
              <!-- Área de composição (canvas de fundo) -->
              <div id="drop-zone" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <!-- Vídeo de fundo (cobertura total 9:16 - sem faixas) -->
                <video id="editor-video" src="" autoplay loop muted style="width: 100%; height: 31.6%; object-fit: cover; position: absolute; top: 34.2%; left: 0;"></video>
                
                <!-- Mensagem de ajuda -->
                <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.9); color: var(--text-muted); padding: 8px 16px; border-radius: 8px; font-size: 11px; text-align: center; border: 1px solid var(--accent); max-width: 280px;">
                  💡 Use os controles à esquerda para ajustar posição e tamanho do vídeo
                </div>
              </div>
            </div>
            
            <!-- Canvas de Preview Final (Renderização Real) -->
            <div style="position: relative;">
              <canvas id="preview-canvas" width="360" height="640" style="aspect-ratio: 9/16; height: 100%; max-height: 100%; background: #000; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 2px var(--accent); flex-shrink: 0; display: block;"></canvas>
              
              <!-- Indicador de Preview em Tempo Real -->
              <div style="position: absolute; top: 8px; right: 8px; background: linear-gradient(135deg, var(--success), var(--accent)); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);">
                ✓ WYSIWYG
              </div>
              
              <!-- FPS Counter -->
              <div id="preview-fps" style="position: absolute; top: 8px; left: 8px; background: rgba(0, 0, 0, 0.8); color: var(--accent); padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; font-family: monospace;">
                FPS: --
              </div>
              
              <!-- Resolução Indicador -->
              <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0, 0, 0, 0.9); color: var(--text); padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; font-family: monospace; border: 1px solid var(--accent);">
                <div style="color: var(--success); font-size: 9px; margin-bottom: 2px;">PREVIEW</div>
                <div>360×640</div>
              </div>
              
              <!-- Exportação Info -->
              <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0, 0, 0, 0.9); color: var(--text); padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; font-family: monospace; border: 1px solid var(--warning);">
                <div style="color: var(--warning); font-size: 9px; margin-bottom: 2px;">EXPORTAÇÃO</div>
                <div>1080×1920</div>
              </div>
            </div>
            
          </div>
          
          <!-- Barra de Progresso da Exportação -->
          <div id="export-progress-container" style="width: 100%; display: none; margin-top: 16px;">
            <div style="background: var(--panel-light); border-radius: 12px; padding: 16px; border: 2px solid var(--accent);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="margin: 0; font-size: 14px; color: var(--text);">🎬 Exportando Vídeo...</h4>
                <span id="export-percentage" style="font-size: 18px; font-weight: 700; color: var(--accent);">0%</span>
              </div>
              
              <!-- Barra de progresso -->
              <div style="width: 100%; height: 12px; background: var(--panel-dark); border-radius: 6px; overflow: hidden; margin-bottom: 12px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                <div id="export-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--accent), var(--success)); transition: width 0.3s ease; border-radius: 6px;"></div>
              </div>
              
              <!-- Info de tempo -->
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted);">
                <span id="export-time-info">Renderizando: 0.0s / 0.0s</span>
                <span id="export-status">Preparando...</span>
              </div>
            </div>
          </div>
          
          <!-- Botões de Ação dentro do editor -->
          <div id="action-buttons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex-shrink: 0;">
            <button id="export-video-btn" class="btn-success" style="padding: 10px; font-size: 13px; margin: 0;">
              ⬇️ Exportar Vídeo
            </button>
            <button id="cancel-editor-btn" class="btn-secondary" style="padding: 10px; font-size: 13px; margin: 0;">
              ❌ Cancelar
            </button>
          </div>
        </div>
        
        <!-- Painel Direito: Câmera + Moldura + Camadas -->
        <div style="background: var(--panel-dark); border-radius: 12px; padding: 10px; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 8px;">
          
          <h4 style="font-size: 12px; margin: 0; color: var(--text);">📹 Câmera</h4>

          <div id="webcam-top-controls">
            <button id="toggle-webcam-top" class="btn-secondary" style="width: 100%; padding: 6px; font-size: 11px; margin: 0 0 6px;">
              ➕ Adicionar Câmera
            </button>

            <div id="webcam-top-options" style="display: none; flex-direction: column; gap: 6px;">

              <!-- ── TAMANHO ── -->
              <p style="font-size: 10px; font-weight:700; color: var(--accent); margin: 0 0 2px; letter-spacing:.3px;">📐 TAMANHO</p>

              <p style="font-size: 9px; color: var(--text-muted); margin: 0;">↕ Altura:</p>
              <div style="display: flex; align-items: center; gap: 4px;">
                <input type="range" id="webcam-height-slider" min="10" max="65" value="30" step="1"
                  style="flex: 1; accent-color: var(--accent); height: 12px; margin: 0;">
                <span id="webcam-height-val" style="font-size: 10px; color: var(--accent); min-width: 28px; text-align: right;">30%</span>
              </div>

              <p style="font-size: 9px; color: var(--text-muted); margin: 0;">↔ Largura:</p>
              <div style="display: flex; align-items: center; gap: 4px;">
                <input type="range" id="webcam-width-slider" min="20" max="100" value="100" step="1"
                  style="flex: 1; accent-color: var(--accent); height: 12px; margin: 0;">
                <span id="webcam-width-val" style="font-size: 10px; color: var(--accent); min-width: 28px; text-align: right;">100%</span>
              </div>

              <div style="border-top: 1px solid var(--border); padding-top: 6px;">

                <!-- ── FORMA ── -->
                <p style="font-size: 10px; font-weight:700; color: var(--accent); margin: 0 0 4px; letter-spacing:.3px;">🔷 FORMA</p>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; margin-bottom: 6px;">
                  <button class="frame-shape-btn active" data-shape="square"   style="padding:5px 2px;font-size:8px;border:2px solid var(--accent);background:rgba(59,130,246,0.15);border-radius:5px;cursor:pointer;color:var(--text);">▪ Quad.</button>
                  <button class="frame-shape-btn" data-shape="rounded"          style="padding:5px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">▣ Round</button>
                  <button class="frame-shape-btn" data-shape="pill"             style="padding:5px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">⬭ Pílula</button>
                  <button class="frame-shape-btn" data-shape="circle"           style="padding:5px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">● Circ.</button>
                  <button class="frame-shape-btn" data-shape="diamond"          style="padding:5px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">♦ Losang.</button>
                  <button class="frame-shape-btn" data-shape="hexagon"          style="padding:5px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">⬡ Hex.</button>
                  <button class="frame-shape-btn" data-shape="oval"             style="padding:5px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">⬭ Oval</button>
                  <button class="frame-shape-btn" data-shape="rect-h"           style="padding:5px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">▬ Wide</button>
                </div>

                <!-- ── ARREDONDAMENTO ── -->
                <p style="font-size: 9px; color: var(--text-muted); margin: 0 0 2px;">🔵 Arredondamento:</p>
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                  <input type="range" id="frame-radius-slider" min="0" max="50" value="0" step="1"
                    style="flex: 1; accent-color: var(--accent); height: 10px; margin: 0;">
                  <span id="frame-radius-val" style="font-size: 9px; color: var(--accent); min-width: 24px; text-align: right;">0px</span>
                </div>

                <!-- ── ESPESSURA DA BORDA ── -->
                <p style="font-size: 10px; font-weight:700; color: var(--accent); margin: 0 0 3px; letter-spacing:.3px;">🖊 BORDA</p>
                <p style="font-size: 9px; color: var(--text-muted); margin: 0 0 2px;">Espessura:</p>
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                  <input type="range" id="frame-thickness-slider" min="0" max="20" value="0" step="1"
                    style="flex: 1; accent-color: var(--accent); height: 10px; margin: 0;">
                  <span id="frame-thickness-val" style="font-size: 9px; color: var(--accent); min-width: 24px; text-align: right;">0px</span>
                </div>

                <!-- ── COR DA BORDA ── -->
                <p style="font-size: 9px; color: var(--text-muted); margin: 0 0 3px;">Cor da borda:</p>
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 4px;">
                  <div class="border-color-swatch active" data-color="#ffffff" style="height:18px;background:#ffffff;border-radius:4px;cursor:pointer;border:2px solid var(--accent);"></div>
                  <div class="border-color-swatch" data-color="#000000"         style="height:18px;background:#000000;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#3b82f6"         style="height:18px;background:#3b82f6;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#f59e0b"         style="height:18px;background:#f59e0b;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#10b981"         style="height:18px;background:#10b981;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#ef4444"         style="height:18px;background:#ef4444;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#8b5cf6"         style="height:18px;background:#8b5cf6;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#ec4899"         style="height:18px;background:#ec4899;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#f97316"         style="height:18px;background:#f97316;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#06b6d4"         style="height:18px;background:#06b6d4;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#84cc16"         style="height:18px;background:#84cc16;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#fbbf24"         style="height:18px;background:#fbbf24;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#6366f1"         style="height:18px;background:#6366f1;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                  <div class="border-color-swatch" data-color="#14b8a6"         style="height:18px;background:#14b8a6;border-radius:4px;cursor:pointer;border:2px solid transparent;"></div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                  <label style="font-size: 9px; color: var(--text-muted);">Personalizada:</label>
                  <input type="color" id="frame-border-color-custom" value="#ffffff"
                    style="width: 28px; height: 20px; padding: 0; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; background: none;">
                </div>

                <!-- ── 15 MOLDURAS PREDEFINIDAS ── -->
                <p style="font-size: 10px; font-weight:700; color: var(--accent); margin: 0 0 4px; letter-spacing:.3px;">🖼 MOLDURA (15 modelos)</p>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; margin-bottom: 6px;">
                  <button class="frame-preset-btn active" data-preset="none"     style="padding:4px 2px;font-size:8px;border:2px solid var(--accent);background:rgba(59,130,246,0.15);border-radius:5px;cursor:pointer;color:var(--text);">⬜ Limpa</button>
                  <button class="frame-preset-btn" data-preset="white-solid"     style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">◻ Branca</button>
                  <button class="frame-preset-btn" data-preset="neon-blue"       style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">💙 Neon Az</button>
                  <button class="frame-preset-btn" data-preset="neon-pink"       style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">💗 Neon Ro</button>
                  <button class="frame-preset-btn" data-preset="neon-green"      style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">💚 Neon Ve</button>
                  <button class="frame-preset-btn" data-preset="gamer"           style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">🎮 Gamer</button>
                  <button class="frame-preset-btn" data-preset="gold"            style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">🥇 Ouro</button>
                  <button class="frame-preset-btn" data-preset="silver"          style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">🥈 Prata</button>
                  <button class="frame-preset-btn" data-preset="shadow-soft"     style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">🌑 Sombra</button>
                  <button class="frame-preset-btn" data-preset="glass"           style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">🔮 Glass</button>
                  <button class="frame-preset-btn" data-preset="rainbow"         style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">🌈 Rainbow</button>
                  <button class="frame-preset-btn" data-preset="fire"            style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">🔥 Fogo</button>
                  <button class="frame-preset-btn" data-preset="ice"             style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">🧊 Gelo</button>
                  <button class="frame-preset-btn" data-preset="double"          style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">🔲 Dupla</button>
                  <button class="frame-preset-btn" data-preset="dashed"          style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:5px;cursor:pointer;color:var(--text);">┅ Trace.</button>
                </div>

                <!-- ── EFEITOS ── -->
                <p style="font-size: 10px; font-weight:700; color: var(--accent); margin: 0 0 3px; letter-spacing:.3px;">✨ EFEITOS</p>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; margin-bottom: 6px;">
                  <button class="frame-effect-btn active" data-effect="none"     style="padding:4px 2px;font-size:8px;border:2px solid var(--accent);background:rgba(59,130,246,0.15);border-radius:4px;cursor:pointer;color:var(--text);">Nenhum</button>
                  <button class="frame-effect-btn" data-effect="shadow"          style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:4px;cursor:pointer;color:var(--text);">🌑 Sombra</button>
                  <button class="frame-effect-btn" data-effect="glow"            style="padding:4px 2px;font-size:8px;border:1px solid var(--border);background:var(--panel-light);border-radius:4px;cursor:pointer;color:var(--text);">✨ Brilho</button>
                </div>

                <!-- ── OPACIDADE ── -->
                <p style="font-size: 9px; color: var(--text-muted); margin: 0 0 2px;">👁 Opacidade:</p>
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
                  <input type="range" id="frame-opacity-slider" min="10" max="100" value="100" step="1"
                    style="flex: 1; accent-color: var(--accent); height: 10px; margin: 0;">
                  <span id="frame-opacity-val" style="font-size: 9px; color: var(--accent); min-width: 28px; text-align: right;">100%</span>
                </div>

                <!-- PREVIEW DA MOLDURA -->
                <p style="font-size: 9px; color: var(--text-muted); margin: 0 0 2px;">Preview:</p>
                <div style="background:#111;border-radius:8px;padding:6px;display:flex;align-items:center;justify-content:center;height:50px;margin-bottom:6px;">
                  <div id="frame-preview-box"
                    style="width:70px;height:40px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:0;border:0px solid #fff;"></div>
                </div>

              </div>

              <button id="remove-webcam-top" class="btn-danger" style="width: 100%; padding: 5px; font-size: 10px; margin: 0;">
                ✖ Remover Câmera
              </button>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border); padding-top: 6px;">
            <h4 style="font-size: 12px; margin: 0 0 4px;">🖥 Vídeo da Tela</h4>
            <p style="font-size: 10px; color: var(--text-muted); margin: 0 0 3px;">↕ Posição vertical:</p>
            <input type="range" id="screen-pan-slider" min="-100" max="100" value="0" step="1"
              style="width: 100%; accent-color: var(--accent); height: 14px; margin-bottom: 4px;">
            <p style="font-size: 10px; color: var(--text-muted); margin: 0 0 3px;">↔ Largura:</p>
            <input type="range" id="screen-width-slider" min="80" max="180" value="100" step="1"
              style="width: 100%; accent-color: var(--warning); height: 14px; margin-bottom: 4px;">
            <p style="font-size: 10px; color: var(--text-muted); margin: 0 0 3px;">↕ Altura:</p>
            <input type="range" id="screen-height-slider" min="80" max="220" value="100" step="1"
              style="width: 100%; accent-color: var(--warning); height: 14px; margin-bottom: 4px;">
            <p style="font-size: 10px; color: var(--text-muted); margin: 0 0 3px;">🔍 Escala geral:</p>
            <input type="range" id="screen-scale-slider" min="80" max="200" value="100" step="1"
              style="width: 100%; accent-color: var(--success); height: 14px; margin-bottom: 4px;">
            <div style="font-size: 10px; color: var(--accent); text-align: center;">
              Pan: <span id="screen-pan-val">0</span> • L: <span id="screen-width-val">100%</span> • A: <span id="screen-height-val">100%</span> • Escala: <span id="screen-scale-val">100%</span>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border); padding-top: 6px; flex: 1; min-height: 0;">
            <h4 style="font-size: 12px; margin: 0 0 4px;">🗂️ Camadas</h4>
            <div id="layers-list" style="display: flex; flex-direction: column; gap: 6px;">
              <p style="color: var(--text-muted); font-size: 11px; text-align: center;">Nenhum elemento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Configurar vídeo
  const editorVideo = modal.querySelector('#editor-video');
  editorVideo.src = URL.createObjectURL(recordingBlob);

  // ===== CONTROLES DO PAINEL DIREITO: WEBCAM NO TOPO + PAN + ESCALA =====
  
  let webcamToplayer = null;
  let webcamTopEl   = null;

  // Estado da moldura
  const frameState = {
    shape:     'square',  // square|rounded|pill|circle|diamond|hexagon|oval|rect-h
    thickness: 0,         // 0-20 px
    color:     '#ffffff', // cor da borda
    effect:    'none',    // none | shadow | glow
    radius:    0,         // 0-50 px (arredondamento manual)
    opacity:   1.0,       // 0.1-1.0
    preset:    'none',    // preset ativo
  };

  // Mapa shape → borderRadius CSS (fallback DOM; canvas usa CameraShapeRenderer)
  const SHAPE_RADIUS = {
    square:  '0px',
    rounded: '14px',
    pill:    '50px',
    circle:  '50%',
    diamond: '0px',
    hexagon: '0px',
    oval:    '50%',
    'rect-h':'0px',
  };

  // 15 presets: cada um sobrescreve alguns campos do frameState
  const FRAME_PRESETS = {
    'none':        { thickness:0,  color:'transparent',   effect:'none',    radius:0  },
    'white-solid': { thickness:4,  color:'#ffffff',        effect:'none',    radius:0  },
    'neon-blue':   { thickness:4,  color:'#00f7ff',        effect:'glow',    radius:0  },
    'neon-pink':   { thickness:4,  color:'#ff0090',        effect:'glow',    radius:0  },
    'neon-green':  { thickness:4,  color:'#39ff14',        effect:'glow',    radius:0  },
    'gamer':       { thickness:5,  color:'#ff00ff',        effect:'glow',    radius:4  },
    'gold':        { thickness:5,  color:'#fbbf24',        effect:'shadow',  radius:4  },
    'silver':      { thickness:4,  color:'#c0c0c0',        effect:'shadow',  radius:0  },
    'shadow-soft': { thickness:0,  color:'transparent',   effect:'shadow',  radius:8  },
    'glass':       { thickness:3,  color:'rgba(255,255,255,0.35)', effect:'none', radius:8 },
    'rainbow':     { thickness:6,  color:'#ff0080',        effect:'glow',    radius:6  },
    'fire':        { thickness:5,  color:'#f97316',        effect:'glow',    radius:4  },
    'ice':         { thickness:4,  color:'#06b6d4',        effect:'glow',    radius:6  },
    'double':      { thickness:6,  color:'#3b82f6',        effect:'none',    radius:0  },
    'dashed':      { thickness:4,  color:'#ffffff',        effect:'none',    radius:0  },
  };

  function _buildBoxShadow() {
    if (frameState.effect === 'shadow') return '0 8px 24px rgba(0,0,0,0.7)';
    if (frameState.effect === 'glow')   return `0 0 10px ${frameState.color}, 0 0 28px ${frameState.color}99`;
    return 'none';
  }

  function _resolveRadius() {
    // radius manual sobrepõe SHAPE_RADIUS quando definido
    if (frameState.radius > 0) return frameState.radius + 'px';
    return SHAPE_RADIUS[frameState.shape] || '0px';
  }

  function applyFrameToElement(el) {
    el.style.borderRadius = _resolveRadius();
    el.style.border       = frameState.thickness > 0 && frameState.color !== 'transparent'
      ? `${frameState.thickness}px solid ${frameState.color}`
      : 'none';
    el.style.overflow  = 'hidden';
    el.style.boxShadow = _buildBoxShadow();
    el.style.opacity   = String(frameState.opacity);
  }

  function _syncEngineLayer() {
    if (!webcamToplayer) return;
    webcamToplayer.borderRadius  = _resolveRadius();
    webcamToplayer.borderWidth   = frameState.thickness;
    webcamToplayer.borderColor   = frameState.color;
    webcamToplayer.glowEnabled   = frameState.effect === 'glow';
    webcamToplayer.shadowEnabled = frameState.effect === 'shadow';
    webcamToplayer.glowColor     = frameState.color;
    webcamToplayer.alpha         = frameState.opacity;
  }

  function _syncUI() {
    // slider radius
    const rs = modal.querySelector('#frame-radius-slider');
    const rv = modal.querySelector('#frame-radius-val');
    if (rs) { rs.value = frameState.radius; }
    if (rv) rv.textContent = frameState.radius + 'px';
    // slider espessura
    const ts = modal.querySelector('#frame-thickness-slider');
    const tv = modal.querySelector('#frame-thickness-val');
    if (ts) { ts.value = frameState.thickness; }
    if (tv) tv.textContent = frameState.thickness + 'px';
    // color picker
    const cp = modal.querySelector('#frame-border-color-custom');
    if (cp && frameState.color !== 'transparent') cp.value = frameState.color;
    // opacidade
    const os = modal.querySelector('#frame-opacity-slider');
    const ov = modal.querySelector('#frame-opacity-val');
    if (os) { os.value = Math.round(frameState.opacity * 100); }
    if (ov) ov.textContent = Math.round(frameState.opacity * 100) + '%';
  }

  function _updateFramePreview() {
    const box = modal.querySelector('#frame-preview-box');
    if (!box) return;
    box.style.borderRadius = _resolveRadius();
    box.style.opacity      = String(frameState.opacity);
    box.style.border       = frameState.thickness > 0 && frameState.color !== 'transparent'
      ? `${frameState.thickness}px solid ${frameState.color}`
      : '2px dashed #444';
    box.style.boxShadow    = _buildBoxShadow();
  }

  function getWebcamHeightPct() {
    const s = modal.querySelector('#webcam-height-slider');
    return s ? parseInt(s.value) / 100 : 0.3;
  }
  function getWebcamWidthPct() {
    const s = modal.querySelector('#webcam-width-slider');
    return s ? parseInt(s.value) / 100 : 1.0;
  }

  function updateWebcamTopDOM() {
    if (!webcamTopEl) return;
    const hPct   = getWebcamHeightPct();
    const wPct   = getWebcamWidthPct();
    const phone  = modal.querySelector('#phone-device');
    const phoneH = phone.offsetHeight;
    const phoneW = phone.offsetWidth;
    const h = phoneH * hPct;
    const w = phoneW * wPct;
    const left = (phoneW - w) / 2;
    webcamTopEl.style.height = h + 'px';
    webcamTopEl.style.width  = w + 'px';
    webcamTopEl.style.left   = left + 'px';
    const vid = webcamTopEl.querySelector('video');
    if (vid) applyFrameToElement(vid);
    if (webcamToplayer) {
      webcamToplayer.heightNormalized = hPct;
      webcamToplayer.widthNormalized  = wPct;
      _syncEngineLayer();
    }
    _updateFramePreview();
  }

  function addWebcamToTop() {
    const phone = modal.querySelector('#phone-device');
    if (webcamTopEl) return;
    const hPct   = getWebcamHeightPct();
    const wPct   = getWebcamWidthPct();
    const phoneH = phone.offsetHeight;
    const phoneW = phone.offsetWidth;
    const h    = phoneH * hPct;
    const w    = phoneW * wPct;
    const left = (phoneW - w) / 2;

    webcamTopEl = document.createElement('div');
    webcamTopEl.id = 'webcam-top-overlay';
    webcamTopEl.style.cssText = `position:absolute;top:0;left:${left}px;width:${w}px;height:${h}px;z-index:50;overflow:hidden;`;

    const vid = document.createElement('video');
    vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
    vid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    applyFrameToElement(vid);

    if (webcamRecordingBlob) {
      vid.src = URL.createObjectURL(webcamRecordingBlob);
    } else if (elements.webcamPreview && elements.webcamPreview.srcObject) {
      vid.srcObject = elements.webcamPreview.srcObject;
    } else {
      updateStatus('⚠️ Nenhum vídeo de câmera disponível.', 'error');
      return;
    }

    webcamTopEl.appendChild(vid);
    phone.querySelector('#drop-zone').appendChild(webcamTopEl);
    vid.play().catch(() => {});

    webcamToplayer = new WebcamTopLayer(editorEngine.generateId(), vid);
    webcamToplayer.heightNormalized = hPct;
    webcamToplayer.widthNormalized  = wPct;
    _syncEngineLayer();
    webcamToplayer.zIndex = 100;
    editorEngine.addLayer(webcamToplayer);

    modal.querySelector('#webcam-top-options').style.display = 'flex';
    modal.querySelector('#toggle-webcam-top').textContent = '✅ Câmera Ativa';
    _updateFramePreview();
  }

  function removeWebcamFromTop() {
    if (webcamToplayer) { editorEngine.removeLayer(webcamToplayer.id); webcamToplayer = null; }
    if (webcamTopEl)    { webcamTopEl.remove(); webcamTopEl = null; }
    modal.querySelector('#webcam-top-options').style.display = 'none';
    modal.querySelector('#toggle-webcam-top').textContent = '➕ Adicionar Câmera';
  }

  // --- Event Listeners ---

  modal.querySelector('#toggle-webcam-top').addEventListener('click', () => {
    webcamTopEl ? removeWebcamFromTop() : addWebcamToTop();
  });
  modal.querySelector('#remove-webcam-top').addEventListener('click', removeWebcamFromTop);

  modal.querySelector('#webcam-height-slider').addEventListener('input', (e) => {
    modal.querySelector('#webcam-height-val').textContent = e.target.value + '%';
    updateWebcamTopDOM();
  });

  modal.querySelector('#webcam-width-slider').addEventListener('input', (e) => {
    modal.querySelector('#webcam-width-val').textContent = e.target.value + '%';
    updateWebcamTopDOM();
  });

  // Botões de forma geométrica (8 shapes)
  function _refreshBtnGroup(selector, activeDataKey, activeValue) {
    modal.querySelectorAll(selector).forEach(b => {
      const isActive = b.dataset[activeDataKey] === activeValue;
      b.style.borderWidth = isActive ? '2px' : '1px';
      b.style.borderColor = isActive ? 'var(--accent)' : 'var(--border)';
      b.style.background  = isActive ? 'rgba(59,130,246,0.15)' : 'var(--panel-light)';
    });
  }

  modal.querySelectorAll('.frame-shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      frameState.shape  = btn.dataset.shape;
      frameState.radius = 0;                        // reset radius manual ao trocar shape
      _refreshBtnGroup('.frame-shape-btn', 'shape', frameState.shape);
      _syncUI();
      if (webcamTopEl) applyFrameToElement(webcamTopEl.querySelector('video'));
      _syncEngineLayer();
      _updateFramePreview();
    });
  });

  // Slider de arredondamento
  modal.querySelector('#frame-radius-slider').addEventListener('input', (e) => {
    frameState.radius = parseInt(e.target.value);
    modal.querySelector('#frame-radius-val').textContent = frameState.radius + 'px';
    if (webcamTopEl) applyFrameToElement(webcamTopEl.querySelector('video'));
    _syncEngineLayer();
    _updateFramePreview();
  });

  // Slider de espessura
  modal.querySelector('#frame-thickness-slider').addEventListener('input', (e) => {
    frameState.thickness = parseInt(e.target.value);
    modal.querySelector('#frame-thickness-val').textContent = frameState.thickness + 'px';
    if (webcamTopEl) applyFrameToElement(webcamTopEl.querySelector('video'));
    _syncEngineLayer();
    _updateFramePreview();
  });

  // Swatches de cor (14 swatches)
  modal.querySelectorAll('.border-color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      modal.querySelectorAll('.border-color-swatch').forEach(s => s.style.borderColor = 'transparent');
      swatch.style.borderColor = 'var(--accent)';
      frameState.color = swatch.dataset.color;
      modal.querySelector('#frame-border-color-custom').value = frameState.color;
      if (webcamTopEl) applyFrameToElement(webcamTopEl.querySelector('video'));
      _syncEngineLayer();
      _updateFramePreview();
    });
  });

  // Cor personalizada
  modal.querySelector('#frame-border-color-custom').addEventListener('input', (e) => {
    frameState.color = e.target.value;
    modal.querySelectorAll('.border-color-swatch').forEach(s => s.style.borderColor = 'transparent');
    if (webcamTopEl) applyFrameToElement(webcamTopEl.querySelector('video'));
    _syncEngineLayer();
    _updateFramePreview();
  });

  // 15 Presets de moldura
  modal.querySelectorAll('.frame-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const cfg    = FRAME_PRESETS[preset];
      if (!cfg) return;
      Object.assign(frameState, cfg, { preset });
      _refreshBtnGroup('.frame-preset-btn', 'preset', preset);
      _syncUI();
      if (webcamTopEl) applyFrameToElement(webcamTopEl.querySelector('video'));
      _syncEngineLayer();
      _updateFramePreview();
    });
  });

  // Botões de efeito
  modal.querySelectorAll('.frame-effect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      frameState.effect = btn.dataset.effect;
      _refreshBtnGroup('.frame-effect-btn', 'effect', frameState.effect);
      if (webcamTopEl) applyFrameToElement(webcamTopEl.querySelector('video'));
      _syncEngineLayer();
      _updateFramePreview();
    });
  });

  // Slider de opacidade
  modal.querySelector('#frame-opacity-slider').addEventListener('input', (e) => {
    frameState.opacity = parseInt(e.target.value) / 100;
    modal.querySelector('#frame-opacity-val').textContent = e.target.value + '%';
    if (webcamTopEl) applyFrameToElement(webcamTopEl.querySelector('video'));
    _syncEngineLayer();
    _updateFramePreview();
  });

  // Frações do canvas para o vídeo 16:9 centrado em 9:16
  const VIDEO_H_FRAC = (9 / 16) * (9 / 16); // ≈ 0.3164
  const VIDEO_Y_FRAC = (1 - VIDEO_H_FRAC) / 2; // ≈ 0.3418
  const VIDEO_CENTER_Y_FRAC = VIDEO_Y_FRAC + (VIDEO_H_FRAC / 2);
  let _videoPanVal = 0;
  let _videoScaleVal = 1.0;
  let _videoWidthVal = 1.0;
  let _videoHeightVal = 1.0;

  function _syncMainVideoLayout() {
    const widthFrac = _videoScaleVal * _videoWidthVal;
    const heightFrac = VIDEO_H_FRAC * _videoScaleVal * _videoHeightVal;
    const leftFrac = (1 - widthFrac) / 2;
    const topFrac = (VIDEO_CENTER_Y_FRAC - (heightFrac / 2)) + ((_videoPanVal / 100) * 0.3);
    const useCoverFit = _videoWidthVal !== 1.0 || _videoHeightVal !== 1.0;

    editorVideo.style.left = `${(leftFrac * 100).toFixed(1)}%`;
    editorVideo.style.top = `${(topFrac * 100).toFixed(1)}%`;
    editorVideo.style.width = `${(widthFrac * 100).toFixed(1)}%`;
    editorVideo.style.height = `${(heightFrac * 100).toFixed(1)}%`;
    editorVideo.style.transform = '';
    editorVideo.style.transformOrigin = 'center center';
    editorVideo.style.objectFit = useCoverFit ? 'cover' : 'contain';

    if (mainVideoLayer) {
      mainVideoLayer.x = leftFrac;
      mainVideoLayer.y = VIDEO_CENTER_Y_FRAC - (heightFrac / 2);
      mainVideoLayer.width = widthFrac;
      mainVideoLayer.height = heightFrac;
      mainVideoLayer.scale = 1.0;
      mainVideoLayer.panY = (_videoPanVal / 100) * 0.6;
      mainVideoLayer.fitMode = useCoverFit ? 'cover' : 'contain';
    }
  }

  // Pan vertical do vídeo da tela
  modal.querySelector('#screen-pan-slider').addEventListener('input', (e) => {
    const val = parseInt(e.target.value); // -100 a +100
    modal.querySelector('#screen-pan-val').textContent = val;
    _videoPanVal = val;
    _syncMainVideoLayout();
  });

  modal.querySelector('#screen-width-slider').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    modal.querySelector('#screen-width-val').textContent = val + '%';
    _videoWidthVal = val / 100;
    _syncMainVideoLayout();
  });

  modal.querySelector('#screen-height-slider').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    modal.querySelector('#screen-height-val').textContent = val + '%';
    _videoHeightVal = val / 100;
    _syncMainVideoLayout();
  });

  // Escala do vídeo da tela
  modal.querySelector('#screen-scale-slider').addEventListener('input', (e) => {
    const val = parseInt(e.target.value); // 80 a 200
    modal.querySelector('#screen-scale-val').textContent = val + '%';
    _videoScaleVal = val / 100;
    _syncMainVideoLayout();
  });
  
  // ===== INICIALIZAÇÃO DO ENGINE OOP =====
  const editorEngine = new EditorEngine();
  const renderEngine = new RenderCanvasEngine(editorEngine);
  const exportManager = new ExportManager(editorEngine, renderEngine);
  
  console.log('[Editor] Engine OOP inicializado ✅');
  
  // SISTEMA HÍBRIDO: Canvas 9:16 com vídeo 16:9 posicionável
  // Vídeo 16:9 (landscape) fica dentro do canvas 9:16 (vertical)
  // Usuário pode mover o vídeo para cima/baixo e redimensionar
  // Áreas livres (topo, laterais, base) para adicionar elementos (webcam, emoji, texto)
  // Exportação final: 1080x1920 com todos os elementos
  
  // Criar camada de vídeo principal — vídeo 16:9 centralizado dentro do canvas 9:16
  // Largura: 100% do canvas. Altura: fração 16:9 (≈31.6%). Y: centrado (≈34.2%).
  // O usuário pode mover (pan) e redimensionar (scale) via controles laterais.
  const mainVideoLayer = new VideoLayer(editorEngine.generateId(), editorVideo);
  mainVideoLayer.x      = 0;
  mainVideoLayer.y      = VIDEO_Y_FRAC;   // ≈ 0.342 — centrado verticalmente
  mainVideoLayer.width  = 1.0;
  mainVideoLayer.height = VIDEO_H_FRAC;   // ≈ 0.316 — faixa 16:9 dentro do 9:16
  mainVideoLayer.scale  = 1.0;
  mainVideoLayer.panY   = 0;
  mainVideoLayer.zIndex = 0;              // vídeo principal sempre atrás dos elementos
  mainVideoLayer.maintainAspectRatio = true;
  mainVideoLayer.fitMode = 'contain';     // sem corte, sem distorção
  
  editorEngine.addLayer(mainVideoLayer);
  
  console.log('[Editor] Camadas base criadas:', editorEngine.layers.length);
  
  // ===== PREVIEW EM TEMPO REAL COM CANVAS =====
  const previewCanvas = modal.querySelector('#preview-canvas');
  const previewFpsElement = modal.querySelector('#preview-fps');
  const previewCtx = previewCanvas.getContext('2d');
  
  let animationFrameId = null;
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let fpsUpdateTime = performance.now();
  
  // Loop de renderização em tempo real
  function renderPreviewLoop() {
    const currentTime = performance.now();
    
    // Renderizar frame no canvas de preview
    renderEngine.renderFrame(previewCtx, previewCanvas.width, previewCanvas.height);
    
    // Calcular FPS
    frameCount++;
    const elapsed = currentTime - fpsUpdateTime;
    
    if (elapsed >= 1000) { // Atualizar FPS a cada 1 segundo
      const fps = Math.round((frameCount / elapsed) * 1000);
      previewFpsElement.textContent = `FPS: ${fps}`;
      frameCount = 0;
      fpsUpdateTime = currentTime;
    }
    
    // Próximo frame
    animationFrameId = requestAnimationFrame(renderPreviewLoop);
  }
  
  // Iniciar loop de preview
  console.log('[Editor] Iniciando preview em tempo real...');
  console.log('[Editor] 🎬 SISTEMA HÍBRIDO:');
  console.log('[Editor] - Canvas: 1080x1920 (9:16 vertical - exportação)');
  console.log('[Editor] - Vídeo: 16:9 (landscape - posicionável dentro do canvas)');
  console.log('[Editor] - Áreas livres: topo, laterais, base (para elementos)');
  console.log('[Editor] - Controles: posição Y + largura + altura + escala');
  console.log('[Editor] 📺 Preview (360x640) → 📱 Exportação (1080x1920)');
  console.log('[Editor] ✓ WYSIWYG: Coordenadas normalizadas = posicionamento idêntico');
  renderPreviewLoop();
  
  // Estado para rastreamento de elementos adicionados (compatibilidade UI)
  const editorState = {
    elements: [], // Array para lista de camadas na sidebar
    nextId: 1
  };
  
  const dropZone = modal.querySelector('#drop-zone');
  const layersList = modal.querySelector('#layers-list');
  const phoneDevice = modal.querySelector('#phone-device');
  const videoPositionSlider = modal.querySelector('#video-position-slider');
  const videoScaleSlider = modal.querySelector('#video-scale-slider');
  const videoYSpan = modal.querySelector('#video-y');
  const videoScaleSpan = modal.querySelector('#video-scale');
  
  // Controle de zoom extra do vídeo (painel esquerdo)
  function updateVideoPosition(zoomPercent) {
    zoomPercent = Math.max(100, Math.min(150, zoomPercent));
    _videoScaleVal = zoomPercent / 100;
    videoYSpan.textContent = `${zoomPercent}%`;
    videoPositionSlider.value = (zoomPercent - 100) * 2;
    modal.querySelector('#screen-scale-slider').value = zoomPercent;
    modal.querySelector('#screen-scale-val').textContent = `${zoomPercent}%`;
    _syncMainVideoLayout();
  }
  
  // Controle de escala do vídeo (painel esquerdo)
  function updateVideoScale(scalePercent) {
    scalePercent = Math.max(50, Math.min(150, scalePercent));
    _videoScaleVal = scalePercent / 100;
    videoScaleSpan.textContent = `${scalePercent}%`;
    videoScaleSlider.value = scalePercent;
    modal.querySelector('#screen-scale-slider').value = scalePercent;
    modal.querySelector('#screen-scale-val').textContent = `${scalePercent}%`;
    _syncMainVideoLayout();
  }

  _syncMainVideoLayout();
  
  // Event listeners para sliders
  videoPositionSlider.addEventListener('input', (e) => {
    // Slider 0-50 → zoom 100%-150%
    updateVideoPosition(100 + parseInt(e.target.value));
  });
  
  videoScaleSlider.addEventListener('input', (e) => {
    updateVideoScale(parseInt(e.target.value));
  });
  
  // Botões de preset de zoom (reutiliza posição top/center/bottom → zoom low/normal/high)
  modal.querySelector('#position-top').addEventListener('click', () => {
    updateVideoPosition(100); // Sem zoom (cobertura exata 9:16)
  });
  
  modal.querySelector('#position-center').addEventListener('click', () => {
    updateVideoPosition(120); // Zoom moderado (+20%)
  });
  
  modal.querySelector('#position-bottom').addEventListener('click', () => {
    updateVideoPosition(150); // Zoom máximo (+50%)
  });
  
  // Botões de preset de escala
  modal.querySelector('#scale-small').addEventListener('click', () => {
    updateVideoScale(75); // 75% do tamanho
  });
  
  modal.querySelector('#scale-normal').addEventListener('click', () => {
    updateVideoScale(100); // Tamanho original
  });
  
  modal.querySelector('#scale-large').addEventListener('click', () => {
    updateVideoScale(125); // 125% do tamanho
  });
  
  // Drag and Drop - Início do arrasto
  const draggableElements = modal.querySelectorAll('.draggable-element');
  draggableElements.forEach(elem => {
    elem.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('type', elem.dataset.type);
      e.dataTransfer.setData('value', elem.dataset.value);
      elem.style.opacity = '0.5';
    });
    
    elem.addEventListener('dragend', (e) => {
      elem.style.opacity = '1';
    });
  });
  
  // Drop Zone - Permitir drop
  phoneDevice.addEventListener('dragover', (e) => {
    e.preventDefault();
    phoneDevice.style.boxShadow = '0 20px 60px rgba(59, 130, 246, 0.5), inset 0 0 0 3px #333, inset 0 0 0 8px #111';
  });
  
  phoneDevice.addEventListener('dragleave', () => {
    phoneDevice.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.8), inset 0 0 0 3px #333, inset 0 0 0 8px #111';
  });
  
  phoneDevice.addEventListener('drop', (e) => {
    e.preventDefault();
    phoneDevice.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.8), inset 0 0 0 3px #333, inset 0 0 0 8px #111';
    
    const type = e.dataTransfer.getData('type');
    const value = e.dataTransfer.getData('value');
    
    // Calcular posição relativa ao celular
    const phoneRect = phoneDevice.getBoundingClientRect();
    const x = e.clientX - phoneRect.left;
    const y = e.clientY - phoneRect.top;
    
    addElementToPhone(type, value, x, y);
  });
  
  // Adicionar texto
  modal.querySelector('#add-text-btn').addEventListener('click', () => {
    const textInput = modal.querySelector('#text-input');
    const text = textInput.value.trim();
    
    if (!text) {
      alert('Digite um texto primeiro!');
      return;
    }
    
    addElementToPhone('text', text, 180, 320);
    textInput.value = '';
  });
  
  // Adicionar webcam
  modal.querySelector('#add-webcam-btn').addEventListener('click', async () => {
    // Verificar se há vídeo GRAVADO da webcam disponível
    if (webcamRecordingBlob) {
      console.log('[Editor] Usando vídeo GRAVADO da webcam');
      
      // Criar URL do blob gravado
      const webcamVideoUrl = URL.createObjectURL(webcamRecordingBlob);
      
      // Adicionar como elemento de vídeo gravado
      addElementToPhone('webcam', webcamVideoUrl, 180, 400, true); // true = é URL de vídeo gravado
      
      updateStatus('📹 Webcam gravada adicionada ao editor');
    } else if (elements.webcamPreview && elements.webcamPreview.srcObject) {
      // Fallback: usar stream ao vivo se não houver gravação
      console.warn('[Editor] Vídeo gravado da webcam não disponível, usando stream ao vivo');
      
      addElementToPhone('webcam', elements.webcamPreview.srcObject, 180, 400, false); // false = é MediaStream
      
      updateStatus('⚠️ Usando webcam ao vivo (não gravada)');
    } else {
      alert('⚠️ Nenhum vídeo de webcam disponível.\n\n1. Grave um vídeo com a webcam ativa\nOU\n2. Ative a webcam ao vivo antes de adicionar.');
    }
  });
  
  // Função para adicionar elemento ao celular (REFATORADO COM OOP)
  function addElementToPhone(type, value, x, y, isRecordedVideo = false) {
    const id = editorState.nextId++;
    const layerId = editorEngine.generateId();
    
    // Criar elemento DOM para preview
    const element = document.createElement('div');
    element.id = `element-${id}`;
    element.className = 'phone-element';
    element.dataset.layerId = layerId; // Vincular ao Layer
    element.style.position = 'absolute';
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.cursor = 'move';
    element.style.zIndex = '100';
    element.style.pointerEvents = 'all';
    element.style.userSelect = 'none';
    
    let layer; // Layer correspondente no EditorEngine
    
    if (type === 'emoji') {
      element.style.fontSize = '48px';
      element.textContent = value;
      element.style.transform = 'translate(-50%, -50%)';
      
      // Criar OverlayLayer para emoji
      layer = new OverlayLayer(layerId, 'emoji', value);
      layer.fromPixelCoordinates(x, y, 360, 640); // Converter pixels para normalizado
      layer.fontSize = 0.05; // 48px / 1080 ≈ 0.045
      layer.zIndex = 100;
      
    } else if (type === 'text') {
      element.style.fontSize = '24px';
      element.style.fontWeight = 'bold';
      element.style.color = '#fff';
      element.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
      element.style.padding = '8px 16px';
      element.style.background = 'rgba(0, 0, 0, 0.5)';
      element.style.borderRadius = '8px';
      element.textContent = value;
      element.style.transform = 'translate(-50%, -50%)';
      
      // Criar OverlayLayer para texto
      layer = new OverlayLayer(layerId, 'text', value);
      layer.fromPixelCoordinates(x, y, 360, 640);
      layer.fontSize = 0.025; // 24px / 1080 ≈ 0.022
      layer.zIndex = 100;
      
    } else if (type === 'webcam') {
      element.style.width = '120px';
      element.style.height = '120px';
      element.style.borderRadius = '0px';    // quadrado por padrão — shape definido por CameraFrameStyle
      element.style.overflow = 'hidden';
      element.style.border = 'none';          // borda gerenciada pelo CameraShapeRenderer
      element.style.boxShadow = '0 4px 20px rgba(0,0,0,0.6)';
      element.style.transform = 'translate(-50%, -50%)';
      
      let videoElement;
      
      // Se value é um MediaStream, criar elemento de vídeo com stream ao vivo
      if (value instanceof MediaStream) {
        console.log('[Editor] Criando webcam com stream ao vivo');
        
        videoElement = document.createElement('video');
        videoElement.srcObject = value;
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.loop = true;
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        element.appendChild(videoElement);
        
      } else if (typeof value === 'string' && isRecordedVideo) {
        // Se value é uma URL de vídeo gravado
        console.log('[Editor] Criando webcam com vídeo GRAVADO');
        
        videoElement = document.createElement('video');
        videoElement.src = value;
        videoElement.autoplay = false;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.loop = true;
        videoElement.currentTime = 0;
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        videoElement.dataset.isRecorded = 'true';
        element.appendChild(videoElement);
        
        // Sincronizar com vídeo principal
        editorVideo.addEventListener('play', () => {
          videoElement.currentTime = editorVideo.currentTime;
          videoElement.play().catch(err => console.warn('[Editor] Erro ao tocar webcam:', err));
        });
        
        editorVideo.addEventListener('pause', () => {
          videoElement.pause();
        });
        
        editorVideo.addEventListener('seeked', () => {
          videoElement.currentTime = editorVideo.currentTime;
        });
        
      } else {
        // Placeholder
        console.log('[Editor] Usando placeholder para webcam');
        element.innerHTML = '<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-size: 48px;">📹</div>';
      }
      
      // Usar CameraOverlayLayer: usa CameraFrameStyle + CameraShapeRenderer
      // Garante fidelidade total entre preview e exportação (WYSIWYG)
      if (videoElement) {
        layer = new CameraOverlayLayer(layerId, videoElement);
        layer.fromPixelCoordinates(x, y, 360, 640);
        layer.width  = 120 / 360;   // largura normalizada relativa ao preview 360px
        layer.height = 120 / 640;   // altura normalizada relativa ao preview 640px
        // Copiar snapshot do estilo atual configurado no painel de personalização
        if (typeof activeOverlayFrameStyle !== 'undefined' && activeOverlayFrameStyle) {
          layer.frameStyle.fromObject(activeOverlayFrameStyle.toJSON());
          // _renderer já aponta para layer.frameStyle (composição interna), a mutação é suficiente
        }
        layer.zIndex = 50;
      }
    }
    
    // Adicionar layer ao EditorEngine (se foi criado)
    if (layer) {
      editorEngine.addLayer(layer);
      console.log(`[Editor] Layer adicionado ao Engine: ${type} (LayerID: ${layerId})`);
    }
    
    // Tornar elemento arrastável dentro do celular
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = element.offsetLeft;
      initialY = element.offsetTop;
      element.style.cursor = 'grabbing';
      e.stopPropagation();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      const newX = initialX + dx;
      const newY = initialY + dy;
      
      element.style.left = `${newX}px`;
      element.style.top = `${newY}px`;
      
      // Sincronizar com Layer
      if (layer) {
        layer.fromPixelCoordinates(newX, newY, 360, 640);
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = 'move';
      }
    });
    
    // Duplo clique para remover
    element.addEventListener('dblclick', () => {
      if (confirm('Remover este elemento?')) {
        dropZone.removeChild(element);
        
        // Remover do estado legado
        const index = editorState.elements.findIndex(e => e.id === id);
        if (index > -1) editorState.elements.splice(index, 1);
        
        // Remover do EditorEngine
        if (layer) {
          editorEngine.removeLayer(layerId);
        }
        
        updateLayersList();
      }
    });
    
    dropZone.appendChild(element);
    
    // Adicionar ao estado legado
    editorState.elements.push({
      id,
      layerId, // Vincular ao Layer
      type,
      value,
      x,
      y,
      element,
      layer, // Referência direta ao Layer
      fontSizePx: type === 'emoji' ? 48 : type === 'text' ? 24 : null
    });
    
    updateLayersList();
  }
  
  // Atualizar lista de camadas
  function updateLayersList() {
    if (editorState.elements.length === 0) {
      layersList.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; text-align: center;">Nenhum elemento adicionado</p>';
      return;
    }

    const getSizeControls = (elem) => {
      if (elem.type !== 'emoji' && elem.type !== 'text') return '';
      const currentSize = elem.fontSizePx || (elem.type === 'emoji' ? 48 : 24);
      return `
        <div style="display:flex; align-items:center; gap:4px; margin-left:8px;">
          <button class="font-size-down-btn" data-id="${elem.id}" style="background: var(--panel-dark); border: 1px solid var(--border); color: var(--text); padding: 4px 6px; border-radius: 4px; cursor: pointer; font-size: 11px;">A-</button>
          <span style="font-size: 10px; color: var(--accent); min-width: 40px; text-align: center;">${currentSize}px</span>
          <button class="font-size-up-btn" data-id="${elem.id}" style="background: var(--panel-dark); border: 1px solid var(--border); color: var(--text); padding: 4px 6px; border-radius: 4px; cursor: pointer; font-size: 11px;">A+</button>
        </div>
      `;
    };
    
    layersList.innerHTML = editorState.elements.map((elem, index) => {
      const icon = elem.type === 'emoji' ? elem.value : elem.type === 'text' ? '📝' : '📹';
      const label = elem.type === 'text' ? elem.value.substring(0, 20) : elem.type.toUpperCase();
      
      return `
        <div style="padding: 8px; background: var(--panel-light); border-radius: 6px; font-size: 12px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <span style="min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${icon} ${label}</span>
          ${getSizeControls(elem)}
          <button class="remove-layer-btn" data-id="${elem.id}" style="background: var(--danger); border: none; color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">🗑️</button>
        </div>
      `;
    }).join('');

    function applyOverlayFontSize(elem, nextSizePx) {
      if (!elem || !elem.element || !elem.layer) return;
      const minSize = elem.type === 'emoji' ? 24 : 14;
      const maxSize = elem.type === 'emoji' ? 160 : 96;
      const clamped = Math.max(minSize, Math.min(maxSize, nextSizePx));

      elem.fontSizePx = clamped;
      elem.layer.fontSize = clamped / 1080;

      elem.element.style.fontSize = `${clamped}px`;
      if (elem.type === 'text') {
        const padY = Math.max(6, Math.round(clamped * 0.33));
        const padX = Math.max(10, Math.round(clamped * 0.66));
        elem.element.style.padding = `${padY}px ${padX}px`;
      }

      updateLayersList();
    }
    
    // Event listeners para remover
    layersList.querySelectorAll('.remove-layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const elem = editorState.elements.find(e => e.id === id);
        if (elem && elem.element) {
          dropZone.removeChild(elem.element);
        }
        const index = editorState.elements.findIndex(e => e.id === id);
        if (elem && elem.layer) {
          editorEngine.removeLayer(elem.layer.id);
        }
        if (index > -1) editorState.elements.splice(index, 1);
        updateLayersList();
      });
    });

    layersList.querySelectorAll('.font-size-down-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const elem = editorState.elements.find(e => e.id === parseInt(btn.dataset.id));
        if (!elem) return;
        applyOverlayFontSize(elem, (elem.fontSizePx || (elem.type === 'emoji' ? 48 : 24)) - 6);
      });
    });

    layersList.querySelectorAll('.font-size-up-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const elem = editorState.elements.find(e => e.id === parseInt(btn.dataset.id));
        if (!elem) return;
        applyOverlayFontSize(elem, (elem.fontSizePx || (elem.type === 'emoji' ? 48 : 24)) + 6);
      });
    });
  }
  
  // Exportar vídeo
  modal.querySelector('#export-video-btn').addEventListener('click', async () => {
    const exportBtn = modal.querySelector('#export-video-btn');
    const actionButtons = modal.querySelector('#action-buttons');
    const progressContainer = modal.querySelector('#export-progress-container');
    const progressBar = modal.querySelector('#export-progress-bar');
    const progressPercentage = modal.querySelector('#export-percentage');
    const timeInfo = modal.querySelector('#export-time-info');
    const statusInfo = modal.querySelector('#export-status');
    
    exportBtn.disabled = true;
    actionButtons.style.display = 'none';
    progressContainer.style.display = 'block';
    
    try {
      // ── Fase 1: Renderização do canvas (0–80%) ──────────────────
      statusInfo.textContent = 'Renderizando frames...';
      const rawBlob = await exportVerticalVideo({
        onProgress: (progress, elapsed, duration) => {
          // Mapear 0-100% da engine → 0-80% da barra
          const mapped = Math.round(progress * 0.80);
          progressBar.style.width = `${mapped}%`;
          progressPercentage.textContent = `${mapped}%`;
          timeInfo.textContent = `Renderizando: ${elapsed.toFixed(1)}s / ${duration.toFixed(1)}s`;
        }
      });

      // ── Fase 2: Normalização final para MP4 H.264/AAC (80–100%) ─
      // Mesmo quando o navegador gera MP4 direto, o container/codecs do
      // MediaRecorder podem não ser aceitos por Galeria/WhatsApp no celular.
      progressBar.style.width = '80%';
      progressPercentage.textContent = '80%';
      statusInfo.textContent = '⚙️ Finalizando MP4 compatível com celular...';
      timeInfo.textContent = 'Aguarde — pode levar de 30s a 2min';

      let finalBlob = rawBlob;

      try {
        console.log('[Editor] Normalizando vídeo final para MP4 H.264/AAC...', rawBlob.type);
        await videoConverterService.loadFFmpeg();
        finalBlob = await videoConverterService.convertBlobToMP4(rawBlob, {
          width: null,
          height: null,
          bitrate: '6M'
        });
        console.log('[Editor] MP4 finalizado ✅', (finalBlob.size / 1024 / 1024).toFixed(2), 'MB');
      } catch (convErr) {
        // Se o FFmpeg falhar, ainda devolve o arquivo bruto para não perder o export.
        console.warn('[Editor] Finalização MP4 falhou, baixando arquivo bruto:', convErr.message);
        statusInfo.textContent = '⚠️ Falha ao finalizar MP4 compatível — baixando arquivo bruto';
        statusInfo.style.color = 'var(--warning)';
        finalBlob = rawBlob;
      }

      // ── Fase 3: Download ────────────────────────────────────────
      progressBar.style.width = '100%';
      progressPercentage.textContent = '100%';
      statusInfo.textContent = '✅ Exportação concluída!';
      statusInfo.style.color = 'var(--success)';
      timeInfo.textContent = `Tamanho: ${(finalBlob.size / 1024 / 1024).toFixed(1)} MB`;

      const ext = finalBlob.type.includes('mp4') ? 'mp4' : EXPORT_EXT;
      const filename = `video-vertical-${new Date().toISOString().slice(0, 10)}.${ext}`;
      exportManager.downloadBlob(finalBlob, filename);
      updateStatus(finalBlob.type.includes('mp4')
        ? '✅ Vídeo exportado em MP4 compatível com celular!'
        : '⚠️ Vídeo exportado no formato bruto; a finalização MP4 falhou.');

      setTimeout(() => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        document.body.removeChild(modal);
        URL.revokeObjectURL(editorVideo.src);
      }, 2500);

    } catch (error) {
      console.error('[Editor] Erro ao exportar:', error);
      statusInfo.textContent = `❌ Erro: ${error.message}`;
      statusInfo.style.color = 'var(--danger)';
      setTimeout(() => {
        progressContainer.style.display = 'none';
        actionButtons.style.display = 'grid';
        exportBtn.disabled = false;
      }, 3000);
    }
  });
  
  // Exportar vídeo com elementos — retorna blob bruto; download/conversão gerenciados pelo caller
  async function exportVerticalVideo(options = {}) {
    const { onProgress } = options;
    
    console.log('[Editor] Iniciando exportação canvas 1080×1920...');
    console.log('[Editor] Camadas:', editorEngine.exportState().layers.length);
    
    try {
      const blob = await exportManager.exportVideo(
        editorVideo,
        (progress, elapsed, duration) => {
          if (onProgress) onProgress(progress, elapsed, duration);
          console.log(`[Editor] Progresso: ${Math.round(progress)}% - ${elapsed.toFixed(1)}s/${duration.toFixed(1)}s`);
        }
      );
      
      console.log('[Editor] Canvas renderizado ✅', (blob.size / 1024 / 1024).toFixed(2), 'MB —', blob.type);
      return blob;
      
    } catch (error) {
      console.error('[Editor] Erro na exportação:', error);
      updateStatus(`❌ Erro na exportação: ${error.message}`, 'error');
      throw error;
    }
  }
  
  // Cancelar
  modal.querySelector('#cancel-editor-btn').addEventListener('click', () => {
    // Parar loop de renderização
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      console.log('[Editor] Preview loop cancelado');
    }
    
    document.body.removeChild(modal);
    URL.revokeObjectURL(editorVideo.src);
  });
  
  modal.querySelector('#close-editor').addEventListener('click', () => {
    // Parar loop de renderização
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      console.log('[Editor] Preview loop cancelado');
    }
    
    document.body.removeChild(modal);
    URL.revokeObjectURL(editorVideo.src);
  });
}

// Remover função downloadPlayerWithFormat (não mais necessária)

function handleStopAll() {
  screenService.stopAllCapture();
  webcamService.stopWebcam();
  phoneService.disconnect();

  elements.screenPreview.srcObject = null;
  elements.webcamPreview.srcObject = null;
  elements.phonePreview.srcObject = null;

  updateSourceStatus("screen", "Clique para ativar");
  updateSourceStatus("webcam", "Clique para ativar");
  updateSourceStatus("microphone", "Clique para ativar");
  updateSourceStatus("phone", "Clique para conectar");

  updateMainPreview();
  updateStatus("Todas as fontes foram desativadas");
}

document.querySelectorAll(".source-item").forEach((item) => {
  item.addEventListener("click", async (e) => {
    // Ignorar clique se foi no ícone de configuração
    if (e.target.closest('.config-icon')) {
      return;
    }
    
    const source = item.dataset.source;

    switch (source) {
      case "screen":
        // Se a tela já está capturando, desligar direto (sem abrir modal)
        if (screenService.isCapturing()) {
          await handleScreenCapture();
        } else {
          // Antes de capturar, pedir ao usuário o formato desejado
          openScreenFormatModal();
        }
        break;
      case "webcam":
        await handleWebcamCapture();
        break;
      case "microphone":
        await handleMicrophoneCapture();
        break;
      case "phone":
        await handlePhoneCamera();
        break;
    }
  });
});

// Event listeners para ícones de configuração
document.querySelectorAll(".config-icon").forEach((icon) => {
  icon.addEventListener("click", async (e) => {
    e.stopPropagation();
    const configType = icon.dataset.config;
    
    if (configType === "webcam") {
      await openWebcamModal();
    } else if (configType === "microphone") {
      await openMicrophoneModal();
    } else if (configType === "audio-output") {
      await openAudioOutputModal();
    } else if (configType === "screen") {
      openScreenFormatModal();
    }
  });
});

// Event listeners para modais
elements.closeWebcamModal.addEventListener("click", closeWebcamModal);
elements.closeMicrophoneModal.addEventListener("click", closeMicrophoneModal);
elements.closeAudioOutputModal.addEventListener("click", closeAudioOutputModal);

elements.reloadWebcam.addEventListener("click", async () => {
  elements.webcamList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">🔄 Recarregando dispositivos...</p>';
  await loadDevices();
  renderWebcamList();
});

elements.reloadMicrophone.addEventListener("click", async () => {
  elements.microphoneList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">🔄 Recarregando dispositivos...</p>';
  await loadDevices();
  renderMicrophoneList();
});

elements.reloadAudioOutput.addEventListener("click", async () => {
  elements.audioOutputList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">🔄 Recarregando dispositivos...</p>';
  await loadDevices();
  renderAudioOutputList();
});

elements.applyWebcam.addEventListener("click", applyWebcamSelection);
elements.applyMicrophone.addEventListener("click", applyMicrophoneSelection);
elements.applyAudioOutput.addEventListener("click", applyAudioOutputSelection);

// Event listeners para modal de formato de tela
elements.closeScreenFormat.addEventListener("click", closeScreenFormatModal);
elements.applyScreenFormat.addEventListener("click", applyScreenFormatSelection);

// Fechar modais ao clicar fora
elements.webcamModal.addEventListener("click", (e) => {
  if (e.target === elements.webcamModal) {
    closeWebcamModal();
  }
});

elements.microphoneModal.addEventListener("click", (e) => {
  if (e.target === elements.microphoneModal) {
    closeMicrophoneModal();
  }
});

elements.screenFormatModal.addEventListener("click", (e) => {
  if (e.target === elements.screenFormatModal) {
    closeScreenFormatModal();
  }
});

elements.audioOutputModal.addEventListener("click", (e) => {
  if (e.target === elements.audioOutputModal) {
    closeAudioOutputModal();
  }
});

elements.startRecording.addEventListener("click", handleStartRecording);
elements.stopRecording.addEventListener("click", handleStopRecording);
elements.downloadRecording.addEventListener("click", handleDownloadRecording);
elements.stopAll.addEventListener("click", handleStopAll);
elements.closeQr.addEventListener("click", () => {
  elements.qrModal.classList.remove("active");
});

// Copiar URL de conexão do celular
elements.copyUrlBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(elements.connectionUrl.value);
    elements.copyUrlBtn.textContent = "✅ Copiado!";
    setTimeout(() => {
      elements.copyUrlBtn.textContent = "📋 Copiar";
    }, 2000);
  } catch (error) {
    console.error("Erro ao copiar:", error);
  }
});

// Network Info Modal
elements.showNetworkInfo.addEventListener("click", () => {
  showNetworkInfoModal();
});

elements.closeNetworkInfo.addEventListener("click", () => {
  elements.networkInfoModal.classList.remove("active");
});

elements.copyNetworkUrl.addEventListener("click", () => {
  const url = elements.networkUrl.textContent;
  navigator.clipboard.writeText(url).then(() => {
    const originalText = elements.copyNetworkUrl.textContent;
    elements.copyNetworkUrl.textContent = "✅ Copiado!";
    setTimeout(() => {
      elements.copyNetworkUrl.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Erro ao copiar:', err);
  });
});

function showNetworkInfoModal() {
  // Obter IP local do servidor (via window.location ou detectar)
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port || '3000';
  
  // Se já está acessando via IP da rede, usar o mesmo
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
    const networkUrl = `${protocol}//${hostname}:${port}`;
    elements.networkUrl.textContent = networkUrl;
  } else {
    // Está em localhost, tentar detectar IP via WebRTC
    detectLocalIP().then(ip => {
      if (ip) {
        const networkUrl = `${protocol}//${ip}:${port}`;
        elements.networkUrl.textContent = networkUrl;
      } else {
        elements.networkUrl.innerHTML = `
          <div style="font-size: 16px;">Verifique o terminal do servidor</div>
          <div style="font-size: 11px; margin-top: 8px; color: var(--text-muted);">
            O IP aparece logo após iniciar com: npm run dev
          </div>
        `;
      }
    });
  }
  
  elements.networkInfoModal.classList.add('active');
}

// Detectar IP local usando WebRTC
async function detectLocalIP() {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    
    pc.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        pc.close();
        return;
      }
      
      const candidate = event.candidate.candidate;
      const ipRegex = /([0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3})/;
      const match = ipRegex.exec(candidate);
      
      if (match && match[1]) {
        const ip = match[1];
        // Ignorar IPs de loopback
        if (!ip.startsWith('127.') && !ip.startsWith('0.')) {
          pc.close();
          resolve(ip);
        }
      }
    };
    
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(() => resolve(null));
    
    // Timeout após 3 segundos
    setTimeout(() => {
      pc.close();
      resolve(null);
    }, 3000);
  });
}

elements.toggleControls.addEventListener("click", () => {
  setControlsOpen(!controlsOpen);
});

elements.drawerScrim.addEventListener("click", () => {
  if (window.innerWidth <= 1024) {
    setControlsOpen(false);
  }
});

// ===== SISTEMA DE OVERLAY WEBCAM PiP =====

/**
 * OverlayMoveController
 *
 * Responsabilidade única: controlar o arrastar (drag) do overlay de câmera
 * dentro dos limites do container pai.
 *
 * Design:
 *  - Baixo acoplamento: recebe os elementos via construtor
 *  - Não conhece o estado global; expõe apenas attach/detach
 *  - Garante que o overlay nunca saia da área válida
 */
class OverlayMoveController {
  /**
   * @param {HTMLElement} overlayEl  — elemento arrastável
   * @param {HTMLElement} containerEl — elemento que define o limite de movimento
   */
  constructor(overlayEl, containerEl) {
    this._overlay   = overlayEl;
    this._container = containerEl;
    this._active    = false;
    this._origin    = { x: 0, y: 0, left: 0, top: 0 };

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp   = this._onMouseUp.bind(this);
  }

  /** Habilita o drag no overlay */
  attach() {
    this._overlay.addEventListener('mousedown', this._onMouseDown);
  }

  /** Remove listeners e encerra qualquer drag em curso */
  detach() {
    this._overlay.removeEventListener('mousedown', this._onMouseDown);
    this._cleanup();
  }

  _onMouseDown(e) {
    // Ignorar cliques nos botões de controle e alças de resize
    if (e.target.closest('.resize-handle') || e.target.closest('.overlay-btn')) return;

    e.preventDefault();
    e.stopPropagation();

    const rect          = this._overlay.getBoundingClientRect();
    this._origin        = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    this._active        = true;

    this._overlay.style.cursor = 'grabbing';
    this._overlay.classList.add('dragging');

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup',   this._onMouseUp);
  }

  _onMouseMove(e) {
    if (!this._active) return;

    const dx = e.clientX - this._origin.x;
    const dy = e.clientY - this._origin.y;

    const containerRect = this._container.getBoundingClientRect();
    const overlayRect   = this._overlay.getBoundingClientRect();

    const maxLeft = containerRect.width  - overlayRect.width;
    const maxTop  = containerRect.height - overlayRect.height;

    const newLeft = Math.max(0, Math.min(this._origin.left - containerRect.left + dx, maxLeft));
    const newTop  = Math.max(0, Math.min(this._origin.top  - containerRect.top  + dy, maxTop));

    this._overlay.style.left   = `${newLeft}px`;
    this._overlay.style.top    = `${newTop}px`;
    this._overlay.style.right  = 'auto';
    this._overlay.style.bottom = 'auto';
  }

  _onMouseUp() {
    this._active = false;
    this._overlay.style.cursor = 'move';
    this._overlay.classList.remove('dragging');
    this._cleanup();
  }

  _cleanup() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup',   this._onMouseUp);
  }
}

// ---------------------------------------------------------------------------

/**
 * OverlayResizeController
 *
 * Responsabilidade única: controlar o redimensionamento do overlay de câmera.
 *
 * Suporta:
 *  - 4 alças de canto (top-left, top-right, bottom-left, bottom-right)
 *  - Redimensionamento livre (padrão) ou proporcional (maintainAspectRatio)
 *  - Limites mínimos e máximos configuráveis
 *
 * Design:
 *  - Recebe mapa de handles via construtor
 *  - Cada handle conhece seu próprio comportamento de delta (x/y negativo ou positivo)
 *  - Não acessa estado global
 */
class OverlayResizeController {
  /**
   * @param {HTMLElement} overlayEl
   * @param {HTMLElement} containerEl
   * @param {Object} options
   * @param {boolean} options.maintainAspectRatio
   * @param {number}  options.minWidth
   * @param {number}  options.minHeight
   * @param {number}  options.maxWidth
   * @param {number}  options.maxHeight
   */
  constructor(overlayEl, containerEl, options = {}) {
    this._overlay   = overlayEl;
    this._container = containerEl;

    this._opts = {
      maintainAspectRatio: options.maintainAspectRatio ?? false,
      minWidth:  options.minWidth  ?? 120,
      minHeight: options.minHeight ?? 80,
      maxWidth:  options.maxWidth  ?? 720,
      maxHeight: options.maxHeight ?? 720
    };

    this._state = {
      active: false,
      handle: null,    // qual alça está sendo usada
      startX: 0, startY: 0,
      startW: 0, startH: 0,
      startLeft: 0, startTop: 0
    };

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp   = this._onMouseUp.bind(this);

    // Mapa: data-resize-dir → { dx: ±1, dy: ±1, adjustLeft: bool, adjustTop: bool }
    this._HANDLE_DEFS = {
      'bottom-right': { dx:  1, dy:  1, adjustLeft: false, adjustTop: false },
      'bottom-left':  { dx: -1, dy:  1, adjustLeft: true,  adjustTop: false },
      'top-right':    { dx:  1, dy: -1, adjustLeft: false, adjustTop: true  },
      'top-left':     { dx: -1, dy: -1, adjustLeft: true,  adjustTop: true  }
    };
  }

  /** Vincula todos os elementos com [data-resize-dir] dentro do overlay */
  attach() {
    this._overlay.querySelectorAll('[data-resize-dir]').forEach(handle => {
      handle.addEventListener('mousedown', (e) => this._onMouseDown(e, handle));
    });
  }

  detach() {
    this._overlay.querySelectorAll('[data-resize-dir]').forEach(handle => {
      handle.replaceWith(handle.cloneNode(true)); // remove todos os listeners de uma vez
    });
    this._cleanup();
  }

  _onMouseDown(e, handle) {
    e.preventDefault();
    e.stopPropagation();

    const dir = handle.dataset.resizeDir;
    if (!this._HANDLE_DEFS[dir]) return;

    this._state = {
      active:    true,
      handle:    dir,
      startX:    e.clientX,
      startY:    e.clientY,
      startW:    this._overlay.offsetWidth,
      startH:    this._overlay.offsetHeight,
      startLeft: this._overlay.offsetLeft,
      startTop:  this._overlay.offsetTop
    };

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup',   this._onMouseUp);
  }

  _onMouseMove(e) {
    if (!this._state.active) return;

    const def  = this._HANDLE_DEFS[this._state.handle];
    const { minWidth, minHeight, maxWidth, maxHeight, maintainAspectRatio } = this._opts;
    const { startX, startY, startW, startH, startLeft, startTop } = this._state;

    const dx = (e.clientX - startX) * def.dx;
    const dy = (e.clientY - startY) * def.dy;

    let newW = startW + dx;
    let newH = startH + dy;

    if (maintainAspectRatio) {
      const ratio = startW / startH;
      // Usar o delta dominante para manter proporção
      if (Math.abs(dx) >= Math.abs(dy)) {
        newH = newW / ratio;
      } else {
        newW = newH * ratio;
      }
    }

    newW = Math.max(minWidth,  Math.min(maxWidth,  newW));
    newH = Math.max(minHeight, Math.min(maxHeight, newH));

    this._overlay.style.width  = `${newW}px`;
    this._overlay.style.height = `${newH}px`;

    // Alças que puxam para cima/esquerda precisam reajustar posição
    if (def.adjustLeft) {
      const deltaW = newW - startW;
      this._overlay.style.left = `${Math.max(0, startLeft - deltaW)}px`;
    }
    if (def.adjustTop) {
      const deltaH = newH - startH;
      this._overlay.style.top = `${Math.max(0, startTop - deltaH)}px`;
    }
  }

  _onMouseUp() {
    this._state.active = false;
    this._cleanup();
  }

  _cleanup() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup',   this._onMouseUp);
  }

  /** Alterna entre redimensionamento livre e proporcional em tempo real */
  setMaintainAspectRatio(value) {
    this._opts.maintainAspectRatio = Boolean(value);
  }

  /** Atualiza limites em tempo real (útil para janelas responsivas) */
  setLimits({ minWidth, minHeight, maxWidth, maxHeight } = {}) {
    if (minWidth  !== undefined) this._opts.minWidth  = minWidth;
    if (minHeight !== undefined) this._opts.minHeight = minHeight;
    if (maxWidth  !== undefined) this._opts.maxWidth  = maxWidth;
    if (maxHeight !== undefined) this._opts.maxHeight = maxHeight;
  }
}

// ---------------------------------------------------------------------------
// Instâncias dos controllers (criadas em initWebcamOverlay)
let _overlayMoveController   = null;
let _overlayResizeController = null;

function initWebcamOverlay() {
  if (!elements.webcamOverlay) return;

  // Posição inicial: canto inferior direito
  elements.webcamOverlay.style.right  = '20px';
  elements.webcamOverlay.style.bottom = '20px';

  const container = elements.mainPreview.parentElement;

  // Destruir controllers anteriores se existirem (hot-reload seguro)
  if (_overlayMoveController)   _overlayMoveController.detach();
  if (_overlayResizeController) _overlayResizeController.detach();

  _overlayMoveController = new OverlayMoveController(
    elements.webcamOverlay,
    container
  );

  _overlayResizeController = new OverlayResizeController(
    elements.webcamOverlay,
    container,
    {
      maintainAspectRatio: false,  // livre por padrão (quadrado → qualquer forma)
      minWidth:  100,
      minHeight: 80,
      maxWidth:  720,
      maxHeight: 720
    }
  );

  _overlayMoveController.attach();
  _overlayResizeController.attach();

  // Botão fechar
  if (elements.overlayClose) {
    elements.overlayClose.addEventListener('click', (e) => {
      e.stopPropagation();
      disableWebcamOverlay();
    });
  }

  // Botão configuração (se existir)
  if (elements.overlayConfigBtn) {
    elements.overlayConfigBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openOverlayConfigPanel();
    });
  }
}

function enableWebcamOverlay() {
  if (!elements.webcamPreview.srcObject) {
    updateStatus('❌ Ative a webcam primeiro', 'error');
    return;
  }

  overlayState.enabled = true;

  if (elements.overlayVideo) {
    elements.overlayVideo.srcObject = elements.webcamPreview.srcObject;
  }

  if (elements.webcamOverlay) {
    elements.webcamOverlay.classList.add('active');
  }

  updateStatus('📹 Câmera ativa');
}

function disableWebcamOverlay() {
  overlayState.enabled = false;
  if (elements.overlayVideo) elements.overlayVideo.srcObject = null;
  if (elements.webcamOverlay) elements.webcamOverlay.classList.remove('active');
  updateStatus('Webcam desativada');
}

function toggleWebcamOverlay() {
  if (overlayState.enabled) {
    disableWebcamOverlay();
  } else {
    enableWebcamOverlay();
  }
}

// ===== SISTEMA DE VOLUME DIGITAL =====


function connectAudioToMainPreview() {
  // Conectar o áudio do main-preview ao sistema de controle de volume
  if (elements.mainPreview && elements.mainPreview.srcObject) {
    const audioTracks = elements.mainPreview.srcObject.getAudioTracks();
    if (audioTracks.length > 0) {
      const isScreenSource = elements.mainPreview.srcObject === elements.screenPreview?.srcObject;
      const hasSystemAudio = isScreenSource && elements.screenPreview?.srcObject?.getAudioTracks().length > 0;

      // Garantir que o volume do elemento reflita o controle
      const volumeLevel = outputMuted || hasSystemAudio ? 0 : (parseFloat(elements.outputVolume.value) / 100);
      elements.mainPreview.volume = volumeLevel;
      elements.mainPreview.muted = outputMuted || hasSystemAudio;

      if (hasSystemAudio) {
        elements.outputMute.textContent = '🔇';
        elements.outputMute.title = 'Áudio do preview silenciado para evitar repetição do som do sistema';
      } else {
        elements.outputMute.textContent = outputMuted ? '🔇' : '🔊';
        elements.outputMute.title = outputMuted ? 'Ativar som' : 'Mudo';
      }
      
      // Aplicar setSinkId se disponível
      if (selectedAudioOutputId && elements.mainPreview.setSinkId) {
        elements.mainPreview.setSinkId(selectedAudioOutputId).catch(err => {
          console.warn('setSinkId não suportado:', err);
        });
      }
    }
  }
}

// ===== TOGGLE RÁPIDO DE FORMATO =====

function initFormatToggle() {
  if (!elements.formatIndicator) return;
  
  elements.formatIndicator.addEventListener('click', () => {
    // Alternar formato
    screenCaptureFormat = screenCaptureFormat === 'youtube' ? 'tiktok' : 'youtube';
    
    console.log('Formato alternado para:', screenCaptureFormat);
    
    // Aplicar novo formato
    applyFormatStyles();
    
    // Atualizar status
    const formatLabel = screenCaptureFormat === 'youtube' ? '🎬 YouTube (16:9)' : '📱 TikTok (9:16)';
    updateStatus(`✅ Formato alterado para ${formatLabel}`);
    
    // Mostrar dica se mudar para TikTok
    if (screenCaptureFormat === 'tiktok') {
      setTimeout(() => {
        updateStatus('💡 Agora em modo vertical! Ideal para Reels, Stories e Shorts');
      }, 1500);
    }
  });
}

// Inicialização
loadCustomNames();
setControlsOpen(true);
initWebcamOverlay();
initFormatToggle();
applyFormatStyles();
updateStatus("Sistema pronto para captura");

// ===== SISTEMA DE PERSONALIZAÇÃO DE OVERLAY — OverlayStylePanel =====

/**
 * OverlayStylePanel
 *
 * Responsabilidade única: controlar a UI de personalização visual do overlay
 * de câmera, sincronizando em tempo real:
 *  a) A aparência CSS do elemento DOM `#webcam-overlay`
 *  b) O CameraFrameStyle compartilhado que a composição de canvas (createCompositionStream)
 *     usa ao gravar
 *
 * Separação de responsabilidades:
 *  - O painel só conhece o DOM e o CameraFrameStyle; não sabe nada de MediaStream
 *  - CameraShapeRenderer (engine) cuida da renderização no canvas
 *  - createCompositionStream() lê `activeOverlayFrameStyle` para aplicar shape/borda
 *
 * Expansibilidade:
 *  - Para adicionar nova forma: registrar em SHAPE_CSS_MAP e a lógica em CameraShapeRenderer
 *  - Para adicionar novo preset: registrar em PRESET_DEFS e CameraShapeRenderer.applyPreset()
 */
class OverlayStylePanel {
  // ── Metadados estáticos (sem instância) ─────────────────────────

  /** Mapa de shape → CSS aplicado ao elemento overlay no DOM */
  static get SHAPE_CSS_MAP() {
    return {
      'square':    { borderRadius: '4px',   aspectRatio: '1 / 1',  clipPath: 'none' },
      'rect-h':    { borderRadius: '4px',   aspectRatio: '16 / 9', clipPath: 'none' },
      'rect-v':    { borderRadius: '4px',   aspectRatio: '9 / 16', clipPath: 'none' },
      'circle':    { borderRadius: '50%',   aspectRatio: '1 / 1',  clipPath: 'none' },
      'oval':      { borderRadius: '50%',   aspectRatio: '16 / 9', clipPath: 'none' },
      'rounded':   { borderRadius: '18%',   aspectRatio: '1 / 1',  clipPath: 'none' },
      'diamond':   { borderRadius: '0',     aspectRatio: '1 / 1',  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
      'hexagon':   { borderRadius: '0',     aspectRatio: '1 / 1',  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
    };
  }

  /** Presets disponíveis para exibição no painel */
  static get PRESET_LABELS() {
    return {
      none:      '⬜ Padrão',
      simple:    '🔲 Simples',
      clean:     '🪟 Clean',
      neon:      '💡 Neon',
      gamer:     '🎮 Gamer',
      glass:     '🔮 Glass',
      colorful:  '🌈 Colorful',
      shadow:    '🌑 Shadow',
      gradient:  '🎨 Gradient',
    };
  }

  // ── Constructor ────────────────────────────────────────────────

  /**
   * @param {HTMLElement} overlayEl   — #webcam-overlay
   * @param {CameraFrameStyle} style  — instância compartilhada com createCompositionStream
   */
  constructor(overlayEl, style) {
    this._overlay = overlayEl;
    this._style   = style;
  }

  // ── Inicialização ─────────────────────────────────────────────

  /** Liga todos os controles do painel ao estilo */
  init() {
    this._bindShapeSelector();
    this._bindBorderControls();
    this._bindRadiusControl();
    this._bindFramePresets();
    this._bindEffectsControls();

    // Sincroniza DOM com o estado inicial do style
    this._applyToDOM();
  }

  // ── API pública ────────────────────────────────────────────────

  /** Força re-aplicação do estilo atual ao DOM (útil após enableWebcamOverlay) */
  refresh() {
    this._applyToDOM();
  }

  get style() {
    return this._style;
  }

  // ── Bind dos controles ─────────────────────────────────────────

  _bindShapeSelector() {
    const btns = document.querySelectorAll('[data-shape]');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._style.shape = btn.dataset.shape;
        this._applyToDOM();
        updateStatus(`🔷 Forma: ${btn.dataset.shape}`);
      });
    });
  }

  _bindBorderControls() {
    // Cor
    const colorPicker = document.getElementById('border-color');
    if (colorPicker) {
      colorPicker.addEventListener('input', () => {
        this._style.borderColor   = colorPicker.value;
        this._style.framePreset   = 'none';
        this._applyToDOM();
      });
    }

    // Espessura
    const thicknessRange = document.getElementById('border-thickness');
    const thicknessValue = document.getElementById('border-thickness-value');
    if (thicknessRange) {
      thicknessRange.addEventListener('input', () => {
        const px = parseInt(thicknessRange.value);
        this._style.borderWidth = px / 1000;  // normalizado para uso no canvas
        if (thicknessValue) thicknessValue.textContent = `${px}px`;
        this._applyToDOM();
      });
    }

    // Estilo de borda (solid / dashed / double / none)
    const borderStyleBtns = document.querySelectorAll('[data-border-style]');
    borderStyleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        borderStyleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._style.borderStyle = btn.dataset.borderStyle;
        this._applyToDOM();
      });
    });

    // Opacidade da borda
    const borderOpacity = document.getElementById('border-opacity');
    const borderOpacityValue = document.getElementById('border-opacity-value');
    if (borderOpacity) {
      borderOpacity.addEventListener('input', () => {
        const val = parseFloat(borderOpacity.value);
        this._style.borderOpacity = val;
        if (borderOpacityValue) borderOpacityValue.textContent = `${Math.round(val * 100)}%`;
        this._applyToDOM();
      });
    }
  }

  _bindRadiusControl() {
    const radiusRange = document.getElementById('border-radius');
    const radiusValue = document.getElementById('border-radius-value');
    if (!radiusRange) return;

    radiusRange.addEventListener('input', () => {
      const val = parseFloat(radiusRange.value);
      this._style.borderRadius = val;

      const pct = Math.round(val * 100);
      if (radiusValue) {
        radiusValue.textContent = pct === 0 ? 'Reto' : pct >= 45 ? 'Oval' : `${pct}%`;
      }
      this._applyToDOM();
    });
  }

  _bindFramePresets() {
    const btns = document.querySelectorAll('[data-preset]');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const preset = btn.dataset.preset;
        CameraShapeRenderer.applyPreset(this._style, preset);
        this._applyToDOM();

        // Sincronizar cor do color picker se mudou
        const colorPicker = document.getElementById('border-color');
        if (colorPicker && !this._style.borderColor.startsWith('gradient')) {
          colorPicker.value = this._style.borderColor.startsWith('rgba')
            ? '#3b82f6'
            : this._style.borderColor;
        }

        updateStatus(`🎨 Preset aplicado: ${OverlayStylePanel.PRESET_LABELS[preset] || preset}`);
      });
    });
  }

  _bindEffectsControls() {
    // Toggle sombra
    const shadowToggle = document.getElementById('shadow-toggle');
    if (shadowToggle) {
      shadowToggle.addEventListener('change', () => {
        this._style.shadowEnabled = shadowToggle.checked;
        this._applyToDOM();
      });
    }

    // Cor da sombra
    const shadowColor = document.getElementById('shadow-color');
    if (shadowColor) {
      shadowColor.addEventListener('input', () => {
        const alpha = this._style.shadowColor.match(/[\d.]+\)$/)?.[0]?.replace(')', '') ?? '0.65';
        this._style.shadowColor = this._hexToRgba(shadowColor.value, parseFloat(alpha));
        this._applyToDOM();
      });
    }

    // Toggle glow
    const glowToggle = document.getElementById('glow-toggle');
    if (glowToggle) {
      glowToggle.addEventListener('change', () => {
        this._style.glowEnabled = glowToggle.checked;
        this._applyToDOM();
      });
    }

    // Cor do glow
    const glowColor = document.getElementById('glow-color');
    if (glowColor) {
      glowColor.addEventListener('input', () => {
        this._style.glowColor = glowColor.value;
        this._applyToDOM();
      });
    }

    // Intensidade do glow
    const glowIntensity = document.getElementById('glow-intensity');
    const glowIntensityValue = document.getElementById('glow-intensity-value');
    if (glowIntensity) {
      glowIntensity.addEventListener('input', () => {
        const val = parseInt(glowIntensity.value);
        this._style.glowBlur = val / 1000;
        if (glowIntensityValue) glowIntensityValue.textContent = `${val}px`;
        this._applyToDOM();
      });
    }

    // Opacidade geral
    const overlayOpacity = document.getElementById('overlay-opacity');
    const overlayOpacityValue = document.getElementById('overlay-opacity-value');
    if (overlayOpacity) {
      overlayOpacity.addEventListener('input', () => {
        const val = parseFloat(overlayOpacity.value);
        this._style.alpha = val;
        if (overlayOpacityValue) overlayOpacityValue.textContent = `${Math.round(val * 100)}%`;
        this._overlay.style.opacity = val;
      });
    }
  }

  // ── Aplicação ao DOM ──────────────────────────────────────────

  /**
   * Traduz o CameraFrameStyle para CSS do `#webcam-overlay`.
   * Garante que o preview visual seja idêntico ao que será gravado.
   */
  _applyToDOM() {
    if (!this._overlay) return;

    const s   = this._style;
    const map = OverlayStylePanel.SHAPE_CSS_MAP[s.shape] || OverlayStylePanel.SHAPE_CSS_MAP['square'];

    // Forma geométrica
    this._overlay.style.borderRadius = map.borderRadius;
    this._overlay.style.clipPath     = map.clipPath;

    // Se for diamond/hexagon, esconder a borda CSS e deixar canvas renderizar
    const usesCssClip = map.clipPath !== 'none';
    const video = this._overlay.querySelector('video');
    if (video) {
      video.style.borderRadius = usesCssClip ? '0' : map.borderRadius;
    }

    // Borda CSS (aproximação visual; canvas renderiza a versão final)
    if (s.borderStyle === 'none' || s.borderWidth <= 0) {
      this._overlay.style.border = 'none';
    } else {
      const pxWidth = Math.round(s.borderWidth * 1000);
      const color   = s.borderColor.startsWith('gradient') ? '#3b82f6' : s.borderColor;
      const cssStyle = s.borderStyle === 'double' ? 'double' :
                       s.borderStyle === 'dashed' ? 'dashed' : 'solid';
      this._overlay.style.border = `${pxWidth}px ${cssStyle} ${color}`;
      this._overlay.style.borderOpacity = s.borderOpacity; // não é uma prop CSS padrão mas usada via alpha
      // Simular opacidade sem afetar o vídeo (usa outline em vez de border quando opacity < 1)
      if (s.borderOpacity < 1) {
        const rgba = this._hexToRgba(color.startsWith('#') ? color : '#3b82f6', s.borderOpacity);
        this._overlay.style.border = `${pxWidth}px ${cssStyle} ${rgba}`;
      }
    }

    // Sombra + Glow (box-shadow)
    const shadows = [];
    if (s.shadowEnabled) {
      shadows.push(`0 8px 24px ${s.shadowColor}`);
    }
    if (s.glowEnabled) {
      const glowPx = Math.round(s.glowBlur * 1000);
      shadows.push(`0 0 ${glowPx}px ${s.glowColor}`);
      shadows.push(`0 0 ${Math.round(glowPx * 1.5)}px ${s.glowColor}`);
    }
    this._overlay.style.boxShadow = shadows.length > 0 ? shadows.join(', ') : 'none';

    // Opacidade geral
    this._overlay.style.opacity = s.alpha;
  }

  // ── Utils privados ────────────────────────────────────────────

  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

// ── Instância global compartilhada entre o painel e o canvas ──────

/** CameraFrameStyle compartilhado — lido por createCompositionStream para renderizar o canvas */
const activeOverlayFrameStyle = new CameraFrameStyle();

/** Instância única do painel de estilo */
let overlayStylePanel = null;

/** Inicializa o OverlayStylePanel após o DOM estar pronto */
function initOverlayConfigSystem() {
  if (!elements.webcamOverlay) return;

  const toggleBtn = document.getElementById('toggle-overlay');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleWebcamOverlay);
  }

  overlayStylePanel = new OverlayStylePanel(elements.webcamOverlay, activeOverlayFrameStyle);
  overlayStylePanel.init();

  console.log('✅ OverlayStylePanel iniciado com sucesso!');
}

/**
 * Abre o painel de personalização (scroll até a seção no sidebar).
 * Chamada pelo botão ⚙️ no overlay PiP.
 */
function openOverlayConfigPanel() {
  if (!controlsOpen) setControlsOpen(true);

  const section = document.getElementById('overlay-controls-group');
  if (!section) {
    updateStatus('⚠️ Painel de estilo não encontrado', 'error');
    return;
  }

  const panel = document.querySelector('.controls-panel');
  if (panel) {
    panel.scrollTo({ top: section.offsetTop - 16, behavior: 'smooth' });
  }

  section.style.transition  = 'box-shadow 0.3s ease';
  section.style.boxShadow   = '0 0 24px rgba(59,130,246,0.5)';
  setTimeout(() => { section.style.boxShadow = ''; }, 2200);

  updateStatus('🎨 Personalize o overlay da câmera');
}

// Sobrescrever enableWebcamOverlay para forçar re-aplicação do estilo ao DOM
const originalEnableWebcamOverlay = enableWebcamOverlay;
enableWebcamOverlay = function() {
  originalEnableWebcamOverlay();
  setTimeout(() => {
    if (overlayStylePanel) overlayStylePanel.refresh();
  }, 120);
};

// Inicializar sistema de personalização
initOverlayConfigSystem();
console.log('✅ Sistema de personalização de overlay inicializado!');



