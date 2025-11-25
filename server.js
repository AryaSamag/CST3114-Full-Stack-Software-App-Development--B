const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = 3000;

const dbName = 'cst3144';
const uri = 'mongodb+srv://arya:arya@cluster0.yt9iemu.mongodb.net/?appName=Cluster0';
let db;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
// Connect to MongoDB Atlas and start server
MongoClient.connect(uri)
  .then(client => {
    console.log('Connected to MongoDB Atlas');
    db = client.db(dbName);

    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });

  // GET all lessons
app.get('/lessons', async (req, res) => {
  try {
    const lessons = await db.collection('lessons').find({}).toArray();
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});