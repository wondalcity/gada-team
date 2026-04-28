-- V16: Assign realistic Korean mobile phone numbers to dev/test users
-- These are dummy numbers for testing only (010-XXXX-XXXX format)
-- Idempotent: only updates rows where phone looks like a placeholder or is empty

-- Update by firebase_uid for known dev accounts
UPDATE users SET phone = '010-1001-0001' WHERE firebase_uid = 'dev-worker-1'  AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0001');
UPDATE users SET phone = '010-1001-0002' WHERE firebase_uid = 'dev-worker-2'  AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0002');
UPDATE users SET phone = '010-1001-0003' WHERE firebase_uid = 'dev-worker-3'  AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0003');
UPDATE users SET phone = '010-1001-0004' WHERE firebase_uid = 'dev-worker-4'  AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0004');
UPDATE users SET phone = '010-1001-0005' WHERE firebase_uid = 'dev-worker-5'  AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0005');
UPDATE users SET phone = '010-1001-0006' WHERE firebase_uid = 'dev-worker-6'  AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0006');
UPDATE users SET phone = '010-1001-0007' WHERE firebase_uid = 'dev-worker-7'  AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0007');
UPDATE users SET phone = '010-1001-0008' WHERE firebase_uid = 'dev-worker-8'  AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0008');
UPDATE users SET phone = '010-1001-0009' WHERE firebase_uid = 'dev-worker-9'  AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0009');
UPDATE users SET phone = '010-1001-0010' WHERE firebase_uid = 'dev-worker-10' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0010');
UPDATE users SET phone = '010-1001-0011' WHERE firebase_uid = 'dev-worker-11' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0011');
UPDATE users SET phone = '010-1001-0012' WHERE firebase_uid = 'dev-worker-12' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0012');
UPDATE users SET phone = '010-1001-0013' WHERE firebase_uid = 'dev-worker-13' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0013');
UPDATE users SET phone = '010-1001-0014' WHERE firebase_uid = 'dev-worker-14' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0014');
UPDATE users SET phone = '010-1001-0015' WHERE firebase_uid = 'dev-worker-15' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0015');
UPDATE users SET phone = '010-1001-0016' WHERE firebase_uid = 'dev-worker-16' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0016');
UPDATE users SET phone = '010-1001-0017' WHERE firebase_uid = 'dev-worker-17' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0017');
UPDATE users SET phone = '010-1001-0018' WHERE firebase_uid = 'dev-worker-18' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0018');

UPDATE users SET phone = '010-2001-0001' WHERE firebase_uid = 'dev-employer-1' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0101');
UPDATE users SET phone = '010-2001-0002' WHERE firebase_uid = 'dev-employer-2' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0102');
UPDATE users SET phone = '010-2001-0003' WHERE firebase_uid = 'dev-employer-3' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0103');
UPDATE users SET phone = '010-2001-0004' WHERE firebase_uid = 'dev-employer-4' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0104');
UPDATE users SET phone = '010-2001-0005' WHERE firebase_uid = 'dev-employer-5' AND (phone = '' OR phone LIKE '000%' OR phone = '010-0000-0105');
