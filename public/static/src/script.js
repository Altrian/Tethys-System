document.addEventListener('DOMContentLoaded', () => {
	document.documentElement.removeAttribute('style');
	requestAnimationFrame(() => {
		document.documentElement.classList.remove('no-transition');
	});

});