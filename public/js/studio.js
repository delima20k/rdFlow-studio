import { ScreenCaptureService } from "./services/screen-capture-service.js";
import { WebcamCaptureService } from "./services/webcam-capture-service.js";
import { PhoneCameraService } from "./services/phone-camera-service.js";
import { RecordingService } from "./services/recording-service.js";
import { streamApiService } from "./services/stream-api-service.js";
import { VideoConverterService, videoConverterService } from "./services/video-converter-service.js";
import {
  EditorEngine,
  RenderCanvasEngine,
  ExportManager,
  VideoLayer,
  WebcamLayer,
  OverlayLayer,
  BackgroundBarLayer,
  EXPORT_CONFIG
} from "./video-editor-engine.js";

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
  resizeHandle: document.getElementById("resize-handle"),
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
let recordingTimer = null;
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

// Estado do overlay webcam
let overlayState = {
  enabled: false,
  dragging: false,
  resizing: false,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  startLeft: 0,
  startTop: 0
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
      
      if (screenService.audioStream) {
        screenService.audioStream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: selectedMicrophoneId } }
      });
      
      screenService.audioStream = stream;
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
  // Marcar opção atual
  const currentFormat = screenCaptureFormat;
  const radioToCheck = elements.screenFormatModal.querySelector(`input[value="${currentFormat}"]`);
  if (radioToCheck) {
    radioToCheck.checked = true;
  }
  
  elements.screenFormatModal.classList.add('active');
}

function closeScreenFormatModal() {
  elements.screenFormatModal.classList.remove('active');
}

async function applyScreenFormatSelection() {
  // Obter formato selecionado
  const selectedRadio = elements.screenFormatModal.querySelector('input[name="screen-format"]:checked');
  if (selectedRadio) {
    screenCaptureFormat = selectedRadio.value;
    
    console.log('Formato preferido para download:', screenCaptureFormat);
    
    // Fechar modal
    closeScreenFormatModal();
    
    // Iniciar captura de tela (sem restrição de aspect ratio)
    await handleScreenCapture();
  }
}

function applyFormatStyles() {
  const isVertical = screenCaptureFormat === 'tiktok';
  
  // Aplicar nos previews
  const previews = [elements.mainPreview, elements.screenPreview];
  
  previews.forEach(preview => {
    if (isVertical) {
      // Formato vertical 9:16 (TikTok, Reels, Stories)
      preview.style.aspectRatio = '9 / 16';
      preview.style.maxWidth = '450px';
      preview.style.maxHeight = '800px';
      preview.style.margin = '0 auto';
      preview.style.objectFit = 'contain';
    } else {
      // Formato horizontal 16:9 (YouTube padrão)
      preview.style.aspectRatio = '16 / 9';
      preview.style.maxWidth = '100%';
      preview.style.maxHeight = '100%';
      preview.style.margin = '';
      preview.style.objectFit = 'contain';
    }
  });
  
  // Atualizar indicador visual
  const formatLabel = isVertical ? '📱 TikTok 9:16' : '🎬 YouTube 16:9';
  if (elements.formatIndicator) {
    elements.formatIndicator.textContent = formatLabel;
    elements.formatIndicator.classList.add('active');
    elements.formatIndicator.style.background = isVertical 
      ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' 
      : 'linear-gradient(135deg, #3b82f6, #10b981)';
  }
  
  console.log('✅ Formato aplicado:', formatLabel);
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
    elements.screenPreview.srcObject = stream;
    updateSourceStatus("screen", "Ativo");
    updateMainPreview();
    
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
      screenService.audioStream.getTracks().forEach((track) => track.stop());
      screenService.audioStream = null;
      updateSourceStatus("microphone", "Clique para ativar");
      updateStatus("Microfone desativado");
      return;
    }

    await screenService.captureMicrophone();
    updateSourceStatus("microphone", "Ativo");
    updateStatus("Microfone ativado");
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
      console.log('Preview principal: Tela');
      
      // Se também tiver webcam, ativar overlay PiP automaticamente
      if (webcamStream) {
        console.log('Tela + Webcam detectados, ativando overlay PiP...');
        if (!overlayState.enabled) {
          setTimeout(() => enableWebcamOverlay(), 500);
        }
      }
    } else if (phoneStream) {
      // Se não tiver tela mas tiver celular, usar celular
      elements.mainPreview.srcObject = phoneStream;
      console.log('Preview principal: Celular');
      
      // Se também tiver webcam, ativar overlay PiP
      if (webcamStream && !overlayState.enabled) {
        setTimeout(() => enableWebcamOverlay(), 500);
      }
    } else {
      // Caso contrário, usa webcam
      elements.mainPreview.srcObject = webcamStream;
      console.log('Preview principal: Webcam');
      
      // Desativar overlay se só tiver webcam
      if (overlayState.enabled) {
        disableWebcamOverlay();
      }
    }
    
    elements.mainPreview.style.display = "block";
    elements.mainPreview.parentElement.querySelector(".preview-placeholder").style.display = "none";
    
    // Conectar áudio ao sistema de controle de volume
    setTimeout(() => connectAudioToMainPreview(), 100);
  } else {
    elements.mainPreview.srcObject = null;
    elements.mainPreview.style.display = "none";
    elements.mainPreview.parentElement.querySelector(".preview-placeholder").style.display = "block";
    
    // Desativar overlay se não houver streams
    if (overlayState.enabled) {
      disableWebcamOverlay();
    }
  }
}

