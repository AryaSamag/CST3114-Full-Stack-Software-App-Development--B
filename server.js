const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const dbName = process.env.DB_NAME || 'cst3144';
const uri = process.env.MONGODB_URI;
let db;

// Check if MongoDB URI is configured
if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable is not set!');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/images', express.static('images')); // Serve images from /images route
app.use(express.static('../CST3114-Full-Stack-Software-App-Development--F')); // Serve frontend files

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB Atlas and start server
console.log('Attempting to connect to MongoDB...');
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

// GET search lessons
app.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = query.toLowerCase();

    // Search in subject, location, and convert price/spaces to string for search
    const lessons = await db.collection('lessons').find({
      $or: [
        { subject: { $regex: searchQuery, $options: 'i' } },
        { location: { $regex: searchQuery, $options: 'i' } }
      ]
    }).toArray();

    // Also filter by price or spaces if the query is numeric
    const numericQuery = parseFloat(query);
    if (!isNaN(numericQuery)) {
      const allLessons = await db.collection('lessons').find({}).toArray();
      const numericMatches = allLessons.filter(lesson => 
        lesson.price === numericQuery || lesson.spaces === numericQuery
      );
      
      // Merge results and remove duplicates
      const mergedLessons = [...lessons];
      numericMatches.forEach(match => {
        if (!mergedLessons.find(l => l._id.toString() === match._id.toString())) {
          mergedLessons.push(match);
        }
      });
      
      return res.json(mergedLessons);
    }

    res.json(lessons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search lessons' });
  }
});

// PUT update lesson spaces
app.put('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { spaces } = req.body;

    if (spaces === undefined || spaces < 0) {
      return res.status(400).json({ error: 'Invalid spaces value' });
    }

    const result = await db.collection('lessons').updateOne(
      { _id: new ObjectId(id) },
      { $set: { spaces: spaces } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const updatedLesson = await db.collection('lessons').findOne({ _id: new ObjectId(id) });
    res.json(updatedLesson);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// GET all orders
app.get('/orders', async (req, res) => {
  try {
    const orders = await db.collection('orders').find({}).toArray();
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST create order
app.post('/orders', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      address, 
      city, 
      state, 
      zip, 
      phone,
      sendGift, 
      giftPhone, 
      cart 
    } = req.body;

    // Validation
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ error: 'First name, last name, and phone are required' });
    }

    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: 'Cart cannot be empty' });
    }

    // Validate name (letters only)
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      return res.status(400).json({ error: 'Names must contain letters only' });
    }

    // Validate phone (numbers only)
    const phoneRegex = /^[0-9]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Phone must contain numbers only' });
    }

    if (sendGift && giftPhone && !phoneRegex.test(giftPhone)) {
      return res.status(400).json({ error: 'Gift phone must contain numbers only' });
    }

    const order = {
      firstName,
      lastName,
      address,
      city,
      state,
      zip,
      phone,
      sendGift,
      giftPhone,
      cart,
      totalPrice: cart.reduce((total, item) => total + (item.price * item.quantity), 0),
      createdAt: new Date()
    };

    const result = await db.collection('orders').insertOne(order);
    res.status(201).json({ 
      message: 'Order created successfully', 
      orderId: result.insertedId 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});