/**
 * Responsável por salvar e carregar configurações do projeto
 */
class ProjectSettings {
  constructor(storageKey = 'screenRecorder_projectSettings') {
    this.storageKey = storageKey;
    this.settings = this._loadSettings();
  }

  /**
   * Carrega configurações do localStorage
   */
  _loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }

    return this._getDefaultSettings();
  }

  /**
   * Retorna configurações padrão
   */
  _getDefaultSettings() {
    return {
      lastFormatType: 'YOUTUBE',
      lastLayoutType: 'SCREEN_PLUS_WEBCAM_CORNER',
      lastQuality: 'HIGH',
      lastWebcamPosition: 'TOP_RIGHT',
      lastBackgroundMode: 'BLACK',
      fps: 30,
      webcamEnabled: true,
      microphoneEnabled: true,
      systemAudioEnabled: false,
      outputDirectory: './recordings',
      selectedWebcamId: null,
      selectedMicrophoneId: null,
      autoSaveEnabled: true,
      recentProjects: []
    };
  }

  /**
   * Salva configurações no localStorage
   */
  _saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      return false;
    }
  }

  /**
   * Obtém um valor de configuração
   */
  get(key, defaultValue = null) {
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
  }

  /**
   * Define um valor de configuração
   */
  set(key, value) {
    this.settings[key] = value;
    this._saveSettings();
  }

  /**
   * Define múltiplos valores
   */
  setMultiple(values) {
    Object.assign(this.settings, values);
    this._saveSettings();
  }

  /**
   * Salva última configuração usada
   */
  saveLastConfig(config) {
    this.setMultiple({
      lastFormatType: config.formatType,
      lastLayoutType: config.layoutType,
      lastQuality: config.quality,
      lastWebcamPosition: config.webcamPosition,
      fps: config.fps,
      webcamEnabled: config.webcamEnabled,
      microphoneEnabled: config.microphoneEnabled,
      systemAudioEnabled: config.systemAudioEnabled,
      outputDirectory: config.outputDirectory
    });
  }

  /**
   * Carrega última configuração usada
   */
  loadLastConfig() {
    return {
      formatType: this.get('lastFormatType'),
      layoutType: this.get('lastLayoutType'),
      quality: this.get('lastQuality'),
      webcamPosition: this.get('lastWebcamPosition'),
      fps: this.get('fps'),
      webcamEnabled: this.get('webcamEnabled'),
      microphoneEnabled: this.get('microphoneEnabled'),
      systemAudioEnabled: this.get('systemAudioEnabled'),
      outputDirectory: this.get('outputDirectory')
    };
  }

  /**
   * Adiciona projeto aos recentes
   */
  addRecentProject(project) {
    const recent = this.get('recentProjects', []);
    
    // Remove duplicatas
    const filtered = recent.filter(p => p.id !== project.id);
    
    // Adiciona no início
    filtered.unshift({
      id: project.id,
      name: project.name,
      formatType: project.formatType,
      createdAt: project.createdAt,
      thumbnail: project.thumbnail
    });

    // Mantém apenas os 10 mais recentes
    const trimmed = filtered.slice(0, 10);

    this.set('recentProjects', trimmed);
  }

  /**
   * Retorna projetos recentes
   */
  getRecentProjects() {
    return this.get('recentProjects', []);
  }

  /**
   * Limpa projetos recentes
   */
  clearRecentProjects() {
    this.set('recentProjects', []);
  }

  /**
   * Define dispositivos padrão
   */
  setDevicePreferences(webcamId, microphoneId) {
    this.setMultiple({
      selectedWebcamId: webcamId,
      selectedMicrophoneId: microphoneId
    });
  }

  /**
   * Retorna dispositivos preferidos
   */
  getDevicePreferences() {
    return {
      webcamId: this.get('selectedWebcamId'),
      microphoneId: this.get('selectedMicrophoneId')
    };
  }

  /**
   * Reseta para configurações padrão
   */
  reset() {
    this.settings = this._getDefaultSettings();
    this._saveSettings();
  }

  /**
   * Exporta configurações
   */
  export() {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Importa configurações
   */
  import(jsonString) {
    try {
      const importedSettings = JSON.parse(jsonString);
      this.settings = {
        ...this._getDefaultSettings(),
        ...importedSettings
      };
      this._saveSettings();
      return true;
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      return false;
    }
  }

  /**
   * Retorna todas as configurações
   */
  getAll() {
    return { ...this.settings };
  }
}

module.exports = { ProjectSettings };
