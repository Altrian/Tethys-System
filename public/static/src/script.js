import { InitializeQuoteGame } from './modules/quote-game.mjs';

document.addEventListener('DOMContentLoaded', async () => {
	InitializeQuoteGame();
	document.documentElement.removeAttribute('style');
	requestAnimationFrame(() => {
		document.documentElement.classList.remove('no-transition');
	});

});