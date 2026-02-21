# Quartz Platform Engineering Guide

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Introduction

Quartz is a modern platform engineering framework designed for building scalable, distributed systems. It provides a comprehensive set of tools and abstractions that simplify the development of cloud-native applications while maintaining **high performance** and *operational excellence*.

The framework was born out of the need to standardize how teams build and deploy microservices across large organizations. Rather than letting each team reinvent the wheel, Quartz provides opinionated defaults that cover **service mesh integration**, *observability pipelines*, and `infrastructure-as-code` templates.

This guide covers everything from initial setup to advanced deployment patterns. Whether you are a **new developer** joining the team or a *seasoned platform engineer* looking to leverage Quartz's full capabilities, this document will serve as your comprehensive reference.

## Architecture Overview

### High-Level Design

The Quartz platform follows a layered architecture that separates concerns into distinct tiers. At the foundation, we have the **infrastructure layer** which manages compute, storage, and networking resources. Above that sits the **platform layer** which provides shared services like service discovery, configuration management, and secrets handling. Finally, the **application layer** houses the actual business logic.

Each layer communicates through well-defined interfaces, ensuring that changes in one tier do not cascade unpredictably into others. This separation is critical for maintaining system stability as the platform scales to support hundreds of microservices.

### Component Diagram

The system is composed of the following primary components:

1. **Gateway Service** - Handles all incoming HTTP and gRPC traffic
2. **Service Registry** - Maintains a real-time catalog of running services
3. **Config Server** - Centralized configuration management with hot-reload support
4. **Event Bus** - Asynchronous message broker for inter-service communication
5. **Metrics Collector** - Aggregates telemetry data from all services
6. **Log Aggregator** - Centralized logging with structured query capabilities

### Data Flow

When a request enters the system, it follows this path:

> The gateway receives the incoming request, performs authentication and rate limiting, then routes it to the appropriate backend service based on the service registry. The backend service processes the request, potentially communicating with other services via the event bus, and returns the response through the gateway.

This pattern ensures consistent security enforcement and observability across all service interactions, regardless of which team owns the service.

### Network Topology

| Component | Port | Protocol | Health Check |
|-----------|------|----------|--------------|
| Gateway | 8080 | HTTP/2 | `/health` |
| Registry | 8500 | HTTP | `/v1/status` |
| Config | 8888 | HTTP | `/actuator/health` |
| Event Bus | 5672 | AMQP | `/api/healthchecks` |
| Metrics | 9090 | HTTP | `/-/healthy` |
| Logs | 9200 | HTTP | `/_cluster/health` |

## Getting Started

### Prerequisites

Before you begin, ensure you have the following tools installed on your development machine:

- [ ] Node.js 20.x or later
- [ ] Docker Desktop 4.x
- [ ] kubectl configured for your cluster
- [ ] Helm 3.x
- [x] Git (any recent version)
- [x] A code editor with TypeScript support

### Installation

To install the Quartz CLI, run the following command in your terminal:

```bash
npm install -g @quartz/cli

# Verify the installation
quartz --version

# Initialize a new project
quartz init my-service --template=typescript

# Navigate to the project directory
cd my-service

# Install dependencies
npm install
```

After installation, you should see the project structure created with all the necessary boilerplate code and configuration files. The template includes a basic HTTP server, health check endpoints, and Docker configuration.

### Project Structure

A typical Quartz project has the following layout:

```
my-service/
├── src/
│   ├── index.ts           # Application entry point
│   ├── config/
│   │   ├── default.ts     # Default configuration
│   │   └── production.ts  # Production overrides
│   ├── routes/
│   │   ├── health.ts      # Health check routes
│   │   └── api.ts         # API routes
│   ├── services/
│   │   └── core.ts        # Business logic
│   └── middleware/
│       ├── auth.ts        # Authentication middleware
│       ├── logging.ts     # Request logging
│       └── metrics.ts     # Metrics collection
├── test/
│   ├── unit/
│   └── integration/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── helm/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── package.json
├── tsconfig.json
└── quartz.config.ts
```

### Configuration

The `quartz.config.ts` file is the central configuration for your service:

```typescript
import { defineConfig } from '@quartz/core';

export default defineConfig({
  service: {
    name: 'my-service',
    version: '1.0.0',
    port: 3000,
  },
  registry: {
    url: 'http://registry:8500',
    healthCheck: {
      interval: '10s',
      timeout: '5s',
    },
  },
  metrics: {
    enabled: true,
    endpoint: '/metrics',
    labels: {
      team: 'platform',
      environment: process.env.NODE_ENV || 'development',
    },
  },
  logging: {
    level: 'info',
    format: 'json',
    redact: ['password', 'token', 'secret'],
  },
});
```

