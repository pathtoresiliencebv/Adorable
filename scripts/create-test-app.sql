-- Create a test app for debugging
INSERT INTO apps (id, name, description, "gitRepo", "createdAt", "updatedAt")
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Test App',
  'A test app for debugging',
  'test-repo',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Show the created app
SELECT * FROM apps WHERE id = '550e8400-e29b-41d4-a716-446655440000';
