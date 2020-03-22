"use strict";

const express = require("express");
const mysql = require("mysql");
const bodyParser = require('body-parser');
const uuid = require('uuid');
const bcrypt = require('bcrypt');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
let config = require('./config');
let middleware = require('./middleware');

// Constants
const PORT = 8080;
const HOST = "0.0.0.0";

// App
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
//twoDigits et toMysqlFormat son les fonctions pour convertir les dates dans le format accepter par MySQL
function twoDigits(d) {
    if (0 <= d && d < 10) return "0" + d.toString();
    if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
    return d.toString();
}

function toMysqlFormat(date) {
    return date.getUTCFullYear() + "-" + twoDigits(1 + date.getUTCMonth()) + "-" + twoDigits(date.getUTCDate()) + " " + twoDigits(date.getUTCHours()) + ":" + twoDigits(date.getUTCMinutes()) + ":" + twoDigits(date.getUTCSeconds());
}

app.get("/", (req, res) => {
    res.send("Commande API\n");
});

// -------------------GET -----------------
// -------------------- Pour les Commandes --------------------

//-----pagination taille et filtre dans la meme fonction-------

app.get("/commandes", (req, res) => {
    let page = 1
    if (req.query.page != null && req.query.page > 0) {
        page = req.query.page
    }
    let size = 10
    if (req.query.size != null && req.query.size > 0) {
        size = req.query.size
    }

    let status = null
    if (req.query.s > 0 && req.query.s < 5) {
        status = req.query.s
    }

    let startIndex = (page - 1) * size
    let endIndex = page * size
    let count = 0

    res.type("application/json;charset=utf-8");
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    let query = "SELECT * FROM `commande` ORDER BY id ASC"; // query database to get all the players
    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
        } else {
            //tmp = new ({ type: 200, msg: 'SUCESS', error: 'SUCESS' });
            let commandList = [];
            let command = {};
            result.forEach(lm => {
                if (status != null) {
                    if (lm.status == status) {
                        command.command = {
                            id: lm.id,
                            nom: lm.nom,
                            created_at: lm.created_at,
                            livraison: lm.livraison,
                            status: lm.status
                        };

                        command.links = { self: { href: `/commandes/${lm.id}` } };
                        commandList.push(command);
                        command = {};
                        count++
                    }
                } else {
                    command.command = {
                        id: lm.id,
                        nom: lm.nom,
                        created_at: lm.created_at,
                        livraison: lm.livraison,
                        status: lm.status
                    };

                    command.links = { self: { href: `/commandes/${lm.id}` } };
                    commandList.push(command);
                    command = {};
                    count++
                }
            });


            let nbpage = Math.ceil(count / size)
            if (page > nbpage) {
                page = nbpage
                startIndex = (page - 1) * size
                endIndex = page * size
            }

            let data = {};
            data.type = "collection";
            data.count = count;
            data.size = commandList.slice(startIndex, endIndex).length;

            if (startIndex > 0) {
                let previous = "localhost:19080/commandes?page=" + parseInt(parseInt(page) - 1) + "&size=" + size;
                if (status != null) {
                    previous += "&s=" + status;
                }
                data.previous = previous;
            }

            if (endIndex < count) {
                let next = "localhost:19080/commandes?page=" + parseInt(parseInt(page) + 1) + "&size=" + size;
                if (status != null) {
                    next += "&s=" + status;
                }
                data.next = next;

            }


            data.commands = commandList.slice(startIndex, endIndex);

            res.status(200).send(JSON.stringify(data));
        }

    });

});


// ------------------- Pour une commande --------------
app.get("/commandes/:id", async(req, res) => {
    res.type("application/json;charset=utf-8");

    let idC = req.params.id;
    let token = null;
    
    if (req.query.token != null){
        token = req.query.token;
    }else{
        token = req.headers['x-lbs-token'];
    }

    let data = {};
    let links = {};
    data.type = "ressouce";
    links.self = `/commandes/"${ idC }"`; 
    links.items = `/commandes/"${ idC }"/items`;
    data.links = links;
    let donne = {};
    let items = {};
    
        if(!bcrypt.compareSync(idC, token)){
            res.status(404).json({ "type": "error", "error": 404, "message": "le token est invalide "});
        }else{

    let query = `SELECT * FROM commande INNER JOIN item on commande.id=item.command_id WHERE commande.id= "${idC}"  `; // query database to get all the players



    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
            res.status(404).send(err);
        }
        if (result.length <= 0) {
            console.log(req.params.id + " Inexistant");
            res.status(404).json({ "type": "error", "error": 404, "message": "Ressource non disponible : " + req._parsedUrl.pathname });
        } else {
            // console.log(resultat[0]);
            donne = {
                "id": result[0].id,
                "created_at": result[0].created_at,
                "livraison": result[0].livraison,
                "nom": result[0].nom,
                "mail": result[0].mail,
                "montant": result[0].montant
            };
            for (let i = 0; i < result.length; i++) {
                items[i] = { "uri": result[i].uri, "libelle": result[i].libelle, "tarif": result[i].tarif, "quantite": result[i].quantite };
            }
            donne.items = items
            data.commands = donne;
            
            res.status(200).send(JSON.stringify(data));

        }
    });
    }

});

