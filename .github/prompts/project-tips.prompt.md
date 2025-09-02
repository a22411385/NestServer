---
mode: agent
---

## Task Definition
Define the task to achieve, including specific requirements, constraints, and success criteria.

1. 使用Schema自動同步,不須額外處理單位身上資料,當單位狀態改變(例如:血量), UI會透過reactive自動更新。
2. 每個單位的狀態會額外製作一份reactive的數據，監聽SchemaCallbackProxy事件處理至reactive結構。