This configuration is validated at startup, and any missing required fields will cause the service to fail fast with a descriptive error message. This is by design: it is better to catch configuration issues early than to discover them in production.

## Core Concepts

### Service Lifecycle

Every Quartz service goes through a well-defined lifecycle consisting of the following phases:

1. **Bootstrap** - Configuration is loaded and validated
2. **Initialize** - Database connections, cache clients, and external service connections are established
3. **Register** - The service registers itself with the service registry
4. **Ready** - The service begins accepting traffic
5. **Drain** - On shutdown, the service stops accepting new requests
6. **Deregister** - The service removes itself from the registry
7. **Shutdown** - All connections are closed and resources are released

Understanding this lifecycle is essential for implementing proper startup and shutdown behavior. A common mistake is to begin serving traffic before all dependencies are initialized, which can lead to cascading failures.

### Middleware Pipeline

Quartz uses a middleware pipeline similar to Express.js but with stronger typing and built-in observability. Middleware functions are executed in order for incoming requests and in reverse order for outgoing responses.

```typescript
import { Middleware, Context, Next } from '@quartz/core';

const timingMiddleware: Middleware = async (ctx: Context, next: Next) => {
  const start = Date.now();

  // Add request ID for tracing
  ctx.requestId = ctx.headers['x-request-id'] || generateId();

  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    ctx.set('X-Response-Time', `${duration}ms`);

    // Record metrics
    ctx.metrics.histogram('http_request_duration_ms', duration, {
      method: ctx.method,
      path: ctx.routePath,
      status: ctx.status,
    });
  }
};

export default timingMiddleware;
```

The middleware pipeline supports both synchronous and asynchronous functions. Each middleware **must** call `next()` to pass control to the next middleware in the chain, unless it intends to short-circuit the pipeline (for example, returning a `401 Unauthorized` response from an auth middleware).

### Event-Driven Communication

For asynchronous communication between services, Quartz provides a built-in event system backed by a message broker. This is the preferred pattern for operations that do not require an immediate response.

```typescript
import { EventEmitter, Event } from '@quartz/events';

// Define an event schema
interface OrderCreatedEvent extends Event {
  type: 'order.created';
  payload: {
    orderId: string;
    customerId: string;
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
    }>;
    total: number;
  };
}

// Publish an event
const emitter = new EventEmitter();
await emitter.publish<OrderCreatedEvent>({
  type: 'order.created',
  payload: {
    orderId: 'ord-12345',
    customerId: 'cust-67890',
    items: [
      { productId: 'prod-001', quantity: 2, price: 29.99 },
      { productId: 'prod-002', quantity: 1, price: 49.99 },
    ],
    total: 109.97,
  },
});

// Subscribe to events
emitter.on<OrderCreatedEvent>('order.created', async (event) => {
  console.log(`New order ${event.payload.orderId} from customer ${event.payload.customerId}`);
  await processOrder(event.payload);
});
```

Events are automatically enriched with metadata including timestamps, source service identifiers, and correlation IDs for distributed tracing.

### Error Handling

Quartz provides a structured error handling system that ensures consistent error responses across all services. Errors are categorized by type and automatically mapped to appropriate HTTP status codes.

| Error Type | HTTP Status | Retry | Description |
|------------|-------------|-------|-------------|
| `ValidationError` | 400 | No | Invalid input data |
| `AuthenticationError` | 401 | No | Missing or invalid credentials |
| `AuthorizationError` | 403 | No | Insufficient permissions |
| `NotFoundError` | 404 | No | Resource does not exist |
| `ConflictError` | 409 | No | Resource state conflict |
| `RateLimitError` | 429 | Yes | Too many requests |
| `InternalError` | 500 | Yes | Unexpected server error |
| `ServiceUnavailableError` | 503 | Yes | Dependency unavailable |
| `TimeoutError` | 504 | Yes | Operation timed out |

```typescript
import { ValidationError, NotFoundError } from '@quartz/errors';

async function getUser(id: string) {
  if (!id || !isValidUUID(id)) {
    throw new ValidationError('Invalid user ID format', {
      field: 'id',
      expected: 'UUID v4',
      received: id,
    });
  }

  const user = await db.users.findById(id);
  if (!user) {
    throw new NotFoundError(`User ${id} not found`, {
      resource: 'User',
      identifier: id,
    });
  }

  return user;
}
```

