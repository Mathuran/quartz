# [001] Create Export Jobs Database Table

## Metadata
- **Status:** DONE
- **Depends On:** None
- **Blocks:** 002, 003, 004
- **Scope:** S
- **Design Doc:** [user-data-export](../../design-docs/user-data-export.md)

## Description

Create the `export_jobs` database table to track export requests and their status. This is the foundational data model that all other export components will depend on.

The table schema is defined in the design doc section 4 (Data Model). This issue covers creating the migration, running it in development, and verifying the schema.

## Acceptance Criteria

- [ ] Migration file created with proper naming convention
- [ ] Table created with all columns from design doc
- [ ] Indexes created for user_id and status columns
- [ ] Migration is reversible (down migration works)
- [ ] Migration passes in CI pipeline
- [ ] Schema documented in database docs

## Technical Notes

### Suggested Approach
1. Create migration file: `db/migrations/20240115_create_export_jobs.sql`
2. Copy schema from design doc section 4
3. Add down migration to drop table
4. Run migration locally and verify with `\d export_jobs`
5. Update database schema documentation

### Files to Modify
- `db/migrations/` - Add new migration file
- `docs/database-schema.md` - Document new table

### Key Considerations
- Use UUID for id (consistent with other tables)
- JSONB for flexible fields (data_types, date_range, fields)
- Add timestamps with timezone (TIMESTAMPTZ)
- Consider adding a version column for future schema evolution

## Tests Required

### Unit Tests
- [ ] Migration up creates table with correct columns
- [ ] Migration down drops table cleanly
- [ ] Indexes exist after migration

### Integration Tests
- [ ] Can insert export_job record with all fields
- [ ] Can query by user_id (uses index)
- [ ] Can query by status (uses index)
- [ ] JSONB fields accept expected data structures

### Manual Testing
- [ ] Run migration in development environment
- [ ] Verify table structure with psql `\d export_jobs`

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated (if applicable)
- [ ] No regressions in existing functionality

---

# [002] Implement Export Job Model and Repository

## Metadata
- **Status:** TODO
- **Depends On:** 001
- **Blocks:** 003, 005
- **Scope:** M
- **Design Doc:** [user-data-export](../../design-docs/user-data-export.md)

## Description

Create the application-level model and repository for export jobs. This provides the interface that the API and workers will use to create, query, and update export jobs.

Include methods for all the operations needed by the API:
- Create new export job
- Get job by ID
- List jobs for a user
- Update job status and metadata
- Handle job expiration

## Acceptance Criteria

- [ ] ExportJob model class with all fields from schema
- [ ] ExportJobRepository with CRUD operations
- [ ] Input validation on create (valid data_types, format, date_range)
- [ ] Pagination support for list operation
- [ ] Status transition validation (can't go from completed to pending)
- [ ] Automatic expires_at calculation on completion

## Technical Notes

### Suggested Approach
1. Create model: `src/models/export_job.ts`
2. Create repository: `src/repositories/export_job_repository.ts`
3. Add validation logic for status transitions
4. Implement pagination using cursor-based approach
5. Add factory method for creating with defaults

### Files to Modify
- `src/models/` - Add export_job.ts
- `src/repositories/` - Add export_job_repository.ts
- `src/types/` - Add export types (status enum, data_types enum)

### Key Considerations
- Use TypeScript strict mode for type safety
- Repository should use connection pooling
- Consider using a query builder for complex queries
- Status transitions: pending → processing → completed/failed

## Tests Required

### Unit Tests
- [ ] Model validation rejects invalid data_types
- [ ] Model validation rejects invalid format
- [ ] Model validation rejects invalid date_range (end before start)
- [ ] Status transition validation works correctly
- [ ] expires_at calculated correctly (24 hours from completion)

### Integration Tests
- [ ] Repository.create inserts record correctly
- [ ] Repository.findById returns correct job
- [ ] Repository.findById returns null for non-existent ID
- [ ] Repository.findByUserId returns paginated results
- [ ] Repository.updateStatus changes status and timestamps
- [ ] Repository.updateStatus validates transitions

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated (if applicable)
- [ ] No regressions in existing functionality

---

# [003] Create Export API Endpoints

## Metadata
- **Status:** TODO
- **Depends On:** 001, 002
- **Blocks:** 006, 007
- **Scope:** M
- **Design Doc:** [user-data-export](../../design-docs/user-data-export.md)

## Description

Implement the REST API endpoints for export functionality as specified in the design doc section 4 (API Design):

- POST /api/v1/exports - Create export job
- GET /api/v1/exports/:id - Get job status
- GET /api/v1/exports - List export history

These endpoints handle request validation, authorization, and response formatting. The actual export processing is handled by workers (separate issue).

## Acceptance Criteria

- [ ] POST /api/v1/exports creates job and returns 202
- [ ] POST validates data_types, format, date_range
- [ ] POST requires authentication
- [ ] GET /api/v1/exports/:id returns job status
- [ ] GET returns 404 for non-existent or other user's jobs
- [ ] GET /api/v1/exports returns paginated list
- [ ] List only returns current user's exports
- [ ] API responses match design doc schema
- [ ] Rate limiting applied (10 exports/hour per user)

## Technical Notes

### Suggested Approach
1. Create controller: `src/controllers/export_controller.ts`
2. Create route definitions: `src/routes/exports.ts`
3. Add request validation middleware
4. Implement authorization checks
5. Add rate limiting middleware
6. Wire up to job queue (issue 004)

### Files to Modify
- `src/controllers/` - Add export_controller.ts
- `src/routes/` - Add exports.ts
- `src/routes/index.ts` - Register export routes
- `src/middleware/` - Add rate_limit.ts if not exists

### Key Considerations
- Use consistent error response format
- Include request ID in responses for debugging
- Log all export requests for audit trail
- Validate user can only access their own exports

## Tests Required

### Unit Tests
- [ ] Request validation rejects invalid data_types
- [ ] Request validation rejects invalid format
- [ ] Request validation rejects invalid date_range
- [ ] Authorization check passes for valid user
- [ ] Authorization check fails for invalid token
- [ ] Rate limiter tracks requests correctly

### Integration Tests
- [ ] POST /exports creates job and enqueues
- [ ] POST /exports returns 400 for invalid input
- [ ] POST /exports returns 401 without auth
- [ ] POST /exports returns 429 when rate limited
- [ ] GET /exports/:id returns job details
- [ ] GET /exports/:id returns 404 for other user's job
- [ ] GET /exports returns paginated list
- [ ] GET /exports only shows current user's exports

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated (if applicable)
- [ ] No regressions in existing functionality
