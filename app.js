const express = require('express');
const datesRouter = require('./routes/events');
const cryptoRouter = require('./routes/crypto');

const app = express();
app.use(express.json());

app.use('/api/events', datesRouter);
app.use('/api/crypto', cryptoRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 