// ------------------- POST UNE COMMANDE ---------------
app.post("/commandes", (req, res) => {
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    // Json en objet 

    const commande = JSON.stringify(req.body);
    const objCommande = JSON.parse(commande);
    let livraison = objCommande.livraison;
    // let dateTest = "2019-11-08 13:45:55"
    let dateTest = toMysqlFormat(new Date());
    let nom = objCommande.nom;
    let mail = objCommande.mail;
    let id = uuid();
    let hash = bcrypt.hashSync(id, 10);
    let montant = 0;
    let tabUri = objCommande.items;

    const promises = [];

    tabUri.forEach((items) => {
        let uri = items.uri;

        const a_promise = axios.get('http://catalogue:8080' + uri)
            .then(function(response) {
                return response.data[0].prix * items.q;
            })
            .catch(err => {
                throw new Error(err)
            });

        promises.push(a_promise);

    });

    Promise.all(promises).then(result => {
        result.forEach(un_montant => {
            montant += un_montant;
        })
        let query = `INSERT INTO commande (id,livraison, nom, mail, created_at, token,montant) VALUES  ("${id}","${dateTest}", "${nom}","${mail}","${dateTest}" ,"${hash}","${montant}")`;

        let libelleSandwich = "";
        let prixSandwich = 0;

        if (nom.trim() == "" || mail.trim() == "") {
            console.log("pb insertion");
            res.status(404).json({ "type": "error", "error": 404, "message": "Tout les champs ne sont pas remplis / Il manque des infos " });
        } else {
            db.query(query, (err, result) => {

                if (err) {
                    console.error(err);
                    res.status(500).send(JSON.stringify(err)); //erreur serveur
                } else {
                    // insertion item pour chaque élément
                    let c = 0;
                    tabUri.forEach(async items => {

                        let uri = items.uri;
                        // --------------------------- IL FAUT FAIRE DES PROMESSE SINON ÇA MARCHE PAS !!!!! ---------------------------
                        const b_promise = axios.get('http://catalogue:8080' + uri)
                            .then(function(response) {
                                prixSandwich = response.data[0].prix;
                                console.log(prixSandwich);
                                libelleSandwich = response.data[0].nom;
                            })
                            .catch(err => {
                                throw new Error(err)
                            });

                            b_promise.then(result => {
                        let quantite = items.q;
                        let queryItem = `INSERT INTO item (uri,libelle,tarif,quantite,command_id) VALUES ("${uri}","${libelleSandwich}","${prixSandwich}","${quantite}","${id}")`
                        db.query(queryItem, (err, result) => {
                            if (err) {
                                console.error(err);
                                res.status(500).send(JSON.stringify(err)); //erreur serveur
                            } else {
                                c = c + 1;

                                if (tabUri.length == c) {
                                    res.status(201).send(JSON.stringify({ commande: req.body,montant:montant, id: id, token: hash })); // renvoie le json dans le body je crois
                                }

                            }
                        })
                            })


                    });
                }
            });

        }


    }).catch(err => {
        throw new Error(err);
    })



});

