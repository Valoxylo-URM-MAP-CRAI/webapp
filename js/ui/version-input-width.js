document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('inputVersionEtude');
    if (!input) return;
    const testSpan = document.createElement('span');
    testSpan.style.visibility = 'hidden';
    testSpan.style.position = 'absolute';
    testSpan.style.whiteSpace = 'pre';
    testSpan.style.font = window.getComputedStyle(input).font;
    document.body.appendChild(testSpan);
    function updateWidth() {
        testSpan.textContent = input.value || input.placeholder;
        input.style.width = Math.max(36, testSpan.offsetWidth + 8) + 'px';
    }
    input.addEventListener('input', updateWidth);
    updateWidth();
});
