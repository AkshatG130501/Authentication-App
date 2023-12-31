require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');  

const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret:"ThisistheSecret.",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://guptaakshat:OWvnadsPjXbAiPlK@cluster0.y6p8hfq.mongodb.net/authDB?retryWrites=true&w=majority",{useNewUrlParser:true});
// mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema({
    email : {
        type : String
    },
    password : String,
    googleId: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("Authentic",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
    done(null,user.id);
});

passport.deserializeUser(async function(id, done) {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL:"http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb){
        User.findOrCreate({googleId:profile.id}, function(err,user){
            return cb(err,user);
        });
    }
));

app.get('/',(req,res)=>{
    res.render("home");
});

app.get('/auth/google',
    passport.authenticate('google',{scope:['profile']})
);

app.get("/auth/google/secrets",
    passport.authenticate('google',{failureRedirect:"/login"}),
    function(req,res){
        res.redirect("/secrets");
});

app.get('/login',(req,res)=>{
    res.render("login");
});

app.get('/register',(req,res)=>{
    res.render("register");
});

app.get("/secrets",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("secrets");
    }else{
        res.redirect("/login"); 
    }
});

app.get("/logout", (req, res) => {
    req.logout(req.user, err => {
      if(err) return next(err);
      res.redirect("/");
    });
});

app.post("/register",(req,res)=>{
    User.register({username : req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect('/register');
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", (req, res) => {
    const user = new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
    console.log("Server Running on port 3000");
});