### Database Integration

Quartz supports multiple database backends through a unified query interface. The most common choice is PostgreSQL, but the abstraction layer also supports MySQL, SQLite, and DynamoDB.

```typescript
import { Database, Migration } from '@quartz/db';

const db = new Database({
  dialect: 'postgresql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'my_service',
  pool: {
    min: 2,
    max: 10,
    idleTimeout: 30000,
  },
});

// Define a migration
const createUsersTable: Migration = {
  id: '001-create-users',
  up: async (db) => {
    await db.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(db.fn.uuid());
      table.string('email').unique().notNullable();
      table.string('name').notNullable();
      table.jsonb('metadata').defaultTo('{}');
      table.timestamps(true, true);
    });
  },
  down: async (db) => {
    await db.schema.dropTable('users');
  },
};
```

Connection pooling is managed automatically, with sensible defaults that work well for most workloads. For high-throughput services, you may want to increase the maximum pool size and enable prepared statement caching.

## API Reference

### HTTP Endpoints

The framework exposes several built-in endpoints for operational purposes:

- `GET /health` - Returns the service health status
- `GET /ready` - Returns readiness probe status
- `GET /metrics` - Prometheus-compatible metrics endpoint
- `GET /info` - Service metadata and version information

Custom endpoints are defined using the router API:

```typescript
import { Router, validate, z } from '@quartz/core';

const router = new Router();

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
});

router.post('/api/users', validate(UserSchema), async (ctx) => {
  const { email, name, role } = ctx.body;

  const user = await userService.create({ email, name, role });

  ctx.status = 201;
  ctx.body = {
    data: user,
    links: {
      self: `/api/users/${user.id}`,
    },
  };
});

router.get('/api/users/:id', async (ctx) => {
  const user = await userService.findById(ctx.params.id);

  ctx.body = {
    data: user,
    links: {
      self: `/api/users/${user.id}`,
      orders: `/api/users/${user.id}/orders`,
    },
  };
});

router.get('/api/users', async (ctx) => {
  const { page = 1, limit = 20, sort = 'created_at' } = ctx.query;

  const result = await userService.list({
    page: Number(page),
    limit: Math.min(Number(limit), 100),
    sort: String(sort),
  });

  ctx.body = {
    data: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit),
    },
  };
});

export default router;
```

### gRPC Services

For inter-service communication that requires low latency and strong typing, Quartz supports gRPC out of the box:

```protobuf
syntax = "proto3";

package quartz.users.v1;

service UserService {
  rpc GetUser (GetUserRequest) returns (GetUserResponse);
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser (CreateUserRequest) returns (CreateUserResponse);
  rpc UpdateUser (UpdateUserRequest) returns (UpdateUserResponse);
  rpc DeleteUser (DeleteUserRequest) returns (DeleteUserResponse);
}

message GetUserRequest {
  string id = 1;
}

message GetUserResponse {
  User user = 1;
}

message User {
  string id = 1;
  string email = 2;
  string name = 3;
  string role = 4;
  google.protobuf.Timestamp created_at = 5;
  google.protobuf.Timestamp updated_at = 6;
}
```

The gRPC server is automatically started alongside the HTTP server, and both share the same middleware pipeline for authentication and observability.

### WebSocket Support

For real-time features, Quartz provides WebSocket support with automatic connection management:

```typescript
import { WebSocketServer, WebSocketHandler } from '@quartz/ws';

const wsHandler: WebSocketHandler = {
  onConnect: async (socket, ctx) => {
    console.log(`Client connected: ${socket.id}`);
    await socket.join(`user:${ctx.userId}`);
  },

  onMessage: async (socket, message) => {
    switch (message.type) {
      case 'subscribe':
        await socket.join(message.channel);
        break;
      case 'unsubscribe':
        await socket.leave(message.channel);
        break;
      case 'broadcast':
        await socket.to(message.channel).emit('message', message.data);
        break;
    }
  },

  onDisconnect: async (socket, reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  },

  onError: async (socket, error) => {
    console.error(`WebSocket error for ${socket.id}:`, error);
  },
};
```

## Deployment

### Docker Configuration

Every Quartz service ships with a production-ready Dockerfile:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS runtime

