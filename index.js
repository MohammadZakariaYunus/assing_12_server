const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z36dc.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {

    try {
        await client.connect();
        const productsCollection = client.db('atlas_machinery').collection('products');
        const reviewCollection = client.db('atlas_machinery').collection('review');
        const bookingCollection = client.db('atlas_machinery').collection('bookings');
        const userCollection = client.db('atlas_machinery').collection('users');
        const profileCollection = client.db('atlas_machinery').collection('profile');
        const paymentCollection = client.db('atlas_machinery').collection('payments');

        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products)
        });

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const products = await productsCollection.findOne(query);
            res.send(products);
        });
        // Add

        app.post('/products', async (req, res) => {
            const add = req.body;
            const result = await productsCollection.insertOne(add);
            return res.send({ success: true, result });
        });

        // Review

        app.get('/review', async (req, res) => {
            const query = {};
            const result = await reviewCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/review', async (req, res) => {
            const add = req.body;
            const result = await reviewCollection.insertOne(add);
            return res.send({ success: true, result });
        })

        // profile
        app.get('/profile', async (req, res) => {
            const query = {};
            const result = await profileCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/profile', async (req, res) => {
            const add = req.body;
            const result = await profileCollection.insertOne(add);
            return res.send({ success: true, result });
        })
        // booking

        app.get('/booking', async (req, res) => {
            const query = {};
            const items = await bookingCollection.find(query).toArray();
            res.send(items);
        });
        // My order
        app.get('/booking', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const items = await bookingCollection.find(query).toArray();
            res.send(items);
        });

        // Payment
        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        })

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        // purchase

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result });
        })
        // user

        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        })


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
        }
        )



    }

    finally {

    }

}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello From Atlas Machinery')
})

app.listen(port, () => {
    console.log(`Atlas Machinery app listening on port ${port}`)
})