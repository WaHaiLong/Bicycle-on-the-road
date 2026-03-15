# 骑行路上 - 公路车出租平台

一个基于 Supabase + 纯静态 HTML/CSS/JS 的公路车出租平台，部署在 GitHub Pages 上。

## 功能

- 浏览公路车列表（支持搜索、筛选）
- 查看车辆详情与用户评价
- 用户注册/登录（Supabase Auth）
- 在线预订租赁（选择日期、自动计算费用）
- 我的租约管理（查看、取消）
- 发布自己的车辆出租

## 技术栈

- **前端**: 原生 HTML / CSS / JavaScript（ES Modules）
- **后端**: [Supabase](https://supabase.com)（PostgreSQL + Auth + RLS）
- **部署**: GitHub Pages（`docs/` 目录）

## 数据库初始化

在 Supabase Dashboard → SQL Editor 中运行 `database/schema.sql` 文件。

## 本地开发

直接用浏览器打开 `docs/index.html`，或使用任意静态文件服务器：

```bash
npx serve docs
```

## GitHub Pages 部署

1. 仓库设置 → Pages → Source 选择 `GitHub Actions`
2. 推送到 `master` 分支后自动部署
