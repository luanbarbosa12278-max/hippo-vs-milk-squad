
// ==========================================
// HIPPO VS MILK SQUAD
// VERSION 0.1.0 — ALPHA
// ==========================================

"use strict";

// ==========================================
// CANVAS
// ==========================================

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

ctx.imageSmoothingEnabled = false;

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const CONFIG = {

    groundY: 635,

    // Limites do ponto de colisão
    collisionMin: 350,
    collisionMax: 880,

    // Posição inicial da batalha
    initialPower: 50,

    // Força adicionada pelos botões
    normalBoost: 8,
    maxBoost: 25,

    // Tempo para reiniciar a rodada
    restartDelay: 5000,

    // Velocidade da movimentação dos ataques
    collisionSpeed: 5,

    // Limite de partículas
    maxParticles: 320
};

// ==========================================
// CAMINHOS DOS ASSETS
// ==========================================

const ASSET_PATHS = {

    arena: "assets/backgrounds/arena.png",

    hippo: "assets/characters/hippo.png",

    cow1: "assets/characters/cow_1.png",
    cow2: "assets/characters/cow_2.png",
    cow3: "assets/characters/cow_3.png",

    fireNormal: "assets/effects/fire_normal.png",
    fireStrong: "assets/effects/fire_strong.png",
    fireMax: "assets/effects/fire_max.png",

    milkNormal: "assets/effects/milk_normal.png",
    milkStrong: "assets/effects/milk_strong.png",
    milkMax: "assets/effects/milk_max.png"
};

const assets = {};

// ==========================================
// ESTADO DO JOGO
// ==========================================

const game = {

    power: 50,
    displayedPower: 50,

    hippoScore: 0,
    cowsScore: 0,

    round: 1,

    paused: false,
    finished: false,
    loaded: false,

    time: 0,

    collisionX: WIDTH / 2,

    shake: 0,

    particles: [],
    particleCarry: 0,
    impact: 0,

    fireBoostUntil: 0,
    milkBoostUntil: 0,

    restartAt: 0,

    winner: null
};

// ==========================================
// ELEMENTOS DA INTERFACE
// ==========================================

const UI = {

    hippoScore: document.getElementById("hippo-score"),
    cowsScore: document.getElementById("cows-score"),

    roundNumber: document.getElementById("round-number"),

    hippoPowerLabel:
        document.getElementById("hippo-power-label"),

    cowsPowerLabel:
        document.getElementById("cows-power-label"),

    hippoPowerFill:
        document.getElementById("hippo-power-fill"),

    cowsPowerFill:
        document.getElementById("cows-power-fill"),

    victoryOverlay:
        document.getElementById("victory-overlay"),

    victoryTitle:
        document.getElementById("victory-title"),

    victoryMessage:
        document.getElementById("victory-message"),

    countdown:
        document.getElementById("restart-countdown"),

    notification:
        document.getElementById("event-notification"),

    eventText:
        document.getElementById("event-text"),

    pauseButton:
        document.getElementById("toggle-pause")
};

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================

