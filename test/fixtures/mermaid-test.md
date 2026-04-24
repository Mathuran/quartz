# Mermaid Diagram Test

Five simple-to-medium complexity diagrams that render within the 400px max-height.

## Flowchart

```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action A]
    B -->|No| D[Action B]
    C --> E[End]
    D --> E
```

## Sequence Diagram

```mermaid
sequenceDiagram
    Client->>Server: POST /login
    Server->>DB: Query user
    DB-->>Server: User record
    Server-->>Client: 200 OK + token
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Review : Submit
    Review --> Approved : Approve
    Review --> Draft : Request changes
    Approved --> Published : Publish
    Published --> [*]
```

## Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ POST : writes
    POST ||--o{ COMMENT : has
    USER ||--o{ COMMENT : writes
    POST }o--|| CATEGORY : belongs_to
```

## Git Graph

```mermaid
gitGraph
    commit
    branch feature
    commit
    commit
    checkout main
    merge feature
    commit
```
