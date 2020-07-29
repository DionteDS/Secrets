require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy
const findOrCreate = require("mongoose-findorcreate");

// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");

// hashing password
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const app = express();

// log API_KEY
// console.log(process.env.API_KEY);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

// const userSchema = new mongoose.Schema({
//     email: String,
//     password: String
// });

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// encrypt the password field from the userSchema

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
 
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
      
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res) {
    res.render("home");
});

// Grab the user profile
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);


app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.get("/secrets", function(req, res) {
    // Look throught database and find all secrets that have been submitted.
    // Look through all the users in the collection
    // check the secret field and look at the users secret field that is not equal to null
    User.find({"secret": {$ne: null}}, function(err, foundUsers) {
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", {userWithSecrets: foundUsers});
            }
        }
    });
});

// Using passport-local-mongoose

app.post("/register", function(req, res) {

    User.register({username: req.body.username}, req.body.password, function(err, user) {

        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            });
        }

    });

});

app.get("/submit", function(req, res) {
    // Check if user is loged in
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("login");
    }
});

app.get("/logout", function(req, res) {
    // end user session
    req.logout();
    res.redirect("/");
});

// Use passport login function

app.post("/login", function(req, res) {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            });
        }
    });

});

app.post("/submit", function(req, res) {
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function() {
                    res.redirect("/secrets");
                });
            }
        }
    });
});

// app.post("/register", function(req, res) {


//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//         // Store hash in your password DB.
//         const newUser = new User({
//             email: req.body.username,
//             password: hash
//         });

//         newUser.save(function(err) {
//             if (err) {
//                 console.log(err);
//             } else {
//                 res.render("secrets");
//             }
//         });

//     });


//     //md5 for hash and no md5 for encrypt
//     // const newUser = new User({
//     //     email: req.body.username,
//     //     password: md5(req.body.password)
//     // });

//     // when we save mongoose will enceypt our password field

//     // newUser.save(function(err) {
//     //     if (err) {
//     //         console.log(err);
//     //     } else {
//     //         res.render("secrets");
//     //     }
//     // });

// });

// app.post("/login", function(req, res) {

//     const username = req.body.username;
//     const password = req.body.password

    

//     // Search for a user in the database that matches the username const
//     // Also mongoose will decrypt the password field when we try to find a user

//     User.findOne({email: username}, function(err, foundUser) {
//         if (err) {
//             console.log(err);
//         } else {
//             // Check if that user exist.
//             if (foundUser) {
//                 // Load hash from your password DB.
//                 bcrypt.compare(password, foundUser.password, function(err, result) {
//                     // result == true
//                     if (result === true) {
//                         res.render("secrets");
//                     }

//                 });
//                 // Then check if that user has a password that matches the password const that was typed in
//                 // from the login page.
//                 // if (foundUser.password === password) {
//                 //     res.render("secrets");
//                 // }
//             }
//         }
//     });

// });


app.listen(3000, function() {
    console.log("Server started on port 3000");
});