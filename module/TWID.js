export class TWIDActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["TWID", "sheet", "actor"],
      template: "systems/TWID/templates/actor/actor-sheet.html",
      width: 650,
      height: 700,
      resizable: false
    });
  }

  getData() {
    const data = super.getData();
    data.system = data.actor.system;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Evitar listeners duplicados
    html.off("change", 'select[name^="system."]');
    html.off("click", ".tirar-poder");
    html.off("click", ".tirar-raza");
    html.off("click", ".tirar-atributo");

    // 💡 Cuando cambia la raza, se actualizan los atributos automáticamente
    html.on("change", 'select[name="system.raza"]', async ev => {
      const raza = ev.currentTarget.value;

      const valoresPorRaza = {
        zorro:     { fuerza: 2, agilidad: 1, sigilo: 1, inteligencia: 2 },
        gato:      { fuerza: 1, agilidad: 2, sigilo: 3, inteligencia: 0 },
        sapo:      { fuerza: 0, agilidad: 1, sigilo: 2, inteligencia: 1 },
        araña:     { fuerza: 0, agilidad: 1, sigilo: 3, inteligencia: 2 },
        búho:      { fuerza: 1, agilidad: 2, sigilo: 1, inteligencia: 3 },
        liebre:    { fuerza: 0, agilidad: 3, sigilo: 2, inteligencia: 0 },
        carpincho: { fuerza: 1, agilidad: 2, sigilo: 1, inteligencia: 2 },
        cuervo:    { fuerza: 1, agilidad: 1, sigilo: 2, inteligencia: 2 },
        perro:     { fuerza: 3, agilidad: 1, sigilo: 0, inteligencia: 1 },
        rata:      { fuerza: 0, agilidad: 2, sigilo: 2, inteligencia: 1 }
      };

      const nuevosValores = valoresPorRaza[raza];

      if (nuevosValores) {
        await this.actor.update({
          "system.raza": raza,
          "system.fuerza": nuevosValores.fuerza,
          "system.agilidad": nuevosValores.agilidad,
          "system.sigilo": nuevosValores.sigilo,
          "system.inteligencia": nuevosValores.inteligencia
        });
      } else {
        await this.actor.update({ "system.raza": "" });
      }

      this.render(false);
    });

    // 🎲 Lanzar dado d10 al hacer clic en el botón del dado de poder
    html.on("click", ".tirar-poder", async ev => {
      ev.preventDefault();

      const roll = new Roll("1d10");
      await roll.evaluate({ async: true });

      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: "Lanzando el poder aleatorio..."
      });

      Hooks.once("diceSoNiceRollComplete", async () => {
        const poderes = [
          "Mano invisible.",
          "Conjurar luz.",
          "Hablar humano (1d10 palabras).",
          "Abrir / Cerrar.",
          "Conjurar la cena.",
          "Crear fuego.",
          "Limpiar, ordenar, arreglar.",
          "Crecimiento de plantas.",
          "Distraer / Confundir.",
          "Hacer que un libro se lea en voz alta."
        ];

        const poderElegido = poderes[roll.total - 1];

        await this.actor.update({ "system.poderAleatorio": poderElegido });

        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: `<b>Tu poder es:</b> ${poderElegido}`
        });

        this.render(false);
      });
    });

    // 🎲 Lanzar dado d10 al hacer clic en el botón del dado de raza
    html.on("click", ".tirar-raza", async ev => {
      ev.preventDefault();

      const roll = new Roll("1d10");
      await roll.evaluate({ async: true });

      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: "Lanzando la raza aleatoria..."
      });

      Hooks.once("diceSoNiceRollComplete", async () => {
        const razas = [
          "zorro", "gato", "sapo", "araña",
          "búho", "liebre", "carpincho", "cuervo",
          "perro", "rata"
        ];

        const razaElegida = razas[roll.total - 1];

        const valoresPorRaza = {
          zorro:     { fuerza: 2, agilidad: 1, sigilo: 1, inteligencia: 2 },
          gato:      { fuerza: 1, agilidad: 2, sigilo: 3, inteligencia: 0 },
          sapo:      { fuerza: 0, agilidad: 1, sigilo: 2, inteligencia: 1 },
          araña:     { fuerza: 0, agilidad: 1, sigilo: 3, inteligencia: 2 },
          búho:      { fuerza: 1, agilidad: 2, sigilo: 1, inteligencia: 3 },
          liebre:    { fuerza: 0, agilidad: 3, sigilo: 2, inteligencia: 0 },
          carpincho: { fuerza: 1, agilidad: 2, sigilo: 1, inteligencia: 2 },
          cuervo:    { fuerza: 1, agilidad: 1, sigilo: 2, inteligencia: 2 },
          perro:     { fuerza: 3, agilidad: 1, sigilo: 0, inteligencia: 1 },
          rata:      { fuerza: 0, agilidad: 2, sigilo: 2, inteligencia: 1 }
        };

        const nuevosValores = valoresPorRaza[razaElegida];

        if (nuevosValores) {
          await this.actor.update({
            "system.raza": razaElegida,
            "system.fuerza": nuevosValores.fuerza,
            "system.agilidad": nuevosValores.agilidad,
            "system.sigilo": nuevosValores.sigilo,
            "system.inteligencia": nuevosValores.inteligencia
          });
        }

        // Actualizamos el select en el formulario
        const selectRaza = html.find('select[name="system.raza"]');
        selectRaza.val(razaElegida);

        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: `<b>Tu raza es:</b> ${razaElegida}`
        });

        this.render(false);
      });
    });

    // 🎲 Tiradas de atributos al presionar el nombre
    html.on("click", ".tirar-atributo", async ev => {
      ev.preventDefault();

      const container = ev.currentTarget.closest(".attr");
      const key = container.dataset.attr; // "fuerza", "agilidad", etc.
      const valor = parseInt(container.querySelector(".valor").textContent);

      // Creamos la tirada con el valor del atributo sumado
      const roll = new Roll(`1d10 + ${valor}`);
      await roll.evaluate({ async: true });

      // Enviar al chat como tirada oficial, para que salga en Dice Tray
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `Tirada de <b>${key}</b>`,
        rollMode: "roll" // Asegura que sea una tirada normal
      });
    });

    html.on("click", ".tirar-magia", async ev => {
      ev.preventDefault();

      // Tomamos el poder elegido desde el actor
      const poderElegido = this.actor.system.poderAleatorio || "ninguno";

      const roll = new Roll("1d10");
      await roll.evaluate({ async: true });

      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `Magia: ${poderElegido}`,
        rollMode: "roll"
      });
    });

  }
}

Hooks.once("init", function() {
  console.log("TWID | Iniciando sistema The Witch is Dead");
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("TWID", TWIDActorSheet, { makeDefault: true });
});