RUN addgroup -g 1001 -S nodejs && \
    adduser -S quartz -u 1001

WORKDIR /app
COPY --from=builder --chown=quartz:nodejs /app/dist ./dist
COPY --from=builder --chown=quartz:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=quartz:nodejs /app/package.json ./

USER quartz
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

This multi-stage build ensures the final image is as small as possible, containing only production dependencies and compiled code.

### Kubernetes Manifests

Quartz generates Kubernetes manifests through Helm charts. Here are the key resource definitions:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  labels:
    app: my-service
    team: platform
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: my-service
          image: registry.example.com/my-service:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### CI/CD Pipeline

The recommended CI/CD pipeline uses GitHub Actions with the following stages:

- [ ] Run unit tests with coverage reporting
- [ ] Run integration tests against real dependencies
- [ ] Build and scan the Docker image for vulnerabilities
- [ ] Push the image to the container registry
- [ ] Deploy to the staging environment
- [ ] Run smoke tests against staging
- [x] Deploy to production (manual approval required)
- [x] Run post-deployment verification

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Runtime environment |
| `PORT` | No | `3000` | HTTP server port |
| `LOG_LEVEL` | No | `info` | Logging verbosity |
| `DB_HOST` | Yes | - | Database hostname |
| `DB_PORT` | No | `5432` | Database port |
| `DB_NAME` | Yes | - | Database name |
| `DB_USER` | Yes | - | Database username |
| `DB_PASSWORD` | Yes | - | Database password |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL |
| `REGISTRY_URL` | Yes | - | Service registry URL |
| `EVENT_BUS_URL` | Yes | - | Message broker URL |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `CORS_ORIGINS` | No | `*` | Allowed CORS origins |

### Scaling Guidelines

When scaling your Quartz services, consider the following recommendations:

1. **Horizontal scaling** is preferred over vertical scaling for stateless services
2. Set up **Horizontal Pod Autoscaler** (HPA) based on CPU and custom metrics
3. Use **Pod Disruption Budgets** (PDB) to ensure availability during cluster maintenance
4. Configure **resource requests and limits** based on actual usage patterns
5. Enable **connection pooling** at the database level to prevent connection exhaustion
6. Use **circuit breakers** for all external service calls to prevent cascading failures

```typescript
import { CircuitBreaker, CircuitBreakerOptions } from '@quartz/resilience';

const options: CircuitBreakerOptions = {
  failureThreshold: 5,        // Open after 5 consecutive failures
  successThreshold: 3,         // Close after 3 consecutive successes
  timeout: 10000,              // 10 second timeout per call
  resetTimeout: 30000,         // Try again after 30 seconds
  monitoring: {
    enabled: true,
    bucketSize: 60000,         // 1 minute buckets
    bucketCount: 10,           // Track last 10 minutes
  },
};

const paymentBreaker = new CircuitBreaker('payment-service', options);

async function processPayment(order: Order) {
  return paymentBreaker.execute(async () => {
    const response = await fetch('https://payment-service/api/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: order.total,
        currency: 'USD',
        customerId: order.customerId,
        orderId: order.id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Payment failed: ${response.statusText}`);
    }

    return response.json();
  });
}
```

## Observability

### Structured Logging

All Quartz services use structured JSON logging by default. This ensures logs are easily parseable by log aggregation systems like Elasticsearch, Loki, or CloudWatch.

```typescript
import { Logger } from '@quartz/logging';

const logger = new Logger({ service: 'my-service' });

// Basic logging
logger.info('Server started', { port: 3000, environment: 'production' });

// Error logging with stack trace
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    operation: 'riskyOperation',
    userId: ctx.userId,
  });
}

// Child loggers inherit parent context
const requestLogger = logger.child({
  requestId: ctx.requestId,
  traceId: ctx.traceId,
});

requestLogger.info('Processing request', { method: 'POST', path: '/api/orders' });
```

### Distributed Tracing

Quartz integrates with OpenTelemetry for distributed tracing across service boundaries. Traces are automatically propagated through HTTP headers and event metadata.

Every span captures key timing information, and you can add custom attributes to enrich the trace data:

```typescript
import { tracer, SpanKind } from '@quartz/tracing';