function clamp(value, min, max) {

    return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {

    return start + (end - start) * amount;
}

function random(min, max) {

    return Math.random() * (max - min) + min;
}

// ==========================================
// CARREGAMENTO DAS IMAGENS
// ==========================================

function loadImage(name, path) {

    return new Promise((resolve, reject) => {

        const image = new Image();

        image.onload = () => {

            assets[name] = image;

            console.log("Asset carregado:", name);

            resolve(image);
        };

        image.onerror = () => {

            reject(
                new Error("Não foi possível carregar: " + path)
            );
        };

        image.src = path;
    });
}

async function loadAssets() {

    drawLoading("CARREGANDO ASSETS...");

    try {

        const promises = Object.entries(ASSET_PATHS).map(
            ([name, path]) => loadImage(name, path)
        );

        await Promise.all(promises);

        game.loaded = true;

        console.log("Todos os assets foram carregados!");

        startGame();

    } catch (error) {

        console.error(error);

        drawLoading(
            "ERRO AO CARREGAR AS IMAGENS",
            error.message
        );
    }
}

// ==========================================
// TELA DE CARREGAMENTO
// ==========================================

function drawLoading(title, message = "") {

    ctx.fillStyle = "#111827";

    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";

    ctx.font = "bold 36px Arial";

    ctx.fillText(
        title,
        WIDTH / 2,
        HEIGHT / 2 - 20
    );

    ctx.font = "18px Arial";

    ctx.fillStyle = "#94a3b8";

    ctx.fillText(
        message,
        WIDTH / 2,
        HEIGHT / 2 + 30
    );
}

// ==========================================
// PERSONAGENS
// ==========================================

// x = centro horizontal do personagem
// y = posição dos pés
// height = altura do personagem

const hippo = {

    asset: "hippo",

    x: 190,
    y: CONFIG.groundY,

    height: 390,

    // Ponto de emissão do fogo
    // Coordenadas relativas à imagem
    emitterX: 0.91,
    emitterY: 0.64
};

const cows = [

    {
        asset: "cow1",

        x: 960,
        y: 625,

        height: 285,

        emitterX: 0.30,
        emitterY: 0.76,

        phase: 0
    },

    {
        asset: "cow2",

        x: 1080,
        y: 635,

        height: 300,

        emitterX: 0.30,
        emitterY: 0.76,

        phase: 1.7
    },

    {
        asset: "cow3",

        x: 1200,
        y: 640,

        height: 315,

        emitterX: 0.30,
        emitterY: 0.76,

        phase: 3.4
    }
];

// ==========================================
// DIMENSÕES DOS SPRITES
// ==========================================

function getSpriteRect(character) {

    const image = assets[character.asset];

    const ratio = image.width / image.height;

    const height = character.height;
    const width = height * ratio;

    return {

        x: character.x - width / 2,

        y: character.y - height,

        width,
        height
    };
}

// ==========================================
// PONTOS DE EMISSÃO
// ==========================================

function getEmitter(character) {

    const rect = getSpriteRect(character);

    return {

        x: rect.x + rect.width * character.emitterX,

        y: rect.y + rect.height * character.emitterY
    };
}

// ==========================================
// CENÁRIO
// ==========================================

function drawBackground() {

    const image = assets.arena;

    // Preenche a arena preservando a proporção
    const scale = Math.max(
        WIDTH / image.width,
        HEIGHT / image.height
    );

    const width = image.width * scale;
    const height = image.height * scale;

    ctx.drawImage(

        image,

        (WIDTH - width) / 2,
        (HEIGHT - height) / 2,

        width,
        height
    );
}

// ==========================================
// SOMBRAS DOS PERSONAGENS
// ==========================================

function drawShadow(character) {

    const rect = getSpriteRect(character);

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";

    ctx.beginPath();

    ctx.ellipse(

        character.x,

        character.y - 3,

        rect.width * 0.37,

        12,

        0,

        0,

        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}

// ==========================================
// RENDERIZAÇÃO DOS PERSONAGENS
// ==========================================

function drawCharacter(character, phase = 0) {

    const image = assets[character.asset];

    const rect = getSpriteRect(character);

    const isHippo = character.asset === "hippo";

    // Respiração
    const breathing = Math.sin(
        game.time * 3 + phase
    ) * 0.008;

    // Tremor causado pela força do ataque
    const strength = isHippo
        ? game.displayedPower
        : 100 - game.displayedPower;

    const vibration = Math.sin(
        game.time * 45 + phase
    ) * (strength / 100) * 1.5;

    const height = rect.height * (1 + breathing);

    ctx.save();

    ctx.translate(
        rect.x + vibration,
        character.y - height
    );

    ctx.drawImage(

        image,

        0,
        0,

        rect.width,

        height
    );

    ctx.restore();
}

// ==========================================
// NÍVEIS DE POTÊNCIA
// ==========================================

function getFireAsset() {

    if (
        game.time < game.fireBoostUntil ||
        game.displayedPower >= 75
    ) {

        return assets.fireMax;
    }

    if (game.displayedPower >= 55) {

        return assets.fireStrong;
    }

    return assets.fireNormal;
}

function getMilkAsset() {

    const milkPower = 100 - game.displayedPower;

    if (
        game.time < game.milkBoostUntil ||
        milkPower >= 75
    ) {

        return assets.milkMax;
    }

    if (milkPower >= 55) {

        return assets.milkStrong;
    }

    return assets.milkNormal;
}

// ==========================================
// ATAQUE DE FOGO
// ==========================================

function drawFire() {

    const image = getFireAsset();

    const origin = getEmitter(hippo);

    const targetX = game.collisionX;

    const targetY = getCollisionY();

    const dx = targetX - origin.x;
    const dy = targetY - origin.y;

    if (dx <= 0) return;

    const length = Math.hypot(dx, dy);

    const angle = Math.atan2(dy, dx);

    const strength = game.displayedPower / 100;

    const pulse = Math.sin(game.time * 24) * 9 + Math.sin(game.time * 43) * 4;

    const height = 95 + strength * 95 + pulse;

    ctx.save();

    ctx.translate(origin.x, origin.y);

    ctx.rotate(angle);

    ctx.globalAlpha = 0.94 + Math.sin(game.time * 28) * 0.05;

    ctx.drawImage(

        image,

        0,

        -height / 2,

        length,

        height
    );

    ctx.restore();
}

// ==========================================
// ATAQUES DE LEITE
// ==========================================

function drawMilk(cow, index) {

    const image = getMilkAsset();

    const origin = getEmitter(cow);

    const targetX = game.collisionX;

    const targetY =
        getCollisionY() + (index - 1) * 22;

    const dx = origin.x - targetX;
    const dy = origin.y - targetY;

    if (dx <= 0) return;

    const length = Math.hypot(dx, dy);

    const angle = Math.atan2(dy, dx);

    const strength =
        (100 - game.displayedPower) / 100;

    const pulse = Math.sin(game.time * 22 + index * 2) * 7;

    const height = 48 + strength * 65 + pulse;

    ctx.save();

    ctx.translate(origin.x, origin.y);

    ctx.rotate(angle);

    ctx.globalAlpha = 0.94 + Math.sin(game.time * 19 + index) * 0.05;

    // O PNG do leite já aponta para a esquerda.
    // Por isso não precisamos espelhar a imagem.

    ctx.drawImage(

        image,

        -length,

        -height / 2,

        length,

        height
    );

    ctx.restore();
}

// ==========================================
// PONTO DE COLISÃO
// ==========================================

function getCollisionY() {

    const fireOrigin = getEmitter(hippo);

    const milkOrigin = getEmitter(cows[0]);

    return (
        fireOrigin.y + milkOrigin.y
    ) / 2;
}

// ==========================================
// SISTEMA DE PARTÍCULAS
// ==========================================

function createParticle(type, x, y) {

    if (
        game.particles.length >=
        CONFIG.maxParticles
    ) {

        return;
    }

    const particle = {

        type,

        x,
        y,

        vx: random(-70, 70),

        vy: random(-120, -20),

        size: random(3, 9),

        life: random(0.35, 1.1),

        maxLife: 1,

        rotation: random(0, Math.PI * 2)
    };

    if (type === "steam") {

        particle.size = random(12, 30);

        particle.vx = random(-25, 25);

        particle.vy = random(-80, -35);

        particle.life = random(0.7, 1.4);
    }

    if (type === "milk") {

        particle.vy = random(-100, 50);

        particle.size = random(3, 7);
    }

    particle.maxLife = particle.life;

    game.particles.push(particle);
}

function spawnCollisionParticles(dt) {

    const x = game.collisionX;
    const y = getCollisionY();

    game.particleCarry += dt * (110 + game.impact * 100);
    const count = Math.floor(game.particleCarry);
    game.particleCarry -= count;

    for (let i = 0; i < count; i++) {

        const type = Math.random();

        if (type < 0.40) {

            createParticle(
                "steam",
                x + random(-15, 15),
                y + random(-15, 15)
            );

        } else if (type < 0.70) {

            createParticle("fire", x, y);

        } else {

            createParticle("milk", x, y);
        }
    }
}

function spawnJetParticles(dt) {
    const emitters = [hippo, ...cows];
    for (const character of emitters) {
        const fire = character === hippo;
        const strength = (fire ? game.displayedPower : 100 - game.displayedPower) / 100;
        if (Math.random() > dt * (12 + strength * 20)) continue;
        const origin = getEmitter(character);
        const t = random(0.08, 0.9);
        const x = lerp(origin.x, game.collisionX, t);
        const y = lerp(origin.y, getCollisionY(), t) + random(-18, 18);
        const before = game.particles.length;
        createParticle(fire ? "fire" : "milk", x, y);
        if (game.particles.length === before) continue;
        const p = game.particles[before];
        p.vx = (fire ? 1 : -1) * random(90, 240);
        p.vy = random(-65, 65);
        p.life = p.maxLife = random(0.12, 0.35);
        p.size = random(3, 7);
    }
}

function burstImpact() {
    game.impact = 1;
    const x = game.collisionX, y = getCollisionY();
    for (let i = 0; i < 42; i++) {
        const before = game.particles.length;
        createParticle(i % 3 === 0 ? "steam" : i % 2 ? "fire" : "milk", x, y);
        if (game.particles.length === before) break;
        const p = game.particles[before];
        const angle = random(0, Math.PI * 2);
        const speed = random(100, 330);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
    }
}

function updateParticles(dt) {

    for (const particle of game.particles) {

        particle.x += particle.vx * dt;

        particle.y += particle.vy * dt;

        particle.life -= dt;

        if (particle.type === "steam") {

            particle.size += dt * 12;
        }

        if (particle.type === "milk") {

            particle.vy += 130 * dt;
        }
    }

    game.particles = game.particles.filter(
        particle => particle.life > 0
    );
}

function drawParticles() {
    ctx.save();
    for (const p of game.particles) {
        const alpha = clamp(p.life / p.maxLife, 0, 1);
        const x = Math.round(p.x / 3) * 3;
        const y = Math.round(p.y / 3) * 3;
        const n = Math.max(3, Math.round(p.size / 3) * 3);
        if (p.type === "steam") {
            ctx.globalAlpha = alpha * 0.55;
            ctx.fillStyle = "#8498a2";
            ctx.fillRect(x - n, y - n / 2, n * 2, n);
            ctx.fillRect(x - n / 2, y - n, n, n * 2);
            ctx.fillStyle = "#d9e7e8";
            ctx.fillRect(x - n / 2, y - n / 2, n, n);
            ctx.fillStyle = "#f7ffff";
            ctx.fillRect(x - n / 2, y - n / 2, n / 2, 3);
        } else {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.type === "fire" ? "#d94b22" : "#79b9dd";
            ctx.fillRect(x - 3, y - 3, n + 6, n + 6);
            ctx.fillStyle = p.type === "fire" ? "#ffb53e" : "#dff6ff";
            ctx.fillRect(x, y, n, n);
            ctx.fillStyle = "#fffbe4";
            ctx.fillRect(x, y, Math.max(2, n / 2), 3);
        }
    }
    ctx.restore();
}

function drawCollisionGlow() {
    const x = Math.round(game.collisionX / 4) * 4;
    const y = Math.round(getCollisionY() / 4) * 4;
    const r = 16 + Math.round((Math.sin(game.time * 24) + 1) * 6) + game.impact * 22;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#f48b36";
    ctx.fillRect(x - r, y - 6, r * 2, 12);
    ctx.fillRect(x - 6, y - r, 12, r * 2);
    ctx.fillStyle = "#fff2a8";
    ctx.fillRect(x - r / 2, y - 4, r, 8);
    ctx.fillRect(x - 4, y - r / 2, 8, r);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 6, y - 6, 12, 12);
    if (game.impact > 0.02) {
        const radius = 24 + (1 - game.impact) * 105;
        ctx.globalAlpha = game.impact * 0.7;
        ctx.strokeStyle = "#fff0b4";
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
            const a = i * Math.PI / 4;
            const px = x + Math.round(Math.cos(a) * radius / 4) * 4;
            const py = y + Math.round(Math.sin(a) * radius / 4) * 4;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    ctx.restore();
}

// ==========================================
// INTERFACE
// ==========================================

function updateUI() {

    const hippoPower = Math.round(
        game.displayedPower
    );

    const cowsPower = 100 - hippoPower;

    UI.hippoPowerLabel.textContent =
        `🔥 ${hippoPower}%`;

    UI.cowsPowerLabel.textContent =
        `${cowsPower}% 🥛`;

    UI.hippoPowerFill.style.width =
        `${hippoPower}%`;

    UI.cowsPowerFill.style.width =
        `${cowsPower}%`;

    UI.hippoScore.textContent =
        game.hippoScore;

    UI.cowsScore.textContent =
        game.cowsScore;

    UI.roundNumber.textContent =
        game.round;
}

// ==========================================
// NOTIFICAÇÕES
// ==========================================

let notificationTimer;

function notify(message) {

    UI.eventText.textContent = message;

    UI.notification.hidden = false;

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {

        UI.notification.hidden = true;

    }, 1600);
}

// ==========================================
// ADICIONAR FORÇA
// ==========================================

function boostTeam(team, amount, special = false) {

    if (
        !game.loaded ||
        game.paused ||
        game.finished
    ) {

        return;
    }

    if (team === "hippo") {

        game.power += amount;

        if (special) {

            game.fireBoostUntil = game.time + 3;
        }

        notify(
            special
                ? "🔥 FOGO MÁXIMO ATIVADO!"
                : `🔥 HIPOPÓTAMO +${amount} DE FORÇA`
        );

    } else if (team === "cows") {

        game.power -= amount;

        if (special) {

            game.milkBoostUntil = game.time + 3;
        }

        notify(
            special
                ? "🥛 LEITE MÁXIMO ATIVADO!"
                : `🥛 VACAS +${amount} DE FORÇA`
        );
    }

    game.power = clamp(game.power, 0, 100);

    game.shake = special ? 9 : 3;
    if (special) burstImpact();
}

// ==========================================
// VITÓRIA
// ==========================================

function finishRound(winner) {

    if (game.finished) return;

    game.finished = true;

    game.winner = winner;

    game.restartAt =
        game.time + CONFIG.restartDelay / 1000;

    if (winner === "hippo") {

        game.hippoScore++;

        UI.victoryTitle.textContent =
            "🔥 HIPOPÓTAMO VENCEU!";

        UI.victoryTitle.style.color =
            "#ff9f43";

        UI.victoryMessage.textContent =
            "O poder do fogo dominou a batalha!";

    } else {

        game.cowsScore++;

        UI.victoryTitle.textContent =
            "🥛 AS VACAS VENCERAM!";

        UI.victoryTitle.style.color =
            "#93c5fd";

        UI.victoryMessage.textContent =
            "O esquadrão do leite apagou o fogo!";
    }

    UI.victoryOverlay.hidden = false;

    game.shake = 12;
    burstImpact();

    updateUI();
}

// ==========================================
// NOVA RODADA
// ==========================================

function nextRound() {

    game.round++;

    resetBattle();

    notify(`⚔️ RODADA ${game.round}`);
}

function resetBattle() {

    game.power = CONFIG.initialPower;

    game.displayedPower = CONFIG.initialPower;

    game.collisionX = WIDTH / 2;

    game.finished = false;

    game.winner = null;

    game.restartAt = 0;

    game.fireBoostUntil = 0;
    game.milkBoostUntil = 0;

    game.shake = 0;

    game.particles = [];
    game.particleCarry = 0;
    game.impact = 0;

    UI.victoryOverlay.hidden = true;

    updateUI();
}

function resetGame() {

    game.hippoScore = 0;
    game.cowsScore = 0;

    game.round = 1;

    game.paused = false;

    UI.pauseButton.textContent = "⏸ Pausar";

    resetBattle();

    notify("🔄 JOGO REINICIADO");
}

// ==========================================
// ATUALIZAÇÃO DO JOGO
// ==========================================

function update(dt) {

    game.time += dt;

    // Suavização da barra de força
    game.displayedPower = lerp(

        game.displayedPower,

        game.power,

        Math.min(1, dt * 6)
    );

    // A colisão avança na direção
    // do time que está perdendo.
    const targetCollision = lerp(

        CONFIG.collisionMin,

        CONFIG.collisionMax,

        game.displayedPower / 100
    );

    game.collisionX = lerp(

        game.collisionX,

        targetCollision,

        Math.min(
            1,
            dt * CONFIG.collisionSpeed
        )
    );

    // Tremor da arena
    game.shake *= Math.exp(-8 * dt);

    if (game.shake < 0.05) {

        game.shake = 0;
    }

    // Partículas
    if (!game.finished) {

        spawnCollisionParticles(dt);
        spawnJetParticles(dt);
    }

    game.impact = Math.max(0, game.impact - dt * 2.2);
    updateParticles(dt);

    // Verifica a vitória
    if (!game.finished) {

        if (
            game.power >= 100 &&
            game.displayedPower >= 99
        ) {

            finishRound("hippo");
        }

        if (
            game.power <= 0 &&
            game.displayedPower <= 1
        ) {

            finishRound("cows");
        }

    } else {

        const remaining = Math.max(

            0,

            Math.ceil(
                game.restartAt - game.time
            )
        );

        UI.countdown.textContent =
            `Próxima rodada em ${remaining} segundos...`;

        if (game.time >= game.restartAt) {

            nextRound();
        }
    }

    updateUI();
}

// ==========================================
// RENDERIZAÇÃO
// ==========================================

// Team HP: visual representation of the existing tug-of-war meter.
function drawTeamHP() {
    const teams = [
        {name:"HIPPO", x:hippo.x, y:getSpriteRect(hippo).y-44, hp:game.displayedPower, color:"#ff9b48", dark:"#a83d24", width:184},
        {name:"MILK SQUAD", x:cows.reduce((sum,c)=>sum+c.x,0)/cows.length, y:Math.min(...cows.map(c=>getSpriteRect(c).y))-44, hp:100-game.displayedPower, color:"#9cdbff", dark:"#3479ad", width:220}
    ];
    ctx.save();
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    for(const t of teams){
        const x=Math.round(clamp(t.x-t.width/2,8,WIDTH-t.width-8));
        const y=Math.round(clamp(t.y,30,HEIGHT-40));
        const hp=clamp(t.hp,0,100);
        ctx.font='12px "Press Start 2P", monospace';
        ctx.fillStyle="#10151d";
        ctx.fillText(t.name,x+t.width/2+2,y-11);
        ctx.fillStyle=t.color;
        ctx.fillText(t.name,x+t.width/2,y-13);
        ctx.fillStyle="#10151d";
        ctx.fillRect(x-3,y-3,t.width+6,29);
        ctx.fillStyle="#b3b8b0";
        ctx.fillRect(x,y,t.width,23);
        ctx.fillStyle="#402c35";
        ctx.fillRect(x+3,y+3,t.width-6,17);
        const fill=Math.round((t.width-6)*hp/100);
        ctx.fillStyle=t.dark;
        ctx.fillRect(x+3,y+3,fill,17);
        ctx.fillStyle=t.color;
        ctx.fillRect(x+3,y+3,fill,11);
        ctx.fillStyle="#ffffff55";
        ctx.fillRect(x+3,y+3,fill,3);
        ctx.fillStyle="#10151d55";
        for(let i=1;i<10;i++)ctx.fillRect(x+3+Math.floor((t.width-6)*i/10),y+3,2,17);
        ctx.font='10px "Press Start 2P", monospace';
        const label="HP "+Math.round(hp)+"%";
        ctx.fillStyle="#10151d";
        ctx.fillText(label,x+t.width/2+1,y+13);
        ctx.fillStyle="#fff5dc";
        ctx.fillText(label,x+t.width/2,y+12);
    }
    ctx.restore();
}

function render() {

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Cenário
    drawBackground();

    ctx.save();

    // Tremor de câmera
    if (game.shake > 0) {

        ctx.translate(

            random(-game.shake, game.shake),

            random(-game.shake, game.shake)
        );
    }

    // Sombras
    drawShadow(hippo);

    for (const cow of cows) {

        drawShadow(cow);
    }

    // Ataques atrás dos personagens
    drawFire();

    // Leite das três vacas
    for (let i = cows.length - 1; i >= 0; i--) {

        drawMilk(cows[i], i);
    }

    // Personagens
    drawCharacter(hippo);

    for (const cow of cows) {

        drawCharacter(cow, cow.phase);
    }

    // Colisão dos ataques
    drawCollisionGlow();

    drawParticles();

    ctx.restore();

    drawTeamHP();

    // Indicador de pausa
    if (game.paused) {

        ctx.fillStyle = "rgba(0,0,0,0.45)";

        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ctx.fillStyle = "#ffffff";

        ctx.font = "bold 48px Arial";

        ctx.textAlign = "center";

        ctx.fillText(

            "PAUSADO",

            WIDTH / 2,

            HEIGHT / 2
        );
    }
}

// ==========================================
// LOOP PRINCIPAL
// ==========================================

let lastTime = 0;

function gameLoop(timestamp) {

    if (!lastTime) {

        lastTime = timestamp;
    }

    const dt = Math.min(

        (timestamp - lastTime) / 1000,

        0.05
    );

    lastTime = timestamp;

    if (!game.paused) {

        update(dt);
    }

    render();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// BOTÕES
// ==========================================

function setupControls() {

    document
        .getElementById("boost-hippo")
        .addEventListener("click", () => {

            boostTeam(
                "hippo",
                CONFIG.normalBoost
            );
        });

    document
        .getElementById("boost-cows")
        .addEventListener("click", () => {

            boostTeam(
                "cows",
                CONFIG.normalBoost
            );
        });

    document
        .getElementById("max-fire")
        .addEventListener("click", () => {

            boostTeam(
                "hippo",
                CONFIG.maxBoost,
                true
            );
        });

    document
        .getElementById("max-milk")
        .addEventListener("click", () => {

            boostTeam(
                "cows",
                CONFIG.maxBoost,
                true
            );
        });

    document
        .getElementById("reset-game")
        .addEventListener("click", resetGame);

    UI.pauseButton.addEventListener("click", () => {

        game.paused = !game.paused;

        UI.pauseButton.textContent = game.paused

            ? "▶ Continuar"

            : "⏸ Pausar";
    });
}

// ==========================================
// CONTROLES PELO TECLADO
// ==========================================

function setupKeyboard() {

    window.addEventListener("keydown", event => {

        if (event.repeat) return;

        if (
            event.target.matches(
                "input, textarea, button"
            )
        ) {

            return;
        }

        const key = event.key.toLowerCase();

        switch (key) {

            case "f":

                boostTeam(
                    "hippo",
                    CONFIG.normalBoost
                );

                break;

            case "l":

                boostTeam(
                    "cows",
                    CONFIG.normalBoost
                );

                break;

            case "q":

                boostTeam(
                    "hippo",
                    CONFIG.maxBoost,
                    true
                );

                break;

            case "e":

                boostTeam(
                    "cows",
                    CONFIG.maxBoost,
                    true
                );

                break;

            case "r":

                resetGame();

                break;

            case " ":

                event.preventDefault();

                UI.pauseButton.click();

                break;
        }
    });
}

// ==========================================
// API PARA FUTURA INTEGRAÇÃO COM LIVE
// ==========================================

window.LiveBattle = {

    fire(amount = 8) {

        if (
            Number.isFinite(amount) &&
            amount > 0
        ) {

            boostTeam(
                "hippo",
                clamp(amount, 1, 100)
            );
        }
    },

    milk(amount = 8) {

        if (
            Number.isFinite(amount) &&
            amount > 0
        ) {

            boostTeam(
                "cows",
                clamp(amount, 1, 100)
            );
        }
    },

    maxFire() {

        boostTeam("hippo", 25, true);
    },

    maxMilk() {

        boostTeam("cows", 25, true);
    },

    reset() {

        if (game.loaded) {

            resetGame();
        }
    },

    getState() {

        return {

            power: game.power,

            hippoScore: game.hippoScore,

            cowsScore: game.cowsScore,

            round: game.round,

            paused: game.paused,

            finished: game.finished
        };
    }
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================

function startGame() {

    setupControls();

    setupKeyboard();

    updateUI();

    notify("⚔️ A BATALHA COMEÇOU!");

    requestAnimationFrame(gameLoop);
}

loadAssets();
