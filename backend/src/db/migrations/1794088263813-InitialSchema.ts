import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794088263813 implements MigrationInterface {
  public readonly name = 'InitialSchema1794088263813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_encryption" ("id" character varying(48) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "clientPublicKey" text, "serverPrivateKey" text, "salt" text, "verifier" text, "publicKey" text, "encryptedPrivateKey" text, "iv" text, "tag" text, "protectedKey" text, "protectedKeyIV" text, "protectedKeyTag" text, "user_id" character varying(48), CONSTRAINT "REL_7e69d8d6c3faea17e1d1d50a2d" UNIQUE ("user_id"), CONSTRAINT "PK_53edc0caf9572c516e4968ced09" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" character varying(48) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "email" character varying(255) NOT NULL, "display_name" character varying(100), "is_active" boolean NOT NULL DEFAULT true, "timezone" character varying(100) NOT NULL DEFAULT 'UTC', "openai_key" character varying(255), "llm_provider" character varying(20), "llm_model" character varying(100), "llm_base_url" character varying(500), "hourly_rate" real NOT NULL DEFAULT '0', "currency" character varying(10) NOT NULL DEFAULT 'USD', CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_a72fa0bb46a03bedcd1745efb41" UNIQUE ("display_name"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."work_sessions_status_enum" AS ENUM('active', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "work_sessions" ("id" character varying(48) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" "public"."work_sessions_status_enum" NOT NULL DEFAULT 'active', "git_branch" character varying(255), "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ended_at" TIMESTAMP WITH TIME ZONE, "active_seconds" integer NOT NULL DEFAULT '0', "idle_seconds" integer NOT NULL DEFAULT '0', "focus_score" numeric(5,2) NOT NULL DEFAULT '0', "earned_money" numeric(10,2) NOT NULL DEFAULT '0', "primary_language" character varying(50), "language_seconds" jsonb DEFAULT '{}'::jsonb, "current_language" character varying(50), "file_seconds" jsonb NOT NULL DEFAULT '{}'::jsonb, "current_file_path" character varying(512), "machine_id" character varying(64), "commands_run" integer NOT NULL DEFAULT '0', "failed_commands" integer NOT NULL DEFAULT '0', "terminal_commands" jsonb NOT NULL DEFAULT '[]'::jsonb, "commits_count" integer NOT NULL DEFAULT '0', "commits" jsonb NOT NULL DEFAULT '[]'::jsonb, "user_id" character varying(40) NOT NULL, "project_id" character varying(40), "ai_assisted" boolean NOT NULL DEFAULT false, "ai_interactions_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_2b15ef494243f1cc2bf0f731e76" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e29e2fe66132da62bf3b701221" ON "work_sessions" ("project_id", "git_branch") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a499435c60c2f803f0c539173" ON "work_sessions" ("user_id", "git_branch", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a4fade802e15a160d9d647b167" ON "work_sessions" ("user_id", "started_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" character varying(48) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "git_remote_url" text NOT NULL, "name" character varying(100) NOT NULL, "user_id" character varying(40) NOT NULL, CONSTRAINT "UQ_a39d41847c3ce69a624884c0337" UNIQUE ("git_remote_url", "user_id"), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "telemetry_events" ("id" character varying(48) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "git_branch" character varying(255), "event_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "active_seconds" integer NOT NULL DEFAULT '0', "idle_seconds" integer NOT NULL DEFAULT '0', "files_changed" jsonb NOT NULL DEFAULT '[]', "file_extensions" jsonb NOT NULL DEFAULT '[]', "user_id" character varying(40) NOT NULL, "api_key_id" character varying(40), "project_id" character varying(40), "session_id" character varying(40), "machine_id" character varying(64), "vscode_session_id" character varying(64), "command" character varying(500), "command_cwd" character varying(500), "exit_code" integer, "task_name" character varying(255), "task_source" character varying(100), "commit_hash" character varying(40), "commit_message" character varying(500), "insertions" integer, "deletions" integer, CONSTRAINT "PK_17996ee1fa9a5ce42e7ffaa8c68" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_33b1f7732780654dfd7059150b" ON "telemetry_events" ("project_id", "git_branch", "event_timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_89067b0ffec40e1b7c2c7f13ec" ON "telemetry_events" ("user_id", "event_timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" character varying(48) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "key_hash" character varying(255) NOT NULL, "key_prefix" character varying(12) NOT NULL, "last_used_at" TIMESTAMP WITH TIME ZONE, "device_label" character varying(100), "scopes" text array NOT NULL DEFAULT '{telemetry:write}', "user_id" character varying(40) NOT NULL, CONSTRAINT "UQ_57384430aa1959f4578046c9b81" UNIQUE ("key_hash"), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "worklog_entries" ("id" character varying(48) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "date" date NOT NULL, "format" character varying(20) NOT NULL, "language" character varying(5) NOT NULL, "facts_hash" character(64) NOT NULL, "text" text NOT NULL, "model" character varying(120) NOT NULL, "user_id" character varying(40) NOT NULL, CONSTRAINT "UQ_efee0abea4d9ae0ff70125fb515" UNIQUE ("user_id", "date", "format", "language"), CONSTRAINT "PK_580afde613cc252707facdd712e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_encryption" ADD CONSTRAINT "FK_7e69d8d6c3faea17e1d1d50a2dd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_sessions" ADD CONSTRAINT "FK_4dfb452d1af3bae425933010980" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_sessions" ADD CONSTRAINT "FK_16795a0e9fa41e4a454ebdd7283" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_bd55b203eb9f92b0c8390380010" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_events" ADD CONSTRAINT "FK_46510805db5668770ec0b0a0cd4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_events" ADD CONSTRAINT "FK_1b26e849769964588b6b98ddc36" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_events" ADD CONSTRAINT "FK_c46059c641d796b31c1ff4ac1f5" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_events" ADD CONSTRAINT "FK_27f900a9ac9f0681261fab399ed" FOREIGN KEY ("session_id") REFERENCES "work_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_a3baee01d8408cd3c0f89a9a973" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "worklog_entries" ADD CONSTRAINT "FK_8c5ba171057e2292eb9f96520e0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worklog_entries" DROP CONSTRAINT "FK_8c5ba171057e2292eb9f96520e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_a3baee01d8408cd3c0f89a9a973"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_events" DROP CONSTRAINT "FK_27f900a9ac9f0681261fab399ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_events" DROP CONSTRAINT "FK_c46059c641d796b31c1ff4ac1f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_events" DROP CONSTRAINT "FK_1b26e849769964588b6b98ddc36"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_events" DROP CONSTRAINT "FK_46510805db5668770ec0b0a0cd4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_bd55b203eb9f92b0c8390380010"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_sessions" DROP CONSTRAINT "FK_16795a0e9fa41e4a454ebdd7283"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_sessions" DROP CONSTRAINT "FK_4dfb452d1af3bae425933010980"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_encryption" DROP CONSTRAINT "FK_7e69d8d6c3faea17e1d1d50a2dd"`,
    );
    await queryRunner.query(`DROP TABLE "worklog_entries"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_89067b0ffec40e1b7c2c7f13ec"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_33b1f7732780654dfd7059150b"`);
    await queryRunner.query(`DROP TABLE "telemetry_events"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a4fade802e15a160d9d647b167"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6a499435c60c2f803f0c539173"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e29e2fe66132da62bf3b701221"`);
    await queryRunner.query(`DROP TABLE "work_sessions"`);
    await queryRunner.query(`DROP TYPE "public"."work_sessions_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "user_encryption"`);
  }
}