// ----------------- Modif (PUT) Commande ----------------
app.put("/commandes/:id", (req, res) => {
    res.type("application/json;charset=utf-8");

    const commande = JSON.stringify(req.body);
    const objCommande = JSON.parse(commande);

    let idC = req.params.id;
    let dateTest = toMysqlFormat(new Date());
    let livraison = objCommande.livraison;
    let nom = objCommande.nom;
    let mail = objCommande.mail;

    let query = `UPDATE commande SET livraison = "${dateTest}", nom = "${nom}", mail = "${mail}", updated_at = "${dateTest}"
                 WHERE id = "${idC}"`; // query database to update une commande

    if (nom.trim() == "" || mail.trim() == "") {
        console.log("Pb modification");
        res.status(404).json({ "type": "error", "error": 404, "message": "Tout les champs ne sont pas remplis / Il manque des infos " });
    } else {
        db.query(query, (err, result) => {
            if (err) {
                console.error(err);
                res.status(404).send(err);
            }
            if (result.affectedRows == 0) {
                console.log("La commande " + req.params.id + " est inexistante");
                res.status(404).json({ "type": "error", "error": 404, "message": "Ressource non disponible : " + req._parsedUrl.pathname });
            } else {
                console.log("La commande " + req.params.id + "a été modifié");

                console.log(result);
                res.status(201).send(JSON.stringify({ result: result, commande: req.body })); // renvoie le json dans le body je crois
            }
        });
    }

})


// ------------------- GET UN CLIENT ---------------
app.get("/clients/:id", async(req, res) => {



    let query = `SELECT * FROM client WHERE client.id= "${idC}"`;


    db.query(query, (err, result) => {
        if (err) {
            console.error(err);
            res.status(404).send(err);
        }
        if (result.length <= 0) {
            console.log(req.params.id + " Inexistant");
            res.status(404).json({ "type": "error", "error": 404, "message": "Ressource non disponible : " + req._parsedUrl.pathname });
        } else {

            donne = {
                "id": result[0].id,
                "nom_client": result[0].nom_client,
                "mail_client": result[0].mail_client,
                "passwd": result[0].passwd,
                "cumuls": result[0].cumuls,
            };


            console.log(donne);
            res.status(200).send(JSON.stringify(donne));

        }
    });
});

// ------------------- POST UN CLIENT ---------------
app.post("/clients", async(req, res) => {
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    // Json en objet

    const client = JSON.stringify(req.body);
    const objClient = JSON.parse(client);
    let dateTest = toMysqlFormat(new Date());
    let nom_client = objClient.nom_client;
    let mail_client = objClient.mail_client;
    let passwd = bcrypt.hash(objClient.passwd);
    let cumuls = objClient.cumul_achats;



    let query = `INSERT INTO client (nom_client, mail_client,passwd,cumul_achats, created_at, updated_at) VALUES  ("${nom_client}", "${mail_client}","${passwd}","${cumuls}" ,"${dateTest}","${dateTest}")`;
    db.query(query, (err, result) => {

        if (err) {
            console.error(err);
            res.status(403).json({ "message": ""});
        } else {
            

            let token = jwt.sign({}, config.secret , { algorithm: 'HS256' });
            console.log(token);
            res.status(201).send({ token: token });
        }
    });



});

// ------------------- AUTHENTIFICATION D'UN CLIENT ---------------
app.post("/connexion", async(req, res) => {
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    // Json en objet

    let tokenauthorization = JSON.stringify(req.headers.authorization.split(' ')[1]);

    if(!tokenauthorization){
        res.status(401).json({ "message": "no authorization header present"});
    }

    jwt.verify(tokenauthorization,config.secret, {algorithm: "H256"}, (err) => {
        if(err){
            req.status(500).json({error: "Not Authorized"});
        }
    })

    const client = JSON.stringify(req.body);
    const objClient = JSON.parse(client);
    let nom_client = objClient.nom_client;
    let mail_client = objClient.mail_client;
    let passwd = bcrypt.hash(objClient.passwd);

    let query = `SELECT * FROM client WHERE mail_client = "${mail_client}"`;

    db.query(query, (err, result) => {

        if (err) {
            console.error(err);
            res.status(401).json({ "message": "no authorization header present"});
        } else {

            if(!bcrypt.compareSync(result[0].passwd, passwd)){
                res.status(401).json({ "message": "bad password"});
            }
            let token = jwt.sign({}, config.secret , { algorithm: 'HS256' });
            console.log(token);
            res.status(201).send({ token: token });
        }
    });



});
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

// ------------------ PUT ------------------
app.put("*", (req, res) => {
    res.status(400).json({ "type": "error", "error": 400, "message": "Ressource non disponible : " + req._parsedUrl.pathname });
    res.status(500).json({ "type": "error", "error": 500, "message": "Pb serveur : " + req._parsedUrl.pathname });
});

app.listen(PORT, HOST);
console.log(`Commande API Running on http: //${HOST}:${PORT}`);

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
})