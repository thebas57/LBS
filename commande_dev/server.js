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
    if(req.query.page != null && req.query.page > 0){
        page = req.query.page
    }
    let size = 10
    if(req.query.size != null && req.query.size > 0){
        size = req.query.size
    }

    let status = null
    if(req.query.s > 0 && req.query.s < 5){
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
                    if(status != null){
                        if(lm.status == status){
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
                    }else{
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


                let data = {};
                data.type = "collection";
                data.count = count;
                data.size = commandList.slice(startIndex,endIndex).length;
                data.commands = commandList.slice(startIndex,endIndex);

                res.status(200).send(JSON.stringify(data));
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
});

// ------------------- POST UNE COMMANDE ---------------
app.post("/commandes", (req,res) => {
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
  let query = `INSERT INTO commande (id,livraison, nom, mail, created_at) VALUES  ("${id}","${dateTest}", "${nom}","${mail}","${dateTest}" )`;

  if (nom.trim()=="" || mail.trim()=="" ) {
    console.log("pb insertion");
    res.status(404).json({"type":"error", "error":404, "message":"Tout les champs ne sont pas remplis / Il manque des infos " });
  }
  else {
    db.query(query, (err,result) => {

    if (err) {
      console.error(err);
      res.status(500).send(JSON.stringify(err)); //erreur serveur
    }
    else {
      console.log("La commande a été créer");
      res.status(201).send(JSON.stringify({result: result, commande: req.body}));// renvoie le json dans le body je crois
    }  
  });
  }

})

// ----------------- Modif (PUT) Commande ----------------
app.put("/commandes/:id", (req,res) => {
  res.type("application/json;charset=utf-8");

  const commande = JSON.stringify(req.body);
  const objCommande = JSON.parse(commande);

  let idC = req.params.id;
  let dateTest = toMysqlFormat(new Date());
  let livraison = objCommande.livraison;
  let nom = objCommande.nom;
  let mail = objCommande.mail;

  let query = `UPDATE commande SET livraison="${dateTest}", nom="${nom}",mail="${mail}",updated_at="${dateTest}"
  WHERE id= "${idC}"`; // query database to update une commande

  if (nom.trim()=="" || mail.trim()=="") {
    console.log("Pb modification");
    res.status(404).json({"type":"error", "error":404, "message":"Tout les champs ne sont pas remplis / Il manque des infos " });
  }
  else {
  db.query(query, (err,result) => {
    if (err) {
      console.error(err);
      res.status(404).send(err);
    }
    if (result.affectedRows==0) {
      console.log("La commande " + req.params.id + " est inexistante");
      res.status(404).json({"type":"error", "error":404, "message":"Ressource non disponible : " + req._parsedUrl.pathname });
    }
    else {
      console.log("La commande " + req.params.id + "a été modifié");
      console.log(result);
      res.status(201).send(JSON.stringify({result: result, commande: req.body}));// renvoie le json dans le body je crois
    }
  });
}

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

// ------------------ PUT ------------------
app.put("*", (req,res) => {
  res.status(400).json({"type":"error", "error":400, "message":"Ressource non disponible : " + req._parsedUrl.pathname });
  res.status(500).json({"type":"error", "error":500, "message":"Pb serveur : " + req._parsedUrl.pathname });
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
