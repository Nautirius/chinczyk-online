import { chinol } from './utils.js'

document.body.onload = chinol.fetches.getGameData().then(result => {
    chinol.generators.generatePlayerList(result);
    chinol.generators.generateBoard(result);
    // console.log(result);
});

setInterval(function () {
    chinol.fetches.getGameData().then(result => {
        chinol.generators.generatePlayerList(result);
        if (result.game.data.find(player => player.id === result.playerId && (player.turn !== result.game.currentTurn || player.status === "waiting"))) {
            chinol.generators.generateBoard(result);
        }
    });
}, 3000);