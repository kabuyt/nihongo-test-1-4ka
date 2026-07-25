-- ============================================================
-- 面接のアーカイブ機能を追加する（Supabase → SQL Editor で1回実行）
-- 終わった面接を一覧から隠すための列。データは消さない。
-- 実行後、管理画面に「アーカイブ」ボタンと「アーカイブ済みを表示」チェックが出る。
-- ============================================================

alter table public.interview_sessions
  add column if not exists archived boolean not null default false;

-- 既存の update ポリシー（admin can update sessions）がそのまま効くので
-- 追加のポリシー変更は不要。アーカイブ操作はGROP管理者のみ。
