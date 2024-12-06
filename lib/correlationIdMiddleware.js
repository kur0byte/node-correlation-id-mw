const {correlator} = require('./correlationIdHelper');

function correlationMw (options) {
    const headerName = (options && options.header) || 'x-correlation-id';
    return (req, res, next) => {
        req.correlationId = correlator.getId;
        req.setCorrelationId = correlator.setId;
        
        const id = req.get(headerName);

        if (id && correlator.isUUID(id)) {
            console.log(`Incoming ID: ${id}`);

            correlator.withId(id, () => {
                res.set(headerName, id);
                next();
            });
        } else {
            console.log(`No ID found, creating a new one`);
            correlator.withId(() => {
                const newId = correlator.getId();
                res.set(headerName, newId);
                next();
            });
        }
    };
}

// Applying getters and setters to the middleware object
correlationMw.getId = correlator.getId;
correlationMw.setId = correlator.setId;

module.exports = { correlationMw };