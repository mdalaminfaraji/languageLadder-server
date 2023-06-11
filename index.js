const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// verifyJWT

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
  
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
      }
      req.decoded = decoded;
      next();
    })
  }
// verifyJwt Ends

// Mongodb start

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wu2rnap.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection=client.db('languageLadder').collection('users');
    const classesCollection=client.db('languageLadder').collection('classes');

    app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
  
        res.send({ token })
      })
    //   verify Admin

    const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        if (user?.role !== 'admin') {
          return res.status(403).send({ error: true, message: 'forbidden message' });
        }
        next();
      }

// user related api
      app.get('/users', async (req, res) => {
        const result = await usersCollection.find().toArray();
        res.send(result);
      });

      app.post('/users', async (req, res) => {
        const user = req.body;
        const query = { email: user.email }
        const existingUser = await usersCollection.findOne(query);
  
        if (existingUser) {
          return res.send({ message: 'user already exists' })
        }
  
        const result = await usersCollection.insertOne(user);
        res.send(result);
      });

      app.get('/users/admin/:email', verifyJWT, async (req, res) => {
        const email = req.params.email;
  
        if (req.decoded.email !== email) {
          res.send({ admin: false })
        }
  
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        const result = { admin: user?.role === 'admin' }
        res.send(result);
      })
      app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
        const email = req.params.email;
  
        if (req.decoded.email !== email) {
          res.send({ instructor: false })
        }
  
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        const result = { instructor: user?.role === 'instructor' }
        res.send(result);
      })

      app.patch('/users/admin/:id', async (req, res) => {
        const id = req.params.id;
        const {role}=req.body;
        
        console.log(id,  role);
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: role,
          },
        };
  
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
  
      })

    //   Add Class Data to mongodb collection
  app.post('/addClasses', async(req, res)=>{
    const classes = req.body;
    console.log(classes);
    const result=await classesCollection.insertOne(classes);
    res.send(result);
  })
  app.get('/classes/:email', async (req, res) => {
    const email=req.params.email;
    // console.log(email);
    const query = { instructorEmail: email};
      const classes = await classesCollection.find(query).toArray();
      res.send(classes);
    });

    app.get('/classes', async (req, res) => {
            const classes = await classesCollection.find().toArray();
            res.send(classes);
    });

    app.patch('/classes/:id', async (req, res) => {
        const id = req.params.id;
         const updateDocument=req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc={
            $set:{
                availableSeats:updateDocument.availableSeats,
                className:updateDocument.className,
                classImage:updateDocument.classImage,
                price:updateDocument.price
            }
        }
        const result = await classesCollection.updateOne(filter, updateDoc);
        res.send(result);
    })

    // admin patch
    app.patch('/classes/admin/:id', async (req, res) => {
        const id = req.params.id;
        const {status, feedback}=req.body;
        
        console.log(feedback,  status);
        let updateDoc={};
        const filter = { _id: new ObjectId(id) };
        if(status){
             updateDoc = {
              $set: {
                status: status,
              },
            };
        }
        else if(feedback){
           updateDoc = {
              $set: {
                feedback: feedback,
              },
            };
        }else{
            return;
        }
      
  
        const result = await classesCollection.updateOne(filter, updateDoc);
        res.send(result);
  
      })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
 })
  
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
 })