const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const mysql = require('mysql2/promise'); 
app.use(express.json());

const db = mysql.createPool({
  host: 'database-1.c9ymi8csk3n5.ap-south-1.rds.amazonaws.com',
  user: 'admin', 
  password: 'Supriya9876', 
  database: 'd2d_rds' 
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
        
        const payload = {
          results,
          usertype: "student"
        };
        console.log(payload);
        jwt.sign(payload,"jwtSecret",{expiresIn: "1m"},(err,token) =>{
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

app.post('/api/Adminlogin', async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ message: 'Please fill in both fields' });
    }
  
    try {
      let [results] = await db.query('SELECT * FROM admins WHERE email = ? AND password = ?', [email, password]);
  
      if (results.length > 0) {
        const payload = {
          results,
          usertype: "admin"
        };
        jwt.sign(payload,"jwtSecret",{expiresIn: "2h"},(err,token) =>{
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
  app.post('/api/Mentorlogin', async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ message: 'Please fill in both fields' });
    }
  
    try {
      let [results] = await db.query('SELECT * FROM mentors WHERE email = ? AND password = ?', [email, password]);
  
      if (results.length > 0) {
        
        const payload = {
          results,
          usertype: "mentor"
        };
        console.log(payload);
        jwt.sign(payload,"jwtSecret",{expiresIn: "2h"},(err,token) =>{
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

  app.put('/update-profile', async (req, res) => {
    const { usertype, id, name, email, phone, password } = req.body;
    console.log(req.body);
  
    let table = '';
    if (usertype === 'student') {
      table = 'users';
    } else if (usertype === 'mentor') {
      table = 'mentors';
    } else if (usertype === 'admin') {
      table = 'admins';
    } else {
      return res.status(400).json({ message: 'Invalid user type' });
    }
  
    // Update query
    
  
    const query = `UPDATE ${table} SET name = ?, email = ?, phone = ?, password=? WHERE id = ?`;
    const values = password ? [name, email, phone, password, id] : [name, email, phone, id];
  
    console.log("Executing Query:", query);
    console.log("With Values:", values);
    await db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error updating profile:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(201).json({ message: 'Profile updated successfully' });
    });
  });

  app.get('/users', async(req, res) => {
    try{
    const [sql] = await db.query("SELECT id, name, email, phone FROM users");
  
    
      res.json(sql);
    }catch (err){
      console.error(err);
      res.status(500).send("Error fetching details.");
    }
  });
  
  
  
  app.get('/mentors', async(req, res) => {
    try{
    const [sql] = await db.query("SELECT id, name, email, phone FROM mentors");
  
    
      res.json(sql);
    }catch (err){
      console.error(err);
      res.status(500).send("Error fetching details.");
    }
  });

  app.post('/mentors', async(req, res) => {
    const { name, email, phone } = req.body;
    
    await db.query('INSERT INTO mentors (name, email, phone) VALUES (?, ?, ?)', [name, email, phone], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Mentor added successfully" });
    });
  });
  app.delete('/mentors/:id', async (req, res) => {
    const mentorId = req.params.id;
    try {
      await db.query('DELETE FROM mentors WHERE id = ?', [mentorId]);
      res.status(200).json({ message: 'Mentor deleted successfully' });
  
    } catch (error) {
      console.error('Error deleting mentor:', error);
      res.status(500).json({ error: 'Error deleting mentor' });
    }
  });
  
  app.post('/progress', async(req, res) => {
    const { userId, cid, completedVideos,totalVideos } = req.body;
    const videoStr = completedVideos.join('@#$%');
  
    db.query(
        'INSERT INTO user_progress (user_id, cid, completed_videos) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE completed_videos = ?',
        [userId, cid, videoStr, videoStr],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        }
    );
    //const [videoCountResult] = await db.query('SELECT COUNT(*) AS total FROM course_content WHERE cid = ?', [cid]);
    //const totalVideos = videoCountResult[0]?.total || 0;
    const progress = totalVideos > 0 ? Math.round((completedVideos.length / totalVideos) * 100) : 0;
    const [cid1]=await db.query(`SELECT cid FROM courses WHERE LOWER(REPLACE(course_name, '.', '')) = ?`,[cid]);
    await db.query(
      'INSERT INTO user_course_progress (uid, cid, course_progress) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE course_progress = ?',
      [userId, cid1[0].cid, progress, progress]
    );
   
     
  });

  app.get('/progress/:userId/:cid', async(req, res) => {
    const { userId, cid} = req.params;
    try{
    const [rows]= await db.query('SELECT completed_videos FROM user_progress WHERE user_id = ? AND cid = ?',[userId, cid]);
    if (rows.length > 0) {
      const completedVideos = rows[0].completed_videos;
  
      // Handle NULL or empty completed_videos
      if (completedVideos) {
        
        res.json(completedVideos.split('@#$%')); // ✅ Returns an array of video names
      } else {
        console.log('No completed videos found for user:', userId);
        res.json([]); // ✅ Return empty array if no videos are saved
      }
    }
   
    }catch{
      console.error("Error fetching saved progress:", error);
      res.status(500).json({ error: 'Failed to retrieve saved videos' });
  
    }
        
    
  });

  module.exports = app;
  

  
