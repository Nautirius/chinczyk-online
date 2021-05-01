var express = require("express");
var app = express();
var path = require("path");
const PORT = 3000;
var session = require('express-session');
const uuid = require('uuid').v4
var Datastore = require('nedb')
// var bodyParser = require("body-parser");

var database = new Datastore({
    filename: 'static/db/database.db',
    autoload: true
});

const colorArray = ["red", "blue", "green", "yellow"];
let sessionArray = [];

app.use(session({
    genid: (req) => {
        console.log('Inside the session middleware')
        console.log(req.sessionID)
        return uuid() // use UUIDs for session IDs
    },
    secret: "fubuki",
    resave: false,
    saveUninitialized: true
}));
app.use(express.urlencoded({ extended: true })); //express.
app.use(express.json());
app.use(express.static('static/js'))
app.use(express.static('static/css'))
app.use(express.static('static/gfx'))

app.get("/", function (req, res) {
    console.log('session: ' + req.sessionID);
    let room = sessionArray.find(session => session.id == req.sessionID)
    console.log(room)
    if (room != undefined) {
        database.findOne({ _id: room.room }, function (err, doc) {
            if (doc.status === "waiting") {
                res.sendFile(path.join(__dirname + "/static/lobby.html"));
            } else if (doc.status === "ongoing") {
                res.sendFile(path.join(__dirname + "/static/game.html"));
            }
        })
    } else {
        res.sendFile(path.join(__dirname + "/static/index.html"));
    }
})
app.post("/login", function (req, res) {
    if (req.body.nick != "") {
        let room = sessionArray.find(session => session.id == req.sessionID)
        if (room == undefined) {
            console.log(req.body);
            database.find({}, function (err, docs) {
                let aviableRoom = Object.keys(docs).find(room => docs[room].status === "waiting");
                if (aviableRoom != undefined) {
                    console.log(docs[aviableRoom]);
                    let room = docs[aviableRoom];
                    let playerColor = colorArray[Object.keys(room.data).length];
                    let lastField = "";
                    if (playerColor === "red") {
                        lastField = 20;
                    } else if (playerColor === "blue") {
                        lastField = 30;
                    } else if (playerColor === "yellow") {
                        lastField = 40;
                    } else if (playerColor === "green") {
                        lastField = 10;
                    }
                    room.data.push({
                        id: req.sessionID,
                        nick: req.body.nick,
                        color: playerColor,   //TODO losowanie koloru?
                        joined: new Date,
                        last_active: "ostatni ruch",
                        status: "waiting",
                        turn: room.data.length + 1,
                        pawns: [
                            { name: "01", pos: `${playerColor[0]}b01` },  //TODO kolor na podstawie losu
                            { name: "02", pos: `${playerColor[0]}b02` },
                            { name: "03", pos: `${playerColor[0]}b03` },
                            { name: "04", pos: `${playerColor[0]}b04` },
                        ],
                        lastField: lastField,
                    });
                    console.log(room);
                    database.update({ _id: room._id }, { $set: { data: room.data, status: (Object.keys(room.data).length == 4) ? "ready" : "waiting" } },
                        {}, function (err, numReplaced) { console.log("docs updated: ", numReplaced) });
                    database.loadDatabase();
                    sessionArray.push({ id: req.sessionID, room: room._id });
                } else {
                    let room = {
                        status: "waiting",
                        data: [
                            {
                                id: req.sessionID,
                                nick: req.body.nick,
                                color: "red",
                                joined: new Date,
                                last_active: "ostatni ruch",
                                status: "waiting",
                                turn: 1,
                                pawns: [
                                    { name: "01", pos: `rb01` },  //TODO kolor na podstawie losu {name:"1",pos:"rb01"}
                                    { name: "02", pos: `rb02` },
                                    { name: "03", pos: `rb03` },
                                    { name: "04", pos: `rb04` },
                                ],
                                lastField: 20,
                            }
                        ],
                        currentTurn: 1,
                        lastRoll: 6
                    }
                    database.insert(room, function (err, newDoc) {
                        console.log("id dokumentu: " + newDoc._id, "DODANO: " + new Date().getMilliseconds())
                        if (err) { console.log(err) }
                        sessionArray.push({ id: req.sessionID, room: newDoc._id });
                    });
                }
            });
            console.log('session: ' + req.sessionID)
            res.sendFile(path.join(__dirname + "/static/lobby.html"));
        } else {
            res.sendFile(path.join(__dirname + "/static/lobby.html"));
        }
    } else {
        res.sendFile(path.join(__dirname + "/static/index.html"));
    }
})
app.get("/data", function (req, res) {
    let room = sessionArray.find(session => session.id == req.sessionID)
    database.findOne({ _id: room.room }, function (err, doc) {
        let player = doc.data.find(player => player.id === req.sessionID && player.turn === doc.currentTurn);
        if (player != undefined && !player.status != "rolled") {
            player.generated = true;
            database.update({ _id: doc._id }, { $set: { data: doc.data } }, {}, function (err, numReplaced) { console.log("docs updated: ", numReplaced) });
            database.loadDatabase();
            res.end(JSON.stringify({ game: doc, playerId: req.sessionID }));
        } else {
            res.end(JSON.stringify({ game: doc, playerId: req.sessionID }));
        }
    });
})
app.post("/changeStatus", function (req, res) {
    let room = sessionArray.find(session => session.id == req.sessionID)
    database.findOne({ _id: room.room }, function (err, doc) {
        let allPlayersReady = true;
        doc.data.forEach(player => {
            if (player.id === req.sessionID) {
                player.status = req.body.status ? "ready" : "waiting";
                console.log(player)
            }
            if (player.status === "waiting") {
                allPlayersReady = false;
            }
        });
        console.log(doc.data)
        database.update({ _id: doc._id }, { $set: { data: doc.data, status: allPlayersReady && Object.keys(doc.data).length > 1 ? "ready" : "waiting" } },
            {}, function (err, numReplaced) { console.log("docs updated: ", numReplaced) });
        database.loadDatabase();
        res.end(JSON.stringify({ game: doc, playerId: req.sessionID }));
    })
})
app.get("/loadGame", function (req, res) {
    console.log("halo")
    let room = sessionArray.find(session => session.id == req.sessionID)
    if (room != undefined) {
        database.findOne({ _id: room.room }, function (err, doc) {
            if (doc.status === "ready") {
                console.log("elo")
                let allPlayersLoaded = true;
                doc.data.forEach(player => {
                    if (player.id === req.sessionID) {
                        player.status = "ingame";
                    }
                    if (player.status === "ready") {
                        allPlayersLoaded = false;
                    }
                });
                database.update({ _id: doc._id }, { $set: { data: doc.data, status: allPlayersLoaded ? "ongoing" : "ready" } },
                    {}, function (err, numReplaced) { console.log("docs updated: ", numReplaced) });
                database.loadDatabase();
                res.sendFile(path.join(__dirname + "/static/game.html"));
            } else if (doc.status === "ongoing") {
                res.sendFile(path.join(__dirname + "/static/game.html"));
            }
        });
    } else {
        console.log("nie")
        res.end();
    }
})
app.get("/rollDie", function (req, res) {
    let room = sessionArray.find(session => session.id == req.sessionID)
    database.findOne({ _id: room.room }, function (err, doc) {
        let player = doc.data.find(player => player.id === req.sessionID && player.turn === doc.currentTurn)
        if (player != undefined) {
            if (player.status !== "rolled") {
                let dieScore = Math.floor(Math.random() * (6 - 1 + 1)) + 1;
                console.log("score: ", dieScore);
                if (dieScore !== 1 && dieScore !== 6) {
                    let possibleMove = player.pawns.find(pawn => pawn.pos[1] !== "b")
                    if (possibleMove == undefined) {
                        doc.currentTurn === doc.data.length ? doc.currentTurn = 1 : doc.currentTurn++;
                        player.status = "waiting";
                    } else {
                        player.status = "rolled";
                    }
                } else {
                    player.status = "rolled";
                }
                database.update({ _id: doc._id }, { $set: { data: doc.data, currentTurn: doc.currentTurn, lastRoll: dieScore } }, {}, function (err, numReplaced) { console.log("docs updated: ", numReplaced) });
                database.loadDatabase();
                res.end(JSON.stringify({ score: dieScore, player: player.color }));
            } else {
                if (doc.lastRoll !== 1 && doc.lastRoll !== 6) {
                    let possibleMove = player.pawns.find(pawn => pawn.pos[1] !== "b")
                    if (possibleMove == undefined) {
                        doc.currentTurn === doc.data.length ? doc.currentTurn = 1 : doc.currentTurn++;
                        player.status = "waiting";
                    } else {
                        player.status = "rolled";
                    }
                } else {
                    player.status = "rolled";
                }
                database.update({ _id: doc._id }, { $set: { data: doc.data, currentTurn: doc.currentTurn } }, {}, function (err, numReplaced) { console.log("docs updated: ", numReplaced) });
                database.loadDatabase();
                res.end(JSON.stringify({ score: doc.lastRoll, player: player.color }));
            }
        } else {
            res.end();
        }
    })
})
app.post("/movePawn", function (req, res) {
    let room = sessionArray.find(session => session.id == req.sessionID)
    database.findOne({ _id: room.room }, function (err, doc) {
        let player = doc.data.find(player => player.id === req.sessionID && player.turn === doc.currentTurn)
        if (player != undefined) {
            console.log(req.body);

            let selectedPawn = player.pawns.findIndex(pawn => pawn.pos === req.body.pawn);
            console.log("selected pawn: ", player.pawns[selectedPawn])
            if (req.body.pawn[1] === "b" && (doc.lastRoll === 1 || doc.lastRoll === 6)) {
                console.log("start--------")
                let newPos = boardPositions.findIndex(pos => pos.top === req.body.choice.top && pos.left === req.body.choice.left)
                player.pawns[selectedPawn].pos = player.pawns[selectedPawn].pos[0] + boardPositions[newPos].name;
                doc.data.forEach(othPlayer => {
                    if (othPlayer != player) {
                        othPlayer.pawns.forEach(pawn => {
                            if (pawn.pos.substr(1, 3) === boardPositions[newPos].name) {
                                console.log("zbicie-------")
                                pawn.pos = othPlayer.color[0] + "b" + pawn.name;
                            }
                        })
                    }
                })
            } else {
                let currentPos = boardPositions.findIndex(pos => pos.name === player.pawns[selectedPawn].pos.substr(1, 3))
                let newPos = boardPositions.findIndex(pos => pos.top === req.body.choice.top && pos.left === req.body.choice.left)
                console.log("szukaj: ", currentPos, newPos)
                // if (newPos - currentPos === doc.lastRoll) {
                console.log("zamaiana")
                // player.pawns[selectedPawn] = { p: player.color[0] + boardPositions[newPos].name };
                player.pawns[selectedPawn].pos = player.pawns[selectedPawn].pos[0] + boardPositions[newPos].name;

                doc.data.forEach(othPlayer => {
                    if (othPlayer != player) {
                        othPlayer.pawns.forEach(pawn => {
                            if (pawn.pos.substr(1, 3) === boardPositions[newPos].name) {
                                console.log("zbicie-------")
                                pawn.pos = othPlayer.color[0] + "b" + pawn.name;
                            }
                        })
                    }
                })
                console.log(player.pawns[selectedPawn])
                // }
            }
            //TODO zmiana gracza po ustawieniu pionka
            if (doc.lastRoll !== 6) {
                doc.currentTurn === doc.data.length ? doc.currentTurn = 1 : doc.currentTurn++;
            }
            player.status = "waiting";

            database.update({ _id: doc._id }, { $set: { data: doc.data, currentTurn: doc.currentTurn } }, {}, function (err, numReplaced) { console.log("docs updated: ", numReplaced) });
            database.loadDatabase();
            res.end(JSON.stringify({ game: doc, playerId: req.sessionID }));
        } else {
            res.end();
        }
    })
})
app.get("*", function (req, res) {
    res.end("404 - nie ma takiej strony");
})

app.listen(PORT, function () {
    console.log("start serwera na porcie " + PORT)
})


const boardPositions = [
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
]
const goalPositions = {
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