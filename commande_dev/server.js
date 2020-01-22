"use strict";

const express = require("express");
const mysql = require("mysql");
const bodyParser = require('body-parser');
const uuid = require('uuid');

// Constants
const PORT = 8080;
const HOST = "0.0.0.0";

// App
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());


app.get("/", (req, res) => {
    res.send("Commande API\n");
});

// -------------------GET -----------------
// -------------------- Pour les Commandes --------------------
app.get("/commandes", (req, res) => {
    res.type("application/json;charset=utf-8");
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    let query = "SELECT * FROM `commande` ORDER BY id ASC"; // query database to get all the players
    let tmp = {};
    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
        } else {
            //tmp = new ({ type: 200, msg: 'SUCESS', error: 'SUCESS' });
            let commandList = [];
            let command = {};
            result.forEach(lm => {
                command.command = {
                    id: lm.id,
                    nom: lm.nom,
                    created_at: lm.created_at,
                    livraison: lm.livraison,
                    status: lm.status
                };
                command.links = { self: { href: `/commandes/${lm.id}` } };
                commandList.push(command);
            });

            let data = {};
            data.type = "collection";
            data.count = result.length;
            data.commands = commandList;
            res.status(200).send(JSON.stringify(data));
            console.log("Commandes trouvées");

        }

    });
});

// ------------------- Pour une commande --------------
app.get("/commandes/:id", (req, res) => {
    res.type("application/json;charset=utf-8");

    let idC = req.params.id;

    let query = `SELECT * FROM commande WHERE id= "${idC}" ORDER BY id ASC`; // query database to get all the players

    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
            res.status(404).send(err);
        }
        if (result.length <= 0) {
            console.log(req.params.id + " Inexistant");
            res.status(404).json({ "type": "error", "error": 404, "message": "Ressource non disponible : " + req._parsedUrl.pathname });
        } else {
            //res.status(200).send(JSON.stringify(result));
            console.log("La commande " + req.params.id + "a été trouvé");
            res.status(200).send(JSON.stringify(result));
        }
    });
})

// ------------------- POST UNE COMMANDE ---------------
app.post("/commandes", (req, res) => {
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    // Json en objet 

    const commande = JSON.stringify(req.body);
    const objCommande = JSON.parse(commande);
    let livraison = objCommande.livraison;
    let dateTest = '2019-11-08 13:45:55';
    let nom = objCommande.nom;
    let mail = objCommande.mail;
    let id = uuid();
    let query = `INSERT INTO commande (id,livraison, nom, mail, created_at) VALUES  ("${id}","${dateTest}", "${nom}","${mail}","${dateTest}" )`;

    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send(JSON.stringify(err)); //erreur serveur
        }
        console.log("La commande a été créer");
        res.status(201).send(JSON.stringify({ result: result, commande: req.body })); // renvoie le json dans le body je crois

    });

})

// ----------------- Modif (PUT) Commande ----------------
app.put("/commandes/:id", (req, res) => {
    console.log(req.params.id); // your JSON
    res.status(200).header({ location: "POST" + req.route.path });
    //res.json(req.body);    // echo the result back

})


// ------------------ Gestion erreur chemin ------------------
// ------------------- POST -----------------------
app.post("/commandes/:id", (req, res) => {
    res.status(405).json({ "type": "error", "error": 405, "message": "Pb PUT : " + req._parsedUrl.pathname });
});

// ------------------ GET ------------------
app.get("*", (req, res) => {
    res.status(400).json({ "type": "error", "error": 400, "message": "Ressource non disponible : " + req._parsedUrl.pathname });
    res.status(500).json({ "type": "error", "error": 500, "message": "Pb serveur : " + req._parsedUrl.pathname });
});



app.listen(PORT, HOST);
console.log(`Commande API Running on http://${HOST}:${PORT}`);

const db = mysql.createConnection({
    host: "mysql.commande",
    user: "command_lbs",
    password: "command_lbs",
    database: "command_lbs"
});

// connexion à la bdd
db.connect(err => {
    if (err) {
        throw err;
    }
    console.log("Connected to database");
});