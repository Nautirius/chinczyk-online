import { chinol } from './utils.js'

document.body.onload = chinol.fetches.getGameData().then(result => {
    chinol.generators.generateLobbyView(result);
    // console.log(result);
});

setInterval(function () {
    chinol.fetches.getGameData().then(result => {
        chinol.generators.generateLobbyView(result);
        // console.log(result);
    });
}, 3000);

document.getElementById("status-input").addEventListener("change", function () {
    chinol.fetches.postStatusChange(this.checked).then(data => {
        chinol.generators.generateLobbyView(data);
    });
});