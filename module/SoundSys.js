export class SoundSystem {
  static currentAudio = null;

  /**
   * Helper para reproducir un audio, deteniendo cualquier otro que estuviera sonando.
   * @param {string} audioData - La data del audio en base64.
   * @private
   */
  static _playAudio(audioData) {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    const audio = new Audio(audioData);
    this.currentAudio = audio;
    audio.play().catch(e => console.error("TWID | Error al reproducir audio", e));
  }

  // -----------------------------
  // Activar listeners para la hoja
  // -----------------------------
  static activateListeners(html, actor) {
    const recordButton = html.find(".record-voice");
    const playButton = html.find(".play-local-voice");
    const deleteButton = html.find(".delete-voice");

    recordButton.on("click", ev => this.recordVoice(ev, actor, playButton, deleteButton));
    playButton.on("click", ev => this.playLocalVoice(ev, actor));
    deleteButton.on("click", ev => this.deleteVoice(ev, actor, playButton, deleteButton));

    // Mostrar botones si ya hay audio
    const voiceData = actor.getFlag("TWID", "voiceData");
    if (voiceData) {
      playButton.show();
      deleteButton.show();
    } else {
      playButton.hide();
      deleteButton.hide();
    }

    // Activar configuración de micrófono
    this.activateMicSettings(html, actor);
  }

  // -----------------------------
  // Reproducir audio local del actor
  // -----------------------------
  static playLocalVoice(ev, actor) {
    ev.preventDefault();
    const voiceData = actor.getFlag("TWID", "voiceData");
    if (voiceData) {
      this._playAudio(voiceData);
    } else {
      ui.notifications.warn("No hay audio guardado para reproducir.");
    }
  }

  // -----------------------------
  // Borrar audio del actor
  // -----------------------------
  static async deleteVoice(ev, actor, playButton, deleteButton) {
    ev.preventDefault();
    await actor.unsetFlag("TWID", "voiceData");
    playButton.hide();
    deleteButton.hide();
    ui.notifications.info("Audio del personaje eliminado.");
  }

  // -----------------------------
  // Grabar audio
  // -----------------------------
  static async recordVoice(ev, actor, playButton, deleteButton) {
    const button = $(ev.currentTarget);
    if (button.hasClass("recording")) return;

    if (!window.MediaRecorder) return ui.notifications.error("Tu navegador no soporta la grabación de audio.");

    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/webm',
      'audio/mp4'
    ];
    const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) return ui.notifications.error("Ningún formato de grabación compatible.");

    try {
      // Obtener micrófono seleccionado
      const micId = await actor.getFlag("TWID", "voiceMicId");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: micId ? { deviceId: { exact: micId } } : true 
      });

      const recorder = new MediaRecorder(stream, { mimeType });
      const audioChunks = [];

      recorder.ondataavailable = event => audioChunks.push(event.data);

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        button.removeClass("recording").html('<i class="fas fa-microphone"></i> Grabar');

        if (audioChunks.length === 0) return;

        const audioBlob = new Blob(audioChunks, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64String = reader.result;
          await actor.setFlag("TWID", "voiceData", base64String);
          playButton.show();
          deleteButton.show();
          ui.notifications.info("Voz grabada y guardada en el personaje.");
        };
      };

      recorder.onerror = event => {
        console.error("TWID | MediaRecorder error:", event.error);
        ui.notifications.error("Ocurrió un error durante la grabación.");
        stream.getTracks().forEach(track => track.stop());
        button.removeClass("recording").html('<i class="fas fa-microphone"></i> Grabar');
      };

      button.addClass("recording").html('<i class="fas fa-microphone-slash"></i>');
      recorder.start();

      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 2000);

    } catch (err) {
      console.error("TWID | Error al acceder al micrófono:", err);
      ui.notifications.error("No se pudo acceder al micrófono. Revisa los permisos en tu navegador.");
      button.removeClass("recording").html('<i class="fas fa-microphone"></i> Grabar');
    }
  }

  // -----------------------------
  // Reproducir audio a todos los jugadores
  // -----------------------------
  static playActorSound(actor) {
    const voiceData = actor.getFlag("TWID", "voiceData");
    if (voiceData) {
      this._playAudio(voiceData);
      game.socket.emit('system.TWID', { audioData: voiceData });
    }
  }

  static initializeSocketListener() {
    game.socket.on("system.TWID", ({ audioData }) => this._playAudio(audioData));
  }

  // -----------------------------
  // Configuración de Micrófono
  // -----------------------------
  static activateMicSettings(html, actor) {
    let modal = html.find(".voice-settings-modal");
    if (!modal.length) {
      const modalHtml = `
      <div class="voice-settings-modal" style="display:none;">
        <div class="voice-settings-content">
          <h3>Configuración de Micrófono</h3>
          <label for="voice-input">Selecciona el micrófono:</label>
          <select id="voice-input"></select>
          <div class="modal-buttons">
            <button class="save-voice-settings">Guardar</button>
            <button class="close-voice-settings">Cancelar</button>
          </div>
        </div>
      </div>`;
      html.append(modalHtml);
      modal = html.find(".voice-settings-modal");
    }

    const settingsBtn = html.find(".settings-voice");

    settingsBtn.off("click").on("click", async () => {
      modal.show();
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === "audioinput");

      const micSelect = modal.find("#voice-input");
      micSelect.empty();

      mics.forEach((mic, index) => {
        const option = `<option value="${mic.deviceId}">${mic.label || `Micrófono ${index+1}`}</option>`;
        micSelect.append(option);
      });

      const selectedMic = await actor.getFlag("TWID", "voiceMicId");
      if (selectedMic) micSelect.val(selectedMic);
    });

    modal.find(".close-voice-settings").off("click").on("click", () => modal.hide());

    modal.find(".save-voice-settings").off("click").on("click", async () => {
      const micSelect = modal.find("#voice-input");
      const selectedMicId = micSelect.val();
      await actor.setFlag("TWID", "voiceMicId", selectedMicId);
      ui.notifications.info("Micrófono seleccionado guardado en el personaje.");
      modal.hide();
    });
  }
}