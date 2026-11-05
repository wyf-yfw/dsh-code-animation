# 浏览式插件市场（可选）

在 DSH 插件页按关键词浏览并安装。

> 返回 [README](../README.md)

---

上面三种装法都是「知道包名直接装」。这一节讲的是另一种入口：在 DSH 插件页的
**Discover 里按关键词浏览**，看到卡片再点安装。

它不查 npm，读的是**插件市场索引**（market index）。要启用需要两步：

**1. 装可选的插件市场 bundle**（默认不启用）

```bash
dsh plugin --profile web add @deepseek-ai/dsh-experimental-plugin-market-bundle
```

**2. 把本仓库的索引地址加进设置**

```json
{
  "indexes": ["https://raw.githubusercontent.com/wyf-yfw/dsh-creation-mode/main/market.json"]
}
```

[`market.json`](../market.json) 是一份 format 1 索引，经 `dsh-plugin-market-index` 的
`parseMarketIndex` 校验；`source.type: "npm"` 表示该版本从 npm 安装。

> 发布新版本后要同步更新 `market.json` 的 `versions` 与 `publishTimestamp`，否则 Discover 仍显示旧版本号。

---
