import { formatDialogueText } from './text-formatter.mjs';
import { createAudioPlayer } from './player.mjs';
import { populateRadioGroup, initializeRadioGroup } from './input.mjs';

import vaData from '/static/data/json/voices.json' with { type: 'json'};
import manifest from '/static/data/json/manifest.json' with { type: 'json'};

const suggestionList = [
    { "Id": 1402, "Name": "Yangyang" }, { "Id": 1202, "Name": "Chixia" }, { "Id": 1503, "Name": "Verina" },
    { "Id": 1501, "Name": "Rover: Spectro" }, { "Id": 1102, "Name": "Sanhua" }, { "Id": 1601, "Name": "Taoqi" },
    { "Id": 1502, "Name": "Rover: Spectro" }, { "Id": 1103, "Name": "Baizhi" }, { "Id": 1203, "Name": "Encore" },
    { "Id": 1602, "Name": "Danjin" }, { "Id": 1403, "Name": "Aalto" }, { "Id": 1404, "Name": "Jiyan" },
    { "Id": 1204, "Name": "Mortefi" }, { "Id": 1603, "Name": "Camellya" }, { "Id": 1301, "Name": "Calcharo" },
    { "Id": 1302, "Name": "Yinlin" }, { "Id": 1104, "Name": "Lingyang" }, { "Id": 1303, "Name": "Yuanwu" },
    { "Id": 1604, "Name": "Rover: Havoc" }, { "Id": 1605, "Name": "Rover: Havoc" }, { "Id": 1405, "Name": "Jianxin" },
    { "Id": 1304, "Name": "Jinhsi" }, { "Id": 1305, "Name": "Xiangli Yao" }, { "Id": 1205, "Name": "Changli" },
    { "Id": 1105, "Name": "Zhezhi" }, { "Id": 1504, "Name": "Lumi" }, { "Id": 1106, "Name": "Youhu" },
    { "Id": 1505, "Name": "Shorekeeper" }, { "Id": 1606, "Name": "Roccia" }, { "Id": 1107, "Name": "Carlotta" },
    { "Id": 1206, "Name": "Brant" }, { "Id": 1506, "Name": "Phoebe" }, { "Id": 1406, "Name": "Rover: Aero" },
    { "Id": 1607, "Name": "Cantarella" }, { "Id": 1407, "Name": "Ciaccona" }, { "Id": 1507, "Name": "Zani" },
    { "Id": 1408, "Name": "Rover: Aero" }, { "Id": 1207, "Name": "Lupa" }, { "Id": 1608, "Name": "Phrolova" },
    { "Id": 1409, "Name": "Cartethyia" }, { "Id": 1306, "Name": "Augusta" }, { "Id": 1410, "Name": "Iuno" },
    { "Id": 1208, "Name": "Galbrena" }, { "Id": 1411, "Name": "Qiuyuan" }
];


let roundData = {};
const userStreak = {};


// Global controller shared by all buttons
const SharedTryController = (() => {
    const buttons = new Set();

    function register(state) {
        buttons.add(state);
        state.updateText();
    }

    function decrementAll() {
        buttons.forEach(state => {
            if (state.remaining > 0) {
                state.remaining--;
                state.updateText();
                if (state.remaining === 0) {
                    console.log(state.button)
                    state.button.disabled = false;
                    if (typeof state.onReady === 'function') {
                        state.onReady(state.button);
                    }
                }
            }
        });
    }

    return { register, decrementAll };
})();
const ElementHiderById = (() => {
  const storage = new Map(); // id => { element, parent, next, placeholder }

  return {
    register(id, element) {
      if (!id || !element) throw new Error('Provide id and element');
      storage.set(id, { element });
    },

    hide(id) {
      const info = storage.get(id);
      if (!info) return;
      const { element } = info;
      if (!element.parentNode) return; // already hidden

      const placeholder = document.createComment(`placeholder-${id}`);
      info.parent = element.parentNode;
      info.next = element.nextSibling;
      info.placeholder = placeholder;

      element.parentNode.replaceChild(placeholder, element);
    },

    show(id) {
      const info = storage.get(id);
      if (!info) return;
      const { element, parent, next, placeholder } = info;
      if (!placeholder || !parent) return;

      parent.insertBefore(element, next);
      placeholder.remove();

      delete info.parent;
      delete info.next;
      delete info.placeholder;
    }
  };
})();

