require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

// log API_KEY
// console.log(process.env.API_KEY);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});



// encrypt the password field from the userSchema

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = mongoose.model("User", userSchema);


app.get("/", function(req, res) {
    res.render("home");
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.post("/register", function(req, res) {


    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        // Store hash in your password DB.
        const newUser = new User({
            email: req.body.username,
            password: hash
        });

        newUser.save(function(err) {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        });

    });


    //md5 for hash and no md5 for encrypt
    // const newUser = new User({
    //     email: req.body.username,
    //     password: md5(req.body.password)
    // });

    // when we save mongoose will enceypt our password field

    // newUser.save(function(err) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         res.render("secrets");
    //     }
    // });

});

app.post("/login", function(req, res) {

    const username = req.body.username;
    const password = req.body.password

    

    // Search for a user in the database that matches the username const
    // Also mongoose will decrypt the password field when we try to find a user

    User.findOne({email: username}, function(err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            // Check if that user exist.
            if (foundUser) {
                // Load hash from your password DB.
                bcrypt.compare(password, foundUser.password, function(err, result) {
                    // result == true
                    if (result === true) {
                        res.render("secrets");
                    }

                });
                // Then check if that user has a password that matches the password const that was typed in
                // from the login page.
                // if (foundUser.password === password) {
                //     res.render("secrets");
                // }
            }
        }
    });

});


app.listen(3000, function() {
    console.log("Server started on port 3000");
});