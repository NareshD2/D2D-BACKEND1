const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); 
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());






app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true 
}));



/*app.use(session({
  secret: '987654321', 
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    httpOnly: true,
    maxAge: 30 * 60 * 1000 
  }
}));*/
const verifyJWT = (req, res, next) => {
  const token=req.headers['authorization'];
  if(token){
    token=token.split(' ')[1];
    jwt.verify(token,"jwtSecret",(err,valid) =>{
      if(err){
        res.send({result:"please add token with header"});
      }
        next();
    });

  }else{
        res.send({result:"please add token with header"});
  }

};

const db = mysql.createPool({
  host: 'localhost',
  user: 'root', 
  password: 'Supriya@987', 
  database: 'drive_to_destiny' 
});
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Please fill all fields' });
  }

  try {
    const [checkEmailResult] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (checkEmailResult.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    await db.query('INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)', [name, email, phone, password]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error processing registration:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});


app.post('/api/Customerlogin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please fill in both fields' });
  }

  try {
    let [results] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

    if (results.length > 0) {
      //req.session.user = results; 
      //const id = results[0].id;
      jwt.sign({results},"jwtSecret",{expiresIn: "2h"},(err,token) =>{
          if(err){
          res.send({result:"somethin went wrong please try again"});}
          res.send({ results,auth: token});
        });
      
    } else {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Error querying database:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});


app.post('/api/set-goal',async (req, res) => {
  
  const {userId, gid, targetDate, objective} = req.body;
  console.log(gid);
  console.log(objective);
  console.log(targetDate);
  console.log(userId);

  try {
    await db.query(
      'INSERT INTO user_goal_registration (gid, uid, targetdate, objective) VALUES (?, ?, ?, ?)',
      [gid, userId, targetDate, objective]
    );
    res.status(200).json({ message: 'Goal registered successfully' });
  } catch (error) {
    console.error('Error registering goal:', error);
    res.status(500).json({ message: 'Error registering goal' });
  }
});
app.get('/api/set-goal', async (req, res) => {
  
  try {
    const [results] = await db.query('SELECT id, goal_name AS goalName FROM goals');
    res.json(results);
  } catch (err) {
    console.error('Error fetching goals:', err);

    res.status(500).send('An error occurred');
  }
});

app.get('/courses', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT cid, course_name, icon, link FROM courses');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});
app.get('/api/goals/:userId', async (req, res) => {
  const userId = req.params.userId;
console.log(userId);
  try {
    const [goals] = await db.query(
    'SELECT  g.goal_name FROM user_goal_registration ugr JOIN goals g ON ugr.gid = g.id WHERE ugr.uid = ?',
      [userId]);
      console.log(goals);
    
    res.json({ goals });

  } catch (error) {
    console.error("Error fetching goals:", error);
    res.status(500).json({ error: 'Failed to retrieve goals' });
  }
});

app.get('/api/:cid', async (req, res) => {
  const { cid } = req.params; 
  const query = `SELECT title, youtubelink FROM course_${cid}`;

  try {
    const [results] = await db.query(query);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No videos found for this category.' });
    }

    res.json(results);
  } catch (err) {
    console.error('Error executing query:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
