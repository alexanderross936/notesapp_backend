const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt')
const config = require('config')
const { check, validationResult } = require("express-validator");
var mongoose = require('mongoose');
var connectDB = require('./config/db')
// var mongoDB = 'mongodb://127.0.0.1/one_database';
const jwt = require('jsonwebtoken');
require('./models/User')
const auth = require('./auth')
const User = require('./models/User');
const Note = require('./models/Note');
require('./config/default.json')

const app = express()

connectDB()

// var db = mongoose.connection;

app.use(express.urlencoded({
    extended: true
  }));

app.use(express.json());

app.use(cors());


app.get('/api/user', auth, async(req, res) => {
    try {
        const user = await (await User.findById(req.user.id)).isSelected('-password');
        res.json(user);
    }   catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post('/api/register', 
[
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please put valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters')
    .isLength({ min: 6 })
]
, 
async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    const { name, email, password } = req.body;
    
    try {
// See if user exists
let user = await User.findOne({ email });

        if(user){
    return res.status(400).json({ errors: [{ msg: 'User already exists' }]});

}


user = new User({
    name,
    email,
    password
})

// encrypt password using bcrypt

const salt = await bcrypt.genSalt(10);

user.password = await bcrypt.hash(password, salt);

await user.save();

const payload = {
    user: {
        id: user.id
    }
}

jwt.sign(
    payload, 
    config.get('jwtSecret'),
    { expiresIn: 360000 },
    (err, token) => {
        if(err) throw err;
        res.json({ token });
    });
// return jsonwebtoken

    } catch(err){
        console.error(err.message);
        res.status(500).send('Server error');

    }

    console.log(req.body);



})

app.post('/api/login', 
[
    check('email', 'Please put valid email').isEmail(),
    check('password', 'Password is required')
    .exists()
]
, 
async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    const { name, email, password } = req.body;
    
    try {
// See if user exists
let user = await User.findOne({ email });

        if(!user){
    return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }]});

}

const isMatch = await bcrypt.compare(password, user.password);

if(!isMatch){
    return res.status(400)
    .json({ errors: [{ msg: 'Invalid credentials'}] })
}


const payload = {
    user: {
        id: user.id
    }
}

jwt.sign(payload, 
    config.get('jwtSecret'),
    { expiresIn: 360000 },
    (err, token) => {
        if(err) throw err;
        res.json({ token });
    });
// return jsonwebtoken

    } catch(err){
        console.error(err.message);
        res.status(500).send('Server error');

    }

    console.log(req.body);

})

app.post('/api/add_note', auth, async(req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        const newNote = new Note({
            Title: req.body.title,
            Text: req.body.text,
            User: user
        });
        
        const note = await newNote.save();

        res.json(note);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error.')
    }
});


app.get('/api/users', auth, (req, res) => {
    Users.find({}, function(err, users){
        Usersmap = {};

        users.forEach(function(user){
            UsersMap[user._id] = user;
        });

        res.send(UsersMap)
    })

})

app.get('/api/notes', auth, (req, res) => {
    const user = req.user.id;
    Note.find({User: user}, (err, notes) => {
        // Note that this error doesn't mean nothing was found,
        // it means the database had an error while searching, hence the 500 status
        if (err) return res.status(500).send(err)
        // send the list of all people
        return res.status(200).send(notes);
    });
});

app.get('/api/note/:id', (req, res) => {
    let id = req.params.id;
    Note.findById(id, function(err, note) {
        res.json(note);
    });
})
app.delete('/api/note/delete/:id', (req, res) => {
    let id = req.params.id;
    Note.findByIdAndRemove(id, (err, note) => {
        // As always, handle any potential errors:
        if (err) return res.status(500).send(err);
        // We'll create a simple object to send back with a message and the id of the document that was removed
        // You can really do this however you want, though.
        const response = {
            message: "Note successfully deleted",
            id: id
        };
        return res.status(200).send(response);
    });
})

app.listen(process.env.PORT || 4000, () => {
    console.log('App listening on PORT 4000')
})