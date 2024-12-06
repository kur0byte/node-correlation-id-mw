# Correlation ID Middleware
This project provides a middleware for Express.js applications to handle correlation IDs. It ensures that each request has a unique correlation ID, which can be used for tracking and logging purposes.

## Installation
1. Install the package:
    ```sh
    npm install correlation_id_middleware
    ```

## Usage
1. Import and use the middleware in your Express application:

    ```javascript
    const express = require('express');
    const { correlationMw } = require('correlation_id_middleware');

    const app = express();

    app.use(correlationMw());

    app.get('*', (req, res) => {
        console.log(`Correlation ID from req getter: ${req.correlationId()}`);
        res.send('Hello World!');
    });

    app.listen(3000, () => {
        console.log('Server started on http://localhost:3000');
    });
    ```

## Example
1. Run the example server:

    ```sh
    npm run dev
    ```

2. The server will start on `http://localhost:3000`. All incoming requests will have a correlation ID attached.

## Running Tests
To run the tests, use the following command:

```sh
npm test
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any changes.

Made with 🖤 by kur0.