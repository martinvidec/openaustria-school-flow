-- DropIndex
DROP INDEX "persons_keycloak_user_id_key";

-- CreateIndex
CREATE INDEX "persons_keycloak_user_id_idx" ON "persons"("keycloak_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "persons_keycloak_user_id_school_id_key" ON "persons"("keycloak_user_id", "school_id");