async function handleOrder(orderId: string) {
  return tracer.startActiveSpan('handleOrder', { kind: SpanKind.INTERNAL }, async (span) => {
    span.setAttribute('order.id', orderId);

    try {
      // Each of these calls creates a child span automatically
      const order = await orderService.findById(orderId);
      span.setAttribute('order.total', order.total);

      const inventory = await inventoryService.check(order.items);
      span.setAttribute('inventory.available', inventory.allAvailable);

      if (inventory.allAvailable) {
        const payment = await paymentService.charge(order);
        span.setAttribute('payment.status', payment.status);
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return order;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Metrics and Alerting

The metrics system collects four types of telemetry data:

- **Counters** - Monotonically increasing values (e.g., total requests)
- **Gauges** - Values that can go up and down (e.g., active connections)
- **Histograms** - Distribution of values (e.g., request latency)
- **Summaries** - Similar to histograms but with pre-calculated quantiles

```typescript
import { metrics } from '@quartz/metrics';

// Counter
const requestCounter = metrics.counter('http_requests_total', {
  description: 'Total HTTP requests',
  labels: ['method', 'path', 'status'],
});
requestCounter.inc({ method: 'GET', path: '/api/users', status: '200' });

// Gauge
const activeConnections = metrics.gauge('active_connections', {
  description: 'Current active connections',
});
activeConnections.set(42);

// Histogram
const latencyHistogram = metrics.histogram('request_latency_seconds', {
  description: 'Request latency in seconds',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
latencyHistogram.observe({ method: 'GET' }, 0.045);
```

## Security

### Authentication

Quartz supports multiple authentication strategies out of the box:

1. **JWT Bearer Tokens** - For service-to-service and user-to-service auth
2. **API Keys** - For external integrations
3. **mTLS** - For service mesh authentication
4. **OAuth2/OIDC** - For user-facing applications

```typescript
import { auth, JWTStrategy, APIKeyStrategy } from '@quartz/auth';

// Configure JWT authentication
auth.use('jwt', new JWTStrategy({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256', 'RS256'],
  issuer: 'quartz-auth',
  audience: 'my-service',
  maxAge: '1h',
}));

// Configure API key authentication
auth.use('apikey', new APIKeyStrategy({
  header: 'X-API-Key',
  validator: async (key) => {
    const client = await db.apiKeys.findByKey(key);
    return client ? { id: client.id, scopes: client.scopes } : null;
  },
}));

// Apply to routes
router.get('/api/users', auth.required('jwt'), listUsers);
router.post('/api/webhooks', auth.required('apikey'), handleWebhook);
router.get('/public/health', listUsers); // No auth required
```

### Rate Limiting

To protect services from abuse, Quartz includes a distributed rate limiter backed by Redis:

```typescript
import { RateLimiter } from '@quartz/security';

const limiter = new RateLimiter({
  store: 'redis',
  keyPrefix: 'ratelimit:',
  points: 100,        // 100 requests
  duration: 60,        // per 60 seconds
  blockDuration: 120,  // block for 2 minutes if exceeded
});

router.use(limiter.middleware({
  keyGenerator: (ctx) => ctx.ip,
  onRateLimited: (ctx) => {
    ctx.status = 429;
    ctx.body = {
      error: 'Too many requests',
      retryAfter: ctx.rateLimitInfo.msBeforeNext / 1000,
    };
  },
}));
```

### Input Validation and Sanitization

Always validate and sanitize user input. Quartz uses Zod for schema validation with additional sanitization helpers:

```typescript
import { z } from '@quartz/validation';

const CreateArticleSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be under 200 characters')
    .trim(),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content must be under 50,000 characters'),
  tags: z.array(z.string().max(30))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  published: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type CreateArticle = z.infer<typeof CreateArticleSchema>;
```

## Troubleshooting

### Common Issues

Here are the most frequently encountered issues and their solutions:

#### Service fails to start

If your service fails to start with a configuration error, check the following:

1. Verify all required environment variables are set
2. Check that the database is reachable from the service container
3. Ensure the service registry is running and accessible
4. Review the startup logs for specific error messages

```bash
# Check environment variables
env | grep -E '^(DB_|REDIS_|REGISTRY_|EVENT_BUS_)'

# Test database connectivity
pg_isready -h $DB_HOST -p $DB_PORT

# Check service registry
curl -s http://$REGISTRY_URL/v1/status | jq .

# View recent logs
kubectl logs -f deployment/my-service --tail=100
```

#### High latency responses

If you notice increased response latency, investigate these areas:

- **Database queries** - Check for missing indexes or N+1 query patterns
- **Connection pool exhaustion** - Monitor active vs idle connections
- **Memory pressure** - Look for garbage collection pauses
- **Network issues** - Check for DNS resolution delays or packet loss
- **Downstream dependencies** - Verify circuit breaker states

> **Pro tip:** Enable slow query logging in your database configuration to identify queries that take longer than 100ms. This is often the root cause of latency spikes.

#### Memory leaks

Memory leaks in Node.js services typically manifest as gradually increasing RSS over time. Common causes include:

- Event listener accumulation (forgetting to remove listeners)
- Unbounded caches without eviction policies
- Closures holding references to large objects
- Streams not being properly closed or destroyed

```typescript
// BAD: Event listener leak
class BadService {
  constructor(private emitter: EventEmitter) {
    // This adds a new listener every time, never removing old ones
    this.emitter.on('data', this.handleData.bind(this));
  }
}

// GOOD: Proper cleanup
class GoodService {
  private boundHandler: (data: unknown) => void;

  constructor(private emitter: EventEmitter) {
    this.boundHandler = this.handleData.bind(this);
    this.emitter.on('data', this.boundHandler);
  }

  destroy() {
    this.emitter.off('data', this.boundHandler);
  }
}
```

### Performance Tuning

For production deployments, consider these performance optimizations:

1. Enable **HTTP/2** for multiplexed connections
2. Use **compression** for responses larger than 1KB
3. Implement **response caching** with appropriate TTLs
4. Enable **keep-alive** connections to reduce TCP handshake overhead
5. Use **worker threads** for CPU-intensive operations
6. Configure **garbage collection** flags for better throughput

```bash
# Recommended Node.js flags for production
node --max-old-space-size=512 \
     --max-semi-space-size=64 \
     --optimize-for-size \
     --gc-interval=100 \
     dist/index.js
```

### Debugging

When all else fails, Quartz provides several debugging utilities:

```typescript
import { debug } from '@quartz/debug';

// Enable debug output for specific modules
// Set DEBUG=quartz:* to enable all debug output
const log = debug('quartz:my-service');

log('Processing request %O', { id: '123', method: 'GET' });
log('Query result: %d records in %dms', results.length, elapsed);
```

For remote debugging, attach the Node.js inspector:

```bash
# Start with inspector
node --inspect=0.0.0.0:9229 dist/index.js

# Port-forward in Kubernetes
kubectl port-forward pod/my-service-xyz 9229:9229
```

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **Circuit Breaker** | A pattern that prevents cascading failures by short-circuiting calls to failing services |
| **Service Mesh** | Infrastructure layer that handles service-to-service communication |
| **Sidecar** | A companion container that runs alongside the main application container |
| **Blue-Green Deployment** | A deployment strategy using two identical environments |
| **Canary Release** | Gradually rolling out changes to a small subset of users |
| **Feature Flag** | A mechanism to enable or disable features without deploying new code |
| **Idempotency** | The property of an operation that produces the same result regardless of how many times it is applied |
| **Back Pressure** | A mechanism for signaling upstream producers to slow down when a consumer is overwhelmed |
| **Dead Letter Queue** | A queue for messages that could not be processed successfully |
| **Saga Pattern** | A sequence of local transactions for managing distributed transactions |

### Migration Guide

If you are migrating from an older version of Quartz, review the following breaking changes:

- **v0.x to v1.0**: The configuration format changed from JSON to TypeScript. Update your `quartz.config.json` to `quartz.config.ts`
- **v1.0 to v1.5**: The middleware API was updated to use async/await instead of callbacks
- **v1.5 to v2.0**: Service registration is now automatic. Remove manual registration code from your startup scripts

For each migration, run the automated migration tool:

```bash
quartz migrate --from=1.0 --to=2.0
```

This will update configuration files, dependency versions, and provide a report of manual changes required.

### Additional Resources

For more information, consult the following resources:

- [Quartz API Documentation](https://docs.quartz.dev/api) - Complete API reference
- [Quartz Examples Repository](https://github.com/quartz/examples) - Sample applications
- [Platform Engineering Blog](https://blog.quartz.dev) - Technical articles and best practices
- [Community Discord](https://discord.gg/quartz) - Ask questions and share knowledge

---

*This document is maintained by the Platform Engineering team. Last updated: February 2026. For corrections or additions, please open a pull request against the `docs` repository.*

*Copyright 2024-2026 Quartz Platform. Licensed under the [MIT License](https://opensource.org/licenses/MIT).*
