// JWT_SECRET должен быть задан до импорта auth.ts — он вызывает process.exit(1) при отсутствии
process.env.JWT_SECRET = 'vitest-test-secret-key'
