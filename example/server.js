const express = require('express');
const { correlationMw } = require('../lib/correlationIdMiddleware');

const server = () => {
    const app = express();
    
    app.use(correlationMw({header: 'id-hly'}));
    app.get('*', (req, res, next) => {
        console.log({Request: req.url, CorrelationId: res.get('id-hly')});
        console.log(`Correlation ID can be accessed within the request handler: ${req.correlationId()}`);
        console.log(`Correlation ID can be accessed within the response header: ${res.get('id-hly')}`);
        
        res.on('finish', () => {
            console.log(`ID within finish is ${req.correlationId()}`);
        });

        res.send(`Hello World!`);
    });

    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });
    
    const port = process.env.PORT || 3001;
    const serverInstance = app.listen(port);
    
    // Add error handling for server startup
    serverInstance.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use. Please try a different port.`);
        } else {
            console.error('Server startup error:', error);
        }
        process.exit(1);
    });
    
    serverInstance.on('listening', () => {
        console.log(`Server started and running on http://localhost:${port}`);
    });
    
    return serverInstance;
}

module.exports = { server };