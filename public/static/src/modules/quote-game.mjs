import { createAudioPlayer } from './player.mjs';
import { populateRadioGroup, initializeRadioGroup } from './input.mjs';

import vaData from '/public/static/data/json/voices.json' with { type: 'json'};
import manifest from '/public/static/data/json/manifest.json' with { type: 'json'};

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

let selectedQuote = null;
let vaInfo = null;
let audioPlayer = null;

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
window.SharedTryController = SharedTryController;


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
    function insertGuess(selector, guess = {}) {
        const { characterId, characterName } = guess;
    
        const container = document.querySelector(selector);
        if (!container) return
    
        const li = document.createElement('li');
        li.className = "guess"
        li.classList.add('headShake');
    
        const iconContainer = document.createElement('div');
        iconContainer.className = "avatar-border"
    
        const icon = document.createElement('img');
        icon.className = "avatar"
        icon.src = `/public/static/data/imgs/iconCircle/${characterId}.webp`;
    
        iconContainer.appendChild(icon);
    
        const span = document.createElement('span');
        span.textContent = characterName;
    
        li.appendChild(iconContainer);
        li.appendChild(span);
        container.appendChild(li)
    
        // Define the handler separately so we can remove it later
        const handleAnimationEnd = () => {
            li.classList.remove('headShake');
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
		img.src = `/public/static/data/imgs/iconCircle/${id}.webp`;

		avatarBorder.appendChild(img);

		const span = document.createElement('span');
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
        if (id === selectedQuote.RoleId) console.log("victory")
		console.log(`Character: ${name} selected`)
		insertGuess('.answers-container', { characterId: id, characterName: name })
		used.add(id);
		SharedTryController.decrementAll();
		input.value = '';
		pop.hidePopover();
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

function setupQuoteHint() {
	const langISO = {
		'English': 'en',
		'Japanese': 'ja',
		'Korean': 'ko',
		'Chinese': 'zh'
	};
    const quoteGame = document.querySelector('.quote-game');
    const hintOneContainer = quoteGame.querySelector('.hint-one');
    const hintTwoContainer = quoteGame.querySelector('.hint-two');


    // --- Helpers ---
    function setupTryButton({ btnElement, initialTries, textFormatter = null, onReady = null }) {
        const button = btnElement;
        if (!button) return;
        const textSpan = button.querySelector('.btn-text.va-label');
        button.disabled = true;
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

    const hintBtn1 = hintOneContainer.querySelector('button');
    setupTryButton({
        btnElement: hintBtn1,
        initialTries: 3,
        textFormatter: (remaining) => `Va Name in ${remaining} ${remaining === 1 ? 'try' : 'tries'}`,
        onReady: (btn) => {
            btn.querySelector('.va-label').textContent = 'Click to reveal';
            btn.addEventListener('click', () => {
                if (btn.querySelector('.va-label').textContent != 'Click to reveal') return
                if (!vaInfo) vaInfo = findVaInformation(vaData, selectedQuote.RoleId)
                console.log(vaInfo)
                console.log("Toggling hint language");
                if (!localStorage.getItem('va-lang-select') || localStorage.getItem('va-lang-select') === 'English') {
                    btn.querySelector('.va-label').textContent = `Voice Actor: ${vaInfo[localStorage.getItem('va-lang-select') || 'English']}`;
                } else {
                    btn.querySelector('.va-label').textContent = `Voice Actor: ${vaInfo[localStorage.getItem('va-lang-select')].name}`;
                }
                if (audioPlayer) {
                    audioPlayer.setSource(`/public/static/data/voices/${selectedQuote.RoleId}/${selectedQuote.Id}_${langISO[localStorage.getItem('va-lang-select') || 'english']}.mp3`);
                }
                if (quoteGame.dataset.hintLang != 'true') quoteGame.dataset.hintLang = 'true';
            });
        }
    })
    const hintBtn2 = hintTwoContainer.querySelector('button');
    setupTryButton({
        btnElement: hintBtn2,
        initialTries: 5,
        textFormatter: (remaining) => `Quote audio in ${remaining} ${remaining === 1 ? 'try' : 'tries'}`,
        onReady: (btn) => {
            btn.querySelector('.va-label').textContent = 'Click to reveal';
            btn.addEventListener('click', async () => {
                if (quoteGame.dataset.hintLang != 'true') quoteGame.dataset.hintLang = 'true';
                const audioPlayerElement = document.createElement('div');
	            audioPlayerElement.className = 'audio-player simple';
                audioPlayer = createAudioPlayer(audioPlayerElement, {
                    src: `/public/static/data/voices/${selectedQuote.RoleId}/${selectedQuote.Id}_${langISO[localStorage.getItem('va-lang-select') || 'English']}.mp3`,
                    playerId: 'player',
                    showProgress: false,
                    showTime: false,
                });
                hintBtn2.replaceWith(audioPlayerElement);
            });
        }
    })



}

function resetQuoteGame() {
    const quoteGame = document.querySelector('.quote-game');
    const hintOneContainer = quoteGame.querySelector('.hint-one');
    const hintTwoContainer = quoteGame.querySelector('.hint-two');   
    
    const answersList = document.querySelector('.answers-container')

    // --- Helpers ---
    function resetButtonElement(btnClass) {
        const btn = document.createElement('button');
        btn.className = 'btn extra-large btn-text va-name-btn';
        btn.classList.add(btnClass);

        const span = document.createElement('span');
        span.className = 'btn-text va-label';

        btn.appendChild(span);
        return btn;
    }

    quoteGame.dataset.hintLang = 'false'
    answersList.replaceChildren()
    if (audioPlayer) audioPlayer.destroy();
    vaInfo = null;
    hintOneContainer.replaceChildren(resetButtonElement('example'));
    hintTwoContainer.replaceChildren(resetButtonElement('example'));
    setupQuoteGame();
}

async function setupQuoteGame() {
    function populateQuote(containerSelector, selectedQuote) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        // Clear previous content
        const quoteEl = document.createElement('span');
        quoteEl.className = 'quote';
        quoteEl.textContent = `"${selectedQuote.Content}"`;
        container.replaceWith(quoteEl);
    }
	const randomQuote = manifest.files[Math.floor(Math.random() * manifest.files.length)]
	const characterId = randomQuote.character_id
	const quoteId = parseInt(randomQuote.filename.match(/^(\d+)_/)[1], 10);
    const jsonFile = await fetch(`/public/static/data/json/characters/${characterId}.json`).then(res => res.json());
    selectedQuote = jsonFile.Words.find(quote => quote.Id === quoteId)
    await populateQuote('.quote-game .quote', selectedQuote);
    setupQuoteHint();
}

export function InitializeQuoteGame() {
	const langISO = {
		'English': 'en',
		'Japanese': 'ja',
		'Korean': 'ko',
		'Chinese': 'zh'
	};
	const langs = {
		'english': 'English',
		'japanese': 'Japanese',
		'chinese': 'Chinese',
		'korean': 'Korean'
	};
    setupInputLogic();
    populateRadioGroup('.lang-radio', langs, 'va-lang');
    initializeRadioGroup('va-lang-select', 'English', (value) => {
        const quoteGame = document.querySelector('.quote-game');
        const vaLabel = quoteGame.querySelector('.va-label');
        if (vaLabel.textContent != 'Click to reveal') {
            if (value === 'English') {
                quoteGame.querySelector('.va-label').textContent = `Voice Actor: ${vaInfo != null ? vaInfo[value] : 'Unknown'}`;
            } else {
                quoteGame.querySelector('.va-label').textContent = `Voice Actor: ${vaInfo != null ? vaInfo[value].name : 'Unknown'}`;
            }
        }
        if (audioPlayer) {
            audioPlayer.setSource(`/public/static/data/voices/${selectedQuote.RoleId}/${selectedQuote.Id}_${langISO[value]}.mp3`);
        }
    });
    setupQuoteGame();
    window.resetQuoteGame = resetQuoteGame;
}