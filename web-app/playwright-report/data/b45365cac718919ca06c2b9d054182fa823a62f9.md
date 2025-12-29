# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - img [ref=e6]
          - generic [ref=e11]: FilamentDB
        - button "Toggle theme" [ref=e12]:
          - img [ref=e13]
      - navigation [ref=e15]:
        - link "Dashboard" [ref=e16] [cursor=pointer]:
          - /url: /
          - img [ref=e17]
          - text: Dashboard
        - link "Inventory" [ref=e22] [cursor=pointer]:
          - /url: /inventory
          - img [ref=e23]
          - text: Inventory
        - link "Scanner" [ref=e27] [cursor=pointer]:
          - /url: /scan
          - img [ref=e28]
          - text: Scanner
        - link "Settings" [ref=e33] [cursor=pointer]:
          - /url: /settings
          - img [ref=e34]
          - text: Settings
    - main [ref=e38]:
      - generic [ref=e40]: Loading...
  - alert [ref=e42]
```