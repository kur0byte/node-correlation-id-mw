const express = require('express');
const { correlationMw } = require('../lib/correlationIdMiddleware');

const app = express();

const server = () => {
    app.use(correlationMw({header: 'id-svc'}));
    app.get('*', (req, res, next) => {
        console.log({Request: req.url, CorrelationId: res.get('id-svc')});
        console.log(`Correlation ID can be accessed within the request handler: ${req.correlationId()}`);
        console.log(`Correlation ID can be accessed within the response header: ${res.get('id-svc')}`);
        
        
        res.on('finish', () => {
            console.log(`ID within finish is ${req.correlationId()}`);
        });

        res.send(`Hello World!`);
    });

    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });
    
    app.listen(3000, () => {
        console.log('Server started on http://localhost:3000');
    });
}

module.exports = { server };