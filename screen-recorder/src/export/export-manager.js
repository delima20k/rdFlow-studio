const { ExportStatus } = require('../models/enums');
const { DEFAULT_EXPORT_CONFIG } = require('../models/constants');

/**
 * Classe que representa um job de exportação
 */
class ExportJob {
  constructor(config) {
    this.id = this._generateId();
    this.config = config;
    this.status = ExportStatus.PENDING;
    this.progress = 0;
    this.outputPath = null;
    this.error = null;
    this.startTime = null;
    this.endTime = null;
  }

  _generateId() {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  start() {
    this.status = ExportStatus.PROCESSING;
    this.startTime = new Date();
    this.progress = 0;
  }

  updateProgress(progress) {
    this.progress = Math.min(100, Math.max(0, progress));
  }

  complete(outputPath) {
    this.status = ExportStatus.COMPLETED;
    this.progress = 100;
    this.outputPath = outputPath;
    this.endTime = new Date();
  }

  fail(error) {
    this.status = ExportStatus.FAILED;
    this.error = error;
    this.endTime = new Date();
  }

  cancel() {
    this.status = ExportStatus.CANCELLED;
    this.endTime = new Date();
  }

  getDuration() {
    if (!this.startTime) return 0;
    const endTime = this.endTime || new Date();
    return endTime - this.startTime;
  }

  toJSON() {
    return {
      id: this.id,
      status: this.status,
      progress: this.progress,
      outputPath: this.outputPath,
      error: this.error,
      duration: this.getDuration(),
      startTime: this.startTime?.toISOString(),
      endTime: this.endTime?.toISOString()
    };
  }
}

/**
 * Responsável por exportar o vídeo final compilado
 */
class ExportManager {
  constructor() {
    this.currentJob = null;
    this.exportQueue = [];
  }

  /**
   * Exporta vídeo usando MediaRecorder (navegador)
   */
  async exportWithMediaRecorder(canvasStream, audioStream, options = {}) {
    const exportConfig = {
      ...DEFAULT_EXPORT_CONFIG,
      ...options
    };

    const job = new ExportJob(exportConfig);
    this.currentJob = job;
    job.start();

    try {
      // Combina stream de vídeo e áudio
      const tracks = [
        ...canvasStream.getVideoTracks()
      ];

      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);

      // Configura MediaRecorder
      const mimeType = this._getSupportedMimeType(exportConfig.mimeType);
      
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: exportConfig.videoBitrate || 5000000,
        audioBitsPerSecond: exportConfig.audioBitrate || 192000
      });

      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      // Aguarda finalização
      const blob = await new Promise((resolve, reject) => {
        mediaRecorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: mimeType });
          resolve(finalBlob);
        };

        mediaRecorder.onerror = (error) => {
          reject(error);
        };

        // Inicia gravação
        mediaRecorder.start(1000);

        // Simula progresso
        const progressInterval = setInterval(() => {
          if (job.progress < 90) {
            job.updateProgress(job.progress + 10);
          }
        }, exportConfig.estimatedDuration ? (exportConfig.estimatedDuration / 10) : 1000);

        // Para após duração especificada ou manualmente
        if (exportConfig.duration) {
          setTimeout(() => {
            clearInterval(progressInterval);
            mediaRecorder.stop();
          }, exportConfig.duration);
        }

        // Expõe método para parar manualmente
        job.stopRecording = () => {
          clearInterval(progressInterval);
          mediaRecorder.stop();
        };
      });

      // Cria URL para download
      const url = URL.createObjectURL(blob);
      const fileName = this._generateFileName(exportConfig);

      // Trigger download
      if (exportConfig.autoDownload !== false) {
        this._triggerDownload(url, fileName);
      }

      job.complete(url);

      return {
        success: true,
        job,
        blob,
        url,
        fileName
      };

    } catch (error) {
      job.fail(error.message);
      
      return {
        success: false,
        error: error.message,
        job
      };
    }
  }

  /**
   * Exporta vídeo pré-gravado (já em blob)
   */
  async exportExistingVideo(videoBlob, options = {}) {
    const exportConfig = {
      ...DEFAULT_EXPORT_CONFIG,
      ...options
    };

    const job = new ExportJob(exportConfig);
    this.currentJob = job;
    job.start();

    try {
      // Cria URL para download
      const url = URL.createObjectURL(videoBlob);
      const fileName = this._generateFileName(exportConfig);

      job.updateProgress(50);

      // Trigger download
      if (exportConfig.autoDownload !== false) {
        this._triggerDownload(url, fileName);
      }

      job.updateProgress(100);
      job.complete(url);

      return {
        success: true,
        job,
        url,
        fileName
      };

    } catch (error) {
      job.fail(error.message);
      
      return {
        success: false,
        error: error.message,
        job
      };
    }
  }

  /**
   * Cancela exportação atual
   */
  cancelExport() {
    if (!this.currentJob) {
      return {
        success: false,
        error: 'Nenhuma exportação em andamento'
      };
    }

    if (this.currentJob.stopRecording) {
      this.currentJob.stopRecording();
    }

    this.currentJob.cancel();

    return {
      success: true,
      job: this.currentJob
    };
  }

  /**
   * Retorna o job atual
   */
  getCurrentJob() {
    return this.currentJob;
  }

  /**
   * Retorna o progresso atual
   */
  getProgress() {
    return this.currentJob ? this.currentJob.progress : 0;
  }

  /**
   * Retorna o status atual
   */
  getStatus() {
    return this.currentJob ? this.currentJob.status : ExportStatus.PENDING;
  }

  /**
   * Gera nome de arquivo para exportação
   */
  _generateFileName(config) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
    const date = timestamp[0];
    const time = timestamp[1].substring(0, 8);
    
    const projectName = config.projectName || 'recording';
    const format = config.formatType || 'video';
    
    return `${projectName}_${format}_${date}_${time}.${config.format || 'mp4'}`;
  }

  /**
   * Trigger download do arquivo
   */
  _triggerDownload(url, fileName) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      // URL.revokeObjectURL(url); // Revoga depois se necessário
    }, 100);
  }

  /**
   * Retorna mime type suportado
   */
  _getSupportedMimeType(preferred) {
    const types = [
      preferred,
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ].filter(Boolean);

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return types[types.length - 1];
  }

  /**
   * Limpa recursos
   */
  dispose() {
    this.currentJob = null;
    this.exportQueue = [];
  }
}

module.exports = { ExportManager, ExportJob };
