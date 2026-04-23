# Mermaid Diagram Test

Some text before diagrams.

## Flowchart

```mermaid
graph TD
    A[User opens file] --> B{Has mermaid blocks?}
    B -->|Yes| C[Render diagrams]
    B -->|No| D[Normal editor]
    C --> E[Click edit button]
    E --> F[Edit source code]
    F --> G[Click Done]
    G --> C
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant E as Editor
    participant M as Mermaid.js
    U->>E: Open markdown file
    E->>M: Parse mermaid block
    M-->>E: Return SVG
    E-->>U: Display diagram
    U->>E: Click edit button
    E-->>U: Show textarea
    U->>E: Edit + click Done
    E->>M: Re-render
    M-->>E: Updated SVG
    E-->>U: Display updated diagram
```

## Regular Code Block (should render normally)

```typescript
function hello() {
  console.log("This should be a normal code block");
}
```

## Invalid Mermaid (should show error)

```mermaid
this is not valid mermaid syntax
    --> broken
```

## Empty Mermaid Block

```mermaid
```

## Mixed Content After Diagrams

Regular paragraph after diagrams. Make sure everything below renders fine.

- List item 1
- List item 2
- List item 3

> A blockquote for good measure.