function getCombinedStream() {
  console.log('=== getCombinedStream ===');
  console.log('Screen stream:', !!elements.screenPreview.srcObject);
  console.log('Webcam stream:', !!elements.webcamPreview.srcObject);
  console.log('Phone stream:', !!elements.phonePreview.srcObject);
  console.log('Overlay enabled:', overlayState.enabled);
  
  // Se o overlay está ativo E temos tela capturada, usar composição com canvas
  if (overlayState.enabled && elements.screenPreview.srcObject && elements.webcamPreview.srcObject) {
    console.log('✨ Usando composição com Canvas (Tela + Webcam Overlay)');
    return createCompositionStream();
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
  
  // Pegar áudio do sistema (se houver)
  if (screenService.audioStream) {
    console.log('✅ Adicionando áudio do sistema');
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
  
  console.log('Total de streams de áudio:', audioStreams.length);

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

/**
 * Cria stream de composição usando Canvas (Tela + Webcam Overlay)
 */
function createCompositionStream() {
  // Obter vídeos
  const mainVideo = elements.screenPreview;
  const overlayVideoElem = elements.overlayVideo;
  
  if (!mainVideo.videoWidth || !overlayVideoElem.videoWidth) {
    console.warn('Aguardando vídeos carregarem...');
    return null;
  }
  
  // Criar canvas se não existir
  if (!compositionCanvas) {
    compositionCanvas = document.createElement('canvas');
    compositionContext = compositionCanvas.getContext('2d');
  }
  
  // Canvas sempre em 1080x1920 (9:16) para exportação mobile sem faixas pretas
  compositionCanvas.width = mainVideo.videoWidth;
  compositionCanvas.height = mainVideo.videoHeight;
  
  console.log('📐 Canvas compositor criado:', {
    width: compositionCanvas.width,
    height: compositionCanvas.height
  });
  
  // Função de renderização contínua
  let frameCounter = 0;
  const renderFrame = () => {
    // NUNCA parar a renderização durante gravação ativa
    // Sempre continuar o loop para evitar frames congelados
    
    try {
      // Limpar canvas
      compositionContext.clearRect(0, 0, compositionCanvas.width, compositionCanvas.height);
      
      // Desenhar vídeo principal (tela) - SEMPRE, mesmo que overlay esteja desabilitado
      if (mainVideo.videoWidth > 0 && mainVideo.videoHeight > 0) {
        compositionContext.drawImage(mainVideo, 0, 0, compositionCanvas.width, compositionCanvas.height);
      }
      
      // Log a cada 5 segundos (150 frames a 30fps)
      if (frameCounter % 150 === 0) {
        console.log(`[Composição] Frame ${frameCounter} renderizado - Vídeo: ${mainVideo.videoWidth}x${mainVideo.videoHeight}`);
      }
      frameCounter++;
    } catch (error) {
      console.error('[Composição] Erro ao renderizar frame:', error);
      // Mesmo com erro, continuar o loop
    }
    
    // Desenhar overlay da webcam se visível
    if (overlayState.enabled && elements.webcamOverlay.classList.contains('active')) {
      try {
        const overlay = elements.webcamOverlay;
        const mainRect = elements.mainPreview.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();
        
        // Calcular posição e tamanho proporcionais ao canvas
        const scaleX = compositionCanvas.width / mainRect.width;
        const scaleY = compositionCanvas.height / mainRect.height;
        
        const overlayX = (overlayRect.left - mainRect.left) * scaleX;
        const overlayY = (overlayRect.top - mainRect.top) * scaleY;
        const overlayWidth = overlayRect.width * scaleX;
        const overlayHeight = overlayRect.height * scaleY;
        
        // Desenhar webcam overlay
        compositionContext.save();
        
        // Adicionar sombra para destaque
        compositionContext.shadowColor = 'rgba(0, 0, 0, 0.5)';
        compositionContext.shadowBlur = 10;
        compositionContext.shadowOffsetX = 0;
        compositionContext.shadowOffsetY = 4;
        
        // Desenhar borda arredondada
        const radius = 8;
        compositionContext.beginPath();
        compositionContext.roundRect(overlayX, overlayY, overlayWidth, overlayHeight, radius);
        compositionContext.clip();
        
        // Desenhar vídeo da webcam
        compositionContext.drawImage(overlayVideoElem, overlayX, overlayY, overlayWidth, overlayHeight);
        
        // Desenhar borda
        compositionContext.strokeStyle = '#3b82f6';
        compositionContext.lineWidth = 3;
        compositionContext.roundRect(overlayX, overlayY, overlayWidth, overlayHeight, radius);
        compositionContext.stroke();
        
        compositionContext.restore();
      } catch (error) {
        console.error('[Composição] Erro ao renderizar overlay:', error);
        // Continuar mesmo com erro
      }
    }
    
    // SEMPRE continuar o loop de renderização (crítico para vídeo não congelar)
    compositionAnimationFrame = requestAnimationFrame(renderFrame);
  };
  
  // Log de início da composição
  console.log('🎬 Iniciando composição contínua (30 FPS)...');
  
  // Iniciar renderização
  renderFrame();
  
  // Capturar stream do canvas
  const canvasStream = compositionCanvas.captureStream(30); // 30 FPS
  
  // Adicionar áudio
  const audioStreams = [];
  
  if (screenService.audioStream) {
    console.log('✅ Adicionando áudio do sistema ao canvas');
    audioStreams.push(screenService.audioStream);
  }
  
  if (elements.screenPreview.srcObject && elements.screenPreview.srcObject.getAudioTracks().length > 0) {
    console.log('✅ Adicionando áudio da tela ao canvas');
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
    cancelAnimationFrame(compositionAnimationFrame);
    compositionAnimationFrame = null;
  }
  
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
    
    // Gravar webcam separadamente se estiver ativa
    startWebcamRecording();

    console.log('✅ Gravação iniciada com sucesso');
    updateStatus("🔴 Gravação iniciada");
  } catch (error) {
    console.error('Erro ao iniciar gravação:', error);
    updateStatus(`❌ Erro: ${error.message}`, "error");
  }
}

async function handleStopRecording() {
  try {
    console.log('Parando gravação...');
    recordingBlob = await recordingService.stopRecording();
    
    // Parar composição do canvas se estiver ativa
    stopCompositionStream();
    
    // Parar gravação da webcam se estiver ativa
    stopWebcamRecording();

    if (!recordingBlob) {
      console.error('Nenhum blob de gravação criado');
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
  modal.style.zIndex = '4000';
  
  modal.innerHTML = `
    <div class="device-content" style="max-width: 1200px; max-height: 90vh; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h3>✨ Editor de Composição Vertical (9:16)</h3>
          <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
            📱 Posicione o vídeo e adicione elementos • ${selectedFormat} • Exportação: 1080x1920
          </p>
        </div>
        <button id="close-editor" class="btn-secondary" style="padding: 8px 16px;">✖ Fechar</button>
      </div>
      
      <div style="flex: 1; display: grid; grid-template-columns: 250px 1fr 250px; gap: 20px; overflow: visible; min-height: 600px;">
        <!-- Painel Esquerdo: Elementos -->
        <div style="background: var(--panel-dark); border-radius: 12px; padding: 16px; overflow-y: auto;">
          <h4 style="margin-bottom: 12px; font-size: 14px;">📦 Adicionar Elementos</h4>
          
          <!-- Explicação do fluxo -->
          <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid var(--accent); padding: 12px; margin-bottom: 16px; border-radius: 6px;">
            <p style="font-size: 11px; line-height: 1.6; color: var(--text-muted); margin: 0;">
              <strong style="color: var(--text);">Como usar:</strong><br>
              1️⃣ Posicione o vídeo da tela (cima/centro/baixo)<br>
              2️⃣ Adicione a webcam gravada como elemento<br>
              3️⃣ Arraste emojis e textos nos espaços livres<br>
              4️⃣ Exporte → Vídeo 9:16 ocupando tela toda
            </p>
          </div>
          
          <!-- Emojis -->
          <div style="margin-bottom: 16px;">
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Emojis:</p>
            <div id="emoji-list" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
              <div class="draggable-element emoji-item" data-type="emoji" data-value="😀" style="font-size: 32px; text-align: center; cursor: grab; padding: 8px; background: var(--panel-light); border-radius: 8px;" draggable="true">😀</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="❤️" style="font-size: 32px; text-align: center; cursor: grab; padding: 8px; background: var(--panel-light); border-radius: 8px;" draggable="true">❤️</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="🔥" style="font-size: 32px; text-align: center; cursor: grab; padding: 8px; background: var(--panel-light); border-radius: 8px;" draggable="true">🔥</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="⭐" style="font-size: 32px; text-align: center; cursor: grab; padding: 8px; background: var(--panel-light); border-radius: 8px;" draggable="true">⭐</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="✨" style="font-size: 32px; text-align: center; cursor: grab; padding: 8px; background: var(--panel-light); border-radius: 8px;" draggable="true">✨</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="💯" style="font-size: 32px; text-align: center; cursor: grab; padding: 8px; background: var(--panel-light); border-radius: 8px;" draggable="true">💯</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="👍" style="font-size: 32px; text-align: center; cursor: grab; padding: 8px; background: var(--panel-light); border-radius: 8px;" draggable="true">👍</div>
              <div class="draggable-element emoji-item" data-type="emoji" data-value="🎉" style="font-size: 32px; text-align: center; cursor: grab; padding: 8px; background: var(--panel-light); border-radius: 8px;" draggable="true">🎉</div>
            </div>
          </div>
          
          <!-- Texto -->
          <div style="margin-bottom: 16px;">
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Texto:</p>
            <input type="text" id="text-input" placeholder="Digite seu texto..." style="width: 100%; padding: 10px; background: var(--panel-light); border: 2px solid var(--border); border-radius: 8px; color: var(--text); font-size: 14px; margin-bottom: 8px;">
            <button id="add-text-btn" class="btn-primary" style="width: 100%; padding: 10px; font-size: 13px;">➕ Adicionar Texto</button>
          </div>
          
          <!-- Webcam Gravada -->
          <div style="margin-bottom: 16px;">
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Vídeo da Webcam:</p>
            <button id="add-webcam-btn" class="btn-secondary" style="width: 100%; padding: 10px; font-size: 13px;">📹 Adicionar Webcam Gravada</button>
            <p style="font-size: 10px; color: var(--text-muted); margin-top: 4px; font-style: italic;">Adiciona o vídeo da webcam como elemento arrastável</p>
          </div>
          
          <!-- Zoom e Escala do Vídeo -->
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border);">
            <h4 style="margin-bottom: 12px; font-size: 14px;">🎬 Vídeo Principal (Full 9:16)</h4>
            
            <!-- Info: modo cobertura total -->
            <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--success); padding: 8px 10px; border-radius: 6px; margin-bottom: 12px; font-size: 11px; color: var(--text-muted);">
              ✅ <strong style="color: var(--success);">Modo Cover ativo</strong><br>
              Vídeo preenche 100% da tela — sem faixas pretas
            </div>
            
            <!-- Zoom Extra -->
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">🔍 Zoom extra (100% = sem zoom):</p>
            <input type="range" id="video-position-slider" min="0" max="50" value="0" step="1" style="width: 100%; margin-bottom: 8px; accent-color: var(--accent);">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px;">
              <button id="position-top" class="btn-secondary" style="padding: 8px; font-size: 11px;">📐 Normal</button>
              <button id="position-center" class="btn-secondary" style="padding: 8px; font-size: 11px;">🔍 +20%</button>
              <button id="position-bottom" class="btn-secondary" style="padding: 8px; font-size: 11px;">🔎 +50%</button>
            </div>
            
            <!-- Escala (Zoom) -->
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">📏 Escala fina (50-150%):</p>
            <input type="range" id="video-scale-slider" min="50" max="150" value="100" step="1" style="width: 100%; margin-bottom: 8px; accent-color: var(--success);">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <button id="scale-small" class="btn-secondary" style="padding: 8px; font-size: 11px;">🔻 Menor</button>
              <button id="scale-normal" class="btn-secondary" style="padding: 8px; font-size: 11px;">⬤ Normal</button>
              <button id="scale-large" class="btn-secondary" style="padding: 8px; font-size: 11px;">🔺 Maior</button>
            </div>
            
            <div id="video-info" style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 6px;">
              <div>Zoom: <span id="video-y">100%</span> • Escala: <span id="video-scale">100%</span></div>
              <div style="margin-top: 4px; font-size: 10px;">💡 Vídeo ocupa toda a tela 9:16 — adicione elementos sobre ele</div>
            </div>
          </div>
        </div>
        
        <!-- Área Central: Editor + Preview Canvas -->
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--panel-dark); border-radius: 12px; overflow: hidden; padding: 16px; gap: 16px;">
          
          <!-- Título do Preview -->
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 8px;">
            <div>
              <h4 style="margin: 0; font-size: 14px; color: var(--text);">📱 Editor Interativo</h4>
              <p style="margin: 4px 0 0; font-size: 11px; color: var(--text-muted);">Arraste elementos para compor</p>
            </div>
            <div>
              <h4 style="margin: 0; font-size: 14px; color: var(--accent);">🎬 Preview Final (1080x1920)</h4>
              <p style="margin: 4px 0 0; font-size: 11px; color: var(--text-muted);">Renderização em tempo real</p>
            </div>
          </div>
          
          <!-- Container com Phone-device e Canvas lado a lado -->
          <div style="display: flex; gap: 24px; align-items: flex-start; justify-content: center;">
            
            <!-- Phone-device (Referência Visual) -->
            <div id="phone-device" style="position: relative; width: 360px; height: 640px; background: linear-gradient(145deg, #1a1a1a, #0a0a0a); border-radius: 40px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), inset 0 0 0 3px #333, inset 0 0 0 8px #111; overflow: hidden; border: 4px solid #222;">
              <!-- Notch do celular -->
              <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 140px; height: 30px; background: #000; border-radius: 0 0 20px 20px; z-index: 100;"></div>
              
              <!-- Área de composição (canvas de fundo) -->
              <div id="drop-zone" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <!-- Vídeo de fundo (cobertura total 9:16 - sem faixas) -->
                <video id="editor-video" src="" autoplay loop muted style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0;"></video>
                
                <!-- Mensagem de ajuda -->
                <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.9); color: var(--text-muted); padding: 8px 16px; border-radius: 8px; font-size: 11px; text-align: center; border: 1px solid var(--accent); max-width: 280px;">
                  💡 Use os controles à esquerda para ajustar posição e tamanho do vídeo
                </div>
              </div>
              </div>
              </div>
            </div>
            
            <!-- Canvas de Preview Final (Renderização Real) -->
            <div style="position: relative;">
              <canvas id="preview-canvas" width="360" height="640" style="width: 360px; height: 640px; background: #000; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 2px var(--accent);"></canvas>
              
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
        </div>
        
        <!-- Painel Direito: Camadas -->
        <div style="background: var(--panel-dark); border-radius: 12px; padding: 16px; overflow-y: auto;">
          <h4 style="margin-bottom: 12px; font-size: 14px;">🗂️ Camadas</h4>
          <div id="layers-list" style="display: flex; flex-direction: column; gap: 8px;">
            <p style="color: var(--text-muted); font-size: 12px; text-align: center;">Nenhum elemento adicionado</p>
          </div>
        </div>
      </div>
      
      <!-- Barra de Progresso da Exportação -->
      <div id="export-progress-container" style="margin-top: 20px; display: none;">
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
      
      <!-- Botões de Ação (sempre visíveis) -->
      <div id="action-buttons" style="margin-top: 20px; padding: 16px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--panel); border-top: 2px solid var(--border); margin-left: -24px; margin-right: -24px; padding-left: 24px; padding-right: 24px; position: sticky; bottom: 0; z-index: 100;">
        <button id="export-video-btn" class="btn-success" style="padding: 16px; font-size: 15px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
          ⬇️ Exportar Vídeo
        </button>
        <button id="cancel-editor-btn" class="btn-secondary" style="padding: 16px; font-size: 15px;">
          ❌ Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Configurar vídeo
  const editorVideo = modal.querySelector('#editor-video');
  editorVideo.src = URL.createObjectURL(recordingBlob);
  
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
  
  // Criar camada de vídeo principal - COBRE TODO O CANVAS 9:16 SEM FAIXAS PRETAS
  // Modo COVER: escala o vídeo para preencher 1080x1920 completo, corta excesso lateral
  // Resultado: zero faixas pretas, vídeo ocupa tela inteira do celular
  const mainVideoLayer = new VideoLayer(editorEngine.generateId(), editorVideo);
  mainVideoLayer.x = 0;       // Alinhado à esquerda
  mainVideoLayer.y = 0;       // Começa no topo (canvas completo)
  mainVideoLayer.width = 1.0; // 100% da largura
  mainVideoLayer.height = 1.0; // 100% da altura (canvas inteiro)
  mainVideoLayer.scale = 1.0;  // Escala padrão (100%)
  mainVideoLayer.zIndex = 0;   // Vídeo principal sempre atrás dos elementos
  mainVideoLayer.maintainAspectRatio = true;
  mainVideoLayer.fitMode = 'cover'; // COVER = preenche TODO o canvas, sem faixas pretas
  
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
  console.log('[Editor] - Controles: posição Y + escala (zoom)');
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
  
  // Controle de zoom do vídeo (reutiliza slider de posição)
  // Com cover + canvas completo, o vídeo já ocupa 100% da tela.
  // Este controle ajusta o zoom (scale) para ampliar/reduzir a área exibida.
  function updateVideoPosition(zoomPercent) {
    // Range: 100% = sem zoom (cobertura exata), 150% = 50% mais ampliado
    zoomPercent = Math.max(100, Math.min(150, zoomPercent));
    const normalizedScale = zoomPercent / 100;
    
    // Atualizar escala do vídeo (zoom)
    mainVideoLayer.scale = normalizedScale;
    
    // Atualizar UI
    videoYSpan.textContent = `${zoomPercent}%`;
    videoPositionSlider.value = (zoomPercent - 100) * 2; // 0-100 no slider
    
    console.log('[Editor] Zoom do vídeo atualizado:', {
      zoomPercent,
      normalizedScale
    });
  }
  
  // Função para atualizar escala do vídeo (50-150%)
  function updateVideoScale(scalePercent) {
    // Limitar valores
    scalePercent = Math.max(50, Math.min(150, scalePercent));
    
    // Converter para normalizado (0.5 - 1.5)
    const normalizedScale = scalePercent / 100;
    
    // Atualizar camada
    mainVideoLayer.scale = normalizedScale;
    
    // Atualizar UI
    videoScaleSpan.textContent = `${scalePercent}%`;
    videoScaleSlider.value = scalePercent;
    
    console.log('[Editor] Escala do vídeo atualizada:', {
      scalePercent,
      normalizedScale
    });
  }
  
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
      element.style.borderRadius = '50%';
      element.style.overflow = 'hidden';
      element.style.border = '3px solid #fff';
      element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
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
      
      // Criar WebcamLayer
      if (videoElement) {
        layer = new WebcamLayer(layerId, videoElement);
        layer.fromPixelCoordinates(x, y, 360, 640);
        layer.width = 120 / 360; // Largura normalizada
        layer.height = 120 / 640; // Altura normalizada
        layer.frameStyle = 'circular';
        layer.borderWidth = 0.003; // 3px / 1080
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
      layer // Referência direta ao Layer
    });
    
    updateLayersList();
  }
  
  // Atualizar lista de camadas
  function updateLayersList() {
    if (editorState.elements.length === 0) {
      layersList.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; text-align: center;">Nenhum elemento adicionado</p>';
      return;
    }
    
    layersList.innerHTML = editorState.elements.map((elem, index) => {
      const icon = elem.type === 'emoji' ? elem.value : elem.type === 'text' ? '📝' : '📹';
      const label = elem.type === 'text' ? elem.value.substring(0, 20) : elem.type.toUpperCase();
      
      return `
        <div style="padding: 8px; background: var(--panel-light); border-radius: 6px; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span>${icon} ${label}</span>
          <button class="remove-layer-btn" data-id="${elem.id}" style="background: var(--danger); border: none; color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">🗑️</button>
        </div>
      `;
    }).join('');
    
    // Event listeners para remover
    layersList.querySelectorAll('.remove-layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const elem = editorState.elements.find(e => e.id === id);
        if (elem && elem.element) {
          dropZone.removeChild(elem.element);
        }
        const index = editorState.elements.findIndex(e => e.id === id);
        if (index > -1) editorState.elements.splice(index, 1);
        updateLayersList();
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
    
    // Desabilitar botão e mostrar barra de progresso
    exportBtn.disabled = true;
    actionButtons.style.display = 'none';
    progressContainer.style.display = 'block';
    
    try {
      await exportVerticalVideo({
        onProgress: (progress, elapsed, duration) => {
          const progressPercent = Math.round(progress);
          progressBar.style.width = `${progressPercent}%`;
          progressPercentage.textContent = `${progressPercent}%`;
          timeInfo.textContent = `Renderizando: ${elapsed.toFixed(1)}s / ${duration.toFixed(1)}s`;
          statusInfo.textContent = progressPercent < 100 ? 'Renderizando frames...' : 'Finalizando...';
        }
      });
      
      // Sucesso
      progressBar.style.width = '100%';
      progressPercentage.textContent = '100%';
      statusInfo.textContent = '✅ Exportação concluída!';
      statusInfo.style.color = 'var(--success)';
      
      setTimeout(() => {
        // Parar loop de renderização antes de fechar
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          console.log('[Editor] Preview loop cancelado');
        }
        
        document.body.removeChild(modal);
        URL.revokeObjectURL(editorVideo.src);
      }, 2000);
      
    } catch (error) {
      console.error('[Editor] Erro ao exportar:', error);
      
      // Mostrar erro
      statusInfo.textContent = `❌ Erro: ${error.message}`;
      statusInfo.style.color = 'var(--danger)';
      
      // Reabilitar botões após 3 segundos
      setTimeout(() => {
        progressContainer.style.display = 'none';
        actionButtons.style.display = 'grid';
        exportBtn.disabled = false;
      }, 3000);
    }
  });
  
  // Exportar vídeo com elementos (REFATORADO COM OOP)
  async function exportVerticalVideo(options = {}) {
    const { onProgress } = options;
    
    console.log('[Editor] Iniciando exportação com OOP Engine...');
    console.log('[Editor] Estado do EditorEngine:', editorEngine.exportState());
    
    try {
      // Exportar usando ExportManager
      const blob = await exportManager.exportVideo(
        editorVideo,
        (progress, elapsed, duration) => {
          // Callback de progresso
          if (onProgress) {
            onProgress(progress, elapsed, duration);
          }
          
          console.log(`[Editor] Progresso: ${Math.round(progress)}% - ${elapsed.toFixed(1)}s/${duration.toFixed(1)}s`);
        }
      );
      
      // Fazer download do blob
      exportManager.downloadBlob(blob, `video-vertical-editado-${new Date().toISOString().slice(0, 10)}.webm`);
      
      console.log('[Editor] Exportação concluída com sucesso! ✅');
      updateStatus('✅ Vídeo vertical exportado com sucesso!');
      
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
  screenService.stopCapture();
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
        await handleScreenCapture();
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

function initWebcamOverlay() {
  if (!elements.webcamOverlay) return;

  // Posicionar overlay no canto inferior direito inicialmente
  elements.webcamOverlay.style.right = '20px';
  elements.webcamOverlay.style.bottom = '20px';

  // Drag do overlay
  elements.webcamOverlay.addEventListener('mousedown', startDrag);
  
  // Resize do overlay
  if (elements.resizeHandle) {
    elements.resizeHandle.addEventListener('mousedown', startResize);
  }

  // Fechar overlay
  if (elements.overlayClose) {
    elements.overlayClose.addEventListener('click', (e) => {
      e.stopPropagation();
      disableWebcamOverlay();
    });
  }
  
  // Event listener para botão de configuração do overlay
  if (elements.overlayConfigBtn) {
    elements.overlayConfigBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar drag
      openOverlayConfigPanel();
    });
  }
}

function startDrag(e) {
  // Não arrastar se clicar nos controles ou no resize handle
  if (e.target.closest('.resize-handle') || e.target.closest('.overlay-btn')) {
    return;
  }
  
  console.log('Iniciando drag do overlay');
  e.preventDefault();
  e.stopPropagation();
  
  overlayState.dragging = true;
  overlayState.startX = e.clientX;
  overlayState.startY = e.clientY;
  
  const rect = elements.webcamOverlay.getBoundingClientRect();
  overlayState.startLeft = rect.left;
  overlayState.startTop = rect.top;
  
  elements.webcamOverlay.style.cursor = 'grabbing';
  elements.webcamOverlay.classList.add('dragging');
  
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
}

function drag(e) {
  if (!overlayState.dragging) return;
  
  const deltaX = e.clientX - overlayState.startX;
  const deltaY = e.clientY - overlayState.startY;
  
  const newLeft = overlayState.startLeft + deltaX;
  const newTop = overlayState.startTop + deltaY;
  
  // Limites da área principal
  const mainBox = elements.mainPreview.parentElement;
  const mainRect = mainBox.getBoundingClientRect();
  const overlayRect = elements.webcamOverlay.getBoundingClientRect();
  
  const maxLeft = mainRect.width - overlayRect.width;
  const maxTop = mainRect.height - overlayRect.height;
  
  elements.webcamOverlay.style.left = `${Math.max(0, Math.min(newLeft - mainRect.left, maxLeft))}px`;
  elements.webcamOverlay.style.top = `${Math.max(0, Math.min(newTop - mainRect.top, maxTop))}px`;
  elements.webcamOverlay.style.right = 'auto';
  elements.webcamOverlay.style.bottom = 'auto';
}

function stopDrag() {
  console.log('Finalizando drag do overlay');
  overlayState.dragging = false;
  elements.webcamOverlay.style.cursor = 'move';
  elements.webcamOverlay.classList.remove('dragging');
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
}

function startResize(e) {
  console.log('Iniciando resize do overlay');
  e.preventDefault();
  e.stopPropagation();
  
  overlayState.resizing = true;
  overlayState.startX = e.clientX;
  overlayState.startY = e.clientY;
  overlayState.startWidth = elements.webcamOverlay.offsetWidth;
  overlayState.startHeight = elements.webcamOverlay.offsetHeight;
  
  elements.webcamOverlay.style.cursor = 'nwse-resize';
  
  document.addEventListener('mousemove', resize);
  document.addEventListener('mouseup', stopResize);
}

function resize(e) {
  if (!overlayState.resizing) return;
  
  const deltaX = e.clientX - overlayState.startX;
  const deltaY = e.clientY - overlayState.startY;
  
  let newWidth = overlayState.startWidth + deltaX;
  let newHeight = overlayState.startHeight + deltaY;
  
  // Manter proporção 16:9
  const aspectRatio = 16 / 9;
  newHeight = newWidth / aspectRatio;
  
  // Aplicar limites
  newWidth = Math.max(120, Math.min(480, newWidth));
  newHeight = Math.max(68, Math.min(270, newHeight));
  
  elements.webcamOverlay.style.width = `${newWidth}px`;
  elements.webcamOverlay.style.height = `${newHeight}px`;
}

function stopResize() {
  console.log('Finalizando resize do overlay');
  overlayState.resizing = false;
  elements.webcamOverlay.style.cursor = 'move';
  document.removeEventListener('mousemove', resize);
  document.removeEventListener('mouseup', stopResize);
}

function enableWebcamOverlay() {
  if (!elements.webcamPreview.srcObject) {
    console.warn('Webcam não está ativa, não pode ativar overlay');
    updateStatus('❌ Ative a webcam primeiro', 'error');
    return;
  }
  
  console.log('Ativando overlay da webcam');
  overlayState.enabled = true;
  elements.webcamOverlay.classList.add('active');
  elements.overlayVideo.srcObject = elements.webcamPreview.srcObject;
  
  // Garantir posicionamento inicial
  if (!elements.webcamOverlay.style.right || elements.webcamOverlay.style.right === 'auto') {
    elements.webcamOverlay.style.right = '20px';
    elements.webcamOverlay.style.bottom = '20px';
    elements.webcamOverlay.style.left = 'auto';
    elements.webcamOverlay.style.top = 'auto';
  }
  
  // Garantir que pointer-events esteja ativo
  elements.webcamOverlay.style.pointerEvents = 'auto';
  
  console.log('✅ Overlay ativado com sucesso');
  updateStatus('📹 Overlay webcam ativado - arraste para mover, canto para redimensionar');
}

function disableWebcamOverlay() {
  overlayState.enabled = false;
  elements.webcamOverlay.classList.remove('active');
  elements.overlayVideo.srcObject = null;
  updateStatus('Overlay webcam desativado');
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
      // Garantir que o volume do elemento reflita o controle
      const volumeLevel = outputMuted ? 0 : (parseFloat(elements.outputVolume.value) / 100);
      elements.mainPreview.volume = volumeLevel;
      elements.mainPreview.muted = outputMuted;
      
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
// initWebcamDevices(); // Removido: detectar apenas quando usuário clicar em Webcam
initWebcamOverlay();
initOverlayConfigSystem();
initFormatToggle();
updateStatus("Sistema pronto para captura");

// ===== SISTEMA COMPLETO DE PERSONALIZAÇÃO DE OVERLAY =====

// Estado do overlay personalizado
const overlayConfig = {
  frameStyle: 'neon-border',
  message: '',
  position: 'bottom-right',
  size: 200
};

/**
 * Abre o painel de configuração do overlay (sidebar)
 * Usado pelo botão ⚙️ no webcam-overlay
 */
function openOverlayConfigPanel() {
  // 1. Abrir sidebar se estiver fechado (mobile)
  if (!controlsOpen) {
    setControlsOpen(true);
  }
  
  // 2. Encontrar a seção "Design da Webcam"
  const overlayControlsGroup = document.querySelector('.overlay-controls-group');
  
  if (!overlayControlsGroup) {
    console.warn('[Overlay Config] Seção de design não encontrada');
    updateStatus('⚠️ Seção de configuração não disponível', 'error');
    return;
  }
  
  // 3. Fazer scroll suave até a seção
  const controlsPanel = document.querySelector('.controls-panel');
  if (controlsPanel) {
    // Calcular posição da seção dentro do painel
    const sectionTop = overlayControlsGroup.offsetTop;
    
    controlsPanel.scrollTo({
      top: sectionTop - 20, // 20px de margem superior
      behavior: 'smooth'
    });
  }
  
  // 4. Destacar temporariamente a seção (animação de atenção)
  overlayControlsGroup.style.transition = 'all 0.3s ease';
  overlayControlsGroup.style.transform = 'scale(1.02)';
  overlayControlsGroup.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
  
  // Remover destaque após 2 segundos
  setTimeout(() => {
    overlayControlsGroup.style.transform = '';
    overlayControlsGroup.style.boxShadow = '';
  }, 2000);
  
  // 5. Feedback visual
  updateStatus('🎨 Configurações do overlay abertas no sidebar');
  console.log('[Overlay Config] Painel de configuração aberto');
}

function initOverlayConfigSystem() {
  const toggleOverlayBtn = document.getElementById('toggle-overlay');
  
  // Toggle overlay (mantém funcionalidade original)
  if (toggleOverlayBtn) {
    toggleOverlayBtn.addEventListener('click', toggleWebcamOverlay);
  }
  
  // Inicializar seleção de molduras (botões compactos)
  initFrameStyleSelection();
  
  // Inicializar sistema de mensagens (tabs + selects)
  initMessageSystem();
  
  // Inicializar controles de posição e tamanho (aplicação em tempo real)
  initPositionControls();
}

function initFrameStyleSelection() {
  const frameCompactBtns = document.querySelectorAll('.frame-compact-btn');
  
  frameCompactBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remover active de todos
      frameCompactBtns.forEach(b => b.classList.remove('active'));
      
      // Adicionar active ao clicado
      btn.classList.add('active');
      
      // Aplicar estilo IMEDIATAMENTE
      const style = btn.dataset.style;
      overlayConfig.frameStyle = style;
      
      // Aplicar configuração em tempo real
      if (overlayState.enabled) {
        applyOverlayConfig();
      }
      
      updateStatus(`🎨 Moldura: ${style}`);
      console.log('[Overlay Config] Estilo de moldura aplicado:', style);
    });
  });
}

function initMessageSystem() {
  // Tabs de categorias (ícones compactos)
  const msgTabs = document.querySelectorAll('.msg-tab');
  const messagePanels = document.querySelectorAll('.message-panel');
  
  msgTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;
      
      // Atualizar tabs
      msgTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Mostrar painel correto
      messagePanels.forEach(panel => {
        if (panel.dataset.category === category) {
          panel.classList.remove('hidden');
        } else {
          panel.classList.add('hidden');
        }
      });
    });
  });
  
  // Mensagem personalizada (input + botão)
  const customMessageInput = document.getElementById('custom-message-input');
  const applyCustomMessage = document.getElementById('apply-custom-message');
  
  if (applyCustomMessage) {
    applyCustomMessage.addEventListener('click', () => {
      const message = customMessageInput.value.trim();
      if (message) {
        overlayConfig.message = message;
        
        // Aplicar IMEDIATAMENTE
        if (overlayState.enabled) {
          applyOverlayConfig();
        }
        
        updateStatus('💬 Mensagem aplicada!');
      }
    });
    
    // Enter também aplica
    customMessageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        applyCustomMessage.click();
      }
    });
  }
  
  // Selects de mensagens predefinidas
  const socialSelect = document.getElementById('social-messages');
  const motivationSelect = document.getElementById('motivation-messages');
  const protestSelect = document.getElementById('protest-messages');
  
  [socialSelect, motivationSelect, protestSelect].forEach(select => {
    if (select) {
      select.addEventListener('change', () => {
        const message = select.value;
        
        if (message) {
          overlayConfig.message = message;
          
          // Aplicar IMEDIATAMENTE
          if (overlayState.enabled) {
            applyOverlayConfig();
          }
          
          updateStatus(`💬 Mensagem: ${message.substring(0, 20)}...`);
          console.log('[Overlay Config] Mensagem selecionada:', message);
        }
      });
    }
  });
  
  // Limpar mensagem
  const clearMessageBtn = document.getElementById('clear-message');
  
  if (clearMessageBtn) {
    clearMessageBtn.addEventListener('click', () => {
      overlayConfig.message = '';
      
      // Limpar campos
      if (customMessageInput) customMessageInput.value = '';
      if (socialSelect) socialSelect.value = '';
      if (motivationSelect) motivationSelect.value = '';
      if (protestSelect) protestSelect.value = '';
      
      // Aplicar IMEDIATAMENTE
      if (overlayState.enabled) {
        const messageElem = elements.webcamOverlay.querySelector('.overlay-message');
        if (messageElem) {
          messageElem.textContent = '';
        }
      }
      
      updateStatus('🗑️ Mensagem removida');
    });
  }
}

function initPositionControls() {
  const positionSelect = document.getElementById('overlay-position');
  const sizeRange = document.getElementById('overlay-size');
  const sizeValue = document.getElementById('overlay-size-value');
  
  // Posição - APLICAÇÃO IMEDIATA
  if (positionSelect) {
    positionSelect.addEventListener('change', () => {
      overlayConfig.position = positionSelect.value;
      
      // Aplicar IMEDIATAMENTE
      if (overlayState.enabled) {
        applyOverlayConfig();
      }
      
      updateStatus(`📍 Posição: ${positionSelect.options[positionSelect.selectedIndex].text}`);
    });
  }
  
  // Tamanho - APLICAÇÃO EM TEMPO REAL
  if (sizeRange) {
    sizeRange.addEventListener('input', () => {
      const size = parseInt(sizeRange.value);
      overlayConfig.size = size;
      
      if (sizeValue) {
        sizeValue.textContent = `${size}px`;
      }
      
      // Aplicar IMEDIATAMENTE enquanto arrasta
      if (overlayState.enabled) {
        applyOverlayConfig();
      }
    });
  }
}

function applyOverlayConfig() {
  if (!elements.webcamOverlay) return;
  
  const overlayFrame = elements.webcamOverlay.querySelector('.overlay-frame');
  const overlayMessage = elements.webcamOverlay.querySelector('.overlay-message');
  
  // Aplicar estilo de moldura
  if (overlayFrame) {
    // Remover todas as classes de estilo
    overlayFrame.className = 'overlay-frame';
    
    // Adicionar novo estilo
    overlayFrame.classList.add(overlayConfig.frameStyle);
    
    console.log('[Overlay Apply] Estilo aplicado:', overlayConfig.frameStyle);
  }
  
  // Aplicar mensagem
  if (overlayMessage) {
    overlayMessage.textContent = overlayConfig.message;
  }
  
  // Aplicar tamanho
  elements.webcamOverlay.style.width = `${overlayConfig.size}px`;
  elements.webcamOverlay.style.height = `${overlayConfig.size}px`;
  
  // Aplicar posição
  applyOverlayPosition(overlayConfig.position);
  
  console.log('[Overlay Apply] Configuração completa aplicada:', overlayConfig);
}

function applyOverlayPosition(position) {
  // Resetar todas as posições
  elements. webcamOverlay.style.left = 'auto';
  elements.webcamOverlay.style.right = 'auto';
  elements.webcamOverlay.style.top = 'auto';
  elements.webcamOverlay.style.bottom = 'auto';
  
  const margin = '20px';
  
  switch (position) {
    case 'bottom-right':
      elements.webcamOverlay.style.bottom = margin;
      elements.webcamOverlay.style.right = margin;
      break;
    case 'bottom-left':
      elements.webcamOverlay.style.bottom = margin;
      elements.webcamOverlay.style.left = margin;
      break;
    case 'top-right':
      elements.webcamOverlay.style.top = margin;
      elements.webcamOverlay.style.right = margin;
      break;
    case 'top-left':
      elements.webcamOverlay.style.top = margin;
      elements.webcamOverlay.style.left = margin;
      break;
  }
}

// Modificar enableWebcamOverlay para aplicar configuração
const originalEnableWebcamOverlay = enableWebcamOverlay;
enableWebcamOverlay = function() {
  originalEnableWebcamOverlay();
  
  // Aplicar configuração salva
  setTimeout(() => {
    applyOverlayConfig();
  }, 100);
};

console.log('✅ Sistema de personalização de overlay inicializado!');
