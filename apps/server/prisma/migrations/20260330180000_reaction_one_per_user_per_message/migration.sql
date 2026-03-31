-- Một user chỉ một reaction / message (Bước 12). Xóa bản trùng (message_id, user_id), giữ bản created_at sớm nhất.
DELETE FROM reactions a
WHERE a.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY message_id, user_id
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM reactions
  ) t
  WHERE t.rn > 1
);

DROP INDEX IF EXISTS "reactions_message_id_user_id_emoji_key";

CREATE UNIQUE INDEX "reactions_message_id_user_id_key" ON "reactions"("message_id", "user_id");
