import { AudioPlayer, createAudioPlayer } from './modules/player.mjs';
import { initializeRadioGroup } from './modules/input.mjs';

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

function setupAnswersList(container) {
	let counter = 0;
	const btn = document.querySelector('.add-answer-btn');
	btn.addEventListener('click', async () => {
		const cardEl = document.createElement('div');
		cardEl.classList.add('guess');
		cardEl.textContent = `This is answer #${counter++}`;


		// If view transitions not supported, just insert
		if (!document.startViewTransition) {
			container.appendChild(cardEl);
			return;
		}
		cardEl.style.backgroundColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
		cardEl.style.viewTransitionName = 'targeted-card';
		// Start transition
		const transition = document.startViewTransition(() => {
			container.appendChild(cardEl);
		});

		// Once transition is ready, give it a unique name
		await transition.ready;
		
		document.querySelector('.guess:last-child').style.viewTransitionName = `card-${counter}`;

	});
}

async function fetchVAData() {
	// Simulate fetching data
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				'english': 'Alice',
				'japanese': 'アリス',
				'chinese': '爱丽丝'
			});
		}, 500);
	});	
}

function populateRadioGroup(containerSelector, dataObj, groupName) {
	const container = document.querySelector(containerSelector);
	if (!container) return;

	// Clear previous content
	container.replaceChildren();

	for (const [key, labelText] of Object.entries(dataObj)) {
		const label = document.createElement('label');
		label.className = 'btn medium btn-radio';
		label.setAttribute('role', 'radio');
		label.setAttribute('tabindex', '0');
		label.setAttribute('aria-checked', 'false');

		const span = document.createElement('span');
		span.className = 'radio-content radio-text';
		span.textContent = labelText;

		const input = document.createElement('input');
		input.type = 'radio';
		input.id = key.toLowerCase();
		input.name = groupName;
		input.value = key.toLowerCase();
		input.className = 'radio-input';
		input.hidden = true;

		span.appendChild(input);
		label.appendChild(span);
		container.appendChild(label);
	}
}


async function setupHinting() {
	let va = null;
	const langs = {
		'english': 'English',
		'japanese': 'Japanese',
		'chinese': 'Chinese',
		'korean': 'Korean'
	};
	
	const quoteGame = document.querySelector('.quote-game');
	const langRadioGroup = document.querySelector('.lang-radio');
	populateRadioGroup('.lang-radio', langs, 'va-lang');
	initializeRadioGroup('va-lang-select', 'english', (value) => {

		document.querySelector('.va-label').textContent = `Voice Actor: ${va != null ? va[value] : 'Unknown'}`;
	});
	const hintBtn1 = document.querySelector('.hint-one');
	setupTryButton({
		btnElement: hintBtn1,
		initialTries: 3,
		textFormatter: (remaining) => `Va Name in ${remaining} ${remaining === 1 ? 'try' : 'tries'}`,
		onReady: (btn) => {
			btn.querySelector('.va-label').textContent = 'Click to reveal';
			btn.addEventListener('click', async () => {
				if (!va) va = await fetchVAData();
				console.log("Toggling hint language");
				btn.querySelector('.va-label').textContent = `Voice Actor: ${va[localStorage.getItem('va-lang-select') || 'english']}`;
				quoteGame.dataset.hintLang = quoteGame.dataset.hintLang === 'true' ? 'false' : 'true';
			});
		}
	})
	const audioPlayerElement = document.createElement('div');
	audioPlayerElement.className = 'audio-player simple hint-two';
	

	const hintBtn2 = document.querySelector('.hint-two');
	setupTryButton({
		btnElement: hintBtn2,
		initialTries: 5,
		textFormatter: (remaining) => `Quote audio in ${remaining} ${remaining === 1 ? 'try' : 'tries'}`,
		onReady: (btn) => {
			btn.querySelector('.va-label').textContent = 'Click to reveal';
			btn.addEventListener('click', async () => {
				if (quoteGame.dataset.hintLang != 'true') quoteGame.dataset.hintLang = 'true';
				createAudioPlayer(audioPlayerElement, { 
					src: 'https://api.encore.moe/resource/Data/Game/Aki/WwiseAudio/Events/ja/play_favor_word_katixiya_sys_gacha.mp3',
					playerId: 'player',
					showProgress: false,
					showTime: false,
				});
				hintBtn2.replaceWith(audioPlayerElement);
			});
		}
	})
}


function setupTryButton({ btnElement, initialTries, textFormatter = null, onReady = null }) {
	const button = btnElement;
	if (!button) return;

	const textSpan = button.querySelector('.btn-text.va-label');
	if (!textSpan) return;

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

document.addEventListener('DOMContentLoaded', async () => {
	setupHinting();
	setupAnswersList(document.querySelector('.answers-container'));

	document.documentElement.removeAttribute('style');
	requestAnimationFrame(() => {
		document.documentElement.classList.remove('no-transition');
	});

});