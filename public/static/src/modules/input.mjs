export function initializeRadioGroup(radioGroupId, defaultValue = null, onChangeCallback = null) {
	const radioGroup = document.querySelector(`.toggle-group[aria-labelledby="${radioGroupId}"]`);

	function updateRadioGroupState() {
		radioGroup.querySelectorAll('.btn-radio').forEach(label => {
			const input = label.querySelector('input[type="radio"]');
			const isChecked = input.checked;

			// Update visual highlight
			label.classList.toggle('active', isChecked);

			// Update ARIA state
			label.setAttribute('aria-checked', isChecked);
		});
	}
	let selectedInput = radioGroup.querySelector(`input[value="${localStorage.getItem(radioGroupId)}"]`);
	if (selectedInput) selectedInput.checked = true;
	if (!selectedInput && defaultValue) {
		selectedInput = radioGroup.querySelector(`input[value="${defaultValue}"]`);
		selectedInput.checked = true;
		localStorage.setItem(radioGroupId, defaultValue);
	}

	updateRadioGroupState();
	
	// Call callback if provided
	if (onChangeCallback) onChangeCallback(selectedInput.value);


	// Listen for changes on the radio inputs
	radioGroup.addEventListener('change', (e) => {
		if (e.target.matches('input[type="radio"]')) {
			localStorage.setItem(radioGroupId, e.target.value);
			updateRadioGroupState();
			// Call callback if provided
			if (onChangeCallback) onChangeCallback(e.target.value);
			console.log(`For ${radioGroupId} the selected option: `, e.target.value);
		}
	});
	console.log("Initialized radio group:", radioGroupId);
}

export function populateRadioGroup(containerSelector, dataObj, groupName) {
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
		input.value = key;
		input.className = 'radio-input';
		input.hidden = true;

		span.appendChild(input);
		label.appendChild(span);
		container.appendChild(label);
	}
}

export function initializeCheckbox(checkboxId, onChangeCallback = null) {
	const label = document.querySelector(`label[for="${checkboxId}"]`);
	const checkbox = document.getElementById(checkboxId);

	if (!label || !checkbox) {
		console.warn(`Checkbox with id "${checkboxId}" or its label not found`);
		return;
	}

	const [uncheckedIcon, checkedIcon] = label.querySelectorAll('.icon > svg');

	function updateCheckboxState() {
		label.setAttribute('aria-checked', checkbox.checked);
		uncheckedIcon.classList.toggle('hidden', checkbox.checked);
		checkedIcon.classList.toggle('hidden', !checkbox.checked);
	}

	checkbox.checked = localStorage.getItem(checkboxId) === 'true';
	updateCheckboxState();
	if (onChangeCallback) onChangeCallback(checkbox.checked);

	checkbox.addEventListener('change', (e) => {
		localStorage.setItem(checkboxId, e.target.checked);
		if (onChangeCallback) onChangeCallback(e.target.checked);
	});

	label.addEventListener('click', (e) => {
		e.preventDefault();
		checkbox.checked = !checkbox.checked;
		updateCheckboxState();
		checkbox.dispatchEvent(new Event('change'));
	});

	label.addEventListener('keydown', (e) => {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			label.click();
		}
	});
}