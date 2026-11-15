(() => {
    'use strict';
    const engine = window.SurvivalEngine;
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('overlay');
    const start = document.getElementById('start');
    const soundButton = document.getElementById('sound');
    const weaponButtons = [...document.querySelectorAll('[data-weapon]')];
    const hud = Object.fromEntries(['health', 'wave', 'score', 'weapon'].map(id => [id, document.getElementById(id)]));
    const keys = { up: false, down: false, left: false, right: false, fire: false };
    const keyMap = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', ' ': 'fire' };
    let game = engine.createGame();
    let pointer = null;
    let audio = null;
    let soundEnabled = true;
    let previous = 0;
    let animation = 0;

    function sound(kind) {
        if (!soundEnabled || !audio || audio.state !== 'running') return;
        const tones = { shoot: [180, 0.045], hit: [420, 0.04], kill: [620, 0.09], damage: [90, 0.18], wave: [520, 0.2], over: [110, 0.3] };
        const [frequency, duration] = tones[kind];
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = kind === 'shoot' ? 'square' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
        gain.gain.setValueAtTime(0.035, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
    }

    function selectWeapon(index) {
        if (!engine.WEAPONS[index]) return;
        game.player.weapon = index;
        weaponButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
        updateHud();
    }

    function updateHud() {
        const values = { health: Math.ceil(game.player.hp), wave: game.wave, score: game.score, weapon: engine.WEAPONS[game.player.weapon].name };
        for (const [key, value] of Object.entries(values)) {
            if (hud[key].textContent !== String(value)) hud[key].textContent = value;
        }
    }

    function clearInput() {
        Object.keys(keys).forEach(key => { keys[key] = false; });
        pointer = null;
    }

    function drawCharacter(x, y, angle, color, enemy, flashing) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = '#0006';
        ctx.beginPath(); ctx.ellipse(2, 4, enemy ? 20 : 19, enemy ? 16 : 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = flashing ? '#fff' : color;
        ctx.beginPath(); ctx.ellipse(0, 0, enemy ? 17 : 16, enemy ? 15 : 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = enemy ? '#602a3c' : '#23475b';
        ctx.fillRect(-6, -13, 9, 26);
        ctx.fillStyle = enemy ? '#fcd6c8' : '#f6c7a6';
        ctx.beginPath(); ctx.arc(5, 0, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#172535';
        if (!enemy) {
            ctx.fillRect(7, 8, 19, 6);
            ctx.fillStyle = '#88a3ae'; ctx.fillRect(21, 9, 10, 4);
            ctx.fillStyle = '#75edd0'; ctx.fillRect(3, -6, 6, 12);
        } else {
            ctx.fillStyle = '#fff'; ctx.fillRect(9, -5, 3, 3); ctx.fillRect(9, 2, 3, 3);
        }
        ctx.restore();
    }

    function draw() {
        ctx.fillStyle = '#122433'; ctx.fillRect(0, 0, engine.WIDTH, engine.HEIGHT);
        ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1;
        for (let x = 0; x < engine.WIDTH; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, engine.HEIGHT); ctx.stroke(); }
        for (let y = 0; y < engine.HEIGHT; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(engine.WIDTH, y); ctx.stroke(); }
        ctx.strokeStyle = '#4d766e'; ctx.lineWidth = 5; ctx.strokeRect(4, 4, engine.WIDTH - 8, engine.HEIGHT - 8);
        for (const enemy of game.enemies) {
            const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
            ctx.save(); ctx.translate(enemy.x, enemy.y);
            const scale = engine.ENEMIES[enemy.type].radius / 16; ctx.scale(scale, scale);
            drawCharacter(0, 0, angle, engine.ENEMIES[enemy.type].color, true, enemy.hit > 0);
            ctx.restore();
        }
        for (const bullet of game.bullets) {
            ctx.fillStyle = '#ffe69a'; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, 3.5, 0, Math.PI * 2); ctx.fill();
        }
        if (!game.player.invulnerable || Math.floor(game.player.invulnerable * 12) % 2 === 0) {
            drawCharacter(game.player.x, game.player.y, game.player.angle, '#52d9b2', false, false);
        }
        if (!game.enemies.length && !game.pending && game.status === 'playing') {
            ctx.fillStyle = '#d7fff2'; ctx.textAlign = 'center'; ctx.font = 'bold 22px Tahoma';
            ctx.fillText(`الموجة ${game.wave + 1} تبدأ قريباً`, engine.WIDTH / 2, 40);
        }
    }

    function loop(time) {
        if (game.status !== 'playing') return;
        const dt = previous ? (time - previous) / 1000 : 0;
        previous = time;
        const angle = pointer ? Math.atan2(pointer.y - game.player.y, pointer.x - game.player.x) : engine.nearestAngle(game);
        engine.step(game, { ...keys, angle }, dt);
        const events = new Set(game.events);
        for (const event of events) sound(event);
        draw();
        updateHud();
        if (game.status === 'over') {
            clearInput();
            document.getElementById('overlay-title').textContent = 'انتهت المهمة';
            document.getElementById('overlay-text').textContent = `وصلت إلى الموجة ${game.wave}، وهزمت ${game.kills} خصماً، وجمعت ${game.score} نقطة.`;
            start.textContent = 'العب مجدداً';
            overlay.hidden = false;
        } else {
            animation = requestAnimationFrame(loop);
        }
    }

    start.addEventListener('click', () => {
        if (animation) cancelAnimationFrame(animation);
        if (soundEnabled) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audio ||= new AudioContext();
                audio.resume().catch(error => console.error('[Survival] Audio could not start:', error));
            }
        }
        clearInput();
        game = engine.createGame();
        selectWeapon(0);
        previous = 0;
        overlay.hidden = true;
        canvas.focus();
        animation = requestAnimationFrame(loop);
    });
    soundButton.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundButton.setAttribute('aria-pressed', String(soundEnabled));
        soundButton.textContent = soundEnabled ? '🔊 الصوت' : '🔇 الصوت';
        if (soundEnabled && audio) audio.resume().catch(error => console.error('[Survival] Audio could not resume:', error));
    });
    weaponButtons.forEach((button, index) => button.addEventListener('click', () => selectWeapon(index)));
    window.addEventListener('keydown', event => {
        if (game.status !== 'playing' || !overlay.hidden) return;
        const key = event.key.toLowerCase();
        if (key === ' ' && event.target instanceof HTMLButtonElement) return;
        if (keyMap[key]) { keys[keyMap[key]] = true; event.preventDefault(); }
        if (['1', '2', '3'].includes(key)) selectWeapon(Number(key) - 1);
    });
    window.addEventListener('keyup', event => {
        const key = keyMap[event.key.toLowerCase()];
        if (key) keys[key] = false;
    });
    canvas.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        const rect = canvas.getBoundingClientRect();
        pointer = { x: (event.clientX - rect.left) / rect.width * engine.WIDTH, y: (event.clientY - rect.top) / rect.height * engine.HEIGHT };
    });
    canvas.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'touch' && overlay.hidden) {
            const rect = canvas.getBoundingClientRect();
            pointer = { x: (event.clientX - rect.left) / rect.width * engine.WIDTH, y: (event.clientY - rect.top) / rect.height * engine.HEIGHT };
            keys.fire = true; canvas.setPointerCapture(event.pointerId);
        }
    });
    canvas.addEventListener('pointerup', () => { keys.fire = false; });
    canvas.addEventListener('pointercancel', () => { keys.fire = false; });
    canvas.addEventListener('lostpointercapture', () => { keys.fire = false; });
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
    updateHud();
})();
