const configElement = document.getElementById('session-config');
const logoutUrl = configElement.dataset.logoutUrl;

let timeout;
const timeM = 10; // time in minutes can be changed
const maxInactivityTime = timeM * 60 * 1000;

function resetTimer() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        alert("Deine Sitzung ist abgelaufen.");
        window.location.href = logoutUrl;
    }, maxInactivityTime);
}

window.onload = resetTimer;
window.onmousemove = resetTimer;
window.onmousedown = resetTimer;
window.ontouchstart = resetTimer;
window.onclick = resetTimer;
window.onkeypress = resetTimer;