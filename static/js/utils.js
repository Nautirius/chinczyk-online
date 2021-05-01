export { chinol }


class chinol {

    static fetches = {
        postStatusChange(status) {
            let result = fetch('https://chinczyk-mk3ib1.glitch.me/changeStatus', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: status })
            })
                .then(res => res.json())
                .then(result => { return result })
                .catch(error => { return error })
            return result;
            // .then(data => chinol.generators.generateLobbyView(data));
        },
        getGameData() {
            let gameData = fetch('https://chinczyk-mk3ib1.glitch.me/data', {
                method: "GET",
            })
                .then(res => res.json())
                .then(result => { return result })
                .catch(error => { return error })
            return gameData;
        },
        rollDie() {
            let score = fetch('https://chinczyk-mk3ib1.glitch.me/rollDie', {
                method: "GET",
            })
                .then(response => response.json())
                .then(result => { return result })
                .catch(error => { return error })
            return score;
        },
        sendChoice(pawnPos, choice) {
            console.log(choice);
            let result = fetch('https://chinczyk-mk3ib1.glitch.me/movePawn', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pawn: pawnPos, choice: choice })
            })
                .then(res => res.json())
                .then(result => { return result })
                .catch(error => { return error })
            return result;
        }
    }

    ////////////////////////////////////////////////////////////////////
    static generators = {
        generateLobbyView(result) {
            if (result.game.status === "ready" || result.game.status === "ongoing") {
                let form = document.createElement("form")
                form.method = "GET"
                form.action = "/loadGame"
                document.body.appendChild(form);
                form.submit();
            } else {
                let playerList = document.getElementById("player-list");
                playerList.innerHTML = "";
                result.game.data.forEach(player => {
                    console.log(player)
                    let playerItem = document.createElement("li");
                    playerItem.innerText = player.nick;
                    playerItem.style.color = player.status === "waiting" ? "gray" : player.color;
                    playerList.appendChild(playerItem);
                })
            }
        },
        generatePlayerList(result) {
            let playerList = document.getElementById("player-list");
            playerList.innerHTML = "";
            let info = document.getElementById("info");
            let playerInfo = result.game.data.find(player => player.id === result.playerId)
            let currentPlayer = result.game.data.find(player => player.turn == result.game.currentTurn);
            info.innerHTML = `Jesteś <span style="color:${playerInfo.color}">${playerInfo.nick}</span><br>
                                Tura gracza <span style="color:${currentPlayer.color}">${currentPlayer.nick}</span>`;
            result.game.data.forEach(player => {
                // console.log(player)
                let playerItem = document.createElement("li");
                playerItem.innerText = player.nick;
                playerItem.style.color = player.color;
                playerList.appendChild(playerItem);
            })
            let prevDie = document.getElementById("die");
            if (prevDie)
                document.getElementById("ct").removeChild(prevDie);
            let die = document.createElement("div");
            die.style.background = `url('${result.game.lastRoll}.png')`;
            die.setAttribute("id", "die");
            // die.innerText = result.game.lastRoll;
            let player = result.game.data.find(player => player.id === result.playerId && player.turn === result.game.currentTurn)
            if (player) {
                // die.innerText = "Twoja tura";
                die.addEventListener("click", this.dieEvent);
                if (player.status === "rolled") {
                    // die.click();
                }

            } else {
                // die.style.display = "none";
            }
            document.getElementById("ct").appendChild(die);
        },
        generateBoard(result) {
            console.log("PIONKI---------------------")
            var pawns = document.getElementsByClassName('pawn');
            while (pawns[0]) {
                pawns[0].parentNode.removeChild(pawns[0]);
            }

            result.game.data.forEach(player => {
                console.log(player.color, "---");
                player.pawns.forEach(pawn => {
                    let pawnDiv = document.createElement("div");
                    pawnDiv.classList.add("pawn", pawn.pos, pawn.pos[0]);
                    if (pawn.pos[1] === "b") {    //base
                    } else if (pawn.pos[1] === "f") { //field
                        let boardPosition = chinol.constants.boardPositions.find(pos => pos.name === pawn.pos.substr(1, 3));
                        pawnDiv.style.top = `${100 + boardPosition.top * 60}px`;
                        pawnDiv.style.left = `${650 + boardPosition.left * 60}px`;
                        console.log(boardPosition);
                    } else if (pawn.pos[1] === "g") { //goal

                    }
                    document.body.appendChild(pawnDiv);
                })
            })
        },
        selectPawn(result, pawn) {
            var hints = document.getElementsByClassName('hint');
            while (hints[0]) {
                hints[0].parentNode.removeChild(hints[0]);
            }
            console.log(result);
            console.log(pawn)
            let pawnPos = pawn.classList[1]
            console.log(pawnPos)
            if (pawn.classList.contains("selected")) {
                pawn.classList.remove("selected");
            } else {
                let selected = document.getElementsByClassName("selected");
                for (let i = 0; i < selected.length; i++) {
                    selected[i].classList.remove("selected");
                }
                pawn.classList.add("selected");
                let hint = document.createElement("div");
                hint.classList.add("hint");
                let boardPosition;
                if (pawnPos[1] == "b") {
                    let startIndex;
                    if (result.player === "red")
                        startIndex = 20;
                    else if (result.player === "blue")
                        startIndex = 30;
                    else if (result.player === "yellow")
                        startIndex = 0;
                    else if (result.player === "green")
                        startIndex = 10;
                    boardPosition = chinol.constants.boardPositions[startIndex];
                } else {
                    let index = ((parseInt(pawnPos.substr(2, 2)) + result.score - 1) > chinol.constants.boardPositions.length - 1) ? parseInt(pawnPos.substr(2, 2)) + result.score - 1 - chinol.constants.boardPositions.length : parseInt(pawnPos.substr(2, 2)) + result.score - 1;
                    boardPosition = chinol.constants.boardPositions[index];
                }
                console.log(boardPosition)
                hint.style.top = `${100 + boardPosition.top * 60}px`;
                hint.style.left = `${650 + boardPosition.left * 60}px`;
                document.body.appendChild(hint);
                hint.addEventListener("click", () => chinol.fetches.sendChoice(pawnPos, boardPosition).then(data => chinol.generators.generateBoard(data)));
            }
        },
        dieEvent() {
            console.log("losuj");
            //POST FETCH O LOSOWANIE
            chinol.fetches.rollDie().then((result) => {
                console.log(result)

                // document.getElementById("die").innerText = String(result.score);
                let die = document.getElementById("die");
                die.style.background = `url('${result.score}.png')`;
                const msg = new SpeechSynthesisUtterance();
                // msg.lang = "ja-jp";
                msg.text = String(result.score);
                window.speechSynthesis.speak(msg);

                let pawns = document.getElementsByClassName(result.player[0])
                console.log(result.player[0])
                console.log(pawns)
                for (let i = 0; i < pawns.length; i++) {
                    // let pawnPos = pawns[i].classList[1];
                    // let index = ((parseInt(pawnPos.substr(2, 2)) + result.score - 1) > boardPositions.length - 1) ? parseInt(pawnPos.substr(2, 2)) + result.score - 1 - boardPositions.length : parseInt(pawnPos.substr(2, 2)) + result.score - 1;

                    // if ((player.color !== "yellow" && player.lastField - index < 0) || (player.color === "yellow")) {
                    //     console.log("goal--------------!!")
                    // }

                    if ((pawns[i].classList[1][1] == "b" && (result.score == 1 || result.score == 6)) || pawns[i].classList[1][1] != "b") {
                        pawns[i].style.background = "black";
                        pawns[i].addEventListener("click", () => chinol.generators.selectPawn(result, pawns[i]));
                    }
                    //TODO zmnienna o bazie, celu
                    // pawns[i].addEventListener("click", () => selectPawn(result, pawns[i]));
                }
            })
        }

    }

    /////////////////////////////////////////////////////
    static constants = {
        boardPositions: [
            { top: 4, left: 0, name: "f01" },
            { top: 4, left: 1, name: "f02" },
            { top: 4, left: 2, name: "f03" },
            { top: 4, left: 3, name: "f04" },
            { top: 4, left: 4, name: "f05" },
            { top: 3, left: 4, name: "f06" },
            { top: 2, left: 4, name: "f07" },
            { top: 1, left: 4, name: "f08" },
            { top: 0, left: 4, name: "f09" },
            { top: 0, left: 5, name: "f10" },
            { top: 0, left: 6, name: "f11" },
            { top: 1, left: 6, name: "f12" },
            { top: 2, left: 6, name: "f13" },
            { top: 3, left: 6, name: "f14" },
            { top: 4, left: 6, name: "f15" },
            { top: 4, left: 7, name: "f16" },
            { top: 4, left: 8, name: "f17" },
            { top: 4, left: 9, name: "f18" },
            { top: 4, left: 10, name: "f19" },
            { top: 5, left: 10, name: "f20" },
            { top: 6, left: 10, name: "f21" },
            { top: 6, left: 9, name: "f22" },
            { top: 6, left: 8, name: "f23" },
            { top: 6, left: 7, name: "f24" },
            { top: 6, left: 6, name: "f25" },
            { top: 7, left: 6, name: "f26" },
            { top: 8, left: 6, name: "f27" },
            { top: 9, left: 6, name: "f28" },
            { top: 10, left: 6, name: "f29" },
            { top: 10, left: 5, name: "f30" },
            { top: 10, left: 4, name: "f31" },
            { top: 9, left: 4, name: "f32" },
            { top: 8, left: 4, name: "f33" },
            { top: 7, left: 4, name: "f34" },
            { top: 6, left: 4, name: "f35" },
            { top: 6, left: 3, name: "f36" },
            { top: 6, left: 2, name: "f37" },
            { top: 6, left: 1, name: "f38" },
            { top: 6, left: 0, name: "f39" },
            { top: 5, left: 0, name: "f40" },
        ],
        goalPositions: {
            red: [
                { top: 5, left: 9, name: "g01" },
                { top: 5, left: 8, name: "g02" },
                { top: 5, left: 7, name: "g03" },
                { top: 5, left: 6, name: "g04" },
            ],
            blue: [
                { top: 9, left: 5, name: "g01" },
                { top: 9, left: 5, name: "g02" },
                { top: 9, left: 5, name: "g03" },
                { top: 9, left: 5, name: "g04" },
            ], yellow: [
                { top: 5, left: 1, name: "g01" },
                { top: 5, left: 2, name: "g02" },
                { top: 5, left: 3, name: "g03" },
                { top: 5, left: 4, name: "g04" },
            ],
            green: [
                { top: 1, left: 5, name: "g01" },
                { top: 2, left: 5, name: "g02" },
                { top: 3, left: 5, name: "g03" },
                { top: 4, left: 5, name: "g04" },
            ]
        }
    }
}