const httpMocks = require('node-mocks-http');
const { correlator } = require('../lib/correlationIdHelper');
const { correlationMw } = require('../lib/correlationIdMiddleware');

jest.mock('../lib/correlationIdHelper', () => ({
    correlator: {
        getId: jest.fn(),
        setId: jest.fn(),
        withId: jest.fn((id, fn) => {
            if (typeof id === 'function') {
                fn = id;
                id = 'generated-uuid';
            }
            if (typeof fn === 'function') {
                return fn();
            }
        }),
        isUUID: jest.fn((id) => {
            return id === '123e4567-e89b-12d3-a456-426614174000';
        })
    }
}));

describe('[ correlationMiddleware (Middleware) ]', () => {
    let req, res, next;
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    
    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('{ Attributes }', () => {
        it('should expose getId function', () => {
            expect(correlationMw.getId).toBeDefined();
            expect(typeof correlationMw.getId).toBe('function');
        });

        it('should expose setId function', () => {
            expect(correlationMw.setId).toBeDefined();
            expect(typeof correlationMw.setId).toBe('function');
        });
    });

    describe('[ middleware(req, res, next) ]: Process HTTP request correlation', () => {
        describe('Request object setup', () => {
            it('should attach correlation functions to request object', () => {
                correlationMw()(req, res, next);
                
                expect(req.correlationId).toBe(correlator.getId);
                expect(req.setCorrelationId).toBe(correlator.setId);
            });
        });

        describe('Header processing', () => {
            it('should use existing correlation ID when valid UUID is provided', () => {
                req.get = jest.fn().mockReturnValue(validUUID);
                correlator.getId.mockReturnValue(validUUID);

                correlationMw()(req, res, next);

                expect(correlator.withId).toHaveBeenCalledWith(validUUID, expect.any(Function));
                expect(res.getHeader('id-hly')).toBe(validUUID);
                expect(next).toHaveBeenCalled();
            });

            it('should generate new correlation ID when header is missing', () => {
                const newUUID = '123e4567-e89b-12d3-a456-426614174001';
                req.get = jest.fn().mockReturnValue(null);
                correlator.getId.mockReturnValue(newUUID);

                correlationMw()(req, res, next);

                expect(correlator.withId).toHaveBeenCalledWith(expect.any(Function));
                expect(res.getHeader('id-hly')).toBe(newUUID);
                expect(next).toHaveBeenCalled();
            });

            it('should generate new correlation ID when header contains invalid UUID', () => {
                const invalidUUID = 'invalid-uuid';
                const newUUID = '123e4567-e89b-12d3-a456-426614174002';
                req.get = jest.fn().mockReturnValue(invalidUUID);
                correlator.getId.mockReturnValue(newUUID);

                correlationMw()(req, res, next);

                expect(correlator.withId).toHaveBeenCalledWith(expect.any(Function));
                expect(res.getHeader('id-hly')).toBe(newUUID);
                expect(next).toHaveBeenCalled();
            });
        });

        describe('Custom configuration', () => {
            it('should use custom header name when provided in options', () => {
                const customHeader = 'x-custom-id';
                req.get = jest.fn().mockReturnValue(validUUID);
                correlator.getId.mockReturnValue(validUUID);

                correlationMw({ header: customHeader })(req, res, next);

                expect(req.get).toHaveBeenCalledWith(customHeader);
                expect(res.getHeader(customHeader)).toBe(validUUID);
                expect(next).toHaveBeenCalled();
            });
        });
    });
});