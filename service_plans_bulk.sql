-- 이미지에서 추출한 모든 요금제 데이터
-- 총 11개 이미지에서 추출한 요금제들

-- 첫 번째 이미지 (LTE 요금제들)
INSERT INTO service_plans (plan_name, carrier, plan_type, data_allowance, monthly_fee, is_active, created_at, updated_at) VALUES
('미)LTE 스마트 플러스 N', '미래엔', 'LTE', '무제한', 0, 1, datetime('now'), datetime('now')),
('미)LTE 스마트 프로', '미래엔', 'LTE', '무제한', 0, 1, datetime('now'), datetime('now')),
('미)LTE 스마트', '미래엔', 'LTE', '무제한', 0, 1, datetime('now'), datetime('now')),
('미)LTE (15GB+100분)', '미래엔', 'LTE', '15GB', 0, 1, datetime('now'), datetime('now')),
('미)데이터트래픽 (15GB+100분)', '미래엔', 'LTE', '15GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (10GB+통화기본)', '미래엔', 'LTE', '10GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (7GB+통화기본)', '미래엔', 'LTE', '7GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (6GB+통화기본)', '미래엔', 'LTE', '6GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (9GB/3000분)', '미래엔', 'LTE', '9GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (6GB+200분)', '미래엔', 'LTE', '6GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (1GB+통화기본)', '미래엔', 'LTE', '1GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (1.5GB+통화기본)', '미래엔', 'LTE', '1.5GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (2.5GB+통화기본)', '미래엔', 'LTE', '2.5GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (4GB+통화기본)', '미래엔', 'LTE', '4GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (4.5GB+통화기본)', '미래엔', 'LTE', '4.5GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (6GB+통화기본)', '미래엔', 'LTE', '6GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (1GB+100분)', '미래엔', 'LTE', '1GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (1.5GB+150분)', '미래엔', 'LTE', '1.5GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (2.5GB+200분)', '미래엔', 'LTE', '2.5GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (2.5GB+200분)', '미래엔', 'LTE', '2.5GB', 0, 1, datetime('now'), datetime('now')),
('미)5G (5GB+통화기본)', '미래엔', '5G', '5GB', 0, 1, datetime('now'), datetime('now')),
('미)5G (6GB/3000분)', '미래엔', '5G', '6GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE 스마트 완전정액', '미래엔', 'LTE', '무제한', 0, 1, datetime('now'), datetime('now')),
('미)LTE (7GB+통화기본)(완전정액)', '미래엔', 'LTE', '7GB', 0, 1, datetime('now'), datetime('now')),
('미)LTE (1GB+통화기본)(완전정액)', '미래엔', 'LTE', '1GB', 0, 1, datetime('now'), datetime('now')),
('미)5G (31GB+통화기본)', '미래엔', '5G', '31GB', 0, 1, datetime('now'), datetime('now')),
('카)이동의즐거움 K-요금제 (7GB+통화기본)', 'KT', 'LTE', '7GB', 0, 1, datetime('now'), datetime('now')),
('카)이동의즐거움 K-요금제 (71GB+통화기본)', 'KT', 'LTE', '71GB', 0, 1, datetime('now'), datetime('now')),
('카)이동의즐거움 K-요금제 (100GB+통화기본)', 'KT', 'LTE', '100GB', 0, 1, datetime('now'), datetime('now'));

-- 두 번째 이미지 (더 많은 LTE/5G 요금제들)
INSERT INTO service_plans (plan_name, carrier, plan_type, data_allowance, monthly_fee, is_active, created_at, updated_at) VALUES
('텔)LTE 알뜰 (100GB+통화량)', 'KT텔레콤', 'LTE', '100GB', 0, 1, datetime('now'), datetime('now')),
('텔)LTE 알뜰 (11GB+통화량)', 'KT텔레콤', 'LTE', '11GB', 0, 1, datetime('now'), datetime('now')),
('텔)LTE 알뜰 (15GB+300분)', 'KT텔레콤', 'LTE', '15GB', 0, 1, datetime('now'), datetime('now')),
('텔)LTE 알뜰 (15GB+100분)', 'KT텔레콤', 'LTE', '15GB', 0, 1, datetime('now'), datetime('now')),
('텔)LTE 알뜰 (7GB+통화량)', 'KT텔레콤', 'LTE', '7GB', 0, 1, datetime('now'), datetime('now')),
('텔)LTE 알뜰 (10GB+통화량)', 'KT텔레콤', 'LTE', '10GB', 0, 1, datetime('now'), datetime('now')),
('텔)LTE 알뜰 (4GB/2000분)', 'KT텔레콤', 'LTE', '4GB', 0, 1, datetime('now'), datetime('now')),
('텔)LTE 알뜰 (5GB+200분)', 'KT텔레콤', 'LTE', '5GB', 0, 1, datetime('now'), datetime('now')),
('텔)LTE 알뜰 (35GB+200분)', 'KT텔레콤', 'LTE', '35GB', 0, 1, datetime('now'), datetime('now')),
('텔)LTE 알뜰 (8GB/2000분)', 'KT텔레콤', 'LTE', '8GB', 0, 1, datetime('now'), datetime('now')),
('텔)5G M 알뜰 10GB', 'KT텔레콤', '5G', '10GB', 0, 1, datetime('now'), datetime('now')),
('텔)5G M 스마트 30GB', 'KT텔레콤', '5G', '30GB', 0, 1, datetime('now'), datetime('now')),
('텔)5G M 프리미엄 110GB', 'KT텔레콤', '5G', '110GB', 0, 1, datetime('now'), datetime('now')),
('텔)5G 프리미엄 200GB', 'KT텔레콤', '5G', '200GB', 0, 1, datetime('now'), datetime('now'));

-- 계속해서 추가할 수 있는 형태로 SQL 구성