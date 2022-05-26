const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello From Atlas Machinery')
})

app.listen(port, () => {
    console.log(`Atlas Machinery app listening on port ${port}`)
})