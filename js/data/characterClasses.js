(function () {
  "use strict";
  const OA = window.OrbArena;
  OA.CHARACTER_CLASSES = Object.freeze({
    Assassino: { color: "#ff5f9e", identity: "mobilidade explosiva e execução", preferredDistance: 70 },
    Tanque: { color: "#7ea2ba", identity: "massa, armadura e controle de espaço", preferredDistance: 52 },
    Lutador: { color: "#ff9e62", identity: "pressão de curta distância e combos", preferredDistance: 58 },
    Mago: { color: "#a878ff", identity: "zonas, energia e dano de habilidade", preferredDistance: 190 },
    Controlador: { color: "#65bfff", identity: "manipulação de posição e ritmo", preferredDistance: 155 },
    Invocador: { color: "#68efc0", identity: "entidades auxiliares e domínio gradual", preferredDistance: 175 },
    Suporte: { color: "#72f5a8", identity: "cura, escudo e utilidade", preferredDistance: 145 },
    Atirador: { color: "#ffd56b", identity: "alcance, precisão e preparação", preferredDistance: 280 },
    Caótico: { color: "#f06dff", identity: "alteração imprevisível de regras", preferredDistance: 120 },
    Parasita: { color: "#85d355", identity: "dreno, acúmulo e enfraquecimento", preferredDistance: 105 },
    Temporal: { color: "#72ddff", identity: "escalas de tempo e cooldowns", preferredDistance: 150 },
    Elemental: { color: "#ff785e", identity: "terreno e efeitos persistentes", preferredDistance: 130 },
    Defensor: { color: "#76b8ff", identity: "barreiras, reflexão e resposta", preferredDistance: 95 },
    Berserker: { color: "#ff536c", identity: "risco crescente e pressão contínua", preferredDistance: 38 },
    Híbrido: { color: "#e6e9ff", identity: "adaptação e alternância de função", preferredDistance: 115 }
  });
}());