window.SharedTryController = SharedTryController;

function finishGame(characterId, name, result) {
    // Ensure properties exist
    userStreak.games_won ??= 0;
    userStreak.games_played ??= 0;
    userStreak.user_streak ??= 0;
    userStreak.highest_streak ??= 0;

    // Update values based on result
    if (result) {
        userStreak.games_won++;
        userStreak.user_streak++;
        if (userStreak.highest_streak < userStreak.user_streak) userStreak.highest_streak = userStreak.user_streak;
    } else {
        userStreak.user_streak = 0;
    }
    userStreak.games_played++;
    localStorage.setItem("WuWa_quote_user_scores", JSON.stringify(userStreak));
    document.querySelector('.game-streak').textContent = `Streak: ${userStreak.user_streak}`;
    const quoteGame = document.querySelector('.quote-game');
    function createResultElement(characterId, name, result, onNext = null) {
        const numberTries = 5 - roundData.remainingTries;
        const imgSrc = `/static/data/imgs/iconCircle/${characterId}.webp`

        const resultElement = document.createElement('div');
        resultElement.className = 'result';

        // --- Titles ---
        const title1 = document.createElement('div');
        title1.className = 'result-title';
        title1.textContent = result ? 'Well Done!' : 'Game Over!';

        const title2 = document.createElement('div');
        title2.className = 'result-title';
        title2.textContent = 'The Character Was:';

        // --- Answer container ---
        const answer = document.createElement('div');
        answer.className = 'result-answer';

        const avatarBorder = document.createElement('div');
        avatarBorder.className = 'avatar-border';

        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = imgSrc;
        avatarBorder.appendChild(avatar);

        const info = document.createElement('div');
        info.className = 'result-answer-info';

        const answerName = document.createElement('div');
        answerName.className = 'answer-name';
        answerName.textContent = name;

        const nbTries = document.createElement('div');
        nbTries.className = 'nb-tries';
        nbTries.textContent = 'Number of tries: ';

        const nth = document.createElement('span');
        nth.className = 'nth';
        nth.textContent = numberTries;
        nbTries.appendChild(nth);

        const answerStats = document.createElement('div');
        answerStats.className = 'answer-stats';
        answerStats.textContent = 'stats';

        info.append(answerName, nbTries, answerStats);
        answer.append(avatarBorder, info);

        // --- Next button ---
        const resultNext = document.createElement('div');
        resultNext.className = 'result-next';

        const button = document.createElement('button');
        button.className = 'btn btn-text medium';
        if (onNext) button.addEventListener('click', onNext);

        const spanText = document.createElement('span');
        spanText.className = 'btn-text';
        spanText.textContent = 'Next Round';

        button.appendChild(spanText);
        resultNext.appendChild(button);

        // --- Assemble everything ---
        resultElement.append(title1, title2, answer, resultNext);
        return resultElement;
    }
    requestAnimationFrame(() => {
        quoteGame.appendChild(createResultElement(characterId, name, result, () => {
            resetQuoteGame();
        }));
    })
    ElementHiderById.hide(1)
}

