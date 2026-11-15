(() => {
    'use strict';
    const engine = window.DuelEngine;
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('overlay');
    const start = document.getElementById('start');
    const soundButton = document.getElementById('sound');
    const weaponButtons = [...document.querySelectorAll('[data-weapon]')];
    const hud = {
        player: document.getElementById('player-health'),
        bot: document.getElementById('bot-health'),
        weapon: document.getElementById('weapon'),
        score: document.getElementById('score')
    };
    const keys = { left: false, right: false, jump: false, fire: false };
    const keyMap = { a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right',
        w: 'jump', arrowup: 'jump', ' ': 'jump', f: 'fire', enter: 'fire' };
    let game = engine.createGame();
    let pointer = null;
    let audio = null;
    let soundEnabled = true;
    let previous = 0;
    let animation = 0;

    function sound(kind) {
        if (!soundEnabled || !audio || audio.state !== 'running') return;
        const tones = { shoot: [165, 0.055], hit: [480, 0.06], damage: [95, 0.16], over: [125, 0.28] };
        const [frequency, duration] = tones[kind];
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.type = kind === 'shoot' ? 'square' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
        gain.gain.setValueAtTime(0.035, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
    }

    function setWeapon(index) {
        if (!engine.WEAPONS[index]) return;
        game.weapon = index;
        weaponButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
        hud.weapon.textContent = engine.WEAPONS[index].name;
    }

    function clearInput() {
        Object.keys(keys).forEach(key => { keys[key] = false; });
        pointer = null;
    }

    function drawBackground() {
        const gradient = ctx.createLinearGradient(0, 0, 0, engine.HEIGHT);
        gradient.addColorStop(0, '#302039'); gradient.addColorStop(1, '#161724');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, engine.WIDTH, engine.HEIGHT);
        ctx.fillStyle = '#fff9';
        for (let i = 0; i < 38; i++) {
            const x = (i * 193 + 41) % engine.WIDTH, y = (i * 83 + 27) % 260;
            ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
        }
        ctx.fillStyle = '#241a2c';
        for (let i = 0; i < 8; i++) {
            const x = i * 135 - 15, height = 60 + (i * 53) % 110;
            ctx.fillRect(x, engine.FLOOR - height, 94, height);
            ctx.fillStyle = '#c87e68'; ctx.fillRect(x + 16, engine.FLOOR - height + 18, 8, 14); ctx.fillStyle = '#241a2c';
            ctx.fillStyle = '#e0aa63'; ctx.fillRect(x + 48, engine.FLOOR - height + 18, 8, 14); ctx.fillStyle = '#241a2c';
        }
        ctx.fillStyle = '#45394a'; ctx.fillRect(0, engine.FLOOR, engine.WIDTH, engine.HEIGHT - engine.FLOOR);
        ctx.fillStyle = '#b28475'; ctx.fillRect(0, engine.FLOOR, engine.WIDTH, 5);
        for (const platform of engine.PLATFORMS) {
            ctx.fillStyle = '#49394d'; ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
            ctx.fillStyle = '#edb06f'; ctx.fillRect(platform.x, platform.y, platform.w, 4);
            ctx.fillStyle = '#b07867';
            for (let x = platform.x + 14; x < platform.x + platform.w - 8; x += 32) ctx.fillRect(x, platform.y + 8, 14, 3);
        }
    }

    function drawFighter(entity, color, accent, time) {
        ctx.save();
        ctx.translate(entity.x, entity.y);
        ctx.scale(entity.facing, 1);
        if (entity.invulnerable > 0 && Math.floor(time * 20) % 2 === 0) ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#08071199';
        ctx.beginPath(); ctx.ellipse(0, 27, 24, 6, 0, 0, Math.PI * 2); ctx.fill();

        const walk = Math.sin(time * 14) * (Math.abs(entity.vx) > 0 ? 5 : 0);
        ctx.strokeStyle = '#1c2736'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-7, 9); ctx.lineTo(-11 + walk, 25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(7, 9); ctx.lineTo(12 - walk, 25); ctx.stroke();
        ctx.fillStyle = '#273447'; ctx.fillRect(-18 + walk, 23, 12, 5); ctx.fillRect(6 - walk, 23, 12, 5);

        ctx.fillStyle = '#172334'; ctx.beginPath(); ctx.roundRect(-14, -20, 28, 34, 8); ctx.fill();
        ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-11, -18, 22, 27, 6); ctx.fill();
        ctx.fillStyle = accent; ctx.fillRect(-8, -9, 16, 4); ctx.fillRect(-4, 2, 8, 4);
        ctx.fillStyle = '#111c2a'; ctx.fillRect(-14, 6, 28, 5);
        ctx.fillStyle = '#f0c4a4'; ctx.beginPath(); ctx.arc(0, -29, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -32, 12, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#192536'; ctx.beginPath(); ctx.roundRect(2, -35, 10, 7, 2); ctx.fill();
        ctx.fillStyle = accent; ctx.fillRect(4, -33, 6, 3);

        ctx.strokeStyle = '#1d2938'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(-10, -13); ctx.lineTo(-17, -2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(9, -13); ctx.lineTo(18, -5); ctx.stroke();
        ctx.fillStyle = '#f0c4a4'; ctx.beginPath(); ctx.arc(18, -5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#192738'; ctx.beginPath(); ctx.roundRect(15, -12, 21, 7, 2); ctx.fill();
        ctx.fillStyle = '#90a4b8'; ctx.fillRect(31, -10, 13, 3);
        ctx.fillStyle = accent; ctx.fillRect(18, -11, 6, 2);
        ctx.restore();
    }

    function drawHealthBar(x, y, ratio, color, label) {
        ctx.fillStyle = '#0a0a13cc'; ctx.beginPath(); ctx.roundRect(x - 32, y, 64, 8, 4); ctx.fill();
        ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x - 30, y + 2, 60 * Math.max(0, ratio), 4, 3); ctx.fill();
        ctx.font = 'bold 12px Tahoma'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        ctx.fillText(label, x, y - 4);
    }

    function draw() {
        drawBackground();
        for (const bullet of game.bullets) {
            ctx.fillStyle = bullet.owner === 'bot' ? '#ff8b79' : '#ffe3a2';
            ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
        drawFighter(game.player, '#3f827b', '#a6f1d7', game.time);
        drawFighter(game.bot, '#9b5065', '#ffc189', game.time);
        drawHealthBar(game.player.x, game.player.y - 54, game.player.hp / 100, '#57e0bd', 'أنت');
        drawHealthBar(game.bot.x, game.bot.y - 54, game.bot.hp / 100, '#ff8177', 'الخصم');
    }

    function loop(time) {
        if (game.status !== 'playing') return;
        const dt = previous ? (time - previous) / 1000 : 0;
        previous = time;
        let aimX = game.bot.x, aimY = game.bot.y - 5;
        if (pointer) { aimX = pointer.x; aimY = pointer.y; }
        engine.step(game, { ...keys, aimX, aimY }, dt);
        for (const event of new Set(game.events)) sound(event);
        draw();
        hud.player.textContent = Math.ceil(game.player.hp);
        hud.bot.textContent = Math.ceil(game.bot.hp);
        hud.score.textContent = game.score;
        if (game.status === 'over') {
            clearInput();
            document.getElementById('overlay-title').textContent = game.winner === 'player' ? 'انتصرت في المبارزة!' : 'خسرت هذه الجولة';
            document.getElementById('overlay-text').textContent = game.winner === 'player'
                ? 'أحسنت! بدّل سلاحك وابدأ جولة جديدة.'
                : 'الخصم أصابك هذه المرة. غيّر أسلوبك وحاول ثانية.';
            start.textContent = 'جولة جديدة';
            overlay.hidden = false;
        } else animation = requestAnimationFrame(loop);
    }

    start.addEventListener('click', () => {
        if (animation) cancelAnimationFrame(animation);
        if (soundEnabled) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audio ||= new AudioContext();
                audio.resume().catch(error => console.error('[Duel] Audio could not start:', error));
            }
        }
        clearInput();
        game = engine.createGame();
        setWeapon(0);
        previous = 0;
        overlay.hidden = true;
        canvas.focus();
        animation = requestAnimationFrame(loop);
    });
    soundButton.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundButton.setAttribute('aria-pressed', String(soundEnabled));
        soundButton.textContent = soundEnabled ? '🔊 الصوت' : '🔇 الصوت';
        if (soundEnabled && audio) audio.resume().catch(error => console.error('[Duel] Audio could not resume:', error));
    });
    weaponButtons.forEach((button, index) => button.addEventListener('click', () => setWeapon(index)));
    window.addEventListener('keydown', event => {
        if (game.status !== 'playing' || !overlay.hidden) return;
        const key = event.key.toLowerCase();
        if (keyMap[key]) { keys[keyMap[key]] = true; event.preventDefault(); }
        if (key === '1' || key === '2') setWeapon(Number(key) - 1);
    });
    window.addEventListener('keyup', event => {
        const key = keyMap[event.key.toLowerCase()];
        if (key) keys[key] = false;
    });
    canvas.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        const rect = canvas.getBoundingClientRect();
        pointer = { x: (event.clientX - rect.left) / rect.width * engine.WIDTH,
            y: (event.clientY - rect.top) / rect.height * engine.HEIGHT };
    });
    canvas.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch' || !overlay.hidden) return;
        const rect = canvas.getBoundingClientRect();
        pointer = { x: (event.clientX - rect.left) / rect.width * engine.WIDTH,
            y: (event.clientY - rect.top) / rect.height * engine.HEIGHT };
        keys.fire = true; canvas.setPointerCapture(event.pointerId);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        canvas.addEventListener(name, () => { keys.fire = false; });
    }
    document.querySelectorAll('[data-key]').forEach(button => {
        const key = button.dataset.key;
        button.addEventListener('pointerdown', event => {
            event.preventDefault(); pointer = null; keys[key] = true; button.setPointerCapture(event.pointerId);
        });
        for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
            button.addEventListener(event, () => { keys[key] = false; });
        }
    });
    window.addEventListener('blur', clearInput);
    document.addEventListener('visibilitychange', () => { previous = 0; if (document.hidden) clearInput(); });
    draw();
})();
