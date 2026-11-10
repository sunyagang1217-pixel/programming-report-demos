(() => {
  const game = document.getElementById("tianji-game");
  if (!game) return;

  const horses = [
    { id: "slow", name: "下等马", speed: 5, tone: "#a16d45" },
    { id: "middle", name: "中等马", speed: 8, tone: "#8c5638" },
    { id: "fast", name: "上等马", speed: 11, tone: "#684735" }
  ];
  const opponents = [
    { name: "上等马", speed: 12, tone: "#a4783e" },
    { name: "中等马", speed: 9, tone: "#a4783e" },
    { name: "下等马", speed: 7, tone: "#a4783e" }
  ];
  const cover = document.getElementById("game-cover");
  const playArea = document.getElementById("game-play");
  const roundLabel = document.getElementById("round-count");
  const playerScore = document.getElementById("player-score");
  const opponentScore = document.getElementById("opponent-score");
  const playerName = document.getElementById("player-horse-name");
  const opponentName = document.getElementById("opponent-horse-name");
  const playerRunner = document.getElementById("player-runner");
  const opponentRunner = document.getElementById("opponent-runner");
  const racePair = document.getElementById("race-pair");
  const message = document.getElementById("race-message");
  const choiceList = document.getElementById("horse-choices");
  const action = document.getElementById("game-action");
  const refresh = document.querySelector("[data-game-refresh]");
  const playButton = document.querySelector("[data-game-play]");
  const keyboardToggle = document.querySelector("[data-keyboard-toggle]");
  const keyboard = document.getElementById("virtual-keyboard");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let round = 0;
  let score = 0;
  let opponentWins = 0;
  let selectedHorse = "slow";
  let usedHorses = [];
  let phase = "choose";
  let started = false;
  let raceTimer;
  let lastWinner = "tie";

  function horseSvg(tone) {
    return `<svg viewBox="0 0 120 92" aria-hidden="true" focusable="false"><path d="M13 60c4-10 14-17 28-20l12-19 18-4 12 9 15 3 8 11-10 8-8 1-5 18 8 15H79L68 66l-17 2-6 14H34l5-18-12-3-8 18H8l7-20-2 1Z" fill="${tone}"/><path d="m54 22 6-10 9 4 4 9M70 26l8-11 8 8" fill="none" stroke="${tone}" stroke-width="5" stroke-linecap="round"/><circle cx="91" cy="33" r="2.3" fill="#fff"/><path d="m28 42-8-10-5 15M57 65l-3 18M78 62l5 17" fill="none" stroke="${tone}" stroke-width="4" stroke-linecap="round"/></svg>`;
  }

  function firstAvailableHorse() {
    return horses.find((horse) => !usedHorses.includes(horse.id))?.id || null;
  }

  function renderChoices() {
    choiceList.replaceChildren();
    horses.forEach((horse) => {
      const used = usedHorses.includes(horse.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "horse-choice";
      button.setAttribute("aria-pressed", String(horse.id === selectedHorse));
      button.disabled = used || phase !== "choose";
      button.innerHTML = `${horse.name}<span>速度 ${horse.speed}</span>`;
      button.addEventListener("click", () => {
        if (phase !== "choose" || used) return;
        selectedHorse = horse.id;
        render();
        game.focus({ preventScroll: true });
      });
      choiceList.append(button);
    });
  }

  function render() {
    const opponent = opponents[round];
    roundLabel.textContent = phase === "finished" ? "比赛结束" : `第 ${round + 1} / 3 局`;
    playerScore.textContent = String(score);
    opponentScore.textContent = String(opponentWins);
    opponentName.textContent = opponent.name;
    opponentRunner.innerHTML = horseSvg(opponent.tone);
    racePair.classList.remove("is-racing", "player-wins", "opponent-wins");
    if (phase !== "result" && phase !== "finished") {
      playerRunner.style.transform = "translateX(0)";
      opponentRunner.style.transform = "translateX(0)";
    }
    if (phase === "result" || phase === "finished") {
      racePair.classList.add(lastWinner === "player" ? "player-wins" : "opponent-wins");
    }

    const chosen = horses.find((horse) => horse.id === selectedHorse);
    playerName.textContent = chosen ? chosen.name : "待选马匹";
    playerRunner.innerHTML = chosen ? horseSvg(chosen.tone) : horseSvg("#9ba99d");
    renderChoices();

    if (phase === "choose") {
      message.textContent = `${opponent.name}已经出场，选择一匹马迎战。`;
      action.textContent = "确认出赛";
      action.disabled = !chosen;
    } else if (phase === "racing") {
      message.textContent = "比赛进行中……";
      action.textContent = "比赛进行中";
      action.disabled = true;
    } else if (phase === "result") {
      const resultText = lastWinner === "player" ? "本局获胜！" : lastWinner === "opponent" ? "本局惜败，再调整出赛顺序。" : "本局平局。";
      message.textContent = resultText;
      action.textContent = round === 2 ? "查看总结果" : "下一局";
      action.disabled = false;
    } else {
      message.textContent = score > opponentWins
        ? `三局结束，你以 ${score} : ${opponentWins} 获胜！`
        : score < opponentWins
          ? `三局结束，齐王以 ${opponentWins} : ${score} 获胜。`
          : `三局结束，双方 ${score} : ${opponentWins} 打平。`;
      action.textContent = "再玩一次";
      action.disabled = false;
    }
  }

  function startGame() {
    if (started) return;
    started = true;
    cover.hidden = true;
    playArea.hidden = false;
    phase = "choose";
    render();
    game.focus({ preventScroll: true });
  }

  function resetGame() {
    window.clearTimeout(raceTimer);
    round = 0;
    score = 0;
    opponentWins = 0;
    lastWinner = "tie";
    selectedHorse = "slow";
    usedHorses = [];
    phase = "choose";
    started = false;
    playArea.hidden = true;
    cover.hidden = false;
    render();
  }

  function moveSelection(direction) {
    if (!started || phase !== "choose") return;
    const available = horses.filter((horse) => !usedHorses.includes(horse.id));
    if (!available.length) return;
    const currentIndex = available.findIndex((horse) => horse.id === selectedHorse);
    const step = direction === "next" ? 1 : -1;
    const nextIndex = (currentIndex + step + available.length) % available.length;
    selectedHorse = available[nextIndex].id;
    render();
  }

  function runRace() {
    const player = horses.find((horse) => horse.id === selectedHorse);
    const rival = opponents[round];
    if (!player || phase !== "choose") return;

    usedHorses.push(player.id);
    phase = "racing";
    playerName.textContent = `${player.name} · 速度 ${player.speed}`;
    opponentName.textContent = `${rival.name} · 速度 ${rival.speed}`;
    renderChoices();
    action.disabled = true;
    message.textContent = "比赛进行中，看看谁先抵达终点。";
    racePair.classList.remove("player-wins", "opponent-wins");
    racePair.classList.add("is-racing");
    const distanceFor = (runner, speed) => {
      const rail = runner.parentElement;
      const availableDistance = rail.clientWidth - runner.offsetWidth - rail.clientWidth * 0.12 - 20;
      return Math.round(Math.max(0, availableDistance) * speed / 12);
    };
    const playerDistance = distanceFor(playerRunner, player.speed);
    const rivalDistance = distanceFor(opponentRunner, rival.speed);
    window.requestAnimationFrame(() => {
      playerRunner.style.transform = `translateX(${playerDistance}px)`;
      opponentRunner.style.transform = `translateX(${rivalDistance}px)`;
    });

    raceTimer = window.setTimeout(() => {
      phase = "result";
      if (player.speed > rival.speed) {
        score += 1;
        lastWinner = "player";
      } else if (player.speed < rival.speed) {
        opponentWins += 1;
        lastWinner = "opponent";
      } else lastWinner = "tie";
      render();
    }, reducedMotion.matches ? 60 : 980);
  }

  function advance() {
    if (!started) {
      startGame();
    } else if (phase === "choose") {
      runRace();
    } else if (phase === "result" && round < 2) {
      round += 1;
      selectedHorse = firstAvailableHorse();
      phase = "choose";
      render();
    } else if (phase === "result" || phase === "finished") {
      if (round === 2 && phase === "result") phase = "finished";
      else {
        round = 0;
        score = 0;
        opponentWins = 0;
        lastWinner = "tie";
        selectedHorse = "slow";
        usedHorses = [];
        phase = "choose";
      }
      render();
    }
  }

  playButton.addEventListener("click", startGame);
  refresh.addEventListener("click", resetGame);
  action.addEventListener("click", advance);
  game.addEventListener("keydown", (event) => {
    if (!game.contains(document.activeElement)) return;
    if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      moveSelection("previous");
    } else if (["ArrowRight", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      moveSelection("next");
    } else if (event.code === "Space" || event.key === " ") {
      event.preventDefault();
      advance();
    }
  });

  document.querySelectorAll("[data-game-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.gameKey;
      if (key === "space") advance();
      else moveSelection(["right", "down"].includes(key) ? "next" : "previous");
      game.focus({ preventScroll: true });
    });
  });

  keyboardToggle.addEventListener("click", () => {
    const expanded = keyboardToggle.getAttribute("aria-expanded") !== "true";
    keyboardToggle.setAttribute("aria-expanded", String(expanded));
    keyboard.hidden = !expanded;
    keyboardToggle.querySelector("span").textContent = expanded ? "收起键盘" : "展开键盘";
    keyboardToggle.querySelector(".keyboard-chevron").textContent = expanded ? "⌃" : "⌄";
  });

  render();
})();