function setupInputLogic() {
    const inputForm = document.getElementById('guess-input-form');
    const input = inputForm.querySelector('#guess-input');
    const pop = inputForm.querySelector("#guess-input-popover")
    const list = inputForm.querySelector("#suggestions-list");

    let used = new Set()
    let current = [];
    let index = -1;
    let pointerDown = false; // 👈 track pointer interaction
    let activeEl = null; // keep reference to currently highlighted element

    // --- Helpers ---
    function insertGuess(selector, guess = {}, correctGuess = false) {
        const { characterId, characterName } = guess;

        const container = document.querySelector(selector);
        if (!container) return

        const li = document.createElement('li');
        li.className = "guess";
        li.dataset.result = correctGuess;

        const correctClasses = ['tada']
        const incorrectClasses = ['headShake']
        li.classList.add(...(correctGuess ? correctClasses : incorrectClasses))

        const iconContainer = document.createElement('div');
        iconContainer.className = "avatar-border"

        const icon = document.createElement('img');
        icon.className = "avatar"
        icon.src = `/static/data/imgs/iconCircle/${characterId}.webp`;

        iconContainer.appendChild(icon);

        const span = document.createElement('span');
        span.className = 'btn-text'
        span.textContent = characterName;

        li.appendChild(iconContainer);
        li.appendChild(span);
        container.appendChild(li)

        // Define the handler separately so we can remove it later
        const handleAnimationEnd = () => {
            li.classList.remove(correctGuess ? 'tada' : 'headShake');
            li.removeEventListener('animationend', handleAnimationEnd);
        };

        li.addEventListener('animationend', handleAnimationEnd);

    }

    function createGuessElement({ id, name }) {
        const li = document.createElement('li');
        li.className = 'guess';
        li.dataset.id = id;

        const avatarBorder = document.createElement('div');
        avatarBorder.className = 'avatar-border small';

        const img = document.createElement('img');
        img.className = 'avatar';
        img.src = `/static/data/imgs/iconCircle/${id}.webp`;

        avatarBorder.appendChild(img);

        const span = document.createElement('span');
        span.className = 'btn-text';
        span.textContent = name;

        li.appendChild(avatarBorder);
        li.appendChild(span);

        return li;
    }

    function updateSuggestions() {
        const val = input.value.trim().toLowerCase();
        if (!val) {
            pop.hidePopover();
            return;
        }
        const starts = suggestionList.filter(d => !used.has(d.Id) && d.Name.toLowerCase().startsWith(val));
        const contains = suggestionList.filter(
            d => !used.has(d.Id) && !d.Name.toLowerCase().startsWith(val) && d.Name.toLowerCase().includes(val)
        );

        current = [...starts, ...contains];

        const listEle = current.map(d => createGuessElement({ id: d.Id, name: d.Name }))
        list.replaceChildren(...listEle)
        index = -1;
        activeEl = null;

        if (current.length) pop.showPopover();
        else pop.hidePopover();
    }

    function highlight(items) {
        const newEl = items[index];

        // no change → do nothing
        if (activeEl === newEl) return;

        // remove active from previous
        if (activeEl) activeEl.classList.remove("active");

        // add active to new one
        if (newEl) {
            newEl.classList.add("active");
            newEl.scrollIntoView({ block: "nearest" });
        }

        activeEl = newEl;
    }

    function useSuggestion(id, name) {
        input.value = name;
        input.value = '';
        pop.hidePopover();
        roundData.remainingTries--;
        console.log(`Character: ${name} selected`);
        if (id === roundData.selectedQuote.RoleId) {
            console.log("victory");
            insertGuess('.answers-container', { characterId: id, characterName: name }, true);
            finishGame(id, name, true);
            return
        };
        if (roundData.remainingTries < 0) {
            insertGuess('.answers-container', { characterId: id, characterName: name });
            finishGame(id, name, false);
            return
        };
        insertGuess('.answers-container', { characterId: id, characterName: name });
        used.add(id);
        SharedTryController.decrementAll();
    }

    // --- Event handling ---

    // Cancel submit event
    inputForm.addEventListener("submit", (e) => e.preventDefault());

    // While typing
    input.addEventListener("input", updateSuggestions);

    // --- Handle focus source ---
    input.addEventListener("pointerdown", () => (pointerDown = true));
    input.addEventListener("pointerup", () => {
        pointerDown = false;
        if (input.value.trim()) updateSuggestions();
    });

    // When focusing with keyboard (e.g., Tab)
    input.addEventListener("focus", () => {
        if (pointerDown) return; // skip if focus came from pointer
        if (input.value.trim()) updateSuggestions();
    });

    input.addEventListener("keydown", e => {
        if (!pop.matches(":popover-open")) return;
        const items = list.querySelectorAll("li");
        if (!items.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            index = (index + 1) % items.length;
            highlight(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            index = (index - 1 + items.length) % items.length;
            highlight(items);
        } else if (e.key === "Enter" && index === -1) {
            const item = items[0];
            useSuggestion(Number(item.dataset.id), item.textContent);
        } else if (e.key === "Enter" && index >= 0) {
            const item = items[index];
            useSuggestion(Number(item.dataset.id), item.textContent);
        }
    });

    list.addEventListener("click", e => {
        const li = e.target.closest('.guess');
        if (!li) return;
        useSuggestion(Number(li.dataset.id), li.textContent);
    });

}

function setupQuoteHint(container) {
    const langISO = {
        'English': 'en',
        'Japanese': 'ja',
        'Korean': 'ko',
        'Chinese': 'zh'
    };
    const langKeys = {
        'English': 'CVNameEn',
        'Japanese': 'CVNameJp',
        'Korean': 'CVNameKo',
        'Chinese': 'CVNameCn'
    }
    

    // --- Helpers ---
    function setupTryButton(btnClass, { initialTries, textFormatter = null, onReady = null }) {
        const button = document.createElement('button');
        button.className = btnClass;
        button.disabled = true;

        const textSpan = document.createElement('span');
        textSpan.className = 'btn-text va-label'

        const state = {
            button,
            textSpan,
            remaining: initialTries,
            onReady,
            updateText() {
                if (typeof textFormatter === 'function') {
                    textSpan.textContent = textFormatter(this.remaining);
                } else {
                    textSpan.textContent = 'Hint format not set';
                }
            }
        };
        SharedTryController.register(state);
        button.append(textSpan);
        return button
    }

    function findVaInformation(items, characterId) {
        return items.find(item => {
            if (Array.isArray(item.Id)) {
                return item.Id.includes(characterId);
            } else {
                return item.Id === characterId;
            }
        });
    }

    const hintOne = setupTryButton('btn extra-large btn-text va-name-btn', {
        initialTries: 3,
        textFormatter: (remaining) => `Va Name in ${remaining} ${remaining === 1 ? 'try' : 'tries'}`,
        onReady: (btn) => {
            btn.querySelector('.va-label').textContent = 'Click to reveal';
            btn.addEventListener('click', () => {
                if (btn.querySelector('.va-label').textContent != 'Click to reveal') return
                console.log(roundData.vaInfo)
                console.log("Toggling hint language", container);
                if (!localStorage.getItem('va-lang-select') || localStorage.getItem('va-lang-select') === 'English') {
                    btn.querySelector('.va-label').textContent = `Voice Actor: ${roundData.vaInfo[localStorage.getItem('va-lang-select') || 'English']}`;
                } else {
                    btn.querySelector('.va-label').textContent = `Voice Actor: ${roundData.vaInfo[localStorage.getItem('va-lang-select')]}`;
                }
                if (roundData.audioPlayer) {
                    roundData.audioPlayer.setSource(`/static/data/voices/${roundData.selectedQuote.RoleId}/${roundData.selectedQuote.Id}_${localStorage.getItem('va-lang-select')}.mp3`);
                }
                if (container.dataset.hintLang != 'true') container.dataset.hintLang = 'true';
            });
        }
    })
    
    const hintTwo = setupTryButton('btn extra-large btn-text va-name-btn', {
        initialTries: 4,
        textFormatter: (remaining) => `Quote audio in ${remaining} ${remaining === 1 ? 'try' : 'tries'}`,
        onReady: (btn) => {
            btn.querySelector('.va-label').textContent = 'Click to reveal';
            btn.addEventListener('click', async () => {
                if (container.dataset.hintLang != 'true') container.dataset.hintLang = 'true';
                const audioPlayerElement = document.createElement('div');
                audioPlayerElement.className = 'audio-player simple';
                roundData.audioPlayer = createAudioPlayer(audioPlayerElement, {
                    src: `/static/data/voices/${roundData.selectedQuote.RoleId}/${roundData.selectedQuote.Id}_${localStorage.getItem('va-lang-select')}.mp3`,
                    playerId: 'player',
                    showProgress: false,
                    showTime: false,
                });
                btn.replaceWith(audioPlayerElement);
            });
        }
    })
    
    return [hintOne, hintTwo];
}

function resetQuoteGame() {
    const quoteGame = document.querySelector('.quote-game');
    const hintOneContainer = quoteGame.querySelector('.hint-one');
    const hintTwoContainer = quoteGame.querySelector('.hint-two');
    const resultContainer = quoteGame.querySelector('.result');
    resultContainer.remove()

    const answersList = document.querySelector('.answers-container')

    quoteGame.dataset.hintLang = 'false'
    answersList.replaceChildren()
    if (roundData.audioPlayer) roundData.audioPlayer.destroy();
    roundData = {};
    const [btnOneEl, btnTwoEl] = setupQuoteHint(quoteGame);
    hintOneContainer.replaceChildren(btnOneEl);
    hintTwoContainer.replaceChildren(btnTwoEl);
    ElementHiderById.show(1)
    setupQuoteGame();
}

async function setupQuoteGame() {
    roundData.remainingTries = 5;

    const randomQuote = manifest.files[Math.floor(Math.random() * manifest.files.length)]
    const characterId = randomQuote.character_id
    const quoteId = parseInt(randomQuote.filename.match(/^(\d+)_/)[1], 10);
    const jsonFile = await fetch(`/static/data/json/characters/${characterId}.json`).then(res => res.json());
    roundData.vaInfo = ((f = jsonFile.favorRole) => ({ zh: f.CVNameCn?.Content ?? '', ja: f.CVNameJp?.Content ?? '', ko: f.CVNameKo?.Content ?? '', en: f.CVNameEn?.Content ?? '' }))();
    roundData.selectedQuote = jsonFile.Words.find(quote => quote.Id === quoteId)
    document.querySelector('.quote').replaceChildren(formatDialogueText(roundData.selectedQuote.Content));
}

export function InitializeQuoteGame() {
    function populateQuoteGame(containerSelector) {
        const container = document.querySelector(containerSelector);
        container.classList.add('quote-game');

        const quoteEl = document.createElement('div');
        quoteEl.className = 'quote';
        quoteEl.textContent =  "";

        const radioEl = document.createElement('div');
        radioEl.className = 'toggle-group lang-radio';
        radioEl.setAttribute('role', 'radiogroup');
        radioEl.setAttribute('aria-labelledby', 'va-lang-select');

        const hintOneEl = document.createElement('div');
        hintOneEl.className = 'hint-one';
        
        const hintTwoEl = document.createElement('div');
        hintTwoEl.className = 'hint-two';
        
        const [btnOneEl, btnTwoEl] = setupQuoteHint(container);
        hintOneEl.append(btnOneEl);
        hintTwoEl.append(btnTwoEl);

        container.replaceChildren(quoteEl, radioEl, hintOneEl, hintTwoEl)
    }

    const langs = {
        'en': 'English',
        'ja': 'Japanese',
        'zh': 'Chinese',
        'ko': 'Korean'
    };
    const savedStreak = localStorage.getItem("WuWa_quote_user_scores");
    if (savedStreak) Object.assign(userStreak, JSON.parse(savedStreak));
    document.querySelector('.game-streak').textContent = `Streak: ${userStreak.user_streak}`;
    const guessBox = document.querySelector('.guessbox');
    ElementHiderById.register(1, guessBox);
    populateQuoteGame('.game-content')
    setupInputLogic();
    populateRadioGroup('.lang-radio', langs, 'va-lang');
    initializeRadioGroup('va-lang-select', 'en', (value) => {
        const quoteGame = document.querySelector('.quote-game');
        const btnEl = quoteGame.querySelector('.hint-one > .btn')
        const vaLabel = quoteGame.querySelector('.hint-one .va-label');
        if (btnEl.disabled) return
        if (vaLabel.textContent === 'Click to reveal') return
        if (value === 'English') {
            quoteGame.querySelector('.va-label').textContent = `Voice Actor: ${roundData.vaInfo != null ? roundData.vaInfo[value] : 'Unknown'}`;
        } else {
            quoteGame.querySelector('.va-label').textContent = `Voice Actor: ${roundData.vaInfo != null ? roundData.vaInfo[value] : 'Unknown'}`;
        }
        if (roundData.audioPlayer) {
            roundData.audioPlayer.setSource(`/static/data/voices/${roundData.selectedQuote.RoleId}/${roundData.selectedQuote.Id}_${value}.mp3`);
        }
    });
    setupQuoteGame();
    window.resetQuoteGame = resetQuoteGame;
}
