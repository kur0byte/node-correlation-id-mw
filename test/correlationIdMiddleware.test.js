const httpMocks = require('node-mocks-http');
const { correlator } = require('../lib/correlationIdHelper');
const { correlationMw } = require('../lib/correlationIdMiddleware');

// Mock the dependencies
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

jest.mock('../lib/graylogHelper', () => ({
    sendLogToGraylog: jest.fn().mockImplementation(() => Promise.resolve())
}));

// Import the mocked module after mocking
const { sendLogToGraylog } = require('../lib/graylogHelper');

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
          it('should use existing correlation ID when valid UUID is provided', async () => {
            req.get = jest.fn().mockReturnValue(validUUID);
            correlator.getId.mockReturnValue(validUUID);
        
            correlationMw()(req, res, next);
        
            expect(correlator.withId).toHaveBeenCalledWith(validUUID, expect.any(Function));
            expect(res.getHeader('x-correlation-id')).toBe(validUUID);
            
            // Wait for any promises to resolve
            await new Promise(process.nextTick);
            
            expect(next).toHaveBeenCalled();
        });

        it('should generate new correlation ID when header is missing', async () => {
          const newUUID = '123e4567-e89b-12d3-a456-426614174001';
          req.get = jest.fn().mockReturnValue(null);
          correlator.getId.mockReturnValue(newUUID);
      
          correlationMw()(req, res, next);
      
          expect(correlator.withId).toHaveBeenCalledWith(expect.any(Function));
          expect(res.getHeader('x-correlation-id')).toBe(newUUID);
          
          // Wait for any promises to resolve
          await new Promise(process.nextTick);
          
          expect(next).toHaveBeenCalled();
      });
      
      it('should generate new correlation ID when header contains invalid UUID', async () => {
          const invalidUUID = 'invalid-uuid';
          const newUUID = '123e4567-e89b-12d3-a456-426614174002';
          req.get = jest.fn().mockReturnValue(invalidUUID);
          correlator.getId.mockReturnValue(newUUID);
      
          correlationMw()(req, res, next);
      
          expect(correlator.withId).toHaveBeenCalledWith(expect.any(Function));
          expect(res.getHeader('x-correlation-id')).toBe(newUUID);
          
          // Wait for any promises to resolve
          await new Promise(process.nextTick);
          
          expect(next).toHaveBeenCalled();
      });
        });

        describe('Custom configuration', () => {
          it('should use custom header name when provided in options', async () => {
              const customHeader = 'x-svc-id';
              req.get = jest.fn().mockReturnValue(validUUID);
              correlator.getId.mockReturnValue(validUUID);
      
              correlationMw({ header: customHeader })(req, res, next);
      
              expect(req.get).toHaveBeenCalledWith(customHeader);
              expect(res.getHeader(customHeader)).toBe(validUUID);
              
              // Wait for any promises to resolve
              await new Promise(process.nextTick);
              
              expect(next).toHaveBeenCalled();
          });
      });

        describe('Graylog Logging', () => {
            beforeEach(() => {
                req.get = jest.fn();
            });

            it('should send log to Graylog with existing correlation ID', async () => {
                req.get.mockReturnValue(validUUID);
                correlator.getId.mockReturnValue(validUUID);

                correlationMw()(req, res, next);
                
                expect(sendLogToGraylog).toHaveBeenCalledWith(validUUID);
                // Wait for any promises to resolve
                await new Promise(process.nextTick);
                expect(next).toHaveBeenCalled();
            });

            it('should send log to Graylog with new correlation ID when header is missing', async () => {
                const newUUID = '123e4567-e89b-12d3-a456-426614174001';
                req.get.mockReturnValue(null);
                correlator.getId.mockReturnValue(newUUID);

                correlationMw()(req, res, next);
                
                expect(sendLogToGraylog).toHaveBeenCalledWith(newUUID);
                await new Promise(process.nextTick);
                expect(next).toHaveBeenCalled();
            });

            it('should handle Graylog logging errors gracefully with existing ID', async () => {
                req.get.mockReturnValue(validUUID);
                correlator.getId.mockReturnValue(validUUID);
                sendLogToGraylog.mockImplementationOnce(() => Promise.reject(new Error('Logging failed')));
                
                // Spy on console.error
                const consoleSpy = jest.spyOn(console, 'error');
                
                correlationMw()(req, res, next);
                
                // Wait for promise rejection to be handled
                await new Promise(process.nextTick);
                
                expect(consoleSpy).toHaveBeenCalledWith('Logging error:', expect.any(Error));
                expect(next).toHaveBeenCalled();
                
                consoleSpy.mockRestore();
            });

            it('should handle unexpected errors during Graylog logging', async () => {
                req.get.mockReturnValue(validUUID);
                sendLogToGraylog.mockImplementationOnce(() => {
                    throw new Error('Unexpected error');
                });
                
                const consoleSpy = jest.spyOn(console, 'error');
                
                correlationMw()(req, res, next);
                
                expect(consoleSpy).toHaveBeenCalledWith('Unexpected error with Graylog logging:', expect.any(Error));
                expect(next).toHaveBeenCalled();
                
                consoleSpy.mockRestore();
            });

            it('should handle Graylog logging errors when generating new ID', async () => {
                req.get.mockReturnValue(null);
                const newUUID = '123e4567-e89b-12d3-a456-426614174002';
                correlator.getId.mockReturnValue(newUUID);
                sendLogToGraylog.mockImplementationOnce(() => Promise.reject(new Error('Logging failed')));
                
                const consoleSpy = jest.spyOn(console, 'error');
                
                correlationMw()(req, res, next);
                
                await new Promise(process.nextTick);
                
                expect(consoleSpy).toHaveBeenCalledWith('Logging error:', expect.any(Error));
                expect(next).toHaveBeenCalled();
                
                consoleSpy.mockRestore();
            });
        });
    });
});