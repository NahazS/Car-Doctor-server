const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jsonwebtoken = require("jsonwebtoken");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1tebz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const app = express();

const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:4000"], // Adjust origin for your frontend domain
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies.token
  console.log('token',token)
  if(!token)
  {
    return res.status(401).send({message: 'unauthorized access(token nai)'})    //res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err)
    {
      return res.status(401).send({message: 'unauthorized access tor'})
    }
    req.user = decoded;
    next();
  })
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servicesCollection = client.db("carDoctor").collection("services");
    const ordersCollection = client.db("carDoctor").collection("orders");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false, // Set to true for production (HTTPS)
          sameSite: "strict"
        })
        .send({ token }); // Ensure response is sent
    });

    app.post("/logOut", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    app.get("/services", async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await servicesCollection.findOne(filter);
      res.send(result);
    });

    
    app.get("/orders", verifyToken, async (req, res) => {
      console.log('token owner info', req.user)
      if(req.user !== req.query.email)
      {
        return res.status(403).send({message: 'forbidden access'})
      }
      let query = {}
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await ordersCollection.find(query).toArray()
      res.send(result)
    });

    app.post("/orders", async (req, res) => {
      const user = req.body;
      const result = await ordersCollection.insertOne(user);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("running");
});
app.listen(port, () => {
  console.log(`running port : ${port}`);
});
